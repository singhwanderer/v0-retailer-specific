// Generates additional golden Q&A rows for the LangSmith eval dataset,
// mechanically derived from data already in this repo — never hand-invented
// — so every "Expected" answer is provably correct against its source.
//
// Sources of truth:
//   - lib/gs1-standard-library.ts (GS1_BRICKS): real GS1 bricks + their
//     E-marked extended attributes.
//   - gs1_extended_attribute_master_code_list.csv: valid values per
//     attribute code list.
//   - lib/retailer-requirements.ts (RETAILER_SUPPLIERS): the ~1000-supplier
//     scale-up fixture (see scripts/generate-suppliers.ts) used to test
//     whether the agent accurately summarizes a large, intentionally
//     uncapped tool output (list_my_suppliers) rather than hallucinating
//     over it.
//
// Writes to Golden_Retailer_Specific_Generated.csv (same 3-column shape as
// Golder_Retailer_Specific.csv) rather than appending to the hand-curated
// file directly, so that file stays reviewable/immutable and this script
// stays idempotent (skips any Input that already exists in either CSV).
//
// Run: node --experimental-strip-types scripts/generate-golden-dataset.ts

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")

// ── CSV helpers (parse: same routine as scripts/upload-golden-dataset.mjs) ──

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\n") + "\n"
}

// ── Load existing questions (both CSVs) for dedup ───────────────────────────
// Rows already present in Golden_Retailer_Specific_Generated.csv are kept
// as-is in the output (previous generator runs, or rows from an older
// template version) — this script only ever appends, never wipes prior
// generated rows on a re-run.

const existingInputs = new Set<string>()
const previouslyGeneratedRows: string[][] = []
for (const filename of ["Golder_Retailer_Specific.csv", "Golden_Retailer_Specific_Generated.csv"]) {
  const p = join(repoRoot, filename)
  if (!existsSync(p)) continue
  const [header, ...dataRows] = parseCsv(readFileSync(p, "utf-8"))
  const inputIdx = header.indexOf("Input")
  if (inputIdx === -1) continue
  for (const r of dataRows) {
    const q = r[inputIdx]?.trim()
    if (q) existingInputs.add(q)
  }
  if (filename === "Golden_Retailer_Specific_Generated.csv") previouslyGeneratedRows.push(...dataRows)
}

// ── Load GS1_BRICKS ──────────────────────────────────────────────────────────

const { GS1_BRICKS } = await import(join(repoRoot, "lib", "gs1-standard-library.ts"))

interface Gs1ExtendedAttribute {
  name: string
  code: string
}
interface Gs1Brick {
  brickCode: string
  brickName: string
  segment: string
  extendedAttributes: Gs1ExtendedAttribute[]
}
const bricks: Gs1Brick[] = GS1_BRICKS

const CORE_ATTRIBUTES =
  "Product ID, Product Description, GTIN code, GTIN Description, NRF Size Code, NRF Color Code, Size Description, and Color Description"

// ── Load the master code-list CSV ───────────────────────────────────────────

const codeListRows = parseCsv(
  readFileSync(join(repoRoot, "gs1_extended_attribute_master_code_list.csv"), "utf-8")
)
const [codeListHeader, ...codeListData] = codeListRows
const clNameIdx = codeListHeader.indexOf("Code List Name")
const clValueIdx = codeListHeader.indexOf("Code List Value")

const valuesByCodeListName = new Map<string, string[]>()
for (const r of codeListData) {
  const name = r[clNameIdx]?.trim()
  const value = r[clValueIdx]?.trim()
  if (!name || !value) continue
  if (!valuesByCodeListName.has(name)) valuesByCodeListName.set(name, [])
  valuesByCodeListName.get(name)!.push(value)
}

// Join rule: attribute name -> code list name. "{name} Code List", or if the
// name already ends in " Code", strip that suffix first. Verified: 34 of 68
// distinct attribute names join cleanly this way — the rest are legitimately
// free-text/numeric attributes (Heel Height, Brand Name, etc.) with no code
// list, and are deliberately skipped rather than fuzzy-matched, so every
// generated "Expected" answer stays provably correct.
function codeListNameFor(attributeName: string): string {
  const base = attributeName.endsWith(" Code") ? attributeName.slice(0, -" Code".length) : attributeName
  return `${base} Code List`
}

const newRows: string[][] = []
function addRow(input: string, expected: string, outcome: string) {
  if (existingInputs.has(input)) return
  existingInputs.add(input) // guard against duplicate templates producing the same question
  newRows.push([input, expected, outcome])
}

// ── Template 1: one row per brick (~25 rows) ────────────────────────────────

