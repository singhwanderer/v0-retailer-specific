// Supplier-side requirement view for the Compliance screen.
//
// Turns a compliance target (GS1 baseline or a retailer) into the requirement
// MATRIX the supplier needs to see: one entry per category the target requires,
// each carrying the full ordered attribute list (retailer extras first, then the
// GS1 standard set) plus the supplier's readiness for that category. This is the
// data behind the "View requirements" drawer — Level 1 is the per-category
// summary, Level 2 the attribute checklist.
//
// Requirements are category-based, so they are knowable even for a retailer the
// supplier does not yet supply: the attribute list comes from the GS1 library +
// the retailer's published extras, independent of whether any product exists.

import { GS1_BRICKS, getBrickByCode } from "@/lib/gs1-standard-library"
import {
  resolveAccountFilterAttributes,
  getPartnerExtraAttributes,
} from "@/lib/partner-filters"
import {
  getCategory,
  getGapCount,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"

export type RequirementTarget = { kind: "gs1" } | { kind: "retailer"; name: string }

/** One required attribute, tagged by where the requirement originates. */
export type RequirementAttribute = {
  name: string
  code?: string
  /** "extra" = retailer-specific requirement on top of GS1; "gs1" = baseline */
  origin: "gs1" | "extra"
}

/** Level-2 payload: the full attribute checklist for one category. */
export type CategoryRequirement = {
  /** GS1 segment — the category label shown in the UI */
  category: string
  /** Representative GS1 brick used to resolve the attribute list for the category */
  brickCode: string
  brickName: string
  attributes: RequirementAttribute[]
  gs1Count: number
  extraCount: number
  /** How many of this category's products the supplier has supplied to the target */
  suppliedProducts: number
  /** How many of those are complete (0 open gaps) for the target */
  completeProducts: number
  /** readiness % across supplied products; null when nothing supplied yet */
  readiness: number | null
}

export type RequirementMatrix = {
  targetLabel: string
  isGs1: boolean
  /** retailer extras count across the whole account (0 for GS1) */
  extraTotal: number
  categories: CategoryRequirement[]
  /** true when the retailer publishes no extras of its own (GS1-only) */
  hasOwnRequirements: boolean
}

/**
 * The representative brick for a category (segment): the first brick in the GS1
 * library for that segment. Requirements are resolved against this brick so a
 * category maps to a single concrete attribute list.
 */
function representativeBrickForSegment(segment: string) {
  return GS1_BRICKS.find((b) => b.segment === segment)
}

/** All GS1 segments, treated as the universe of categories a target can require. */
function allSegments(): string[] {
  return [...new Set(GS1_BRICKS.map((b) => b.segment))].sort((a, b) => a.localeCompare(b))
}

/**
 * Readiness for one category against a target: counts the supplier's supplied
 * products in that category (categorised, and — for a retailer — carrying a
 * status for that retailer) and how many are complete.
 */
function categoryReadiness(
  products: SupplierProduct[],
  segment: string,
  target: RequirementTarget
): { supplied: number; complete: number } {
  let supplied = 0
  let complete = 0
  for (const p of products) {
    if (getCategory(p) !== segment) continue
    if (target.kind === "retailer") {
      const rs = p.retailers?.find((r) => r.retailer === target.name)
      if (!rs) continue
    }
    supplied += 1
    const gapTarget =
      target.kind === "gs1" ? ({ kind: "gs1" } as const) : ({ kind: "retailer", name: target.name } as const)
    if (getGapCount(p, gapTarget) === 0) complete += 1
  }
  return { supplied, complete }
}

/**
 * Build the requirement matrix for a target. Includes every category the target
 * can require (all GS1 segments), so categories the supplier does not yet supply
 * still surface as onboarding rows. Sorted worst-readiness-first, with
 * not-yet-supplied categories sinking to the bottom.
 */
export function getRequirementMatrix(
  products: SupplierProduct[],
  target: RequirementTarget
): RequirementMatrix {
  const isGs1 = target.kind === "gs1"
  const targetLabel = isGs1 ? "GS1 Standard" : target.name

  const categories: CategoryRequirement[] = []
  let extraTotal = 0

  for (const segment of allSegments()) {
    const brick = representativeBrickForSegment(segment)
    if (!brick) continue
    const brickCode = brick.brickCode

    // Full ordered attribute list for this category + target.
    let attributes: RequirementAttribute[]
    let extraCount = 0
    if (isGs1) {
      attributes = (getBrickByCode(brickCode)?.extendedAttributes ?? []).map((a) => ({
        name: a.name,
        code: a.code,
        origin: "gs1" as const,
      }))
    } else {
      const extras = getPartnerExtraAttributes(target.name, brickCode)
      const extraSet = new Set(extras)
      extraCount = extras.length
      attributes = resolveAccountFilterAttributes(target.name, brickCode).map((a) => ({
        name: a.name,
        code: a.code,
        origin: extraSet.has(a.name) ? ("extra" as const) : ("gs1" as const),
      }))
    }
    extraTotal = Math.max(extraTotal, extraCount)

    const gs1Count = attributes.filter((a) => a.origin === "gs1").length
    const { supplied, complete } = categoryReadiness(products, segment, target)
    const readiness = supplied === 0 ? null : Math.round((complete / supplied) * 100)

    categories.push({
      category: segment,
      brickCode,
      brickName: brick.brickName,
      attributes,
      gs1Count,
      extraCount,
      suppliedProducts: supplied,
      completeProducts: complete,
      readiness,
    })
  }

  // Worst-readiness-first; not-yet-supplied (null) sinks below assessed rows.
  categories.sort((a, b) => {
    if (a.readiness === null && b.readiness === null) return a.category.localeCompare(b.category)
    if (a.readiness === null) return 1
    if (b.readiness === null) return -1
    if (a.readiness !== b.readiness) return a.readiness - b.readiness
    return a.category.localeCompare(b.category)
  })

  // A retailer "has own requirements" when it publishes at least one extra.
  const hasOwnRequirements = isGs1 ? true : extraTotal > 0

  return { targetLabel, isGs1, extraTotal, categories, hasOwnRequirements }
}

// ── CSV template export ─────────────────────────────────────────────────────
// The blank fill-in template: one row per required attribute, columns the
// supplier fills. Covers either the whole target (every category) or a single
// category, reachable directly from the compliance row / drawer.

function csvCell(value: string): string {
  // Quote cells containing commas, quotes, or newlines; double embedded quotes.
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
}

/** Filename-safe slug for a label. */
function slug(label: string): string {
  return label.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()
}

export type CsvTemplate = { filename: string; content: string }

/**
 * A blank requirement template for one category. Header row + one row per
 * required attribute, with Requirement Source (GS1 / retailer) and an empty
 * Value column for the supplier to fill.
 */
export function buildCategoryTemplateCsv(
  matrix: RequirementMatrix,
  category: CategoryRequirement
): CsvTemplate {
  const header = ["Category", "GS1 Brick", "Attribute", "Attribute Code", "Requirement Source", "Value"]
  const rows: string[][] = [header]
  for (const attr of category.attributes) {
    rows.push([
      category.category,
      category.brickName,
      attr.name,
      attr.code ?? "",
      attr.origin === "extra" ? `${matrix.targetLabel} (extra)` : "GS1 Standard",
      "",
    ])
  }
  return {
    filename: `${slug(matrix.targetLabel)}-${slug(category.category)}-requirements.csv`,
    content: toCsv(rows),
  }
}

/** A blank requirement template covering every category the target requires. */
export function buildTargetTemplateCsv(matrix: RequirementMatrix): CsvTemplate {
  const header = ["Category", "GS1 Brick", "Attribute", "Attribute Code", "Requirement Source", "Value"]
  const rows: string[][] = [header]
  for (const cat of matrix.categories) {
    for (const attr of cat.attributes) {
      rows.push([
        cat.category,
        cat.brickName,
        attr.name,
        attr.code ?? "",
        attr.origin === "extra" ? `${matrix.targetLabel} (extra)` : "GS1 Standard",
        "",
      ])
    }
  }
  return {
    filename: `${slug(matrix.targetLabel)}-requirements.csv`,
    content: toCsv(rows),
  }
}
