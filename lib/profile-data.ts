// Shared profile data model for retailer Attribute & Image Requirements.
//
// This module is the single source of truth for the shape of a category
// profile (core attributes, extended attributes, image requirements) and the
// seed data used to build one. Screen 1 (the list) and Screen 2 (the detail
// editor) both read counts from the SAME profile objects that live in page
// state, so the attribute/image counts shown on the list ALWAYS match what is
// inside the profile — and they move up and down live as the user adds or
// removes requirements inside Screen 2.

import { getBrickByCode } from "@/lib/gs1-standard-library"

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AttributeRow {
  retailerName: string
  tgcGs1Name: string
  guidance: string
  /** Whether this attribute was inherited from the GS1 standard brick or added by the retailer */
  source: "standard" | "custom"
}

export interface ImageRequirementRow {
  requirementName: string
  format: string
  background: string
  minDimensions: string
  maxFileSize: string
  shapeCrop: string
  guidanceNote: string
}

export interface ProfileData {
  coreRows: AttributeRow[]
  extendedRows: AttributeRow[]
  imageRows: ImageRequirementRow[]
}

// ── Seeded data ───────────────────────────────────────────────────────────────
// Core attributes are common across all apparel/footwear/jewellery categories in
// this prototype, so every profile starts from the same 6 core rows.
export const initialCoreRows: AttributeRow[] = [
  { retailerName: "GTIN code", tgcGs1Name: "GTIN code", guidance: "", source: "standard" },
  { retailerName: "GTIN Description", tgcGs1Name: "GTIN Description", guidance: "Max 35 characters. Plain language product name.", source: "standard" },
  { retailerName: "NRF Color Code", tgcGs1Name: "NRF Color Code", guidance: "Must match NRF standard code table. See NRF guide.", source: "standard" },
  { retailerName: "NRF Size Code", tgcGs1Name: "NRF Size Code", guidance: "Primary and secondary codes both required.", source: "standard" },
  { retailerName: "Color Description", tgcGs1Name: "Color Description", guidance: "Max 10 characters. All caps.", source: "custom" },
  { retailerName: "Size Description", tgcGs1Name: "Size Description", guidance: "", source: "custom" },
]

// Fallback extended rows, used only when a profile has no GS1 brick mapping.
export const initialExtendedRows: AttributeRow[] = [
  { retailerName: "Heel Type", tgcGs1Name: "Heel Type (GM03HLTY)", guidance: "", source: "standard" },
  { retailerName: "Toe Shape", tgcGs1Name: "Toe Shape (GM03TOES)", guidance: "", source: "standard" },
  { retailerName: "Outsole Type", tgcGs1Name: "Outsole Type (GM03OUTS)", guidance: "", source: "standard" },
  { retailerName: "Lining Material", tgcGs1Name: "Lining Material (GM03LIMT)", guidance: "", source: "standard" },
  { retailerName: "Closure", tgcGs1Name: "Closure (GM03CLOS)", guidance: "", source: "standard" },
]

export const initialImageRows: ImageRequirementRow[] = [
  {
    requirementName: "Hero Shot",
    format: "JPEG",
    background: "Pure white (#FFFFFF)",
    minDimensions: "2000 × 2000 px",
    maxFileSize: "10 MB",
    shapeCrop: "Square, product centered",
    guidanceNote: "No mannequin, no props.",
  },
]

/**
 * Build the extended-attribute rows for a GS1 brick from its standard
 * attribute list. Falls back to the generic seed when the brick is unknown.
 */
export function buildExtendedRowsForBrick(brickCode: string | null | undefined): AttributeRow[] {
  const brick = brickCode ? getBrickByCode(brickCode) : undefined
  if (!brick) return initialExtendedRows.map((r) => ({ ...r }))
  return brick.extendedAttributes.map((attr) => ({
    retailerName: attr.name,
    tgcGs1Name: `${attr.name} (${attr.code})`,
    guidance: "",
    source: "standard" as const,
  }))
}

/**
 * Build a full profile (core + extended + image rows) for a given GS1 brick.
 * This is what seeds Screen 1's per-category counts AND Screen 2's editor, so
 * both always agree.
 */
export function buildProfileForBrick(brickCode: string | null | undefined): ProfileData {
  return {
    coreRows: initialCoreRows.map((r) => ({ ...r })),
    extendedRows: buildExtendedRowsForBrick(brickCode),
    imageRows: initialImageRows.map((r) => ({ ...r })),
  }
}

/** Total attribute count (core + extended) for a profile. */
export function countAttributes(profile: ProfileData): number {
  return profile.coreRows.length + profile.extendedRows.length
}

/** Image requirement count for a profile. */
export function countImages(profile: ProfileData): number {
  return profile.imageRows.length
}
