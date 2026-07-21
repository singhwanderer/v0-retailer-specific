// GS1 attribute allowed-value lists for supplier fill-in dropdowns.
//
// Sourced from the GS1 Extended Attribute Master Code List: 20 attributes map
// to real GS1 code lists (Gender, Closure, Heel Type, Metal, Collar/Neck Type,
// etc.), the remaining apparel/jewellery/accessory attributes use a curated
// value set consistent with GS1 vocabulary. The map is keyed by the same
// attribute CODE the GS1 standard library and gap records use, so a missing
// attribute row can look up its pick-list directly.
//
// Free-text attributes (materials, descriptions, certifications) are not keyed
// here; the supplier fill-in flow falls back to a free-text entry for those.

export const GS1_ATTRIBUTE_VALUES: Record<string, string[]> = {
  GM03HLTY: ["Block", "No Heel/Flat", "Comma", "Novelty", "Cone", "Spool", "Demi-Wedge", "Stacked", "Flare", "Stiletto/Pointed", "Flatform", "Wedge", "Kitten", "Other", "Louis"],
  GM03HLHT: ["Flat - 0 - .5 inch", "Low > .5 to 1 inch", "Medium - > 1 inch - 2 inch", "High > 2 inch 3 inch", "Extra-High > 3 inch", "Other"],
  GM03TOES: ["Almond", "Round", "Chisel", "Snip", "Oblique", "Square", "Pointy", "Other"],
  GM03OUTS: ["Dimpled", "Non-Slip", "Driver", "Tooth", "Embossed", "Tread", "Heavy Lug", "Light Lug", "Other"],
  GM03CLOS: ["Adjustable/Pull", "Lace-up Front", "Back", "Latch", "Back Button/Zip", "Leverback", "Back Hook/Zip", "Lift-Lock", "Barrel", "Link/Clasp", "Box Tab Insert", "Lobster Claw", "Buckle", "Magnetic", "Button", "Pierced Post", "Button Back", "Push-Lock", "Button Front", "Side Button/Zip", "Button Front Partial", "Side Hook/Zip", "Button Shoulder", "Snap", "Clasp", "Snap Back", "Click Top", "Snap Front", "Clip On", "Snap Front Partial", "Drawstring", "Snap Legs", "Drawstring Front", "Snap Shoulder", "Drawstring Elastic", "Snap Post", "D Ring", "String", "Swivel", "Tab", "Fishhook", "Tie", "Flap", "Tie Back/Halter", "Foldover", "Tie Front", "French Wire", "Tie Side", "Frog/Button Loop", "Toggle", "Front Button/Zip", "Toggle Front", "Front Hook/Zip", "Top Zip", "Hidden Button Front", "Turn Lock", "O Ring"],
  GM03LIMT: ["Antimicrobial", "Nylon", "Cotton", "Organic Material", "Fabric", "Polyester", "Faux Fur", "PU", "Faux Leather", "PVC", "Faux Shearling", "Quilted", "Fleece", "Shearling Lined", "Gel", "Sherpa", "Leather", "Straw", "Logo Lining", "Synthetic", "Memory Foam", "Taffeta", "Mesh", "Other"],
  GM03FITT: ["Relaxed", "Structured", "Other"],
  GM03FTMT: ["Artificially Colored", "Natural (untreated)", "Bleached", "Painted", "Dyed", "Other Fur Treatment"],
  GENDER: ["Female", "Male", "Gender Neutral"],
  CONLIFESTAGE: ["Baby/Infant", "Toddler", "Child", "Teen", "Young Adult", "Adult", "All Ages", "Preemie", "Unclassified"],
  SPACTIVITY: ["Badminton", "Hunting", "Baseball", "Lacrosse", "Basketball", "Racing", "Bowling", "Rowing", "Boxing/Martial Arts", "Running", "Climbing", "Skiing", "Cross Country", "Soccer", "Cross-Training", "Softball", "Cycling", "Tennis", "Dance", "Walking", "Football", "Wrestling", "Golf", "Yoga", "Hiking", "Hockey", "Other"],
  GM03NKLN: ["Ballet", "Plunge", "Banded", "Point", "Boat or Bateau", "Polo", "Cowl", "Crew", "Racer Back", "Drape", "Funnel", "Round", "Halter", "Scoop", "Henley", "Shawl", "Jewel", "Spread", "Keyhole", "Square", "Mandarin", "Sweetheart", "Mockneck", "Turtle", "Notch", "V-Neck", "Off the Shoulder", "Y-Neck", "One Shoulder", "Peter Pan", "Other Collar"],
  GM03SLLN: ["Sleeveless", "Cap Sleeve", "Short Sleeve", "Elbow Length", "Three-Quarter Sleeve", "Long Sleeve", "Extra Long"],
  GM03DRLN: ["Mini", "Above Knee", "Knee Length", "Midi", "Tea Length", "Maxi", "Floor Length"],
  GM03CLTP: ["Adjustable/Pull", "Back", "Buckle", "Button", "Clasp", "Drawstring", "Hook & Eye", "Lace-up", "Magnetic", "Snap", "Tie", "Toggle", "Zip", "Other"],
  GM03FLPW: ["400", "500", "550", "600", "650", "700", "800", "900"],
  GM03KTTP: ["Pom", "Tassel", "Skully", "Other"],
  GM03RISE: ["Low", "Mid", "Classic", "High", "Other"],
  GM03SKLN: ["Micro Mini", "Mini", "Above Knee", "Knee Length", "Midi", "Maxi"],
  GM03LGOP: ["Skinny", "Slim", "Straight", "Bootcut", "Wide Leg", "Flare", "Tapered"],
  GM03MTLT: ["Aluminum", "Platinum", "Brass", "Rhodium", "Bronze", "Rose Gold", "Copper", "Silver", "Gold", "Stainless Steel", "Gold Plated", "Titanium", "Nickel", "White Gold", "Palladium", "Other"],
  GM03MTPU: ["10K", "14K", "18K", "22K", "24K", "925 Sterling", "950 Platinum"],
  GM03STTP: ["Diamond", "Ruby", "Sapphire", "Emerald", "Pearl", "Amethyst", "Topaz", "Opal", "Cubic Zirconia", "None"],
  GM03CHLN: ['14"', '16"', '18"', '20"', '24"', '30"', '36"'],
  GM03STCT: ["Round", "Princess", "Oval", "Emerald", "Marquise", "Pear", "Cushion", "Asscher", "Radiant", "Heart"],
  GM03RGSZ: ["US", "UK", "EU", "Japan", "Swiss"],
  GM03ERFT: ["Post/Stud", "Lever Back", "Fish Hook", "Clip-On", "Hoop/Huggie", "Screw Back", "Threader"],
  GM03STRT: ["Adjustable", "Fixed", "Detachable", "Chain", "Crossbody", "Shoulder", "Wristlet"],
  GM03BKTP: ["Pin Buckle", "Snap", "Magnetic", "Slide", "D-Ring", "Automatic", "Reversible"],
  GM03BLWD: ['0.75"', '1"', '1.25"', '1.5"', '2"', '3"'],
  GM03CMPL: ["Light", "Medium", "Firm", "Extra Firm", "Other"],
}

/**
 * Allowed pick-list values for a GS1 attribute code, or `undefined` when the
 * attribute has no enumerated code list (a free-text field). Consumers should
 * render a dropdown when this returns a list and a text input otherwise.
 */
export function getAllowedValues(code: string | undefined): string[] | undefined {
  if (!code) return undefined
  return GS1_ATTRIBUTE_VALUES[code]
}
