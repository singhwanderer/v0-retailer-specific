// Retailer-side requirement mock data.
//
// Extracted from the Screen 1 (Attribute Profiles) and Screen 3 (Vendor
// Exceptions) components so the portal UI and the demo MCP server read the
// same rows instead of each keeping a private copy.

export type ProfileStatus = "Active" | "Draft"

export interface AttributeProfile {
  name: string
  category: string
  attributes: string
  status: ProfileStatus
  lastUpdated: string
  actions: readonly string[]
  isLink: boolean
  brickCode: string
  brickName: string
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
    attributes: "51 attributes",
    status: "Active",
    lastUpdated: "Feb 14, 2026",
    actions: ["Edit", "Deactivate"],
    isLink: true,
    brickCode: "10001352",
    brickName: "Shirts/Blouses/Polo Shirts/T-Shirts",
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
