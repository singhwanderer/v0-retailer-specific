import { readFileSync } from "node:fs"

const CORE = new Set([
  "Product ID","Product Description","GTIN code","GTIN Description",
  "NRF Size Code","NRF Color Code","Size Description","Color Description",
])

function parseCsv(text) {
  const rows = []
  let field = "", row = [], q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else {
      if (c === '"') q = true
      else if (c === ",") { row.push(field); field = "" }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
      else if (c === "\r") {} else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// CSV E-marked names per brick column
function csvBrickNames(file) {
  const rows = parseCsv(readFileSync(file, "utf8"))
  const codeRow = rows.find((r) => r.some((c) => /^\d{8}$/.test(c.trim())))
  const codeIdx = {}
  codeRow.forEach((c, i) => { if (/^\d{8}$/.test(c.trim())) codeIdx[c.trim()] = i })
  const map = {}
  for (const [code, idx] of Object.entries(codeIdx)) {
    const names = []
    for (const r of rows) {
      const attr = (r[0] || "").trim()
      const mark = (r[idx] || "").trim().toUpperCase()
      if (mark === "E" && attr && !CORE.has(attr)) names.push(attr)
    }
    map[code] = names
  }
  return map
}

const csv = { ...csvBrickNames("Clothing.csv") }
// library names
const libSrc = readFileSync("lib/gs1-standard-library.ts", "utf8")

function libNames(brick) {
  const start = libSrc.indexOf(`brickCode: "${brick}"`)
  const slice = libSrc.slice(start, libSrc.indexOf("brickCode:", start + 10) === -1 ? undefined : libSrc.indexOf("brickCode:", start + 10))
  return [...slice.matchAll(/name: "([^"]+)"/g)].map((m) => m[1])
}

for (const brick of ["10001352", "10001351", "10001334", "10001335"]) {
  const c = new Set(csv[brick] || [])
  const l = new Set(libNames(brick))
  const inLibNotCsv = [...l].filter((n) => !c.has(n))
  const inCsvNotLib = [...c].filter((n) => !l.has(n))
  console.log(`\n=== ${brick} | CSV E=${c.size} | LIB ext=${l.size} ===`)
  if (inLibNotCsv.length) console.log("  in LIB not CSV:", inLibNotCsv)
  if (inCsvNotLib.length) console.log("  in CSV not LIB:", inCsvNotLib)
}
