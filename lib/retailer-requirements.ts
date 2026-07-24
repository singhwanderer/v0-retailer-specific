// Retailer-side requirement mock data.
//
// Extracted from the Screen 1 (Attribute Profiles) and Screen 3 (Vendor
// Exceptions) components so the portal UI and the demo MCP server read the
// same rows instead of each keeping a private copy.

import { GENERATED_SUPPLIERS } from "./generated-suppliers.ts"

export type ProfileStatus = "Active" | "Draft"

/** One GS1 brick mapped to a requirement profile. */
export interface ProfileBrick {
  code: string
  name: string
}

export interface AttributeProfile {
  name: string
  category: string
  attributes: string
  status: ProfileStatus
  lastUpdated: string
  actions: readonly string[]
  isLink: boolean
  /** Primary GS1 brick (kept for existing single-brick readers) */
  brickCode: string
  brickName: string
  /**
   * All GS1 bricks mapped to this requirement. A requirement can span several
   * bricks within one category (segment). Optional: when absent, the profile
   * maps to just the primary `brickCode`/`brickName` — use `getProfileBricks`
   * to read the effective list.
   */
  bricks?: ProfileBrick[]
}

/**
 * The effective GS1 bricks for a profile: its explicit `bricks` list when set,
 * otherwise the single primary brick. Empty when the profile has no mapping.
 */
export function getProfileBricks(
  profile: Pick<AttributeProfile, "bricks" | "brickCode" | "brickName">
): ProfileBrick[] {
  if (profile.bricks && profile.bricks.length > 0) return profile.bricks
  return profile.brickCode ? [{ code: profile.brickCode, name: profile.brickName }] : []
}

export const ATTRIBUTE_PROFILES: AttributeProfile[] = [
  {
    name: "Footwear",
    category: "Footwear",
    attributes: "30 attributes · 1 image requirement",
    status: "Active",
    lastUpdated: "Mar 8, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001077",
    brickName: "Shoes - General Purpose",
  },
  {
    name: "Apparel",
    category: "Women's Apparel",
    attributes: "59 attributes · 2 GS1 categories",
    status: "Active",
    lastUpdated: "Feb 14, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001352",
    brickName: "Shirts/Blouses/Polo Shirts/T-Shirts",
    bricks: [
      { code: "10001352", name: "Shirts/Blouses/Polo Shirts/T-Shirts" },
      { code: "10001351", name: "Sweaters/Pullovers" },
    ],
  },
  {
    name: "Outerwear",
    category: "Women's Apparel",
    attributes: "36 attributes",
    status: "Active",
    lastUpdated: "Feb 26, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001350",
    brickName: "Jackets/Blazers/Cardigans/Waistcoats",
  },
  {
    name: "Dresses",
    category: "Women's Apparel",
    attributes: "34 attributes",
    status: "Active",
    lastUpdated: "Mar 15, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001333",
    brickName: "Dresses",
  },
  {
    name: "Skirts",
    category: "Women's Apparel",
    attributes: "32 attributes",
    status: "Active",
    lastUpdated: "Mar 12, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001334",
    brickName: "Skirts",
  },
  {
    name: "Trousers & Shorts",
    category: "Women's Apparel",
    attributes: "34 attributes",
    status: "Draft",
    lastUpdated: "Mar 14, 2026",
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: "10001335",
    brickName: "Trousers/Shorts",
  },
  {
    name: "Belts",
    category: "Accessories",
    attributes: "29 attributes",
    status: "Active",
    lastUpdated: "Mar 7, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001326",
    brickName: "Belts/Braces/Cummerbunds",
  },
]

// ── Retailer's own suppliers (for MCP compliance queries) ─────────────────────
// Supplier names reused from VENDOR_EXCEPTIONS below, each mapped to the
// Dillard's category (ATTRIBUTE_PROFILES) their exception "profile" field
// already implies, so supplier <-> category pairing stays internally
// consistent rather than invented fresh. Category-level compliance counts —
// this is what "which of my suppliers are behind, and on what" can answer.
export interface SupplierComplianceRow {
  supplier: string
  brickCode: string
  category: string
  productsTotal: number
  productsWithGaps: number
  openGaps: number
  productsComplete: number
}

