// One-off uploader: pushes Golder_Retailer_Specific.csv into a LangSmith dataset.
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

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { Client } from "langsmith"

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvPath = join(__dirname, "..", "Golder_Retailer_Specific.csv")

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

const client = new Client({ apiKey })

const datasetExists = await client.hasDataset({ datasetName })
if (!datasetExists) {
  await client.createDataset(datasetName, {
    description:
      "Golden Q&A set for the TGC Compliance Agent, uploaded from Golder_Retailer_Specific.csv.",
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
