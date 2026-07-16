// GS1 Standard Brick Library
// Source: GS1 Global Data Dictionary — representative subset for prototype.
// Each Gs1Brick has a code, human-readable name, the segment (CSV file origin),
// and the list of standard extended attributes defined by GS1 for that brick.

export interface Gs1ExtendedAttribute {
  name: string  // Human-readable attribute name
  code: string  // GS1 attribute code
}

export interface Gs1Brick {
  brickCode: string
  brickName: string
  segment: string
  extendedAttributes: Gs1ExtendedAttribute[]
}

export const GS1_BRICKS: Gs1Brick[] = [
  // ── Footwear ──────────────────────────────────────────────────────────────
  {
    brickCode: "10005811",
    brickName: "Footwear",
    segment: "Footwear",
    extendedAttributes: [
      { name: "Heel Type", code: "GM03HLTY" },
      { name: "Heel Height Range", code: "GM03HLHT" },
      { name: "Toe Shape", code: "GM03TOES" },
      { name: "Outsole Type", code: "GM03OUTS" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Lining Material", code: "GM03LIMT" },
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Fur Treatment", code: "GM03FTMT" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10005812",
    brickName: "Athletic/Sports Footwear",
    segment: "Footwear",
    extendedAttributes: [
      { name: "Heel Type", code: "GM03HLTY" },
      { name: "Toe Shape", code: "GM03TOES" },
      { name: "Outsole Type", code: "GM03OUTS" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Sport/Activity", code: "SPACTIVITY" },
    ],
  },

  // ── Clothing ──────────────────────────────────────────────────────────────
  {
    brickCode: "10001333",
    brickName: "Dresses",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Dress Length", code: "GM03DRLN" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Fur Treatment", code: "GM03FTMT" },
    ],
  },
  {
    brickCode: "10001350",
    brickName: "Jackets/Blazers/Cardigans/Waistcoats",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Lining Material", code: "GM03LIMT" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Collar Type", code: "GM03CLTP" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Fur Treatment", code: "GM03FTMT" },
      { name: "Fill Power", code: "GM03FLPW" },
    ],
  },
  {
    brickCode: "10001352",
    brickName: "Shirts/Blouses/Polo Shirts/T-Shirts",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Collar Type", code: "GM03CLTP" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10001351",
    brickName: "Sweaters/Pullovers",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Knit Type", code: "GM03KTTP" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Fur Treatment", code: "GM03FTMT" },
    ],
  },
  {
    brickCode: "10001361",
    brickName: "Upper Body Wear/Tops Variety Packs",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10001332",
    brickName: "Overalls/Bodysuits",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10001356",
    brickName: "Lower Body Wear/Bottoms Variety Packs",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Rise", code: "GM03RISE" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10001334",
    brickName: "Skirts",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Skirt Length", code: "GM03SKLN" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Fur Treatment", code: "GM03FTMT" },
    ],
  },
  {
    brickCode: "10001335",
    brickName: "Trousers/Shorts",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Rise", code: "GM03RISE" },
      { name: "Leg Opening", code: "GM03LGOP" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Fur Treatment", code: "GM03FTMT" },
    ],
  },

  // ── Jewellery ─────────────────────────────────────────────────────────────
  {
    brickCode: "10006017",
    brickName: "Necklaces/Chains/Pendants",
    segment: "Jewellery",
    extendedAttributes: [
      { name: "Metal Type", code: "GM03MTLT" },
      { name: "Metal Purity", code: "GM03MTPU" },
      { name: "Stone Type", code: "GM03STTP" },
      { name: "Chain Length", code: "GM03CHLN" },
      { name: "Closure Type", code: "GM03CLTP" },
      { name: "Gender", code: "GENDER" },
    ],
  },
  {
    brickCode: "10006018",
    brickName: "Rings",
    segment: "Jewellery",
    extendedAttributes: [
      { name: "Metal Type", code: "GM03MTLT" },
      { name: "Metal Purity", code: "GM03MTPU" },
      { name: "Stone Type", code: "GM03STTP" },
      { name: "Stone Cut", code: "GM03STCT" },
      { name: "Ring Size System", code: "GM03RGSZ" },
      { name: "Gender", code: "GENDER" },
    ],
  },
  {
    brickCode: "10006019",
    brickName: "Earrings/Ear Cuffs",
    segment: "Jewellery",
    extendedAttributes: [
      { name: "Metal Type", code: "GM03MTLT" },
      { name: "Metal Purity", code: "GM03MTPU" },
      { name: "Stone Type", code: "GM03STTP" },
      { name: "Earring Fastening", code: "GM03ERFT" },
      { name: "Gender", code: "GENDER" },
    ],
  },

  // ── Accessories ───────────────────────────────────────────────────────────
  {
    brickCode: "10006030",
    brickName: "Handbags/Purses",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Lining Material", code: "GM03LIMT" },
      { name: "Strap Type", code: "GM03STRT" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10006031",
    brickName: "Belts",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Buckle Type", code: "GM03BKTP" },
      { name: "Belt Width", code: "GM03BLWD" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10006032",
    brickName: "Scarves/Wraps/Shawls",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fur Treatment", code: "GM03FTMT" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },

  // ── Sportswear ────────────────────────────────────────────────────────────
  {
    brickCode: "10001400",
    brickName: "Sports/Performance Tops",
    segment: "Sportswear",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Sport/Activity", code: "SPACTIVITY" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Compression Level", code: "GM03CMPL" },
    ],
  },
  {
    brickCode: "10001401",
    brickName: "Sports/Performance Bottoms",
    segment: "Sportswear",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Rise", code: "GM03RISE" },
      { name: "Sport/Activity", code: "SPACTIVITY" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
      { name: "Compression Level", code: "GM03CMPL" },
    ],
  },

  // ── Homewear ──────────────────────────────────────────────────────────────
  {
    brickCode: "10002100",
    brickName: "Nightwear/Pyjamas",
    segment: "Homewear",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Sleeve Length", code: "GM03SLLN" },
      { name: "Neckline", code: "GM03NKLN" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
  {
    brickCode: "10002101",
    brickName: "Robes/Dressing Gowns",
    segment: "Homewear",
    extendedAttributes: [
      { name: "Fabric or Material", code: "GM03FBMC" },
      { name: "Fit", code: "GM03FITT" },
      { name: "Closure", code: "GM03CLOS" },
      { name: "Lining Material", code: "GM03LIMT" },
      { name: "Gender", code: "GENDER" },
      { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
    ],
  },
]

/** Look up a brick by its code. Returns undefined if not found. */
export function getBrickByCode(code: string): Gs1Brick | undefined {
  return GS1_BRICKS.find((b) => b.brickCode === code)
}

/** Get all unique segments present in the library. */
export function getSegments(): string[] {
  return [...new Set(GS1_BRICKS.map((b) => b.segment))].sort()
}

/** Search bricks by name, code, or segment (case-insensitive). */
export function searchBricks(query: string): Gs1Brick[] {
  const q = query.toLowerCase().trim()
  if (!q) return GS1_BRICKS
  return GS1_BRICKS.filter(
    (b) =>
      b.brickName.toLowerCase().includes(q) ||
      b.brickCode.includes(q) ||
      b.segment.toLowerCase().includes(q)
  )
}
