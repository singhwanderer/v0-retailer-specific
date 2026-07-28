// Shared supplier product store (mock).
//
// One source of truth for the supplier's catalogue so every screen —
// Catalogue, Compliance Status, and the GS1/retailer product leaf — reads and
// writes the same products. Assigning a category in the Catalogue therefore
// updates the compliance counts and product lists everywhere, instead of each
// screen keeping its own copy that can drift out of agreement.

import { getAllowedValues } from "@/lib/gs1-attribute-values"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import { isAttributeWaived, waivedAttributeNames } from "@/lib/mcp/store"

export type RetailerStatus = {
  retailer: string
  gaps: number | "complete"
}

export type SupplierProduct = {
  id: string
  description: string
  /** "categorised" once a GS1 brick is assigned; "uncategorised" until then */
  state: "categorised" | "uncategorised"
  /** GS1 category brick — drives the category label and GS1 assessment */
  brickCode?: string
  /** GS1 baseline gaps for this product (meaningful only when categorised) */
  gs1Gaps?: number
  /** How the category was set — manual picker vs. (future) enrichment flow */
  source?: "manual"
  /** Discontinued line — Compliance Reports can exclude these on request */
  discontinued?: boolean
  /** Per-retailer compliance (static mock — gap-filling is not simulated) */
  retailers?: RetailerStatus[]
  /**
   * Attribute values the supplier has filled in from the gap-detail screen,
   * keyed by GS1 attribute NAME → chosen value. A filled attribute is a
   * product-level fact: it satisfies that attribute for every target (GS1
   * baseline and every retailer), mirroring the "you keep one product" model.
   *
   * Keyed by code until those codes turned out to be fabricated and, worse,
   * shared: Closure Type and Collar Type carried the same one, so filling
   * either marked both done. Names are unique across the GS1 library.
   */
  filledAttributes?: Record<string, string>
}

