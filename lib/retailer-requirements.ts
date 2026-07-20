// Retailer-side requirement mock data.
//
// Extracted from the Screen 1 (Attribute Profiles) and Screen 3 (Vendor
// Exceptions) components so the portal UI and the demo MCP server read the
// same rows instead of each keeping a private copy.

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
    attributes: "34 attributes · 1 image requirement",
    status: "Active",
    lastUpdated: "Mar 8, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10005811",
    brickName: "Footwear",
  },
  {
    name: "Apparel",
    category: "Women's Apparel",
    attributes: "51 attributes · 2 GS1 categories",
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
    name: "Jewellery",
    category: "Jewellery",
    attributes: "22 attributes",
    status: "Draft",
    lastUpdated: "Mar 11, 2026",
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: "10006017",
    brickName: "Necklaces/Chains/Pendants",
  },
  {
    name: "Handbags",
    category: "Accessories",
    attributes: "28 attributes · 1 image requirement",
    status: "Active",
    lastUpdated: "Mar 2, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10006030",
    brickName: "Handbags/Purses",
  },
  {
    name: "Activewear",
    category: "Sportswear",
    attributes: "37 attributes",
    status: "Active",
    lastUpdated: "Mar 9, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001400",
    brickName: "Sports/Performance Tops",
  },
  {
    name: "Outerwear",
    category: "Women's Apparel",
    attributes: "44 attributes",
    status: "Active",
    lastUpdated: "Feb 26, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001350",
    brickName: "Jackets/Blazers/Cardigans/Waistcoats",
  },
  {
    name: "Sleepwear",
    category: "Homewear",
    attributes: "19 attributes",
    status: "Draft",
    lastUpdated: "Mar 13, 2026",
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: "10002100",
    brickName: "Nightwear/Pyjamas",
  },
  {
    name: "Dresses",
    category: "Women's Apparel",
    attributes: "13 attributes",
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
    attributes: "11 attributes",
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
    attributes: "12 attributes",
    status: "Draft",
    lastUpdated: "Mar 14, 2026",
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: "10001335",
    brickName: "Trousers/Shorts",
  },
  {
    name: "Rings",
    category: "Jewellery",
    attributes: "10 attributes",
    status: "Draft",
    lastUpdated: "Mar 10, 2026",
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: "10006018",
    brickName: "Rings",
  },
  {
    name: "Belts",
    category: "Accessories",
    attributes: "9 attributes",
    status: "Active",
    lastUpdated: "Mar 7, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10006031",
    brickName: "Belts",
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

export const RETAILER_SUPPLIERS: SupplierComplianceRow[] = [
  { supplier: "J.Renée", brickCode: "10005811", category: "Footwear", productsTotal: 14, productsWithGaps: 5, openGaps: 11, productsComplete: 9 },
  { supplier: "Levi Strauss & Co.", brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts", productsTotal: 22, productsWithGaps: 8, openGaps: 17, productsComplete: 14 },
  { supplier: "Fossil Group", brickCode: "10006017", category: "Necklaces/Chains/Pendants", productsTotal: 9, productsWithGaps: 2, openGaps: 3, productsComplete: 7 },
  { supplier: "Calvin Klein", brickCode: "10001352", category: "Shirts/Blouses/Polo Shirts/T-Shirts", productsTotal: 16, productsWithGaps: 6, openGaps: 14, productsComplete: 10 },
  { supplier: "York and Jones", brickCode: "10006017", category: "Necklaces/Chains/Pendants", productsTotal: 7, productsWithGaps: 1, openGaps: 1, productsComplete: 6 },
  { supplier: "Michael Kors", brickCode: "10006030", category: "Handbags/Purses", productsTotal: 11, productsWithGaps: 3, openGaps: 5, productsComplete: 8 },
  { supplier: "Nike", brickCode: "10001400", category: "Sports/Performance Tops", productsTotal: 18, productsWithGaps: 4, openGaps: 6, productsComplete: 14 },
  { supplier: "Ralph Lauren", brickCode: "10001350", category: "Jackets/Blazers/Cardigans/Waistcoats", productsTotal: 13, productsWithGaps: 7, openGaps: 15, productsComplete: 6 },
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
