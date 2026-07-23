// Throwaway verifier: parse the master-data CSVs and print, for every brick
// column, the exact count of "E"-marked (Essential/Extended) attributes and
// the list of attribute names. No assumptions — this is the source of truth
// for the requirement counts on the retailer screen.
import { readFileSync } from "node:fs"

function parseCsv(text) {
  // Simple CSV split (no quoted commas in these sheets).
  return text
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((l) => l.split(","))
}

function analyze(file, headerRowIdx, codeRowIdx, nameRowIdx, firstDataRow) {
  const rows = parseCsv(readFileSync(file, "utf8"))
  const codeRow = rows[codeRowIdx]
  const nameRow = rows[nameRowIdx]
  const result = {}
  // Columns start at index 1 (col A is the attribute name).
  for (let col = 1; col < codeRow.length; col++) {
    const code = (codeRow[col] || "").trim()
    if (!/^\d{6,}$/.test(code)) continue
    const brickName = (nameRow[col] || "").trim()
    const attrs = []
    for (let r = firstDataRow; r < rows.length; r++) {
      const attrName = (rows[r][0] || "").trim()
      if (!attrName || /^total/i.test(attrName)) continue
      const cell = (rows[r][col] || "").trim()
      if (cell === "E") attrs.push(attrName)
    }
    result[code] = { brickName, count: attrs.length, attrs }
  }
  return result
}

const footwear = analyze("Footwear.csv", 0, 1, 2, 3)
const clothing = analyze("Clothing.csv", 0, 1, 2, 3)
const accessories = analyze("Accessories.csv", 0, 1, 2, 3)

const all = { ...footwear, ...clothing, ...accessories }
for (const [code, info] of Object.entries(all)) {
  console.log(`${code}\t${info.count}\tcore8+ext=${info.count + 8}\t${info.brickName}`)
}
