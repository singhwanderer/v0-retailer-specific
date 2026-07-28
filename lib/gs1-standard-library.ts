// GS1 Standard Brick Library
// Source: GS1 Global Data Dictionary — E-marked (Essential) attributes per
// GPC brick, derived from the Dillard's Footwear.csv, Clothing.csv, and
// Accessories.csv specification sheets.
// Each Gs1Brick has a code, human-readable name, the segment (CSV file origin),
// and the full list of E-marked extended attributes defined for that brick,
// identified by name — see Gs1ExtendedAttribute for why there is no code.
// Everything in here comes from those source sheets; nothing is authored.

/**
 * An E-marked extended attribute on a brick.
 *
 * Name only, deliberately. These rows used to carry a `code` field billed as
 * the GS1 attribute code; none of the 65 values appeared in
 * gs1_extended_attribute_master_code_list.csv. They were stems of attribute
 * *value* code families — "GM03CLOS" is the common prefix of GM03CLOSAP /
 * GM03CLOSLF / GM03CLOSZI, and is not itself an identifier — or invented
 * outright. Three were shared by two different attributes, which no real
 * identifier is, and because the code was used as the identity key that
 * collision made Collar Type offer the closure pick-list. Attribute *value*
 * codes in lib/gs1-attribute-values.ts are genuine and stay; brick codes are
 * genuine and stay. Identity here is the name, which is unique across the
 * library.
 */
export interface Gs1ExtendedAttribute {
  name: string
}

export interface Gs1Brick {
  brickCode: string
  brickName: string
  segment: string
  extendedAttributes: Gs1ExtendedAttribute[]
}