export const SUPPLIER_PRODUCTS_SEED: SupplierProduct[] = [
  {
    id: "1TESTPROD1",
    description: "Floral Wrap Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 2,
    retailers: [
      { retailer: "Dillard's", gaps: 3 },
      { retailer: "Belk", gaps: "complete" },
    ],
  },
  {
    id: "B11442",
    description: "Linen Shift Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 3,
    retailers: [{ retailer: "Dillard's", gaps: 5 }],
  },
  {
    id: "B11443",
    description: "Printed Midi Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 0,
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
  },
  {
    id: "B11444",
    description: "Velvet Evening Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Dillard's", gaps: 2 },
      { retailer: "Belk", gaps: 1 },
    ],
  },
  {
    id: "B11445",
    description: "Jersey Wrap Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 0,
    discontinued: true,
    retailers: [{ retailer: "Belk", gaps: "complete" }],
  },
  { id: "B11446", description: "Denim Shirtdress", state: "uncategorised" },
  { id: "B11447", description: "Pleated Chiffon Gown", state: "uncategorised" },
  {
    id: "B11448",
    description: "Satin Slip Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 0,
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
  },
  { id: "B11449", description: "Broderie Anglaise Dress", state: "uncategorised" },
  {
    id: "B11450",
    description: "Tiered Maxi Dress",
    state: "categorised",
    brickCode: "10001077",
    gs1Gaps: 0,
    retailers: [{ retailer: "Dillard's", gaps: 1 }],
  },
  { id: "B11451", description: "Cotton Sundress", state: "uncategorised" },
  {
    id: "B11452",
    description: "Crepe Sheath Dress",
    state: "categorised",
    brickCode: "10001077",
    gs1Gaps: 0,
    retailers: [{ retailer: "Belk", gaps: "complete" }],
  },
  {
    id: "B11453",
    description: "Silk Maxi Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 0,
    retailers: [{ retailer: "Belk", gaps: "complete" }],
  },
  {
    id: "B11460",
    description: "Leather Ankle Boot",
    state: "categorised",
    brickCode: "10001077",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Macy's", gaps: 2 },
      { retailer: "Dillard's", gaps: "complete" },
    ],
  },
  {
    id: "B11461",
    description: "Structured Leather Tote",
    state: "categorised",
    brickCode: "10006030",
    gs1Gaps: 2,
    retailers: [
      { retailer: "Macy's", gaps: 4 },
      { retailer: "Nordstrom", gaps: "complete" },
    ],
  },
  {
    id: "B11462",
    description: "Quilted Crossbody Bag",
    state: "categorised",
    brickCode: "10006030",
    gs1Gaps: 0,
    retailers: [{ retailer: "Nordstrom", gaps: 1 }],
  },
  {
    id: "B11463",
    description: "Performance Running Tee",
    state: "categorised",
    brickCode: "10001400",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Macy's", gaps: 2 },
      { retailer: "Dillard's", gaps: 3 },
    ],
  },
  {
    id: "B11464",
    description: "Compression Training Tights",
    state: "categorised",
    brickCode: "10001401",
    gs1Gaps: 0,
    discontinued: true,
    retailers: [{ retailer: "Macy's", gaps: "complete" }],
  },
  {
    id: "B11465",
    description: "Wool Tailored Blazer",
    state: "categorised",
    brickCode: "10001350",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Nordstrom", gaps: 3 },
      { retailer: "Dillard's", gaps: "complete" },
    ],
  },
  {
    id: "B11466",
    description: "Cotton Pyjama Set",
    state: "categorised",
    brickCode: "10002100",
    gs1Gaps: 0,
    retailers: [{ retailer: "Nordstrom", gaps: 1 }],
  },
  {
    id: "B11467",
    description: "Gold Chain Necklace",
    state: "categorised",
    brickCode: "10006017",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Belk", gaps: 2 },
      { retailer: "Macy's", gaps: "complete" },
    ],
  },

  // ── Saks Fifth Avenue coverage ──────────────────────────────────────────────
  {
    id: "B11468",
    description: "Sequin Cocktail Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Saks Fifth Avenue", gaps: 3 },
      { retailer: "Nordstrom", gaps: "complete" },
    ],
  },
  {
    id: "B11469",
    description: "Double-Breasted Blazer",
    state: "categorised",
    brickCode: "10001350",
    gs1Gaps: 2,
    retailers: [{ retailer: "Saks Fifth Avenue", gaps: 4 }],
  },
  {
    id: "B11470",
    description: "Patent Pointed Pump",
    state: "categorised",
    brickCode: "10001077",
    gs1Gaps: 0,
    retailers: [
      { retailer: "Saks Fifth Avenue", gaps: "complete" },
      { retailer: "Dillard's", gaps: 2 },
    ],
  },
  {
    id: "B11471",
    description: "Top-Handle Satchel",
    state: "categorised",
    brickCode: "10006030",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Saks Fifth Avenue", gaps: 2 },
      { retailer: "Bloomingdale's", gaps: "complete" },
    ],
  },
  {
    id: "B11472",
    description: "Signet Ring",
    state: "categorised",
    brickCode: "10006018",
    gs1Gaps: 1,
    retailers: [{ retailer: "Saks Fifth Avenue", gaps: 1 }],
  },
  {
    id: "B11473",
    description: "Cashmere Crew Sweater",
    state: "categorised",
    brickCode: "10001351",
    gs1Gaps: 0,
    retailers: [
      { retailer: "Saks Fifth Avenue", gaps: "complete" },
      { retailer: "Belk", gaps: 3 },
    ],
  },

  // ── Bloomingdale's coverage ─────────────────────────────────────────────────
  {
    id: "B11474",
    description: "Pleated Midi Skirt",
    state: "categorised",
    brickCode: "10001334",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Bloomingdale's", gaps: 2 },
      { retailer: "Macy's", gaps: "complete" },
    ],
  },
  {
    id: "B11475",
    description: "Silk Button Blouse",
    state: "categorised",
    brickCode: "10001352",
    gs1Gaps: 2,
    retailers: [{ retailer: "Bloomingdale's", gaps: 5 }],
  },
  {
    id: "B11476",
    description: "Cable-Knit Cardigan",
    state: "categorised",
    brickCode: "10001351",
    gs1Gaps: 0,
    retailers: [
      { retailer: "Bloomingdale's", gaps: "complete" },
      { retailer: "Nordstrom", gaps: 2 },
    ],
  },
  {
    id: "B11477",
    description: "Mesh Running Trainer",
    state: "categorised",
    brickCode: "10001070",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Bloomingdale's", gaps: 3 },
      { retailer: "Macy's", gaps: 1 },
    ],
  },
  {
    id: "B11478",
    description: "Layered Pendant Necklace",
    state: "categorised",
    brickCode: "10006017",
    gs1Gaps: 0,
    retailers: [{ retailer: "Bloomingdale's", gaps: "complete" }],
  },
  {
    id: "B11479",
    description: "A-Line Denim Skirt",
    state: "categorised",
    brickCode: "10001334",
    gs1Gaps: 2,
    retailers: [
      { retailer: "Bloomingdale's", gaps: 1 },
      { retailer: "Dillard's", gaps: "complete" },
    ],
  },

  // ── Deeper Dillard's coverage ───────────────────────────────────────────────
  {
    id: "B11480",
    description: "Belted Shirt Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 0,
    retailers: [{ retailer: "Dillard's", gaps: 2 }],
  },
  {
    id: "B11481",
    description: "Suede Block Heel",
    state: "categorised",
    brickCode: "10001077",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Dillard's", gaps: 4 },
      { retailer: "Belk", gaps: "complete" },
    ],
  },
  {
    id: "B11482",
    description: "Oxford Cotton Shirt",
    state: "categorised",
    brickCode: "10001352",
    gs1Gaps: 1,
    retailers: [{ retailer: "Dillard's", gaps: 3 }],
  },
  {
    id: "B11483",
    description: "Tailored Wide-Leg Trouser",
    state: "categorised",
    brickCode: "10001335",
    gs1Gaps: 2,
    retailers: [
      { retailer: "Dillard's", gaps: 5 },
      { retailer: "Macy's", gaps: 2 },
    ],
  },
  {
    id: "B11484",
    description: "Reversible Leather Belt",
    state: "categorised",
    brickCode: "10001326",
    gs1Gaps: 0,
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
  },

  // ── Deeper Nordstrom coverage ───────────────────────────────────────────────
  {
    id: "B11485",
    description: "Quilted Puffer Jacket",
    state: "categorised",
    brickCode: "10001350",
    gs1Gaps: 1,
    retailers: [{ retailer: "Nordstrom", gaps: 3 }],
  },
  {
    id: "B11486",
    description: "Chain Shoulder Bag",
    state: "categorised",
    brickCode: "10006030",
    gs1Gaps: 2,
    retailers: [
      { retailer: "Nordstrom", gaps: 1 },
      { retailer: "Saks Fifth Avenue", gaps: "complete" },
    ],
  },
  {
    id: "B11487",
    description: "Merino Turtleneck",
    state: "categorised",
    brickCode: "10001351",
    gs1Gaps: 0,
    retailers: [{ retailer: "Nordstrom", gaps: "complete" }],
  },
  {
    id: "B11488",
    description: "Stackable Band Set",
    state: "categorised",
    brickCode: "10006018",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Nordstrom", gaps: 2 },
      { retailer: "Bloomingdale's", gaps: 1 },
    ],
  },
  {
    id: "B11489",
    description: "Seamless Training Top",
    state: "categorised",
    brickCode: "10001400",
    gs1Gaps: 1,
    retailers: [{ retailer: "Nordstrom", gaps: 2 }],
  },

  // ── Deeper Belk coverage ────────────────────────────────────────────────────
  {
    id: "B11490",
    description: "Cowl Neck Slip Dress",
    state: "categorised",
    brickCode: "10001333",
    gs1Gaps: 0,
    retailers: [{ retailer: "Belk", gaps: "complete" }],
  },
  {
    id: "B11491",
    description: "Satin Bias Skirt",
    state: "categorised",
    brickCode: "10001334",
    gs1Gaps: 1,
    retailers: [{ retailer: "Belk", gaps: 2 }],
  },
  {
    id: "B11492",
    description: "Piped Cotton Pyjama Set",
    state: "categorised",
    brickCode: "10002100",
    gs1Gaps: 0,
    retailers: [
      { retailer: "Belk", gaps: "complete" },
      { retailer: "Macy's", gaps: 1 },
    ],
  },
  {
    id: "B11493",
    description: "Pearl Strand Necklace",
    state: "categorised",
    brickCode: "10006017",
    gs1Gaps: 1,
    retailers: [{ retailer: "Belk", gaps: 3 }],
  },

  // ── Deeper Macy's coverage ──────────────────────────────────────────────────
  {
    id: "B11494",
    description: "High-Rise Legging",
    state: "categorised",
    brickCode: "10001401",
    gs1Gaps: 1,
    retailers: [{ retailer: "Macy's", gaps: 2 }],
  },
  {
    id: "B11495",
    description: "Court Sneaker",
    state: "categorised",
    brickCode: "10001070",
    gs1Gaps: 0,
    retailers: [
      { retailer: "Macy's", gaps: "complete" },
      { retailer: "Dillard's", gaps: 3 },
    ],
  },
  {
    id: "B11496",
    description: "Pleated Cigarette Trouser",
    state: "categorised",
    brickCode: "10001335",
    gs1Gaps: 1,
    retailers: [{ retailer: "Macy's", gaps: 4 }],
  },
  {
    id: "B11497",
    description: "Satin Cami Set",
    state: "categorised",
    brickCode: "10002100",
    gs1Gaps: 0,
    discontinued: true,
    retailers: [{ retailer: "Macy's", gaps: 1 }],
  },

  // ── Cross-partner fill ──────────────────────────────────────────────────────
  {
    id: "B11498",
    description: "Running Short",
    state: "categorised",
    brickCode: "10001401",
    gs1Gaps: 1,
    retailers: [
      { retailer: "Nordstrom", gaps: 1 },
      { retailer: "Macy's", gaps: "complete" },
    ],
  },
  {
    id: "B11499",
    description: "Trail Running Shoe",
    state: "categorised",
    brickCode: "10001070",
    gs1Gaps: 2,
    retailers: [{ retailer: "Saks Fifth Avenue", gaps: 3 }],
  },
  {
    id: "B11500",
    description: "Woven Waist Belt",
    state: "categorised",
    brickCode: "10001326",
    gs1Gaps: 0,
    retailers: [
      { retailer: "Bloomingdale's", gaps: "complete" },
      { retailer: "Nordstrom", gaps: 1 },
    ],
  },
  {
    id: "B11501",
    description: "Longline Sports Bra",
    state: "categorised",
    brickCode: "10001400",
    gs1Gaps: 1,
    retailers: [{ retailer: "Bloomingdale's", gaps: 2 }],
  },

  // ── Uncategorised (keep the assign-category story alive) ─────────────────────
  { id: "B11502", description: "Colour-Block Windbreaker", state: "uncategorised" },
  { id: "B11503", description: "Embroidered Kaftan", state: "uncategorised" },
]

