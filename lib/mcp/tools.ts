// Shared tool layer for the TGC demo MCP server.
//
// Pure functions over the prototype's mock data modules. This is the single
// tool inventory described in docs/mcp-concept.md — consumed today by the
// external MCP endpoint (app/api/[transport]/route.ts) and, in a later phase,
// by an embedded portal assistant.

import { getBrickByCode, getSegments, searchBricks } from "@/lib/gs1-standard-library"
import { SUPPLIER_PRODUCTS_SEED } from "@/lib/supplier-catalogue"
import {
  type AttributeProfile,
  type ExceptionRow,
  type ExceptionType,
  type ProfileStatus,
} from "@/lib/retailer-requirements"
import {
  BASELINE_CORE_ATTRIBUTES,
  getProfileExtras,
  getStore,
  type AttributeRequirement,
  type ImageRequirement,
} from "@/lib/mcp/store"

const DEMO_NOTE =
  "Demo prototype: this change is stored in the demo server's in-memory data (mock data only, resets periodically). In production this would persist to TGC."

// Distinct retail-partner names present in the supplier catalogue seed. Used
// both to filter gaps and to redirect a query that names an unknown partner.
function knownRetailPartners(): string[] {
  const set = new Set<string>()
  for (const product of SUPPLIER_PRODUCTS_SEED) {
    for (const r of product.retailers ?? []) set.add(r.retailer)
  }
  return [...set].sort()
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function searchGs1Bricks(query: string) {
  return searchBricks(query).map((b) => ({
    brickCode: b.brickCode,
    brickName: b.brickName,
    segment: b.segment,
    standardExtendedAttributes: b.extendedAttributes.map((a) => `${a.name} (${a.code})`),
  }))
}

export function listAttributeProfiles(status?: ProfileStatus) {
  const { profiles } = getStore()
  const matches = status ? profiles.filter((p) => p.status === status) : profiles
  if (status && matches.length === 0) {
    const available = [...new Set(profiles.map((p) => p.status))]
    return {
      matches: [],
      availableStatuses: available,
      note: `No attribute profiles with status "${status}". Available statuses: ${available.join(", ")}. Call list_attribute_profiles with no filter to see all ${profiles.length} profiles.`,
    }
  }
  return matches
}

export function getProfileDetail(brickCode: string) {
  const profile = getStore().profiles.find((p) => p.brickCode === brickCode)
  const brick = getBrickByCode(brickCode)
  if (!profile && !brick) {
    return { error: `No attribute profile or GS1 brick found for brick code ${brickCode}. Use search_gs1_bricks or list_attribute_profiles to find valid codes.` }
  }
  const extras = getProfileExtras(brickCode)
  const standardExtended: AttributeRequirement[] = (brick?.extendedAttributes ?? []).map((a) => ({
    name: a.name,
    gs1Name: `${a.name} (${a.code})`,
    guidance: "",
    source: "standard",
    target: "extended",
  }))
  return {
    profile: profile ?? { note: "No retailer profile created yet for this brick", brickCode, brickName: brick?.brickName },
    coreAttributes: [
      ...BASELINE_CORE_ATTRIBUTES,
      ...extras.customAttributes.filter((a) => a.target === "core"),
    ],
    extendedAttributes: [
      ...standardExtended,
      ...extras.customAttributes.filter((a) => a.target === "extended"),
    ],
    imageRequirements: extras.imageRequirements,
  }
}

export function getSupplierComplianceSummary() {
  // Invert the supplier catalogue's per-retailer gaps into the hub view
  const byVendor = new Map<string, { openGaps: number; productsWithGaps: number; productsComplete: number }>()
  for (const product of SUPPLIER_PRODUCTS_SEED) {
    for (const r of product.retailers ?? []) {
      const row = byVendor.get(r.retailer) ?? { openGaps: 0, productsWithGaps: 0, productsComplete: 0 }
      if (r.gaps === "complete") row.productsComplete += 1
      else {
        row.openGaps += r.gaps
        row.productsWithGaps += 1
      }
      byVendor.set(r.retailer, row)
    }
  }
  const uncategorised = SUPPLIER_PRODUCTS_SEED.filter((p) => p.state === "uncategorised").length
  return {
    note: "Demo data covers one supplier's catalogue as seen by each retail partner.",
    vendors: [...byVendor.entries()]
      .map(([vendor, stats]) => ({ vendor, ...stats }))
      .sort((a, b) => b.openGaps - a.openGaps),
    uncategorisedProducts: uncategorised,
  }
}

export function listVendorGaps(vendor?: string) {
  const q = vendor?.toLowerCase().trim()
  const rows = SUPPLIER_PRODUCTS_SEED.flatMap((product) =>
    (product.retailers ?? [])
      .filter((r) => r.gaps !== "complete" && (!q || r.retailer.toLowerCase().includes(q)))
      .map((r) => ({
        productId: product.id,
        product: product.description,
        brickCode: product.brickCode,
        category: product.brickCode ? getBrickByCode(product.brickCode)?.brickName : undefined,
        retailer: r.retailer,
        openGaps: r.gaps,
      }))
  )
  const sorted = rows.sort((a, b) => (b.openGaps as number) - (a.openGaps as number))
  if (q && sorted.length === 0) {
    const known = knownRetailPartners()
    return {
      matches: [],
      knownVendors: known,
      note: `No retail partner matched "${vendor}". Known partners with compliance data: ${known.join(", ")}. (This demo tracks the supplier's catalogue as seen by each retail partner.)`,
    }
  }
  return sorted
}

export function listVendorExceptions(status?: ExceptionRow["status"], vendor?: string) {
  const q = vendor?.toLowerCase().trim()
  const all = getStore().exceptions
  const matches = all.filter(
    (e) => (!status || e.status === status) && (!q || e.vendor.toLowerCase().includes(q))
  )
  if (matches.length === 0 && (q || status)) {
    const knownVendors = [...new Set(all.map((e) => e.vendor))].sort()
    const availableStatuses = [...new Set(all.map((e) => e.status))]
    const criteria = [q ? `vendor "${vendor}"` : "", status ? `status "${status}"` : ""]
      .filter(Boolean)
      .join(" and ")
    return {
      matches: [],
      knownVendors,
      availableStatuses,
      note: `No exceptions matched ${criteria}. Vendors with exceptions on record: ${knownVendors.join(", ")}. Statuses in use: ${availableStatuses.join(", ")}.`,
    }
  }
  return matches
}

// Plain-English catalog of what this connector can do, plus a live snapshot of
// the demo data so the model can answer "what can I ask?" without guessing.
// Built from the store, so it never drifts from the actual seeded data.
export function getCapabilities() {
  const store = getStore()
  const categoriesWithData = [
    ...new Set(
      SUPPLIER_PRODUCTS_SEED.filter((p) => p.brickCode).map(
        (p) => getBrickByCode(p.brickCode!)?.brickName ?? p.brickCode!
      )
    ),
  ].sort()
  return {
    about:
      "TGC demo connector — retailer-side requirement authoring and supplier compliance monitoring over mock Trading Grid Catalogue data. Ask in your own words; the examples below are illustrations, not a fixed command list.",
    youCanAsk: {
      understandRequirements: {
        summary: "Look up what a product category requires (attributes, guidance, image rules).",
        examples: [
          "What does my Footwear profile require?",
          "Show me the image rules for handbags.",
          "List all my attribute profiles.",
        ],
      },
      monitorSuppliers: {
        summary: "See how retail partners are doing on compliance and where the gaps are.",
        examples: [
          "Which partners are furthest behind on compliance, and on what?",
          "List the open gaps for Macy's.",
          "How are my accessories categories doing?",
        ],
      },
      authorRequirements: {
        summary: "Create and extend requirement profiles conversationally (writes to the demo store).",
        examples: [
          "Set up requirements for a new Swimwear category.",
          "Add a 'Care Instructions' attribute to the Apparel profile.",
          "Require a lifestyle image on Handbags, JPEG, white background.",
        ],
      },
      manageExceptions: {
        summary: "Review and grant vendor exceptions (waivers, extended deadlines, reduced scope).",
        examples: [
          "Show all active vendor exceptions.",
          "Give Nike a 60-day extension on Compression Level.",
        ],
      },
    },
    writeActions: [
      "create_attribute_profile",
      "add_attribute_requirement",
      "set_image_requirement",
      "create_vendor_exception",
    ],
    liveSnapshot: {
      attributeProfiles: store.profiles.map((p) => ({
        name: p.name,
        category: p.category,
        status: p.status,
        brickCode: p.brickCode,
      })),
      retailPartnersWithComplianceData: knownRetailPartners(),
      vendorsWithExceptions: [...new Set(store.exceptions.map((e) => e.vendor))].sort(),
      categoriesWithSupplierData: categoriesWithData,
      gs1Segments: getSegments(),
    },
    note: "All data is mock/demo and watermarked; write tools store changes in memory only and reset periodically. Out of scope in this demo: supplier-side tools, sales/logistics, and anything outside retailer requirements + supplier compliance.",
  }
}

// ── Writes (in-memory demo store) ────────────────────────────────────────────

export function createAttributeProfile(categoryName: string, brickCode: string) {
  const brick = getBrickByCode(brickCode)
  if (!brick) {
    return { error: `Unknown GS1 brick code ${brickCode}. Use search_gs1_bricks to find the right brick first.` }
  }
  const store = getStore()
  const existing = store.profiles.find((p) => p.brickCode === brickCode)
  if (existing) {
    return { error: `A profile for brick ${brickCode} (${existing.name}) already exists. Use add_attribute_requirement or set_image_requirement to extend it.` }
  }
  const profile: AttributeProfile = {
    name: categoryName,
    category: categoryName,
    attributes: `${BASELINE_CORE_ATTRIBUTES.length + brick.extendedAttributes.length} attributes`,
    status: "Draft",
    lastUpdated: today(),
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: brick.brickCode,
    brickName: brick.brickName,
  }
  store.profiles.push(profile)
  return {
    created: profile,
    seededStandardAttributes: brick.extendedAttributes.map((a) => `${a.name} (${a.code})`),
    demo_note: DEMO_NOTE,
  }
}

export function addAttributeRequirement(
  brickCode: string,
  attributeName: string,
  target: "core" | "extended",
  guidance?: string
) {
  const detail = getProfileDetail(brickCode)
  if ("error" in detail) return detail
  const extras = getProfileExtras(brickCode)
  const requirement: AttributeRequirement = {
    name: attributeName,
    gs1Name: attributeName,
    guidance: guidance ?? "",
    source: "custom",
    target,
  }
  extras.customAttributes.push(requirement)
  return { created: requirement, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
}

export function setImageRequirement(brickCode: string, requirement: ImageRequirement) {
  const detail = getProfileDetail(brickCode)
  if ("error" in detail) return detail
  const extras = getProfileExtras(brickCode)
  const idx = extras.imageRequirements.findIndex(
    (r) => r.requirementName.toLowerCase() === requirement.requirementName.toLowerCase()
  )
  const replaced = idx >= 0
  if (replaced) extras.imageRequirements[idx] = requirement
  else extras.imageRequirements.push(requirement)
  return {
    [replaced ? "updated" : "created"]: requirement,
    profileBrickCode: brickCode,
    demo_note: DEMO_NOTE,
  }
}

export function createVendorException(args: {
  vendor: string
  profile: string
  exceptionType: ExceptionType
  attributes: string[]
  validUntil: string
}) {
  const exception: ExceptionRow = {
    ...args,
    status: "Active",
    actions: ["Edit", "Revoke"],
  }
  getStore().exceptions.push(exception)
  return { created: exception, demo_note: DEMO_NOTE }
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
