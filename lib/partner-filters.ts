// Retail partners + their account attribute filters (supplier-side view).
//
// PARTNERS is the roster of retailers who publish requirements against the
// supplier's account — extracted from the Compliance list screen so the
// compliance table and the Compliance Report request dropdown can never
// disagree about who the supplier's trading partners are or how many extra
// attributes each one requires.
//
// resolveAccountFilterAttributes answers "what does retailer R require for
// this GS1 category" from the supplier's seat. Dillard's is the live persona
// on the other side of the prototype, so its filter resolves through the real
// attribute-profile store; every other retailer gets a deterministic mock
// filter: the GS1 standard set plus `extras` retailer-specific attributes
// drawn from a fixed pool, so each retailer's filter differs but never
// changes between runs.

import { getBrickByCode } from "@/lib/gs1-standard-library"
import { assembleBrickAttributes } from "@/lib/mcp/attribute-assembly"

export type Partner = {
  id: string
  name: string
  /** Retailer-specific attributes required on top of the GS1 baseline */
  extras: number
}

export const PARTNERS: Partner[] = [
  { id: "dillards", name: "Dillard's", extras: 3 },
  { id: "belk", name: "Belk", extras: 1 },
  { id: "nordstrom", name: "Nordstrom", extras: 5 },
  { id: "macys", name: "Macy's", extras: 2 },
  { id: "saks", name: "Saks Fifth Avenue", extras: 6 },
  { id: "bloomingdales", name: "Bloomingdale's", extras: 4 },
]

// Plausible retailer-extra attribute names. Several deliberately reuse the
// vocabulary of VENDOR_EXCEPTIONS so the two mock datasets sound like one
// product rather than two invented lists.
const MOCK_EXTRA_ATTRIBUTE_POOL = [
  "Country of Origin",
  "Care Instructions",
  "Sustainable Materials Y/N",
  "Chemical Certifications",
  "Season Code",
  "Vendor Style Number",
  "MAP Price Y/N",
  "Compression Level",
] as const

/**
 * The retailer-specific extras retailer R layers on top of the GS1 standard
 * set. Dillard's resolves live from the attribute-profile store (custom
 * extended attributes authored on the retailer side show up here), topped up
 * from the mock pool to its advertised `extras` count; other retailers draw
 * `extras` names from the pool at a stable per-retailer offset.
 */
export function getPartnerExtraAttributes(retailer: string, brickCode: string): string[] {
  const partner = PARTNERS.find((p) => p.name === retailer)
  if (!partner) return []

  const pool = MOCK_EXTRA_ATTRIBUTE_POOL
  const offset = PARTNERS.indexOf(partner)
  const fromPool = (count: number, skip: Set<string> = new Set()) => {
    const names: string[] = []
    for (let i = 0; names.length < count && i < pool.length; i++) {
      const name = pool[(offset + i) % pool.length]
      if (!skip.has(name) && !names.includes(name)) names.push(name)
    }
    return names
  }

  if (partner.name === "Dillard's") {
    const live = assembleBrickAttributes(brickCode)
      .extendedAttributes.filter((a) => a.source === "custom")
      .map((a) => a.name)
    const topUp = Math.max(0, partner.extras - live.length)
    return [...live, ...fromPool(topUp, new Set(live))]
  }
  return fromPool(partner.extras)
}

/**
 * The attribute names retailer R requires for a brick, in the order a
 * Compliance Report allocates gaps to them: the retailer's extras first
 * (the fields suppliers most commonly miss — and the whole reason to run a
 * per-retailer scan), then the GS1 standard extended set. Gap COUNTS always
 * agree with the compliance screens; this ordering only decides which
 * attribute NAMES a given gap count surfaces.
 */
export function resolveAccountFilterAttributes(
  retailer: string,
  brickCode: string
): { name: string; code?: string }[] {
  const extras = getPartnerExtraAttributes(retailer, brickCode).map((name) => ({ name }))
  const standard = (getBrickByCode(brickCode)?.extendedAttributes ?? []).map((a) => ({
    name: a.name,
    code: a.code,
  }))
  return [...extras, ...standard]
}
