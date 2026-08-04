// Catalogue-wide gap aggregation (supplier side).
//
// Every existing supplier screen looks at gaps through ONE compliance target at
// a time: the GS1 baseline, or one retailer, reached via that retailer's
// selection codes. That answers "am I ready for Dillard's" but never "what
// across my whole catalogue needs work", which is the question that precedes
// any enrichment run.
//
// This module answers it by unioning lib/supplier-catalogue's per-target gap
// records across every target that assesses a product, producing one row per
// product regardless of how many selection codes it appears under.
//
// Why the union is the right arithmetic: a retailer's gap allocation is a
// head-slice of the same brick attribute pool the GS1 baseline draws from (see
// allocateGaps in lib/supplier-catalogue.ts), and a filled attribute is a
// product-level fact that satisfies every target at once (see fillAttribute).
// So the union of the per-target missing sets is a strict superset of each one
// — clear the union and every target is clear. That is the "fill a gap once,
// satisfy every retailer" claim, computed rather than asserted.
//
// Nothing here is a new source of truth: every number routes back through
// getGapRecords / getGapCount, so this screen can never disagree with the
// per-target drill-down.

import { getBrickByCode } from "@/lib/gs1-standard-library"
import {
  getCategory,
  getGapCount,
  getGapRecords,
  type GapTarget,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"

/** Display label for the GS1 baseline target, matching the Compliance list. */
export const GS1_TARGET_LABEL = "GS1 Standard"

export type UnionGap = {
  kind: "attribute" | "image"
  name: string
  /** Image requirements only — the spec text shown beside the name. */
  spec?: string
  /**
   * Target labels that still require this. Non-empty for every open gap; empty
   * only for an entry that every interested target has waived.
   */
  requiredBy: string[]
  /** Target labels that have waived this requirement for us. */
  waivedBy: string[]
}

export type AffectedTarget = {
  label: string
  target: GapTarget
  /** Open gaps for this product against this target alone. */
  count: number
}

export type ProductGapRow = {
  product: SupplierProduct
  /** No GS1 brick assigned — the product cannot be assessed against anything. */
  categoryMissing: boolean
  /** GS1 segment, or null when uncategorised. */
  category: string | null
  /** GS1 brick name, or null when uncategorised. */
  brickLabel: string | null
  /** Union of open gaps across every target. Always empty when categoryMissing. */
  gaps: UnionGap[]
  attributeGapCount: number
  imageGapCount: number
  /** attributeGapCount + imageGapCount — distinct requirements, not a per-target sum. */
  openGapCount: number
  /** Requirements every interested target has waived — shown, but not counted. */
  waivedOnly: UnionGap[]
  /** Targets with at least one open gap, worst first. */
  affectedTargets: AffectedTarget[]
  needsEnrichment: boolean
}

export type CatalogueGaps = {
  /** Only products needing enrichment: uncategorised first, then most gaps first. */
  rows: ProductGapRow[]
  totalProducts: number
  uncategorisedCount: number
  /** Categorised products carrying at least one open attribute or image gap. */
  productsWithGaps: number
  /** Sum of distinct open gaps across every row. */
  totalOpenGaps: number
  /** The attribute names blocking the most products, worst first. */
  topMissingAttributes: { name: string; products: number }[]
}

/**
 * Every compliance target that assesses this product: the GS1 baseline, plus
 * each retailer publishing requirements against it. Retailers come from the
 * product's own status list rather than the global partner list, because a
 * partner that publishes nothing against a product does not assess it — the
 * same rule getTargetCompletion applies to its denominator.
 */
function targetsFor(product: SupplierProduct): { label: string; target: GapTarget }[] {
  const targets: { label: string; target: GapTarget }[] = [
    { label: GS1_TARGET_LABEL, target: { kind: "gs1" } },
  ]
  for (const rs of product.retailers ?? []) {
    targets.push({ label: rs.retailer, target: { kind: "retailer", name: rs.retailer } })
  }
  return targets
}

/** One product's gaps, unioned across every target that assesses it. */
export function getProductGapRow(product: SupplierProduct): ProductGapRow {
  const categoryMissing = product.state !== "categorised" || !product.brickCode
  const brick = product.brickCode ? getBrickByCode(product.brickCode) : undefined

  if (categoryMissing) {
    // Uncategorised products carry no attribute gaps to speak of — no brick
    // means no requirement set. Categorisation IS the gap.
    return {
      product,
      categoryMissing: true,
      category: null,
      brickLabel: null,
      gaps: [],
      attributeGapCount: 0,
      imageGapCount: 0,
      openGapCount: 0,
      waivedOnly: [],
      affectedTargets: [],
      needsEnrichment: true,
    }
  }

  // name → union entry, insertion-ordered so attributes keep the brick pool's
  // order and images follow whatever order the requirement pool defines.
  const byName = new Map<string, UnionGap>()
  const affectedTargets: AffectedTarget[] = []

  for (const { label, target } of targetsFor(product)) {
    const { missingAttrs, missingImages, waivedAttrs } = getGapRecords(product, target)

    for (const attr of missingAttrs) {
      const entry =
        byName.get(attr.name) ??
        { kind: "attribute" as const, name: attr.name, requiredBy: [], waivedBy: [] }
      entry.requiredBy.push(label)
      byName.set(attr.name, entry)
    }

    for (const img of missingImages) {
      const entry =
        byName.get(img.name) ??
        { kind: "image" as const, name: img.name, spec: img.spec, requiredBy: [], waivedBy: [] }
      entry.requiredBy.push(label)
      byName.set(img.name, entry)
    }

    // A waiver is per-retailer. An attribute Dillard's has waived is still open
    // if the GS1 baseline (or another retailer) requires it, so waivedBy is
    // recorded alongside requiredBy rather than instead of it.
    for (const attr of waivedAttrs) {
      const entry =
        byName.get(attr.name) ??
        { kind: "attribute" as const, name: attr.name, requiredBy: [], waivedBy: [] }
      entry.waivedBy.push(label)
      byName.set(attr.name, entry)
    }

    const count = getGapCount(product, target)
    if (count > 0) affectedTargets.push({ label, target, count })
  }

  const all = [...byName.values()]
  const gaps = all.filter((g) => g.requiredBy.length > 0)
  const waivedOnly = all.filter((g) => g.requiredBy.length === 0)

  const attributeGapCount = gaps.filter((g) => g.kind === "attribute").length
  const imageGapCount = gaps.filter((g) => g.kind === "image").length

  affectedTargets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return {
    product,
    categoryMissing: false,
    category: getCategory(product),
    brickLabel: brick?.brickName ?? null,
    gaps,
    attributeGapCount,
    imageGapCount,
    openGapCount: attributeGapCount + imageGapCount,
    waivedOnly,
    affectedTargets,
    needsEnrichment: attributeGapCount + imageGapCount > 0,
  }
}

/**
 * Catalogue-wide roll-up: the rows that need enrichment plus the headline
 * figures the Compliance entry card and the summary tiles read from.
 */
export function getCatalogueGaps(products: SupplierProduct[]): CatalogueGaps {
  const rows = products
    .map(getProductGapRow)
    .filter((r) => r.needsEnrichment)
    // Uncategorised first — nothing else can be assessed until they're fixed —
    // then the products with the most outstanding requirements.
    .sort((a, b) => {
      if (a.categoryMissing !== b.categoryMissing) return a.categoryMissing ? -1 : 1
      return b.openGapCount - a.openGapCount || a.product.id.localeCompare(b.product.id)
    })

  const attrFrequency = new Map<string, number>()
  for (const row of rows) {
    for (const gap of row.gaps) {
      if (gap.kind !== "attribute") continue
      attrFrequency.set(gap.name, (attrFrequency.get(gap.name) ?? 0) + 1)
    }
  }

  const topMissingAttributes = [...attrFrequency.entries()]
    .map(([name, count]) => ({ name, products: count }))
    .sort((a, b) => b.products - a.products || a.name.localeCompare(b.name))
    .slice(0, 8)

  return {
    rows,
    totalProducts: products.length,
    uncategorisedCount: rows.filter((r) => r.categoryMissing).length,
    productsWithGaps: rows.filter((r) => !r.categoryMissing).length,
    totalOpenGaps: rows.reduce((sum, r) => sum + r.openGapCount, 0),
    topMissingAttributes,
  }
}
