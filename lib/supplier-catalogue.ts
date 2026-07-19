// Shared supplier product store (mock).
//
// One source of truth for the supplier's catalogue so every screen —
// Catalogue, Compliance Status, and the GS1/retailer product leaf — reads and
// writes the same products. Assigning a category in the Catalogue therefore
// updates the compliance counts and product lists everywhere, instead of each
// screen keeping its own copy that can drift out of agreement.

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
  /** Per-retailer compliance (static mock — gap-filling is not simulated) */
  retailers?: RetailerStatus[]
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
    brickCode: "10005811",
    gs1Gaps: 0,
    retailers: [{ retailer: "Dillard's", gaps: 1 }],
  },
  { id: "B11451", description: "Cotton Sundress", state: "uncategorised" },
  {
    id: "B11452",
    description: "Crepe Sheath Dress",
    state: "categorised",
    brickCode: "10005811",
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
    brickCode: "10005811",
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
]

/** Products with no category assigned — cannot be assessed against any target. */
export function countUncategorised(products: SupplierProduct[]): number {
  return products.filter((p) => p.state === "uncategorised").length
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
