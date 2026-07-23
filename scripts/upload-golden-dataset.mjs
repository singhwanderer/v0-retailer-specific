// One-off uploader: pushes Golder_Retailer_Specific.csv into a Braintrust dataset.
//
// Run locally (never paste your Braintrust key into chat/commits):
//   BRAINTRUST_API_KEY=sk-... node scripts/upload-golden-dataset.mjs
//
// Optional overrides (defaults match lib/copilot/agent.ts / evals/copilot.eval.ts):
//   BRAINTRUST_PROJECT=tgc-copilot BRAINTRUST_DATASET=tgc-compliance-eval
//
// CSV columns expected: Input, Expected, Outcome (Outcome is carried as metadata).
// Re-running this script does not duplicate rows for unchanged input/expected
// pairs — Braintrust dataset inserts are content-addressed by row hash.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { initDataset } from "braintrust"

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvPath = join(__dirname, "..", "Golder_Retailer_Specific.csv")

const apiKey = process.env.BRAINTRUST_API_KEY ?? process.env.EvalTGC
if (!apiKey) {
  console.error("Missing BRAINTRUST_API_KEY (or EvalTGC) in the environment.")
  process.exit(1)
}

const projectName = process.env.BRAINTRUST_PROJECT ?? "tgc-copilot"
const datasetName = process.env.BRAINTRUST_DATASET ?? "tgc-compliance-eval"

function parseCsv(text) {
  const rows = []
  let row = []
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

const raw = readFileSync(csvPath, "utf-8")
const rows = parseCsv(raw)
const [header, ...dataRows] = rows
const inputIdx = header.indexOf("Input")
const expectedIdx = header.indexOf("Expected")
const outcomeIdx = header.indexOf("Outcome")

if (inputIdx === -1 || expectedIdx === -1) {
  console.error(`CSV header must include "Input" and "Expected". Found: ${header.join(", ")}`)
  process.exit(1)
}

const dataset = initDataset(projectName, { dataset: datasetName, apiKey })

let count = 0
for (const r of dataRows) {
  const input = r[inputIdx]?.trim()
  const expected = r[expectedIdx]?.trim()
  if (!input) continue
  dataset.insert({
    input,
    expected: expected || undefined,
    metadata: outcomeIdx !== -1 && r[outcomeIdx]?.trim() ? { outcome: r[outcomeIdx].trim() } : undefined,
  })
  count++
}

await dataset.flush()
console.log(`Pushed ${count} rows to Braintrust project "${projectName}", dataset "${datasetName}".`)
