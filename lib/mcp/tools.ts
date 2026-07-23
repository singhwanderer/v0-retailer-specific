// Shared tool layer for the TGC demo MCP server.
//
// Pure functions over the prototype's mock data modules. This is the single
// tool inventory described in the README's "Requirement authoring model" and
// "Conversational access (MCP)" sections — consumed both by the external MCP
// endpoint (app/api/[transport]/route.ts) and directly by the portal UI
// (Screen 1/2), which call these same functions as plain client-side calls.

import { getBrickByCode, getSegments, searchBricks } from "@/lib/gs1-standard-library"
import { SUPPLIER_PRODUCTS_SEED } from "@/lib/supplier-catalogue"
import {
  getProfileBricks,
  RETAILER_SUPPLIERS,
  type AttributeProfile,
  type ProfileBrick,
  type ProfileStatus,
} from "@/lib/retailer-requirements"
import {
  getProfileExtras,
  getStore,
  type AttributeRequirement,
  type ImageRequirement,
} from "@/lib/mcp/store"
import {
  assembleBrickAttributes,
  describeProfileAttributes,
  findProfileForBrick,
} from "@/lib/mcp/attribute-assembly"
import { SYSTEM_FILTERS, getSystemFilter, type SystemFilterId } from "@/lib/system-filters"
import { runRetailerReport, type ReportFilterRef } from "@/lib/compliance-report"

const DEMO_NOTE =
  "Demo prototype: this change is stored in the demo server's in-memory data (mock data only, resets periodically). In production this would persist to TGC."

// Distinct supplier names trading under this retailer account. Used both to
// redirect a query that names an unknown supplier and in get_capabilities.
function knownSuppliers(): string[] {
  return [...new Set(RETAILER_SUPPLIERS.map((s) => s.supplier))].sort()
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
  const profile = findProfileForBrick(getStore().profiles, brickCode)
  const brick = getBrickByCode(brickCode)
  if (!profile && !brick) {
    return { error: `No attribute profile or GS1 category found for category code ${brickCode}. Use search_gs1_bricks or list_attribute_profiles to find valid codes.` }
  }
  // Read-only: inspecting a profile must never create store state.
  const { coreAttributes, extendedAttributes, imageRequirements } = assembleBrickAttributes(brickCode)
  return {
    profile: profile ?? { note: "No retailer profile created yet for this GS1 category", brickCode, brickName: brick?.brickName },
    coreAttributes,
    extendedAttributes,
    imageRequirements,
  }
}

export function listMySuppliers() {
  return {
    note: "Compliance for the suppliers trading under your retailer account, ranked by open gaps.",
    suppliers: [...RETAILER_SUPPLIERS]
      .sort((a, b) => b.openGaps - a.openGaps)
      .map(({ supplier, category, brickCode, openGaps, productsWithGaps, productsComplete }) => ({
        supplier,
        category,
        brickCode,
        openGaps,
        productsWithGaps,
        productsComplete,
      })),
  }
}

export function getSupplierCompliance(supplier: string) {
  const q = supplier.toLowerCase().trim()
  const matches = RETAILER_SUPPLIERS.filter((s) => s.supplier.toLowerCase().includes(q))
  if (matches.length === 0) {
    const known = knownSuppliers()
    return {
      matches: [],
      knownSuppliers: known,
      note: `No supplier matched "${supplier}". Suppliers trading under your retailer account: ${known.join(", ")}. (Other retail partners' data is not available through this connector.)`,
    }
  }
  return matches
}

/** The global System attribute filters both sides of the network can run. */
export function listSystemFilters() {
  return SYSTEM_FILTERS.map(({ id, name, description, scope }) => ({ id, name, description, scope }))
}

/**
 * Run a defensive Compliance Report across the retailer's vendor base —
 * the same engine the portal's retailer Compliance Reports screen uses.
 * Stateless read: computed on demand from current data; the portal UI keeps
 * its own report queue, so nothing is persisted here.
 */
