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
]