/** Products with no category assigned — cannot be assessed against any target. */
export function countUncategorised(products: SupplierProduct[]): number {
  return products.filter((p) => p.state === "uncategorised").length
}

// ── Gap records ───────────────────────────────────────────────────────────────
// The canonical expansion of a product's numeric gap count into named missing
// attributes and image requirements. The seed's counts stay authoritative; the
// expansion is deterministic — the first N of the brick's standard attribute
// pool, with any overflow allocated to image requirements — so the gap detail,
// the product-leaf pills, and any other consumer can never disagree about what
// a gap actually is.

export type GapTarget = { kind: "gs1" } | { kind: "retailer"; name: string }

export type MissingAttribute = { name: string }
export type MissingImage = { name: string; spec: string }

export type GapRecords = {
  missingAttrs: MissingAttribute[]
  missingImages: MissingImage[]
  /**
   * Attributes that would be missing, except this retailer has waived them.
   * Not counted as gaps — surfaced so a screen can show "waived by <retailer>"
   * instead of the requirement vanishing with no explanation.
   */
  waivedAttrs: MissingAttribute[]
  /** Pool sizes, for "X of Y provided" summaries */
  totalAttrCount: number
  totalImageCount: number
}

/** The supplier persona this prototype is logged in as. */
export const SUPPLIER_PERSONA = "J.Renée"