export const GS1_BRICKS: Gs1Brick[] = [
  // ── Footwear ──────────────────────────────────────────────────────────────
  // Brick 10001077 = "Shoes - General Purpose" per Footwear.csv column B.
  {
    brickCode: "10001077",
    brickName: "Shoes - General Purpose",
    segment: "Footwear",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Faux Fur" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Heel Height" },
      { name: "Lining Material" },
      { name: "Open/Closed Toe" },
      { name: "Prop 65" },
      { name: "Shoe Type" },
      { name: "Sole Type" },
      { name: "Toe Shape" },
      { name: "Toe Style" },
    ],
  },
  // Brick 10001070 = "Athletic Footwear - General Purpose" per Footwear.csv column D.
  {
    brickCode: "10001070",
    brickName: "Athletic Footwear - General Purpose",
    segment: "Footwear",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Heel Height" },
      { name: "Lining Material" },
      { name: "Prop 65" },
      { name: "Shoe Type" },
      { name: "Sole Type" },
      { name: "Sport" },
    ],
  },

  // ── Clothing ──────────────────────────────────────────────────────────────
  // Attributes sourced from Clothing.csv — E-marked columns only, per brick.

  {
    brickCode: "10001333",
    brickName: "Dresses",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Collar Type" },
      { name: "Consumer Item Length" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Dress Type" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gauge" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
      { name: "Wrinkle Resistant" },
    ],
  },
  {
    brickCode: "10001350",
    brickName: "Jackets/Blazers/Cardigans/Waistcoats",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Coat/Jacket Type" },
      { name: "Collar Type" },
      { name: "Consumer Item Length" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gauge" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Hooded" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
      { name: "Water Repellent" },
      { name: "Wrinkle Resistant" },
    ],
  },
  {
    brickCode: "10001352",
    brickName: "Shirts/Blouses/Polo Shirts/T-Shirts",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Collar Type" },
      { name: "Consumer Item Length" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Hooded" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
      { name: "Wrinkle Resistant" },
    ],
  },
  {
    brickCode: "10001351",
    brickName: "Sweaters/Pullovers",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Collar Type" },
      { name: "Consumer Item Length" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gauge" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Hooded" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
      { name: "Sweater/Pullover Type" },
    ],
  },
  {
    brickCode: "10001361",
    brickName: "Upper Body Wear/Tops Variety Packs",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Collar Type" },
      { name: "Consumer Item Length" },
      { name: "Consumer Life Stage" },
      { name: "Consumer Quantity of Units in Consumer Package" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Length Description" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
    ],
  },
  {
    brickCode: "10001332",
    brickName: "Overalls/Bodysuits",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Collar Type" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Leg Type" },
      { name: "Length Description" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
    ],
  },
  {
    brickCode: "10001356",
    brickName: "Lower Body Wear/Bottoms Variety Packs",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Consumer Life Stage" },
      { name: "Consumer Quantity of Units in Consumer Package" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Leg Type" },
      { name: "Pant Inseam Length" },
      { name: "Pants/Shorts Type" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Waist Rise" },
      { name: "Waistband Type" },
    ],
  },
  {
    brickCode: "10001334",
    brickName: "Skirts",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Consumer Item Length" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Skirt Type" },
      { name: "Waistband Type" },
      { name: "Wrinkle Resistant" },
    ],
  },
  {
    brickCode: "10001335",
    brickName: "Trousers/Shorts",
    segment: "Clothing",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Leg Type" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Pant Inseam Length" },
      { name: "Pants/Shorts Type" },
      { name: "Pocket Details" },
      { name: "Prop 65" },
      { name: "Waist Rise" },
      { name: "Waistband Type" },
      { name: "Wrinkle Resistant" },
    ],
  },

  // ── Jewellery ─────────────────────────────────────────────────────────────
  // No dedicated Jewellery CSV supplied — these remain from the GS1 GDD.
  {
    brickCode: "10006017",
    brickName: "Necklaces/Chains/Pendants",
    segment: "Jewellery",
    extendedAttributes: [
      { name: "Metal Type" },
      { name: "Metal Purity" },
      { name: "Stone Type" },
      { name: "Chain Length" },
      { name: "Closure Type" },
      { name: "Gender" },
    ],
  },
  {
    brickCode: "10006018",
    brickName: "Rings",
    segment: "Jewellery",
    extendedAttributes: [
      { name: "Metal Type" },
      { name: "Metal Purity" },
      { name: "Stone Type" },
      { name: "Stone Cut" },
      { name: "Ring Size System" },
      { name: "Gender" },
    ],
  },
  {
    brickCode: "10006019",
    brickName: "Earrings/Ear Cuffs",
    segment: "Jewellery",
    extendedAttributes: [
      { name: "Metal Type" },
      { name: "Metal Purity" },
      { name: "Stone Type" },
      { name: "Earring Fastening" },
      { name: "Gender" },
    ],
  },

  // ── Accessories ───────────────────────────────────────────────────────────
  // Attributes sourced from Accessories.csv — E-marked columns only, per brick.

  {
    brickCode: "10006030",
    brickName: "Handbags/Purses",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Country of Origin" },
      { name: "Convertible" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Lining Material" },
      { name: "Prop 65" },
    ],
  },
  {
    brickCode: "10001328",
    brickName: "Handwear/Gloves",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Convertible" },
      { name: "Country of Origin" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Glove Type" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Lining Material" },
      { name: "Prop 65" },
    ],
  },
  {
    brickCode: "10001329",
    brickName: "Headwear",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Adjustable" },
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Country of Origin" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Hat Type" },
      { name: "Prop 65" },
    ],
  },
  {
    brickCode: "10001327",
    brickName: "Pocket Squares/Handkerchiefs",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Consumer Item Length" },
      { name: "Consumer Item Width" },
      { name: "Country of Origin" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Prop 65" },
    ],
  },
  {
    brickCode: "10001330",
    brickName: "Scarves/Ties/Neckwear",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Consumer Item Length" },
      { name: "Consumer Item Width" },
      { name: "Country of Origin" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Neckwear Type" },
      { name: "Prop 65" },
      { name: "Scarf Type" },
    ],
  },
  {
    brickCode: "10001326",
    brickName: "Belts/Braces/Cummerbunds",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Adjustable" },
      { name: "Advertised Origin" },
      { name: "Belt Type" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Consumer Item Length" },
      { name: "Consumer Item Width" },
      { name: "Country of Origin" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Prop 65" },
      { name: "Reversible" },
      { name: "Stretch" },
    ],
  },
  {
    brickCode: "10006032",
    brickName: "Scarves/Wraps/Shawls",
    segment: "Accessories",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Consumer Item Length" },
      { name: "Consumer Item Width" },
      { name: "Country of Origin" },
      { name: "Fabric or Material" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Fur Animal Name" },
      { name: "Fur Country of Origin" },
      { name: "Fur Treatment" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Prop 65" },
    ],
  },

  // ── Sportswear ────────────────────────────────────────────────────────────
  // No dedicated Sportswear CSV supplied — derived from GS1 GDD plus
  // alignment with Clothing CSV conventions.
  {
    brickCode: "10001400",
    brickName: "Sports/Performance Tops",
    segment: "Sportswear",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Compression Level" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Hooded" },
      { name: "Length Description" },
      { name: "Neckline" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
      { name: "Sport/Activity" },
    ],
  },
  {
    brickCode: "10001401",
    brickName: "Sports/Performance Bottoms",
    segment: "Sportswear",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Compression Level" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Pant Inseam Length" },
      { name: "Prop 65" },
      { name: "Rise" },
      { name: "Sport/Activity" },
    ],
  },

  // ── Homewear ──────────────────────────────────────────────────────────────
  // No dedicated Homewear CSV supplied — derived from GS1 GDD plus
  // alignment with Clothing CSV conventions.
  {
    brickCode: "10002100",
    brickName: "Nightwear/Pyjamas",
    segment: "Homewear",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Length Description" },
      { name: "Prop 65" },
      { name: "Sleeve Type" },
    ],
  },
  {
    brickCode: "10002101",
    brickName: "Robes/Dressing Gowns",
    segment: "Homewear",
    extendedAttributes: [
      { name: "Advertised Origin" },
      { name: "Brand Name" },
      { name: "Care Instructions Code" },
      { name: "Closure" },
      { name: "Consumer Life Stage" },
      { name: "Country of Origin" },
      { name: "Fabric or Material Code" },
      { name: "Features - Benefits Marketing Message" },
      { name: "Fiber" },
      { name: "Gender" },
      { name: "Global Product Classification (GPC)" },
      { name: "Harmonized Tariff Schedule Code" },
      { name: "Length Description" },
      { name: "Lined" },
      { name: "Lining Material" },
      { name: "Prop 65" },
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

/**
 * Search bricks by name, code, or segment (case-insensitive).
 *
 * Deliberately literal. A `synonyms` field once mapped everyday retail
 * vocabulary onto bricks ("booties" -> Shoes - General Purpose) so a fuzzy
 * query would still resolve. It was removed for two reasons.
 *
 * Those mappings were authored here rather than taken from GS1 — the same
 * invented-data problem as the attribute codes, and just as arguable ("
 * leggings" had been filed under Sports/Performance Bottoms, not
 * Trousers/Shorts).
 *
 * And a fuzzy match is actively harmful on the path that matters. A profile
 * name is the retailer's own label, so a one-word one can collide with the
 * vocabulary: "Boots" matched Shoes - General Purpose, "Bags" matched
 * Handbags/Purses, "Tops" matched three bricks. A retailer naming a profile
 * "Boots" would have been told that category already belongs to Footwear
 * instead of being asked which category they meant — exactly the guessing
 * create_attribute_profile now exists to prevent. Matching nothing is the
 * safe outcome: it routes to asking the user.
 */
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