export function runComplianceReport(args: {
  systemFilterId?: string
  profileName?: string
  supplier?: string
  maxAttributes?: number
}) {
  const { systemFilterId, profileName, supplier, maxAttributes } = args

  if (systemFilterId && profileName) {
    return { error: "Choose ONE filter mode: either systemFilterId (a global System filter) or profileName (one of your attribute profiles). Omit both to scan against all your active profiles." }
  }

  let filter: ReportFilterRef
  let filterLabel: string
  let resolvedProfile: string = "all-active"

  if (systemFilterId) {
    const sys = getSystemFilter(systemFilterId)
    if (!sys) {
      return { error: `Unknown system filter "${systemFilterId}". Valid ids: ${SYSTEM_FILTERS.map((f) => f.id).join(", ")}.` }
    }
    filter = { kind: "system", id: sys.id as SystemFilterId }
    filterLabel = sys.name
  } else {
    const { profiles } = getStore()
    if (profileName) {
      const match = profiles.find((p) => p.name.toLowerCase() === profileName.toLowerCase().trim())
      if (!match) {
        return { error: `No attribute profile named "${profileName}". Your profiles: ${profiles.map((p) => p.name).join(", ")}.` }
      }
      resolvedProfile = match.name
    }
    filter = { kind: "account", retailer: "Dillard's" }
    filterLabel = profileName ? resolvedProfile : "All active profiles"
  }

  let vendorScope: string = "all"
  if (supplier) {
    const q = supplier.toLowerCase().trim()
    const match = RETAILER_SUPPLIERS.find((s) => s.supplier.toLowerCase().includes(q))
    if (!match) {
      const known = knownSuppliers()
      return {
        knownSuppliers: known,
        note: `No supplier matched "${supplier}". Suppliers trading under your retailer account: ${known.join(", ")}. (Other retail partners' data is not available through this connector.)`,
      }
    }
    vendorScope = match.supplier
  }

  const result = runRetailerReport(
    RETAILER_SUPPLIERS,
    getStore().profiles,
    filter,
    resolvedProfile,
    vendorScope,
    { maxAttributes: maxAttributes ?? 10, ignoreDiscontinued: true }
  )

  return {
    filter: { label: filterLabel, type: filter.kind === "system" ? "System" : "Account" },
    vendorScope: vendorScope === "all" ? "All vendors" : vendorScope,
    ...result,
    demo_note:
      "Computed on demand from mock demo data; nothing is persisted — the portal UI keeps its own report queue. Attributes waived by an Active vendor exception are not counted as gaps.",
  }
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
        summary: "See how your suppliers are doing on compliance and where the gaps are.",
        examples: [
          "Which of my suppliers is furthest behind on compliance, and on what?",
          "How is J.Renée doing on Footwear?",
          "List all my suppliers and their compliance status.",
        ],
      },
      runComplianceReports: {
        summary:
          "Run a compliance report across your vendor base — against one of your attribute profiles or a global System filter (e.g. the GS1 Core Scorecard).",
        examples: [
          "Run a GS1 Core scorecard across my vendor base.",
          "Run a compliance report on J.Renée using my Footwear profile.",
          "Which attributes are my vendors missing most often?",
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
    },
    writeActions: [
      "create_attribute_profile",
      "add_attribute_requirement",
      "set_image_requirement",
    ],
    liveSnapshot: {
      attributeProfiles: store.profiles.map((p) => ({
        name: p.name,
        category: p.category,
        status: p.status,
        brickCode: p.brickCode,
      })),
      mySuppliers: knownSuppliers(),
      categoriesWithSupplierData: categoriesWithData,
      gs1Segments: getSegments(),
      systemFilters: SYSTEM_FILTERS.map((f) => f.id),
    },
    note: "All data is mock/demo and watermarked; write tools store changes in memory only and reset periodically. Out of scope in this demo: supplier-side tools, sales/logistics, and anything outside retailer requirements + supplier compliance.",
  }
}

// ── Writes (in-memory demo store) ────────────────────────────────────────────

/**
 * Create a requirement profile mapped to one or more GS1 bricks. `category`
 * is the free-text product-type label shown in the requirements list —
 * independent of which/how-many bricks are mapped; it defaults to
 * `categoryName` so existing single-argument callers keep working.
 */