/**
 * The one retailer whose exceptions are modelled — the live persona on the
 * other side of this prototype. The other trading partners are static mocks
 * and grant no exceptions.
 */
export const EXCEPTION_GRANTING_RETAILER = "Dillard's"

export const IMAGE_REQUIREMENT_POOL: MissingImage[] = [
  { name: "Hero Shot", spec: "pure white background, 2000 × 2000 px, square" },
  { name: "Detail Shot", spec: "close-up of material/texture" },
]

/** Number of attribute gaps the supplier has filled in for this product. */
export function countFilledAttributes(product: SupplierProduct): number {
  return product.filledAttributes ? Object.keys(product.filledAttributes).length : 0
}

/**
 * Attribute names the exception-granting retailer has waived for this supplier
 * in this GS1 category.
 *
 * Empty for the GS1 baseline (a retailer's waiver has no authority over the
 * industry standard) and for every retailer other than Dillard's — the other
 * trading partners are static mocks in this prototype and grant no exceptions.
 */
export function waivedAttributesForTarget(
  brickCode: string | undefined,
  target: GapTarget
): string[] {
  if (target.kind !== "retailer") return []
  if (target.name !== EXCEPTION_GRANTING_RETAILER) return []
  if (!brickCode) return []
  return waivedAttributeNames(SUPPLIER_PERSONA, {
    exceptionType: "Attribute Waiver",
    brickCode,
  })
}

