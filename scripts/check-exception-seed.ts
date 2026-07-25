// Consistency check for the vendor-exception seed.
//
// Run: npx tsx scripts/check-exception-seed.ts
//
// The original seed drifted badly from the rest of the mock data — it named
// three vendors and four attribute profiles that don't exist, and 12 of its 15
// attribute names matched nothing in any GS1 pool, so those exceptions silently
// did nothing. Nothing caught it because nothing checked. This is that check.
//
// Every exception must satisfy:
//   1. the vendor trades in RETAILER_SUPPLIERS at this exact brickCode
//   2. the profile is a real ATTRIBUTE_PROFILES name
//   3. that profile actually covers this brickCode
//   4. every attribute name exists in the brick's assembled pool
//   5. no attribute name substring-collides with a different attribute in the
//      same pool — isAttributeWaived matches loosely in both directions, so
//      waiving "Fur Country of Origin" would also waive "Country of Origin"

import {
  ATTRIBUTE_PROFILES,
  RETAILER_SUPPLIERS,
  VENDOR_EXCEPTIONS,
  getProfileBricks,
} from "../lib/retailer-requirements"
import { assembleBrickAttributes } from "../lib/mcp/attribute-assembly"

const problems: string[] = []

VENDOR_EXCEPTIONS.forEach((e, i) => {
  const where = `Row ${i + 1} (${e.vendor} / ${e.profile})`

  if (!e.brickCode) {
    problems.push(`${where}: no brickCode — an unscoped exception never reduces a gap count.`)
    return
  }

  if (!RETAILER_SUPPLIERS.some((s) => s.supplier === e.vendor && s.brickCode === e.brickCode)) {
    const cats = RETAILER_SUPPLIERS.filter((s) => s.supplier === e.vendor).map((s) => s.brickCode)
    problems.push(
      cats.length
        ? `${where}: vendor does not trade in brick ${e.brickCode}. Trades in: ${cats.join(", ")}.`
        : `${where}: vendor "${e.vendor}" is not in RETAILER_SUPPLIERS at all.`
    )
  }

  const profile = ATTRIBUTE_PROFILES.find((p) => p.name === e.profile)
  if (!profile) {
    problems.push(
      `${where}: profile "${e.profile}" does not exist. Real profiles: ${ATTRIBUTE_PROFILES.map((p) => p.name).join(", ")}.`
    )
  } else if (!getProfileBricks(profile).some((b) => b.code === e.brickCode)) {
    problems.push(`${where}: profile "${e.profile}" does not cover brick ${e.brickCode}.`)
  }

  const pool = assembleBrickAttributes(e.brickCode).extendedAttributes.map((a) => a.name)
  for (const attr of e.attributes) {
    if (!pool.includes(attr)) {
      problems.push(`${where}: attribute "${attr}" is not in brick ${e.brickCode}'s pool.`)
      continue
    }
    const lower = attr.toLowerCase()
    const collides = pool.filter(
      (other) =>
        other !== attr &&
        !e.attributes.includes(other) &&
        (other.toLowerCase().includes(lower) || lower.includes(other.toLowerCase()))
    )
    if (collides.length) {
      problems.push(
        `${where}: attribute "${attr}" substring-collides with ${collides.map((c) => `"${c}"`).join(", ")} — it would silently waive those too.`
      )
    }
  }
})

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s) in the vendor-exception seed:\n`)
  for (const p of problems) console.error(`  • ${p}`)
  process.exit(1)
}

console.log(`✓ All ${VENDOR_EXCEPTIONS.length} vendor exceptions are consistent with the mock data.`)
