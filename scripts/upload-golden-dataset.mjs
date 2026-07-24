// One-off uploader: pushes Golder_Retailer_Specific.csv (hand-curated) and
// Golden_Retailer_Specific_Generated.csv (see scripts/generate-golden-dataset.ts,
// mechanically derived from GS1 reference data) into a LangSmith dataset.
//
// Run locally (never paste your LangSmith key into chat/commits):
//   LANGSMITH_API_KEY=lsv2_... node scripts/upload-golden-dataset.mjs
//
// Optional override (default matches lib/copilot/run-eval.ts):
//   LANGSMITH_DATASET=tgc-compliance-eval
//
// CSV columns expected: Input, Expected, Outcome. Rows become LangSmith
// examples: inputs: { question }, outputs: { answer }, metadata: { outcome }.
// Re-running this script skips questions that already exist in the dataset
// (checked by exact text match against existing examples) — it does not
// create a second dataset or duplicate rows on a rerun.

import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { Client } from "langsmith"

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvFilenames = ["Golder_Retailer_Specific.csv", "Golden_Retailer_Specific_Generated.csv"]

const apiKey = process.env.LANGSMITH_API_KEY
if (!apiKey) {
  console.error("Missing LANGSMITH_API_KEY in the environment.")
  process.exit(1)
}

const datasetName = process.env.LANGSMITH_DATASET ?? "tgc-compliance-eval"

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

const dataRows = []
let inputIdx, expectedIdx, outcomeIdx

for (const filename of csvFilenames) {
  const csvPath = join(__dirname, "..", filename)
  if (!existsSync(csvPath)) continue
  const raw = readFileSync(csvPath, "utf-8")
  const [header, ...fileRows] = parseCsv(raw)
  const fileInputIdx = header.indexOf("Input")
  const fileExpectedIdx = header.indexOf("Expected")
  const fileOutcomeIdx = header.indexOf("Outcome")
  if (fileInputIdx === -1 || fileExpectedIdx === -1) {
    console.error(`${filename}: header must include "Input" and "Expected". Found: ${header.join(", ")}`)
    process.exit(1)
  }
  // All expected CSVs share the same 3-column shape, so the same indices work
  // across files — assert that rather than tracking per-file indices.
  inputIdx = fileInputIdx
  expectedIdx = fileExpectedIdx
  outcomeIdx = fileOutcomeIdx
  dataRows.push(...fileRows)
}

if (inputIdx === undefined) {
  console.error(`No readable CSV found among: ${csvFilenames.join(", ")}`)
  process.exit(1)
}

const client = new Client({ apiKey })

const datasetExists = await client.hasDataset({ datasetName })
if (!datasetExists) {
  await client.createDataset(datasetName, {
    description:
      "Golden Q&A set for the TGC Compliance Agent, uploaded from Golder_Retailer_Specific.csv " +
      "(hand-curated) and Golden_Retailer_Specific_Generated.csv (generated from GS1 reference data).",
  })
}

const existingQuestions = new Set()
if (datasetExists) {
  for await (const example of client.listExamples({ datasetName })) {
    if (typeof example.inputs?.question === "string") {
      existingQuestions.add(example.inputs.question)
    }
  }
}

const toCreate = []
for (const r of dataRows) {
  const question = r[inputIdx]?.trim()
  const answer = r[expectedIdx]?.trim()
  if (!question || existingQuestions.has(question)) continue
  toCreate.push({
    dataset_name: datasetName,
    inputs: { question },
    outputs: answer ? { answer } : undefined,
    metadata: outcomeIdx !== -1 && r[outcomeIdx]?.trim() ? { outcome: r[outcomeIdx].trim() } : undefined,
  })
}

const created = toCreate.length > 0 ? await client.createExamples(toCreate) : []
console.log(
  `Pushed ${created.length} new row(s) to LangSmith dataset "${datasetName}" ` +
    `(${dataRows.length - created.length} already present, skipped).`
)