/** Stable small hash of a string — deterministic across renders and reloads. */
function stableHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

type BrickAttribute = { name: string }

type GapAllocation = {
  /** The head-slice of the brick pool this product's gaps resolve to. */
  allocatedAttrs: BrickAttribute[]
  imageGaps: MissingImage[]
  attrPoolSize: number
}

/**
 * Resolve a product's opaque gap count into the specific attribute and image
 * requirements it stands for. Both getGapCount and getGapRecords route through
 * this, so the number on a pill can never disagree with the list on the detail
 * screen — they are derived from one allocation.
 */
function allocateGaps(
  product: SupplierProduct | undefined,
  target: GapTarget
): GapAllocation {
  const brick = product?.brickCode ? getBrickByCode(product.brickCode) : undefined
  const attrPool = brick?.extendedAttributes ?? []

  const originalGapCount =
    product && product.state === "categorised"
      ? target.kind === "gs1"
        ? product.gs1Gaps ?? 0
        : (() => {
            const rs = product.retailers?.find((r) => r.retailer === target.name)
            return !rs || rs.gaps === "complete" ? 0 : rs.gaps
          })()
      : 0

  // Split the opaque gap count into named attribute gaps and image-requirement
  // gaps. A small, deterministic share (0–2) of the gaps falls to images —
  // keyed on product + target so it never changes between renders — rather than
  // "images only once every attribute is also missing", which would leave image
  // requirements unreachable given the seed's modest gap counts.
  const targetKey = target.kind === "gs1" ? "gs1" : `r:${target.name}`
  const hash = product ? stableHash(`${product.id}|${targetKey}`) : 0
  const desiredImageGaps = originalGapCount === 0 ? 0 : hash % 3

  let imageGapCount = Math.min(desiredImageGaps, originalGapCount, IMAGE_REQUIREMENT_POOL.length)
  let attrCount = originalGapCount - imageGapCount
  if (attrCount > attrPool.length) {
    // More attribute gaps than the pool holds — push the remainder to images.
    const extra = attrCount - attrPool.length
    imageGapCount = Math.min(imageGapCount + extra, IMAGE_REQUIREMENT_POOL.length)
    attrCount = attrPool.length
  }

  return {
    allocatedAttrs: attrPool.slice(0, attrCount).map((a) => ({ name: a.name })),
    imageGaps: IMAGE_REQUIREMENT_POOL.slice(0, imageGapCount),
    attrPoolSize: attrPool.length,
  }
}

/**
 * Open gap count for a product against one target (0 when complete or not
 * assessed). Attributes the supplier has filled in reduce the count for every
 * target, since a filled attribute is a product-level fact; attributes the
 * retailer has waived reduce it for that retailer's target only.
 */
export function getGapCount(product: SupplierProduct, target: GapTarget): number {
  const { missingAttrs, missingImages } = getGapRecords(product, target)
  return missingAttrs.length + missingImages.length
}

export function getGapRecords(
  product: SupplierProduct | undefined,
  target: GapTarget
): GapRecords {
  // The image split is derived from the ORIGINAL gap count (before any fills or
  // waivers) so that filling or waiving an attribute never disturbs which image
  // requirements show — both only ever reduce the attribute portion.
  const { allocatedAttrs, imageGaps, attrPoolSize } = allocateGaps(product, target)

  const filledNames = new Set(product?.filledAttributes ? Object.keys(product.filledAttributes) : [])
  const waivedNames = waivedAttributesForTarget(product?.brickCode, target)

  // Attributes this retailer has waived for us: no longer outstanding, but
  // surfaced separately so the detail screen can say "waived by Dillard's"
  // rather than having the requirement silently disappear.
  const waivedAttrs = allocatedAttrs.filter(
    (a) => !filledNames.has(a.name) && isAttributeWaived(a.name, waivedNames)
  )
  const waivedAttrNames = new Set(waivedAttrs.map((a) => a.name))

  // What's genuinely still open: not filled in by us, not waived by them.
  const missingAttrs = allocatedAttrs.filter(
    (a) => !filledNames.has(a.name) && !waivedAttrNames.has(a.name)
  )

  return {
    missingAttrs,
    missingImages: imageGaps,
    waivedAttrs,
    totalAttrCount: attrPoolSize,
    totalImageCount: IMAGE_REQUIREMENT_POOL.length,
  }
}