// This is intentionally DENSE and easy to confuse — it is the raw material for
// the golden-set eval (see lib/copilot/run-eval.ts). None of it is corrupt; the
// challenge is realism, not garbage data:
//   • Near-duplicate supplier names ("Calvin Klein" vs "Calvin Klein
//     Performance"; "Ralph Lauren" vs "Lauren Ralph Lauren") — tests whether
//     the agent resolves the RIGHT vendor instead of collapsing partial
//     matches.
//   • Suppliers trading in MULTIPLE categories with different standing in each
//     (Calvin Klein spans Footwear, Shirts and Dresses; Ralph Lauren spans
//     Sweaters and Outerwear; Levi Strauss spans Shirts and Sweaters) — tests
//     whether the agent scopes an answer to the asked-about category rather
//     than summing everything under one name.
//   • A wide range of gap counts across a larger vendor base — tests precise
//     "who is worst / by how much" ranking rather than a vague answer.
export const HAND_CURATED_SUPPLIERS: SupplierComplianceRow[] = [
  // Footwear
  { supplier: "J.Renée", brickCode: "10001077", category: "Footwear", productsTotal: 14, productsWithGaps: 5, openGaps: 11, productsComplete: 9 },
  { supplier: "Nike Golf", brickCode: "10001077", category: "Footwear", productsTotal: 19, productsWithGaps: 6, openGaps: 13, productsComplete: 13 },
  { supplier: "Calvin Klein", brickCode: "10001077", category: "Footwear", productsTotal: 12, productsWithGaps: 2, openGaps: 4, productsComplete: 10 },

  // Shirts / tops (two very similar Calvin Klein rows across categories)
  { supplier: "Levi Strauss & Co.", brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts", productsTotal: 22, productsWithGaps: 8, openGaps: 17, productsComplete: 14 },
  { supplier: "Calvin Klein", brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts", productsTotal: 16, productsWithGaps: 6, openGaps: 14, productsComplete: 10 },
  { supplier: "Calvin Klein Performance", brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts", productsTotal: 8, productsWithGaps: 1, openGaps: 2, productsComplete: 7 },
  { supplier: "Tommy Hilfiger", brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts", productsTotal: 15, productsWithGaps: 3, openGaps: 5, productsComplete: 12 },

  // Sweaters/pullovers (same Levi entity, different category)
  { supplier: "Levi Strauss & Co.", brickCode: "10001351", category: "Sweaters/Pullovers", productsTotal: 10, productsWithGaps: 2, openGaps: 4, productsComplete: 8 },
  { supplier: "Ralph Lauren", brickCode: "10001351", category: "Sweaters/Pullovers", productsTotal: 14, productsWithGaps: 5, openGaps: 9, productsComplete: 9 },

  // Belts
  { supplier: "Michael Kors", brickCode: "10001326", category: "Belts/Braces/Cummerbunds", productsTotal: 5, productsWithGaps: 0, openGaps: 0, productsComplete: 5 },

  // Outerwear (Ralph Lauren vs Lauren Ralph Lauren)
  { supplier: "Ralph Lauren", brickCode: "10001350", category: "Jackets/Blazers/Cardigans/Waistcoats", productsTotal: 13, productsWithGaps: 7, openGaps: 15, productsComplete: 6 },
  { supplier: "Lauren Ralph Lauren", brickCode: "10001350", category: "Jackets/Blazers/Cardigans/Waistcoats", productsTotal: 9, productsWithGaps: 2, openGaps: 3, productsComplete: 7 },

  // Dresses
  { supplier: "Calvin Klein", brickCode: "10001333", category: "Dresses", productsTotal: 10, productsWithGaps: 4, openGaps: 8, productsComplete: 6 },
]

// ~1000 additional, distinct, newly-generated suppliers — see
// scripts/generate-suppliers.ts. This scale mirrors a real retailer (a big
// chain like Dillard's genuinely has ~1000 suppliers, ~100-200 per
// category), and exists specifically so `list_my_suppliers` (deliberately
// left uncapped — see lib/copilot/tools.ts and lib/mcp/tools.ts) gives the
// TGC Compliance Agent a genuinely large tool-output surface to test its
// accuracy against, rather than the ~14-row set above being all it ever
// has to summarize.
export const RETAILER_SUPPLIERS: SupplierComplianceRow[] = [
  ...HAND_CURATED_SUPPLIERS,
  ...GENERATED_SUPPLIERS,
]

export type ExceptionType = "Attribute Waiver" | "Extended Deadline" | "Reduced Scope"
export type ExceptionStatus = "Active" | "Expired"

export interface ExceptionRow {
  vendor: string
  profile: string
  exceptionType: ExceptionType
  attributes: string[]
  validUntil: string
  status: ExceptionStatus
  actions: string[]
}

export const VENDOR_EXCEPTIONS: ExceptionRow[] = [
  {
    vendor: "J.Renée",
    profile: "Footwear — Core Compliance",
    exceptionType: "Attribute Waiver",
    attributes: ["Heel Height", "Platform Height"],
    validUntil: "Jun 30, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Levi Strauss & Co.",
    profile: "Apparel — Extended Sustainability",
    exceptionType: "Extended Deadline",
    attributes: ["Sustainable Materials Y/N", "Sustainable Materials Desc"],
    validUntil: "Apr 15, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Fossil Group",
    profile: "Jewellery — Base Requirements",
    exceptionType: "Attribute Waiver",
    attributes: ["CPSIA Certified Y/N"],
    validUntil: "Dec 31, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Calvin Klein",
    profile: "Apparel — Extended Sustainability",
    exceptionType: "Extended Deadline",
    attributes: ["Chemical Certifications", "Social Certifications"],
    validUntil: "Mar 1, 2026",
    status: "Expired",
    actions: ["Renew", "Archive"],
  },
  {
    vendor: "York and Jones",
    profile: "Jewellery — Base Requirements",
    exceptionType: "Reduced Scope",
    attributes: ["Gold Karat", "Stone Details", "Stone"],
    validUntil: "Permanent",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Michael Kors",
    profile: "Handbags — Base Requirements",
    exceptionType: "Attribute Waiver",
    attributes: ["Lining Material", "Strap Type"],
    validUntil: "Aug 31, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Nike",
    profile: "Activewear — Performance",
    exceptionType: "Extended Deadline",
    attributes: ["Compression Level"],
    validUntil: "May 15, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Ralph Lauren",
    profile: "Outerwear — Core Compliance",
    exceptionType: "Reduced Scope",
    attributes: ["Fill Power", "Fur Treatment"],
    validUntil: "Feb 1, 2026",
    status: "Expired",
    actions: ["Renew", "Archive"],
  },
]
