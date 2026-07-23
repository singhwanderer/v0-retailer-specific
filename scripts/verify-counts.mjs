// Cross-check: GS1 library extendedAttributes count per brick  vs  CSV E-count
// vs the hardcoded "N attributes" strings in ATTRIBUTE_PROFILES.
// Pure text parsing — no TS imports. Verifies the main screen can never drift
// from the profile detail screen (which derives its count from the library).
import { readFileSync } from "node:fs"

const BASELINE = 8

// ── 1. Parse GS1 library: extendedAttributes.length per brickCode ────────────
const lib = readFileSync("lib/gs1-standard-library.ts", "utf8")
// Split into brick blocks on "brickCode:"
const libCounts = {}
const brickRe = /brickCode:\s*"(\d+)"/g
const blocks = lib.split(/(?=brickCode:\s*")/)
for (const block of blocks) {
  const m = block.match(/brickCode:\s*"(\d+)"/)
  if (!m) continue
  const code = m[1]
  // count extended attribute entries: lines with `code: "..."` inside extendedAttributes
  const extBlock = block.split("extendedAttributes")[1] ?? ""
  const codeMatches = extBlock.match(/code:\s*"/g) ?? []
  libCounts[code] = codeMatches.length
}

// ── 2. Parse ATTRIBUTE_PROFILES: hardcoded count + bricks per profile ────────
const req = readFileSync("lib/retailer-requirements.ts", "utf8")
const profilesSection = req.split("ATTRIBUTE_PROFILES")[1].split("RETAILER_SUPPLIERS")[0]
const profileBlocks = profilesSection.split(/(?=\{\s*\n\s*name:)/).filter((b) => b.includes("name:"))

console.log("Profile\tHardcoded\tComputed(8+ext)\tBricks\tMATCH?")
for (const b of profileBlocks) {
  const name = b.match(/name:\s*"([^"]+)"/)?.[1]
  if (!name) continue
  const hardcoded = b.match(/attributes:\s*"(\d+) attributes/)?.[1]
  // collect brick codes: prefer bricks[] array, else brickCode
  let codes = [...b.matchAll(/code:\s*"(\d+)"/g)].map((m) => m[1])
  if (codes.length === 0) {
    const single = b.match(/brickCode:\s*"(\d+)"/)?.[1]
    if (single) codes = [single]
  }
  const ext = codes.reduce((s, c) => s + (libCounts[c] ?? NaN), 0)
  const computed = BASELINE + ext
  const match = String(computed) === hardcoded ? "OK" : "*** MISMATCH ***"
  console.log(`${name}\t${hardcoded}\t${computed}\t${codes.join(",")}\t${match}`)
}