// ── Full attribute view ───────────────────────────────────────────────────────
// The gap engine above only ever answers "what's missing". The supplier also
// needs to see and edit everything that is *already* on the product, which the
// count-based seed doesn't carry: SupplierProduct stores gap counts, never
// attribute values. Rather than hand-author a value map onto ~55 seed products,
// values for the non-gap attributes are derived deterministically from the GS1
// allowed-value lists, keyed on product + attribute, so they are stable across
// renders and reloads and read as plausible catalogue data.
//
// These derived values are display-only: they are never written into
// filledAttributes, so compliance arithmetic stays driven entirely by
// getGapRecords. The moment the supplier edits one, it becomes a real filled
// attribute and takes precedence.

export type ResolvedAttributeStatus = "provided" | "missing" | "waived"

export type ResolvedAttribute = {
  name: string
  /** Empty only when status is "missing" (or "waived" and never supplied). */
  value: string
  status: ResolvedAttributeStatus
  /** "filled" = the supplier entered this value; "seeded" = derived demo data. */
  source: "filled" | "seeded"
}

/**
 * A stable, plausible value for an attribute the product is deemed to already
 * provide. Picks from the GS1 allowed-value list where one exists; otherwise
 * falls back to a short deterministic string, since free-text attributes have
 * no enumerated values to choose from.
 */
function seededAttributeValue(productId: string, attr: BrickAttribute): string {
  const options = getAllowedValues(attr.name)
  const hash = stableHash(`${productId}|${attr.name}`)
  if (options && options.length > 0) return options[hash % options.length].value

  // No GS1 code list — a free-text field. Match on the attribute name so the
  // value at least reads like the thing it's describing; a country field gets
  // a country, a percentage gets a number. Order matters: the first keyword
  // that matches wins.
  const name = attr.name.toLowerCase()
  for (const [keyword, pool] of FREE_TEXT_VALUE_POOLS) {
    if (name.includes(keyword)) return pool[hash % pool.length]
  }
  return GENERIC_FREE_TEXT_POOL[hash % GENERIC_FREE_TEXT_POOL.length]
}

/**
 * Plausible stand-in values for free-text attributes, keyed by a substring of
 * the attribute name. Demo data only — the seed carries no real values.
 */
const FREE_TEXT_VALUE_POOLS: [string, string[]][] = [
  ["country", ["China", "Vietnam", "Italy", "Portugal", "India", "Brazil"]],
  ["origin", ["China", "Vietnam", "Italy", "Portugal", "India", "Brazil"]],
  ["brand", ["J.Renée", "J.Renée Collection", "J.Renée Signature"]],
  ["tariff", ["6403.99.90", "6404.19.39", "6402.99.31"]],
  ["classification", ["10001077", "10001334", "10001235"]],
  ["percent", ["100", "80", "65", "50"]],
  ["weight", ["0.6 kg", "0.8 kg", "1.1 kg"]],
  ["width", ["3.5 cm", "5 cm", "7.5 cm"]],
  ["height", ["6 cm", "8 cm", "10 cm"]],
  ["length", ["24 cm", "26 cm", "28 cm"]],
  ["diameter", ["12 mm", "16 mm", "20 mm"]],
  ["size", ["6 M", "7 M", "8 M", "9 M"]],
  ["colour", ["Black", "Cognac", "Bone", "Navy"]],
  ["color", ["Black", "Cognac", "Bone", "Navy"]],
  ["message", ["Cushioned footbed with a padded collar for all-day wear."]],
  ["description", ["Cushioned footbed with a padded collar for all-day wear."]],
  ["marketing", ["Cushioned footbed with a padded collar for all-day wear."]],
  ["care", ["Wipe clean with a damp cloth"]],
  ["warranty", ["1 year limited"]],
  ["fur", ["Not applicable"]],
  ["material", ["Leather upper, synthetic lining"]],
  ["fabric", ["Leather upper, synthetic lining"]],
  ["code", ["JR-4820", "JR-5194", "JR-6033"]],
]

const GENERIC_FREE_TEXT_POOL = ["Standard", "Not applicable", "Supplied"]

/**
 * Every attribute in this product's category, with its status against one
 * compliance target and the value currently on the product.
 *
 * The list is the whole GS1 brick pool in pool order, so its length always
 * equals the `totalAttrCount` used by the "X of Y provided" summaries — the
 * full-attribute screen and the requirements-status screen can never disagree.
 */