for (const brick of bricks) {
  const attrNames = brick.extendedAttributes.map((a) => a.name)
  const input = `What does my ${brick.brickName} profile require?`
  const expected =
    `The GS1 category ${brick.brickName} (${brick.brickCode}, ${brick.segment}) has ` +
    `${attrNames.length} standard extended attributes defined in the GS1 library: ` +
    `${attrNames.join(", ")}. All products also always carry the 8 baseline core ` +
    `attributes (${CORE_ATTRIBUTES}). Whether an active attribute profile has been ` +
    `created for this category should be confirmed in Attributes & Images.`
  addRow(input, expected, "generated: gs1-brick-requirements")
}

// ── Template 2: one row per attribute with a confirmed code-list join (~34 rows) ──

const attributeNamesSeen = new Set<string>()
for (const brick of bricks) {
  for (const attr of brick.extendedAttributes) {
    if (attributeNamesSeen.has(attr.name)) continue
    attributeNamesSeen.add(attr.name)
    const codeListName = codeListNameFor(attr.name)
    const values = valuesByCodeListName.get(codeListName)
    if (!values || values.length === 0) continue // no clean join — skip, don't guess
    const input = `What are the valid values for ${attr.name}?`
    const expected =
      `Valid values for ${attr.name} (per the GS1 extended attribute master code list) are: ` +
      `${values.join(", ")}.`
    addRow(input, expected, "generated: gs1-code-list-values")
  }
}

// ── Template 3: one row per attribute required by 2+ bricks (~35-45 rows) ──

const bricksByAttribute = new Map<string, { brickCode: string; brickName: string }[]>()
for (const brick of bricks) {
  for (const attr of brick.extendedAttributes) {
    if (!bricksByAttribute.has(attr.name)) bricksByAttribute.set(attr.name, [])
    bricksByAttribute.get(attr.name)!.push({ brickCode: brick.brickCode, brickName: brick.brickName })
  }
}
for (const [attrName, matchingBricks] of bricksByAttribute) {
  if (matchingBricks.length < 2) continue
  const input = `Which GS1 categories require ${attrName}?`
  const list = matchingBricks.map((b) => `${b.brickName} (${b.brickCode})`).join(", ")
  const expected = `${attrName} is a required extended attribute for: ${list} — ${matchingBricks.length} categories total.`
  addRow(input, expected, "generated: gs1-cross-brick-attribute")
}

// ── Template 4: supplier-scale aggregate questions (uncapped-tool test fixture) ──

const { RETAILER_SUPPLIERS } = await import(join(repoRoot, "lib", "retailer-requirements.ts"))
interface SupplierComplianceRow {
  supplier: string
  brickCode: string
  category: string
  productsTotal: number
  productsWithGaps: number
  openGaps: number
  productsComplete: number
}
const suppliers: SupplierComplianceRow[] = RETAILER_SUPPLIERS

{
  const distinctNames = new Set(suppliers.map((s) => s.supplier)).size
  addRow(
    "List all my suppliers.",
    `There are ${suppliers.length} supplier/category rows across ${distinctNames} distinct supplier names ` +
      `trading under this retailer account.`,
    "generated: supplier-scale-total"
  )
}

for (const n of [10, 20, 30]) {
  const count = suppliers.filter((s) => s.openGaps > n).length
  addRow(
    `How many suppliers have more than ${n} open gaps?`,
    `${count} supplier/category row(s) have more than ${n} open gaps.`,
    "generated: supplier-scale-threshold"
  )
}

{
  const zeroGap = suppliers.filter((s) => s.openGaps === 0).map((s) => s.supplier).sort()
  const expected =
    zeroGap.length <= 20
      ? `${zeroGap.length} supplier/category row(s) have zero open gaps: ${zeroGap.join(", ")}.`
      : `${zeroGap.length} supplier/category row(s) have zero open gaps. A sample: ${zeroGap.slice(0, 20).join(", ")}, and ${zeroGap.length - 20} more.`
  addRow("Which suppliers have zero open gaps?", expected, "generated: supplier-scale-zero-gaps")
}

{
  const top = [...suppliers].sort((a, b) => b.openGaps - a.openGaps || a.supplier.localeCompare(b.supplier))[0]
  addRow(
    "Which supplier has the most open gaps, and how many?",
    `${top.supplier} (${top.category}) has the most open gaps: ${top.openGaps}.`,
    "generated: supplier-scale-top"
  )
}

// ── Write output ─────────────────────────────────────────────────────────────

const outPath = join(repoRoot, "Golden_Retailer_Specific_Generated.csv")
writeFileSync(outPath, toCsv([["Input", "Expected", "Outcome"], ...previouslyGeneratedRows, ...newRows]))
console.log(
  `Wrote ${previouslyGeneratedRows.length + newRows.length} row(s) to ${outPath} ` +
    `(${newRows.length} new, ${previouslyGeneratedRows.length} kept from a previous run).`
)