export function createAttributeProfile(categoryName: string, brickCodes: string[], category?: string) {
  if (brickCodes.length === 0) {
    return { error: "At least one GS1 category code is required. Use search_gs1_bricks to find one." }
  }
  const bricks = brickCodes.map((code) => getBrickByCode(code))
  const missingIdx = bricks.findIndex((b) => !b)
  if (missingIdx >= 0) {
    return { error: `Unknown GS1 category code ${brickCodes[missingIdx]}. Use search_gs1_bricks to find the right category first.` }
  }
  const resolvedBricks = bricks as NonNullable<(typeof bricks)[number]>[]
  const store = getStore()
  const conflictCode = brickCodes.find((code) => findProfileForBrick(store.profiles, code))
  if (conflictCode) {
    const owner = findProfileForBrick(store.profiles, conflictCode)!
    return { error: `GS1 category ${conflictCode} is already mapped to the "${owner.name}" profile. Use add_attribute_requirement or set_image_requirement to extend it.` }
  }
  const [primary] = resolvedBricks
  const mappedBricks: ProfileBrick[] = resolvedBricks.map((b) => ({ code: b.brickCode, name: b.brickName }))
  const profile: AttributeProfile = {
    name: categoryName,
    category: category ?? categoryName,
    attributes: describeProfileAttributes(mappedBricks),
    status: "Draft",
    lastUpdated: today(),
    actions: ["Edit", "Activate"],
    isLink: true,
    brickCode: primary.brickCode,
    brickName: primary.brickName,
    bricks: mappedBricks,
  }
  store.profiles.push(profile)
  return {
    created: profile,
    seededStandardAttributes: resolvedBricks.flatMap((b) => b.extendedAttributes.map((a) => `${a.name} (${a.code})`)),
    demo_note: DEMO_NOTE,
  }
}

// A write may only extend a profile that actually exists — otherwise the store
// silently grows extras for a category the retailer never set up.
function requireProfile(brickCode: string) {
  const profile = findProfileForBrick(getStore().profiles, brickCode)
  if (!profile) {
    return {
      error: `No attribute profile exists for GS1 category ${brickCode}. Create one first with create_attribute_profile, then add requirements to it.`,
    }
  }
  return null
}

export function addAttributeRequirement(
  brickCode: string,
  attributeName: string,
  target: "core" | "extended",
  guidance?: string
) {
  const missing = requireProfile(brickCode)
  if (missing) return missing
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
  const missing = requireProfile(brickCode)
  if (missing) return missing
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

/**
 * Edit an existing attribute row's label/guidance, whether it's a custom row
 * (mutated in place) or a standard row inherited from the GS1 brick / the
 * global baseline (recorded as an override, since standard rows aren't
 * themselves stored — they're derived live).
 */
export function updateAttributeRequirement(
  brickCode: string,
  gs1Name: string,
  updates: { name?: string; guidance?: string }
) {
  const missing = requireProfile(brickCode)
  if (missing) return missing
  const extras = getProfileExtras(brickCode)
  const idx = extras.customAttributes.findIndex((a) => a.gs1Name === gs1Name)
  if (idx >= 0) {
    extras.customAttributes[idx] = { ...extras.customAttributes[idx], ...updates }
  } else {
    extras.overrides[gs1Name] = { ...extras.overrides[gs1Name], ...updates }
  }
  return { updated: { gs1Name, ...updates }, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
}

/**
 * Remove an attribute row from a profile's requirements — a custom row is
 * deleted outright; a standard row (GS1-inherited or global baseline) can't
 * be deleted since it isn't itself stored, so it's recorded as an exclusion
 * that assembleBrickAttributes filters out instead.
 */
export function removeAttributeRequirement(brickCode: string, gs1Name: string) {
  const missing = requireProfile(brickCode)
  if (missing) return missing
  const extras = getProfileExtras(brickCode)
  const idx = extras.customAttributes.findIndex((a) => a.gs1Name === gs1Name)
  if (idx >= 0) {
    const [removed] = extras.customAttributes.splice(idx, 1)
    return { removed, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
  }
  if (!extras.excludedGs1Names.includes(gs1Name)) {
    extras.excludedGs1Names.push(gs1Name)
  }
  delete extras.overrides[gs1Name]
  return { removed: { gs1Name }, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