export function getProductAttributes(
  product: SupplierProduct | undefined,
  target: GapTarget
): ResolvedAttribute[] {
  const brick = product?.brickCode ? getBrickByCode(product.brickCode) : undefined
  const pool = brick?.extendedAttributes ?? []

  const { missingAttrs, waivedAttrs } = getGapRecords(product, target)
  const missingNames = new Set(missingAttrs.map((a) => a.name))
  const waivedAttrNames = new Set(waivedAttrs.map((a) => a.name))

  return pool.map((attr) => {
    const filled = product?.filledAttributes?.[attr.name]
    if (filled) {
      return { name: attr.name, value: filled, status: "provided" as const, source: "filled" as const }
    }
    if (missingNames.has(attr.name)) {
      return { name: attr.name, value: "", status: "missing" as const, source: "seeded" as const }
    }
    if (waivedAttrNames.has(attr.name)) {
      return { name: attr.name, value: "", status: "waived" as const, source: "seeded" as const }
    }
    return {
      name: attr.name,
      value: product ? seededAttributeValue(product.id, attr) : "",
      status: "provided" as const,
      source: "seeded" as const,
    }
  })
}

// ── Completion % ──────────────────────────────────────────────────────────────
// A product is "complete" for a target when it has zero open gaps for that
// target (GS1 baseline: gs1Gaps === 0; a retailer: that retailer's entry reads
// "complete"). We report completion as a % of products, grouped by category so
// the multi-brick nature of a category (segment) is aggregated: a category such
// as Clothing spans several GS1 bricks, and every product in those bricks rolls
// up into the one Clothing figure.

/** The category (GS1 segment) a product belongs to, or null when uncategorised. */
export function getCategory(product: SupplierProduct): string | null {
  if (product.state !== "categorised" || !product.brickCode) return null
  return getBrickByCode(product.brickCode)?.segment ?? null
}

export type CategoryCompletion = {
  category: string
  total: number
  complete: number
  pct: number
}

export type TargetCompletion = {
  total: number
  complete: number
  pct: number
  byCategory: CategoryCompletion[]
}

/**
 * Product-completion % for a compliance target — `"gs1"` for the baseline, or a
 * retailer name. Only assessable products count toward the denominator:
 * categorised products for GS1, and (for a retailer) categorised products that
 * carry a status for that retailer. The `byCategory` breakdown aggregates every
 * brick in a category into one figure.
 */
export function getTargetCompletion(
  products: SupplierProduct[],
  target: "gs1" | string
): TargetCompletion {
  const isGs1 = target === "gs1"

  // Assessable products + whether each is complete for this target.
  const assessed: { category: string; complete: boolean }[] = []
  for (const p of products) {
    const category = getCategory(p)
    if (category === null) continue // uncategorised — cannot be assessed
    if (isGs1) {
      assessed.push({ category, complete: getGapCount(p, { kind: "gs1" }) === 0 })
    } else {
      const rs = p.retailers?.find((r) => r.retailer === target)
      if (!rs) continue // this retailer publishes nothing against the product
      // Via getGapCount, not rs.gaps, so a product whose every gap has been
      // filled in or waived reads as complete here too.
      assessed.push({ category, complete: getGapCount(p, { kind: "retailer", name: target }) === 0 })
    }
  }

  const total = assessed.length
  const complete = assessed.filter((a) => a.complete).length
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100)

  // Group into per-category figures.
  const byCat = new Map<string, { total: number; complete: number }>()
  for (const a of assessed) {
    const acc = byCat.get(a.category) ?? { total: 0, complete: 0 }
    acc.total += 1
    if (a.complete) acc.complete += 1
    byCat.set(a.category, acc)
  }
  const byCategory: CategoryCompletion[] = [...byCat.entries()]
    .map(([category, { total: t, complete: c }]) => ({
      category,
      total: t,
      complete: c,
      pct: t === 0 ? 0 : Math.round((c / t) * 100),
    }))
    .sort((a, b) => a.category.localeCompare(b.category))

  return { total, complete, pct, byCategory }
}

/** Total GS1 baseline gaps across categorised products. */
export function countBaselineGaps(products: SupplierProduct[]): number {
  return products.reduce((sum, p) => sum + (p.state === "categorised" ? p.gs1Gaps ?? 0 : 0), 0)
}

/**
 * Assign a GS1 brick to the given products (manual categorisation path).
 * Newly categorised products start with a nominal baseline-gap count so the
 * compliance view has something to show; already-categorised products keep
 * their existing gap figure.
 */
