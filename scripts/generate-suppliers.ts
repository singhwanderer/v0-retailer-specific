// Generates ~1000 distinct, newly-named mock suppliers spread across the
// GS1 categories already backed by a live AttributeProfile, and writes them
// to lib/generated-suppliers.ts.
//
// Deliberate design goal (see plan discussion): this is NOT meant to be a
// small, realistic-looking supplier list — it exists to give the TGC
// Compliance Agent's `list_my_suppliers` tool (which is intentionally left
// UNCAPPED, see lib/copilot/tools.ts and lib/mcp/tools.ts) a genuinely large
// tool-output surface, mirroring how a real retailer like Dillard's has
// ~1000 suppliers spread ~100-200 per category. Every name generated here is
// new and distinct from the 14 hand-curated suppliers in
// lib/retailer-requirements.ts (HAND_CURATED_SUPPLIERS) — this is not the
// small pool of ~14 names stretched across categories, it's ~1000 unique
// entities, as requested.
//
// Deterministic: seeded PRNG, so re-running this script with no code changes
// produces byte-identical output (stable diffs, reproducible eval runs).
//
// Run: node --experimental-strip-types scripts/generate-suppliers.ts

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, "..", "lib", "generated-suppliers.ts")

// The 8 GS1 categories already backed by a live AttributeProfile in
// lib/retailer-requirements.ts — kept in sync with ATTRIBUTE_PROFILES so
// run_compliance_report's per-category aggregation stays meaningful.
const CATEGORIES = [
  { brickCode: "10001077", category: "Footwear" },
  { brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts" },
  { brickCode: "10001351", category: "Sweaters/Pullovers" },
  { brickCode: "10001350", category: "Jackets/Blazers/Cardigans/Waistcoats" },
  { brickCode: "10001333", category: "Dresses" },
  { brickCode: "10001334", category: "Skirts" },
  { brickCode: "10001335", category: "Trousers/Shorts" },
  { brickCode: "10001326", category: "Belts/Braces/Cummerbunds" },
] as const

const SUPPLIERS_PER_CATEGORY = 125 // 8 * 125 = 1000
// A small fraction of suppliers legitimately trade in a second category too,
// mirroring the realistic multi-category pattern already established by the
// 14 hand-curated suppliers (e.g. Calvin Klein spans 3 categories) — but
// this is the exception, not the mechanism used to reach 1000 rows.
const CROSS_CATEGORY_RATE = 0.04

// mulberry32 — small, fast, deterministic PRNG (no external dependency).
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(0x5a1e5)
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

// Word banks for combinatorial, plausible-looking brand-style names — large
// enough that surname x suffix combinations comfortably exceed 1000 distinct
// values without repeating.
const SURNAMES = [
  "Harlow", "Weston", "Kensington", "Marchetti", "Delacroix", "Sinclair", "Ashford", "Bellweather",
  "Carrow", "Fenwick", "Hargrove", "Lindqvist", "Montrose", "Pemberton", "Rousseau", "Sterling",
  "Thackeray", "Vaughn", "Winslet", "Ashworth", "Blackwood", "Callahan", "Dunmore", "Everhart",
  "Faircloth", "Grayson", "Hollis", "Ingram", "Jorstad", "Kingsley", "Lachance", "Maddox",
  "Norwood", "Ostrander", "Pruitt", "Quintero", "Radcliffe", "Stanhope", "Tremaine", "Underwood",
  "Vandermark", "Whitfield", "Yarrow", "Zelinski", "Ainsworth", "Bramwell", "Castellan", "Drummond",
  "Edenfield", "Fairbanks", "Galloway", "Halloran", "Isherwood", "Jennick", "Kavanagh", "Larchmont",
  "Merriweather", "Norcross", "Oakhurst", "Prescott", "Quimby", "Ravensworth", "Somerhalder", "Trentham",
  "Ulverston", "Vellacott", "Wickersham", "Yardley", "Ashbrooke", "Braithwaite", "Cavendish", "Dashwood",
  "Elmswood", "Farnsworth", "Greysham", "Hawthorne", "Ivanhoe", "Jettison", "Kirkwood", "Ledbury",
  "Marlowe", "Nightingale", "Overton", "Penhallow", "Quartermain", "Ridgemont", "Stonebridge", "Talbot",
  "Ulster", "Verlaine", "Wexley", "Ashgrove", "Beaumont", "Chesterfield", "Dovecote", "Everly",
] as const

const SUFFIXES = [
  "& Co.", "Group", "Brands", "Studio", "Collective", "Label", "Apparel", "Athletic",
  "Footwear", "Textiles", "Atelier", "Workshop", "Supply Co.", "Goods", "House", "Trading Co.",
] as const

function generateSupplierNames(count: number): string[] {
  const names = new Set<string>()
  while (names.size < count) {
    const name = `${pick(SURNAMES)} ${pick(SUFFIXES)}`
    names.add(name)
  }
  return [...names]
}

interface SupplierComplianceRow {
  supplier: string
  brickCode: string
  category: string
  productsTotal: number
  productsWithGaps: number
  openGaps: number
  productsComplete: number
}

const allNames = generateSupplierNames(SUPPLIERS_PER_CATEGORY * CATEGORIES.length)
let nameCursor = 0
const rows: SupplierComplianceRow[] = []

for (const { brickCode, category } of CATEGORIES) {
  for (let i = 0; i < SUPPLIERS_PER_CATEGORY; i++) {
    const supplier = allNames[nameCursor++]
    const productsTotal = randInt(3, 40)
    const productsWithGaps = randInt(0, productsTotal)
    const openGaps = productsWithGaps === 0 ? 0 : randInt(productsWithGaps, productsWithGaps * 3)
    const productsComplete = productsTotal - productsWithGaps
    rows.push({ supplier, brickCode, category, productsTotal, productsWithGaps, openGaps, productsComplete })

    // Occasionally also trade in one other category (realistic multi-category
    // supplier, not the mechanism used to reach 1000 distinct entities).
    if (rand() < CROSS_CATEGORY_RATE) {
      const other = pick(CATEGORIES.filter((c) => c.brickCode !== brickCode))
      const total2 = randInt(3, 40)
      const withGaps2 = randInt(0, total2)
      const gaps2 = withGaps2 === 0 ? 0 : randInt(withGaps2, withGaps2 * 3)
      rows.push({
        supplier,
        brickCode: other.brickCode,
        category: other.category,
        productsTotal: total2,
        productsWithGaps: withGaps2,
        openGaps: gaps2,
        productsComplete: total2 - withGaps2,
      })
    }
  }
}

const header = `// AUTO-GENERATED by scripts/generate-suppliers.ts — do not hand-edit.
// Re-run \`node --experimental-strip-types scripts/generate-suppliers.ts\` to
// regenerate (deterministic: same seed always produces this exact output).
//
// ~1000 distinct, newly-named mock suppliers spread across the GS1
// categories already backed by a live AttributeProfile. Combined with
// HAND_CURATED_SUPPLIERS in lib/retailer-requirements.ts to form the full
// RETAILER_SUPPLIERS list. This scale exists specifically so the
// intentionally-uncapped \`list_my_suppliers\` tool (lib/copilot/tools.ts,
// lib/mcp/tools.ts) has a genuinely large tool-output surface to test the
// agent's accuracy against — see the golden-dataset Template 4 questions in
// scripts/generate-golden-dataset.ts.

import type { SupplierComplianceRow } from "./retailer-requirements"

export const GENERATED_SUPPLIERS: SupplierComplianceRow[] = ${JSON.stringify(rows, null, 2)}
`

writeFileSync(outPath, header)
console.log(`Wrote ${rows.length} generated supplier rows to ${outPath}`)
console.log(`Distinct supplier names: ${new Set(rows.map((r) => r.supplier)).size}`)