export function assignCategory(
  products: SupplierProduct[],
  ids: Set<string>,
  brickCode: string
): SupplierProduct[] {
  return products.map((p) =>
    ids.has(p.id)
      ? {
          ...p,
          state: "categorised",
          brickCode,
          source: "manual",
          gs1Gaps: p.state === "categorised" ? p.gs1Gaps : 2,
        }
      : p
  )
}

/**
 * Record a supplier-supplied value for one attribute on a product. The value
 * applies to the whole product (and therefore every GTIN within it), satisfying
 * that attribute for the GS1 baseline and every retailer at once — so gap counts
 * everywhere drop by one. Passing an empty value clears a previously-filled
 * attribute.
 */
export function fillAttribute(
  products: SupplierProduct[],
  productId: string,
  attributeName: string,
  value: string
): SupplierProduct[] {
  return products.map((p) => {
    if (p.id !== productId) return p
    const next = { ...(p.filledAttributes ?? {}) }
    if (value) next[attributeName] = value
    else delete next[attributeName]
    return { ...p, filledAttributes: next }
  })
}

// ── Selection codes ───────────────────────────────────────────────────────────
// A "Product/Selection Code" groups the supplier's products under one retailer
// by GS1 category. Derived live from the shared product store — rather than a
// separately hardcoded list — so the code's product count and gap totals can
// never drift from what the product leaf and gap detail actually show.

export type SelectionCodeSummary = {
  id: string
  brickCode: string
  label: string
  products: number
  gaps: number
  complete: number
}

/** All selection codes (one per GS1 category) this partner has products under. */
export function getSelectionCodesForPartner(
  products: SupplierProduct[],
  partnerName: string
): SelectionCodeSummary[] {
  const byBrick = new Map<string, SupplierProduct[]>()
  for (const p of products) {
    if (p.state !== "categorised" || !p.brickCode) continue
    if (!p.retailers?.some((r) => r.retailer === partnerName)) continue
    const list = byBrick.get(p.brickCode) ?? []
    list.push(p)
    byBrick.set(p.brickCode, list)
  }
  return [...byBrick.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([brickCode, rows], i) => {
      let gaps = 0
      let complete = 0
      for (const p of rows) {
        // Via getGapCount so fills and this retailer's waivers are reflected,
        // rather than reading the raw seeded count.
        const open = getGapCount(p, { kind: "retailer", name: partnerName })
        if (open === 0) complete += 1
        else gaps += open
      }
      return {
        id: String(i + 1).padStart(3, "0"),
        brickCode,
        label: getBrickByCode(brickCode)?.brickName ?? brickCode,
        products: rows.length,
        gaps,
        complete,
      }
    })
}

/** Aggregate code/gap/complete totals for a partner, for the Compliance list. */
export function getPartnerSummary(products: SupplierProduct[], partnerName: string) {
  const codes = getSelectionCodesForPartner(products, partnerName)
  return {
    codes: codes.length,
    gaps: codes.reduce((sum, c) => sum + c.gaps, 0),
    complete: codes.reduce((sum, c) => sum + c.complete, 0),
  }
}

// ── Account-wide selection codes ───────────────────────────────────────────────
// The real Selection Code List is a flat, account-wide catalogue view — no
// retailer filter, no compliance/gap dimension — unlike getSelectionCodesForPartner
// above (which stays as the retailer-scoped compliance breakdown, untouched).

export type AllSelectionCodeSummary = {
  id: string
  brickCode: string
  label: string
  products: number
}

/**
 * Account-wide selection codes — one row per GS1 brick with at least one
 * categorised product, aggregated across every retailer (or none at all).
 * This is a separate numbering space from getSelectionCodesForPartner's
 * per-partner "001", "002" — the two are never rendered together.
 */
export function getAllSelectionCodes(products: SupplierProduct[]): AllSelectionCodeSummary[] {
  const byBrick = new Map<string, SupplierProduct[]>()
  for (const p of products) {
    if (p.state !== "categorised" || !p.brickCode) continue
    const list = byBrick.get(p.brickCode) ?? []
    list.push(p)
    byBrick.set(p.brickCode, list)
  }
  return [...byBrick.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([brickCode, rows], i) => ({
      id: String(i + 1).padStart(3, "0"),
      brickCode,
      label: getBrickByCode(brickCode)?.brickName ?? brickCode,
      products: rows.length,
    }))
}
