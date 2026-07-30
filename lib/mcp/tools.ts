// Shared tool layer for the TGC demo MCP server.
//
// Pure functions over the prototype's mock data modules. This is the single
// tool inventory described in the README's "Requirement authoring model" and
// "Conversational access (MCP)" sections — consumed both by the external MCP
// endpoint (app/api/[transport]/route.ts) and directly by the portal UI
// (Screen 1/2), which call these same functions as plain client-side calls.
//
// Every function that touches tenant-owned state takes a CallerContext as its
// FIRST parameter and resolves its data through ctx.tenantId. That is what
// makes §4A's per-call tenant check possible: authorization is re-evaluated at
// each invocation (in runGuarded, lib/mcp/guard.ts) rather than being decided
// once when the connection was established. The portal's own in-process calls
// pass PORTAL_CTX, so there is no code path into tenant data without an
// identity attached.
//
// Demo caveat, recorded in docs/mcp-enterprise-auth-trd.md: the supplier
// fixture (RETAILER_SUPPLIERS) is shared across retailer tenants, so two
// retailer tenants see the same vendor list. Isolation is real for everything
// that is *stored* — profiles, profile extras, and vendor exceptions, which is
// where every write lands — and that divergence is what the cross-tenant test
// asserts.

import { getBrickByCode, getSegments } from "@/lib/gs1-standard-library"
import { SUPPLIER_PERSONA, SUPPLIER_PRODUCTS_SEED } from "@/lib/supplier-catalogue"
import {
  RETAILER_SUPPLIERS,
  type AttributeProfile,
  type ProfileBrick,
  type ProfileStatus,
} from "@/lib/retailer-requirements"
import { SCOPES, type CallerContext, type Scope } from "@/lib/mcp/context"
import { getSupplierCapabilities } from "@/lib/mcp/tools-supplier"
import {
  getGlobalImageRequirements,
  getProfileExtras,
  getStore,
  type AttributeRequirement,
  type ImageRequirement,
  type VendorException,
} from "@/lib/mcp/store"
import { listAudit } from "@/lib/mcp/audit"
import {
  assembleBrickAttributes,
  describeProfileAttributes,
  findProfileForBrick,
  describeAvailableCategories,
  mappingConflict,
  resolveGs1Name,
  searchBricksWithMapping,
} from "@/lib/mcp/attribute-assembly"
import { SYSTEM_FILTERS, getSystemFilter, type SystemFilterId } from "@/lib/system-filters"
import { runRetailerReport, type ReportFilterRef } from "@/lib/compliance-report"
import { TREND_PROVENANCE, getFilterTrend, getSupplierTrend } from "@/lib/compliance-history"

const DEMO_NOTE =
  "Demo prototype: this change is stored in the demo server's in-memory data (mock data only, resets periodically). In production this would persist to TGC."

// Distinct supplier names trading under this retailer account. Used both to
// redirect a query that names an unknown supplier and in get_capabilities.
function knownSuppliers(): string[] {
  return [...new Set(RETAILER_SUPPLIERS.map((s) => s.supplier))].sort()
}

// ── Reads ─────────────────────────────────────────────────────────────────────

// Each hit says whether the category is still free to map, and an empty or
// fully-taken result carries a note naming the categories that are — without
// it a caller can only discover a clash by attempting create_attribute_profile
// and being refused (see searchBricksWithMapping).
export function searchGs1Bricks(ctx: CallerContext, query: string) {
  const { matches, note } = searchBricksWithMapping(getStore(ctx.tenantId).profiles, query)
  const shaped = matches.map(({ extendedAttributes, ...b }) => ({
    ...b,
    standardExtendedAttributes: extendedAttributes.map((a) => a.name),
  }))
  return note ? { matches: shaped, note } : shaped
}

export function listAttributeProfiles(ctx: CallerContext, status?: ProfileStatus) {
  const { profiles } = getStore(ctx.tenantId)
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

export function getProfileDetail(ctx: CallerContext, brickCode: string) {
  const profile = findProfileForBrick(getStore(ctx.tenantId).profiles, brickCode)
  const brick = getBrickByCode(brickCode)
  if (!profile && !brick) {
    return { error: `No attribute profile or GS1 category found for category code ${brickCode}. Use search_gs1_bricks or list_attribute_profiles to find valid codes.` }
  }
  // Read-only: inspecting a profile must never create store state.
  const { coreAttributes, extendedAttributes, imageRequirements } = assembleBrickAttributes(brickCode, ctx.tenantId)
  return {
    profile: profile ?? { note: "No retailer profile created yet for this GS1 category", brickCode, brickName: brick?.brickName },
    coreAttributes,
    extendedAttributes,
    imageRequirements,
  }
}

// Deliberately uncapped: this is the fixture for testing whether the agent
// accurately reports/counts/lists a large tool output (~1000 rows, see
// lib/generated-suppliers.ts) rather than hallucinating over it (see
// golden-dataset Template 4 in scripts/generate-golden-dataset.ts). This is
// a permanent product decision, not a bug — don't add a limit here.
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
export function runComplianceReport(ctx: CallerContext, args: {
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
    const { profiles } = getStore(ctx.tenantId)
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
    getStore(ctx.tenantId).profiles,
    filter,
    resolvedProfile,
    vendorScope,
    { maxAttributes: maxAttributes ?? 10, ignoreDiscontinued: true, tenantId: ctx.tenantId }
  )

  return {
    filter: { label: filterLabel, type: filter.kind === "system" ? "System" : "Account" },
    vendorScope: vendorScope === "all" ? "All vendors" : vendorScope,
    ...result,
    demo_note:
      "Computed on demand from mock demo data; nothing is persisted — the portal UI keeps its own report queue. Attributes waived by an Active vendor exception are not counted as gaps.",
  }
}

/**
 * Trend for a filter or a single supplier, anchored to the live percentage
 * `runComplianceReport` would return right now for the same scope. See
 * lib/compliance-history.ts for why this is simulated, not captured, history.
 */
export function getComplianceTrend(ctx: CallerContext, args: {
  systemFilterId?: string
  profileName?: string
  supplier?: string
}) {
  const { systemFilterId, profileName, supplier } = args

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
    const { profiles } = getStore(ctx.tenantId)
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
    getStore(ctx.tenantId).profiles,
    filter,
    resolvedProfile,
    vendorScope,
    { maxAttributes: 10, ignoreDiscontinued: true, tenantId: ctx.tenantId }
  )

  const seedKey = vendorScope === "all" ? filterLabel : vendorScope
  const months =
    vendorScope === "all"
      ? getFilterTrend(seedKey, result.overallPct)
      : getSupplierTrend(seedKey, result.overallPct)

  return {
    filter: { label: filterLabel, type: filter.kind === "system" ? "System" : "Account" },
    vendorScope: vendorScope === "all" ? "All vendors" : vendorScope,
    months,
    provenance: TREND_PROVENANCE,
    asOf: new Date().toISOString().slice(0, 10),
    demo_note:
      "This prototype captures no compliance history — 'months' is generated and anchored to today's live number, not a real historical record. Say so if you relay it.",
  }
}

/** List vendor exceptions on file, optionally filtered by vendor name or status. */
export function listVendorExceptions(ctx: CallerContext, vendor?: string, status?: "Active" | "Expired") {
  const { vendorExceptions } = getStore(ctx.tenantId)
  let matches = vendorExceptions
  if (vendor) {
    const q = vendor.toLowerCase().trim()
    matches = matches.filter((e) => e.vendor.toLowerCase().includes(q))
  }
  if (status) matches = matches.filter((e) => e.status === status)

  if (matches.length === 0) {
    const knownVendors = [...new Set(vendorExceptions.map((e) => e.vendor))].sort()
    return {
      matches: [],
      knownVendorsWithExceptions: knownVendors,
      note: vendor
        ? `No vendor exceptions matched "${vendor}"${status ? ` with status "${status}"` : ""}. Vendors with exceptions on file: ${knownVendors.join(", ")}.`
        : `No vendor exceptions with status "${status}". Call list_vendor_exceptions with no filters to see all ${vendorExceptions.length}.`,
    }
  }
  return matches
}

/**
 * Create or update a vendor exception. Pass `id` (from list_vendor_exceptions)
 * to update an existing exception; omit it to create a new one. `vendor` may be
 * omitted, in which case the exception applies to SUPPLIER_PERSONA (J.Renée) —
 * the supplier this prototype is logged in as, and the only one whose supplier
 * view reflects an exception. `brickCode`
 * scopes the exception to one category — required because a vendor can
 * supply multiple categories (e.g. Calvin Klein: Footwear, Shirts, Dresses),
 * and without an explicit scope a waiver could leak into an unrelated
 * category that happens to share an attribute name.
 * An Active "Attribute Waiver" exception's attributes reduce that vendor's
 * gap count for this exact category in run_compliance_report and the
 * portal's own Compliance Reports/Dashboard screens (Extended Deadline and
 * Reduced Scope exceptions still affect which attribute is named as a gap,
 * but don't reduce the count — see waivedAttributes()/runRetailerReport()
 * in lib/compliance-report.ts).
 */
export function setVendorException(ctx: CallerContext, args: {
  id?: string
  vendor?: string
  brickCode: string
  profile: string
  exceptionType: "Attribute Waiver" | "Extended Deadline" | "Reduced Scope"
  attributes: string[]
  validUntil: string
  status?: "Active" | "Expired"
}) {
  if (args.attributes.length === 0) {
    return { error: "At least one attribute must be listed for the exception (e.g. 'Sustainable Materials Y/N')." }
  }
  const store = getStore(ctx.tenantId)

  // The supplier side of this prototype is logged in as one persona, so an
  // exception granted without naming a vendor is meant for them — that's the
  // only vendor whose supplier view can actually reflect it.
  const vendor = args.vendor?.trim() || SUPPLIER_PERSONA
  const assumedVendor = !args.vendor?.trim()

  if (args.id) {
    const idx = store.vendorExceptions.findIndex((e) => e.id === args.id)
    if (idx < 0) {
      return {
        error: `No vendor exception with id "${args.id}". Use list_vendor_exceptions to find the right id, or omit id to create a new exception.`,
      }
    }
    const updated: VendorException = {
      ...store.vendorExceptions[idx],
      vendor,
      brickCode: args.brickCode,
      profile: args.profile,
      exceptionType: args.exceptionType,
      attributes: args.attributes,
      validUntil: args.validUntil,
      status: args.status ?? store.vendorExceptions[idx].status,
    }
    store.vendorExceptions[idx] = updated
    return { updated, ...(assumedVendor ? { assumedVendor: vendor } : {}), demo_note: DEMO_NOTE }
  }

  const created: VendorException = {
    id: `exc-${Date.now()}-${store.vendorExceptions.length}`,
    vendor,
    brickCode: args.brickCode,
    profile: args.profile,
    exceptionType: args.exceptionType,
    attributes: args.attributes,
    validUntil: args.validUntil,
    status: args.status ?? "Active",
    actions: ["Edit", "Revoke"],
  }
  store.vendorExceptions.push(created)
  return { created, ...(assumedVendor ? { assumedVendor: vendor } : {}), demo_note: DEMO_NOTE }
}

/**
 * What each optional scope unlocks, in the consent screen's own words — so the
 * model can name the exact box a user has to tick rather than inventing a
 * description of it. Keep the labels in step with app/oauth/authorize/route.ts.
 */
const SCOPE_LABELS: Record<string, string> = {
  [SCOPES.requirementsWrite]: "Author requirements — create profiles, add attributes and image rules",
  [SCOPES.exceptionsWrite]: "Grant vendor exceptions — waivers and deadline extensions",
  [SCOPES.activate]: "Activate requirements — start enforcing a profile across your vendor base",
  [SCOPES.destructive]: "Remove requirements and revoke exceptions",
}

// Plain-English catalog of what this connector can do, plus a live snapshot of
// the demo data so the model can answer "what can I ask?" without guessing.
// Built from the store, so it never drifts from the actual seeded data.
//
// Every capability below is gated on the scopes this caller actually holds.
// Advertising an action whose tool is absent from tools/list is worse than
// saying nothing: the model promises the user it can author requirements, finds
// no tool, and reports the connector cannot do it at all.
export function getCapabilities(ctx: CallerContext) {
  // A supplier and a retailer are asking genuinely different questions, and a
  // capability list that describes the wrong half is worse than none — it
  // invites the model to propose tools this caller will be refused for.
  if (ctx.tenantClass === "supplier") return getSupplierCapabilities(ctx)

  const store = getStore(ctx.tenantId)
  const categoriesWithData = [
    ...new Set(
      SUPPLIER_PRODUCTS_SEED.filter((p) => p.brickCode).map(
        (p) => getBrickByCode(p.brickCode!)?.brickName ?? p.brickCode!
      )
    ),
  ].sort()

  const can = (s: Scope) => ctx.scopes.has(s)
  const canAuthor = can(SCOPES.requirementsWrite)
  const canException = can(SCOPES.exceptionsWrite)
  const notGranted = [SCOPES.requirementsWrite, SCOPES.exceptionsWrite, SCOPES.activate, SCOPES.destructive]
    .filter((s) => !can(s))
    .map((s) => ({ scope: s, unlocks: SCOPE_LABELS[s] }))

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
      ...(canAuthor
        ? {
            authorRequirements: {
              summary:
                "Create and extend requirement profiles conversationally (writes to the demo store). A new profile is created as a Draft — nothing is assessed against it until someone activates it, which is a separate permission.",
              examples: [
                "Set up requirements for a new Swimwear category.",
                "Add a 'Care Instructions' attribute to the Apparel profile.",
                "Require a lifestyle image on Handbags, JPEG, white background.",
              ],
            },
          }
        : {}),
      ...(canException
        ? {
            manageExceptions: {
              summary:
                "Grant, look up, or revoke vendor exceptions — waivers, extended deadlines, or reduced scope on specific attributes. Active exceptions reduce that vendor's compliance gap count.",
              examples: [
                "Give Levi's a 60-day extension on sustainable-materials fields.",
                "Show all active exceptions.",
                "Waive the Heel Height requirement for J.Renée.",
              ],
            },
          }
        : {}),
    },
    // Derived from this caller's scopes, so it always matches tools/list.
    writeActions: [
      ...(canAuthor
        ? [
            "create_attribute_profile",
            "add_attribute_requirement",
            "set_image_requirement",
            "update_attribute_requirement",
          ]
        : []),
      ...(canException ? ["set_vendor_exception"] : []),
      ...(canAuthor && can(SCOPES.activate) ? ["activate_profile"] : []),
      ...(canAuthor && can(SCOPES.destructive)
        ? ["remove_attribute_requirement", "remove_image_requirement", "delete_attribute_profile"]
        : []),
      ...(canException && can(SCOPES.destructive) ? ["revoke_vendor_exception"] : []),
    ],
    // Every write is two-phase: the first call previews and returns a token,
    // and only confirm_pending_change applies it. Say so, so the model sets the
    // right expectation instead of reporting a change that has not happened.
    writesRequireConfirmation: true,
    ...(notGranted.length > 0
      ? {
          notGranted,
          howToEnable:
            "These permissions were not granted to this connection. To add one, the user reconnects the TGC connector and ticks that box on the consent screen. Tell them which box; never imply the connector cannot do it at all.",
        }
      : {}),
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
      activeVendorExceptions: store.vendorExceptions.filter((e) => e.status === "Active").length,
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
export function createAttributeProfile(
  ctx: CallerContext,
  categoryName: string,
  brickCodes: string[],
  category?: string
) {
  const bricks = brickCodes.map((code) => getBrickByCode(code))
  const store = getStore(ctx.tenantId)
  if (brickCodes.length === 0) {
    return {
      error:
        `"${categoryName}" is the retailer's own label for the profile and does not have to match a GS1 category name. ` +
        `What is missing is which GS1 category it covers, and that is the user's decision: ask them, offering the ` +
        `categories still free — ${describeAvailableCategories(store.profiles)} ` +
        `They can answer with a category name or its code.`,
    }
  }
  const missingIdx = bricks.findIndex((b) => !b)
  if (missingIdx >= 0) {
    return {
      error:
        `Unknown GS1 category code ${brickCodes[missingIdx]}. Use search_gs1_bricks to find the right category first. ` +
        `Categories still free to map — ${describeAvailableCategories(store.profiles)}`,
    }
  }
  const resolvedBricks = bricks as NonNullable<(typeof bricks)[number]>[]
  const conflict = resolvedBricks.find((b) => findProfileForBrick(store.profiles, b.brickCode))
  if (conflict) {
    const owner = findProfileForBrick(store.profiles, conflict.brickCode)!
    return { error: mappingConflict(store.profiles, conflict, owner.name) }
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
    seededStandardAttributes: resolvedBricks.flatMap((b) => b.extendedAttributes.map((a) => a.name)),
    demo_note: DEMO_NOTE,
  }
}

// A write may only extend a profile that actually exists — otherwise the store
// silently grows extras for a category the retailer never set up.
function requireProfile(ctx: CallerContext, brickCode: string) {
  const profile = findProfileForBrick(getStore(ctx.tenantId).profiles, brickCode)
  if (!profile) {
    return {
      error: `No attribute profile exists for GS1 category ${brickCode}. Create one first with create_attribute_profile, then add requirements to it.`,
    }
  }
  return null
}

export function addAttributeRequirement(
  ctx: CallerContext,
  brickCode: string,
  attributeName: string,
  target: "core" | "extended",
  guidance?: string
) {
  const missing = requireProfile(ctx, brickCode)
  if (missing) return missing
  const extras = getProfileExtras(brickCode, ctx.tenantId)
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

/** The shared/global row this name matches, if any (case-insensitive). */
function findGlobalImageRequirement(requirementName: string, tenantId?: string) {
  const wanted = requirementName.toLowerCase().trim()
  return getGlobalImageRequirements(tenantId).find((r) => r.requirementName.toLowerCase() === wanted)
}

/**
 * Add or edit an image requirement on a category. A name matching a
 * shared/global requirement is recorded as a per-category override (the
 * global row itself isn't stored per category — it's derived live from
 * globalImageRequirements); any other name is a custom row local to this
 * category, added or replaced in place.
 */
export function setImageRequirement(ctx: CallerContext, brickCode: string, requirement: ImageRequirement) {
  const missing = requireProfile(ctx, brickCode)
  if (missing) return missing
  const extras = getProfileExtras(brickCode, ctx.tenantId)
  const global = findGlobalImageRequirement(requirement.requirementName, ctx.tenantId)
  if (global) {
    const { requirementName: _requirementName, source: _source, ...updates } = requirement
    extras.imageOverrides[global.requirementName] = updates
    extras.excludedImageRequirementNames = extras.excludedImageRequirementNames.filter(
      (n) => n !== global.requirementName
    )
    return { updated: requirement, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
  }
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
 * Add or replace a shared image requirement by name — visible to every
 * category unless a category overrides or excludes it.
 */
export function setGlobalImageRequirement(ctx: CallerContext, requirement: ImageRequirement) {
  const store = getStore(ctx.tenantId)
  const idx = store.globalImageRequirements.findIndex(
    (r) => r.requirementName.toLowerCase() === requirement.requirementName.toLowerCase()
  )
  const replaced = idx >= 0
  if (replaced) store.globalImageRequirements[idx] = requirement
  else store.globalImageRequirements.push(requirement)
  return {
    [replaced ? "updated" : "created"]: requirement,
    demo_note: DEMO_NOTE,
  }
}

/** Remove a shared image requirement from the global list (all categories). */
export function removeGlobalImageRequirement(
  ctx: CallerContext,
  requirementName: string
): { error: string } | { removed: ImageRequirement; demo_note: string } {
  const store = getStore(ctx.tenantId)
  const wanted = requirementName.toLowerCase().trim()
  const idx = store.globalImageRequirements.findIndex((r) => r.requirementName.toLowerCase() === wanted)
  if (idx < 0) {
    const names = store.globalImageRequirements.map((r) => r.requirementName)
    return {
      error: `No shared image requirement named "${requirementName}". ${
        names.length ? `Shared image requirements: ${names.join(", ")}.` : "There are no shared image requirements yet."
      }`,
    }
  }
  const [removed] = store.globalImageRequirements.splice(idx, 1)
  return { removed, demo_note: DEMO_NOTE }
}

/**
 * Edit an existing attribute row's label/guidance, whether it's a custom row
 * (mutated in place) or a standard row inherited from the GS1 brick / the
 * global baseline (recorded as an override, since standard rows aren't
 * themselves stored — they're derived live).
 */
export function updateAttributeRequirement(
  ctx: CallerContext,
  brickCode: string,
  gs1Name: string,
  updates: { name?: string; guidance?: string }
) {
  const missing = requireProfile(ctx, brickCode)
  if (missing) return missing
  // Resolve the caller's spelling to the canonical key before touching the
  // store, so an unmatched name is an error rather than an override nothing
  // ever reads.
  const resolved = resolveGs1Name(brickCode, gs1Name, ctx.tenantId)
  if ("error" in resolved) return resolved
  const key = resolved.gs1Name
  const extras = getProfileExtras(brickCode, ctx.tenantId)
  const idx = extras.customAttributes.findIndex((a) => a.gs1Name === key)
  if (idx >= 0) {
    extras.customAttributes[idx] = { ...extras.customAttributes[idx], ...updates }
  } else {
    extras.overrides[key] = { ...extras.overrides[key], ...updates }
  }
  return { updated: { gs1Name: key, ...updates }, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
}

/**
 * Remove an attribute row from a profile's requirements — a custom row is
 * deleted outright; a standard row (GS1-inherited or global baseline) can't
 * be deleted since it isn't itself stored, so it's recorded as an exclusion
 * that assembleBrickAttributes filters out instead.
 *
 * The exclusion branch is why the name has to be resolved first: pushing an
 * unmatched string produces an exclusion that filters nothing, and without a
 * lookup there is no later point at which that reads as a failure.
 */
export function removeAttributeRequirement(ctx: CallerContext, brickCode: string, gs1Name: string) {
  const missing = requireProfile(ctx, brickCode)
  if (missing) return missing
  const resolved = resolveGs1Name(brickCode, gs1Name, ctx.tenantId)
  if ("error" in resolved) return resolved
  const key = resolved.gs1Name
  const extras = getProfileExtras(brickCode, ctx.tenantId)
  const idx = extras.customAttributes.findIndex((a) => a.gs1Name === key)
  if (idx >= 0) {
    const [removed] = extras.customAttributes.splice(idx, 1)
    return { removed, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
  }
  if (!extras.excludedGs1Names.includes(key)) {
    extras.excludedGs1Names.push(key)
  }
  delete extras.overrides[key]
  return { removed: { gs1Name: key }, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
}

/**
 * Remove an image requirement from a category — a custom row is deleted
 * outright; a shared/global row can't be deleted since it isn't itself
 * stored per category, so it's recorded as an exclusion instead.
 */
export function removeImageRequirement(ctx: CallerContext, brickCode: string, requirementName: string) {
  const missing = requireProfile(ctx, brickCode)
  if (missing) return missing
  const extras = getProfileExtras(brickCode, ctx.tenantId)
  const wanted = requirementName.toLowerCase().trim()
  const idx = extras.imageRequirements.findIndex((r) => r.requirementName.toLowerCase() === wanted)
  if (idx >= 0) {
    const [removed] = extras.imageRequirements.splice(idx, 1)
    return { removed, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
  }
  const global = findGlobalImageRequirement(requirementName, ctx.tenantId)
  if (global) {
    if (!extras.excludedImageRequirementNames.includes(global.requirementName)) {
      extras.excludedImageRequirementNames.push(global.requirementName)
    }
    delete extras.imageOverrides[global.requirementName]
    return { removed: global, profileBrickCode: brickCode, demo_note: DEMO_NOTE }
  }
  const names = [...extras.imageRequirements.map((r) => r.requirementName), ...getGlobalImageRequirements(ctx.tenantId).map((r) => r.requirementName)]
  return {
    error: `No image requirement named "${requirementName}" on GS1 category ${brickCode}. ${
      names.length ? `Image requirements here: ${names.join(", ")}.` : "This profile has no image requirements."
    }`,
  }
}

/** Activate, deactivate, or return a profile to Draft. */
export function setProfileStatus(ctx: CallerContext, profileName: string, status: ProfileStatus) {
  const store = getStore(ctx.tenantId)
  const profile = store.profiles.find((p) => p.name.toLowerCase() === profileName.toLowerCase().trim())
  if (!profile) {
    return { error: `No attribute profile named "${profileName}". Your profiles: ${store.profiles.map((p) => p.name).join(", ")}.` }
  }
  const previous = profile.status
  profile.status = status
  profile.lastUpdated = today()
  return {
    updated: { name: profile.name, status, previousStatus: previous },
    demo_note: DEMO_NOTE,
  }
}

/**
 * Delete a requirement profile and the per-brick extras beneath it.
 *
 * The widest-blast-radius write in the inventory: every vendor item in the
 * mapped categories stops being assessed against these rules the moment it
 * lands, which is exactly why it sits behind the destructive scope and the
 * confirmation step rather than alongside "add an attribute".
 */
export function deleteAttributeProfile(ctx: CallerContext, profileName: string) {
  const store = getStore(ctx.tenantId)
  const idx = store.profiles.findIndex((p) => p.name.toLowerCase() === profileName.toLowerCase().trim())
  if (idx < 0) {
    return { error: `No attribute profile named "${profileName}". Your profiles: ${store.profiles.map((p) => p.name).join(", ")}.` }
  }
  const [removed] = store.profiles.splice(idx, 1)
  for (const brick of profileBrickCodes(removed)) delete store.profileExtras[brick]
  return { removed: { name: removed.name, category: removed.category, status: removed.status }, demo_note: DEMO_NOTE }
}

/**
 * Revoke a vendor exception outright, or expire it.
 *
 * "Expire" keeps the row visible with status Expired — the audit-friendly
 * default, since a waiver that once applied is part of how a vendor's past
 * numbers were reached. Deleting removes the record entirely.
 */
export function revokeVendorException(ctx: CallerContext, id: string, mode: "expire" | "delete" = "expire") {
  const store = getStore(ctx.tenantId)
  const idx = store.vendorExceptions.findIndex((e) => e.id === id)
  if (idx < 0) {
    return { error: `No vendor exception with id "${id}". Use list_vendor_exceptions to find the right id.` }
  }
  const row = store.vendorExceptions[idx]
  if (mode === "delete") {
    store.vendorExceptions.splice(idx, 1)
    return { deleted: row, demo_note: DEMO_NOTE }
  }
  const updated: VendorException = { ...row, status: "Expired" }
  store.vendorExceptions[idx] = updated
  return { expired: updated, demo_note: DEMO_NOTE }
}

function profileBrickCodes(profile: AttributeProfile): string[] {
  return profile.bricks?.length ? profile.bricks.map((b) => b.code) : [profile.brickCode]
}

// ── Simulation ───────────────────────────────────────────────────────────────

/**
 * Answer "what would this requirement change do to my vendor base?" without
 * changing anything.
 *
 * This is the question a merchandiser actually has *before* authoring, and no
 * screen in the product answers it: today you add the attribute, run a report,
 * and find out afterwards.
 *
 * ── Why this models the change rather than re-running the engine ─────────────
 * The obvious implementation — apply the change to a copy of the store and diff
 * two real reports — cannot work here, and it is worth saying why rather than
 * shipping something that silently always returns zero. The retailer engine
 * takes each vendor's gap total from the supplier fixture and then *distributes*
 * it across whatever attributes are currently required. Widening or narrowing
 * that pool changes which attribute gets named as the culprit; it cannot change
 * the total, because the total was never derived from the pool.
 *
 * So the two directions are modelled explicitly, from the baseline report:
 *   - Adding a requirement nobody has been asked for yet means every assessed
 *     item is missing it on day one. New gaps = items assessed.
 *   - Removing one clears exactly the gaps currently blamed on it, which the
 *     baseline report already counts per attribute.
 *
 * Both assumptions are returned alongside the numbers, because a forecast whose
 * model is hidden is worse than no forecast.
 */
export function simulateRequirementChange(ctx: CallerContext, args: {
  profileName: string
  attributeName: string
  action?: "add" | "remove"
}) {
  const action = args.action ?? "add"
  const store = getStore(ctx.tenantId)
  const profile = store.profiles.find((p) => p.name.toLowerCase() === args.profileName.toLowerCase().trim())
  if (!profile) {
    return { error: `No attribute profile named "${args.profileName}". Your profiles: ${store.profiles.map((p) => p.name).join(", ")}.` }
  }

  const filter: ReportFilterRef = { kind: "account", retailer: "Dillard's" }
  const before = runRetailerReport(RETAILER_SUPPLIERS, store.profiles, filter, profile.name, "all", {
    maxAttributes: 999,
    ignoreDiscontinued: true,
    tenantId: ctx.tenantId,
  })

  const vendorRows = before.rows.filter(
    (r): r is Extract<typeof r, { kind: "vendor" }> => r.kind === "vendor"
  )

  if (vendorRows.length === 0) {
    return {
      error: `No vendors are assessed against "${profile.name}" today${profile.status !== "Active" ? " — it is a Draft, so nothing is being measured against it yet" : ""}. There is nothing to simulate.`,
    }
  }

  if (action === "add") {
    const alreadyRequired = before.missingAttributes.some(
      (a) => a.name.toLowerCase() === args.attributeName.toLowerCase().trim()
    )
    const newGaps = vendorRows.reduce((sum, r) => sum + r.productsTotal, 0)
    const impact = vendorRows
      .map((r) => ({
        supplier: r.supplier,
        category: r.category,
        itemsAffected: r.productsTotal,
        gapsBefore: r.openGaps,
        gapsAfter: r.openGaps + r.productsTotal,
        wasFullyCompliant: r.openGaps === 0,
      }))
      .sort((a, b) => b.itemsAffected - a.itemsAffected)

    return {
      simulated: { profile: profile.name, action, attribute: args.attributeName },
      alreadyRequired,
      itemsAssessed: before.itemsAssessed,
      gapsBefore: before.totalGaps,
      gapsAfter: before.totalGaps + newGaps,
      gapsDelta: newGaps,
      vendorsAffected: impact.length,
      vendorsNewlyNonCompliant: impact.filter((v) => v.wasFullyCompliant).length,
      vendorImpact: impact.slice(0, 15),
      note: impact.length > 15 ? `Showing the 15 most affected vendors of ${impact.length}.` : undefined,
      assumption:
        "Assumes no supplier is already carrying this attribute, so every assessed item is missing it on day one. That is the worst case and the usual one for a genuinely new requirement — if some suppliers already hold the data, the real increase is smaller.",
      demo_note: "Nothing was changed. This is a forecast against current mock data.",
    }
  }

  const blamed = before.missingAttributes.find(
    (a) => a.name.toLowerCase() === args.attributeName.toLowerCase().trim()
  )
  if (!blamed) {
    return {
      simulated: { profile: profile.name, action, attribute: args.attributeName },
      gapsRemoved: 0,
      note: `"${args.attributeName}" is not currently the cause of any open gaps under "${profile.name}", so removing it would not change the numbers. Attributes currently driving gaps here: ${before.missingAttributes.slice(0, 8).map((a) => a.name).join(", ")}.`,
      demo_note: "Nothing was changed. This is a forecast against current mock data.",
    }
  }

  return {
    simulated: { profile: profile.name, action, attribute: args.attributeName },
    itemsAssessed: before.itemsAssessed,
    gapsBefore: before.totalGaps,
    gapsAfter: Math.max(0, before.totalGaps - blamed.count),
    gapsDelta: -blamed.count,
    warning:
      "Removing a requirement improves the reported number without any supplier supplying anything. It lowers the bar rather than closing a gap — worth being explicit about with whoever asked for it.",
    demo_note: "Nothing was changed. This is a forecast against current mock data.",
  }
}

// ── Vendor outreach ──────────────────────────────────────────────────────────

/**
 * Draft the remediation message for one vendor from their actual open gaps.
 *
 * Read-only on purpose: it drafts, a human sends. Attributes already covered by
 * an Active exception are excluded, because chasing a vendor for something you
 * waived for them is the fastest way to make the whole report untrustworthy.
 */
export function draftVendorOutreach(ctx: CallerContext, args: {
  supplier: string
  tone?: "direct" | "collaborative"
  deadline?: string
}) {
  const q = args.supplier.toLowerCase().trim()
  const matches = RETAILER_SUPPLIERS.filter((s) => s.supplier.toLowerCase().includes(q))
  if (matches.length === 0) {
    const known = knownSuppliers()
    return {
      matches: [],
      knownSuppliers: known,
      note: `No supplier matched "${args.supplier}". Suppliers trading under your retailer account: ${known.join(", ")}.`,
    }
  }
  // A partial name can match several vendors, and the fixture deliberately
  // contains near-duplicates ("Calvin Klein" / "Calvin Klein Performance").
  // Drafting a chase letter to the wrong legal entity is worth one clarifying
  // question, so ask rather than guess.
  const distinct = [...new Set(matches.map((m) => m.supplier))]
  if (distinct.length > 1) {
    return {
      ambiguous: distinct,
      note: `"${args.supplier}" matches ${distinct.length} suppliers: ${distinct.join(", ")}. Name one exactly before drafting outreach.`,
    }
  }

  const supplier = distinct[0]
  const report = runRetailerReport(
    RETAILER_SUPPLIERS,
    getStore(ctx.tenantId).profiles,
    { kind: "account", retailer: "Dillard's" },
    "all-active",
    supplier,
    { maxAttributes: 10, ignoreDiscontinued: true, tenantId: ctx.tenantId }
  )

  const waived = [
    ...new Set(
      getStore(ctx.tenantId)
        .vendorExceptions.filter((e) => e.status === "Active" && e.vendor === supplier)
        .flatMap((e) => e.attributes)
    ),
  ]

  const categories = matches.map((m) => m.category)

  // Do not draft a chase letter with nothing to chase. This fires both when a
  // vendor is genuinely clean and when nothing they supply is covered by an
  // active profile — different causes, so say which.
  if (report.itemsAssessed === 0) {
    return {
      supplier,
      note: `No items of ${supplier}'s are currently assessed against any active profile (${categories.join(", ")}), so there is nothing to raise with them. Check that a profile covering their categories is Active.`,
    }
  }
  if (report.totalGaps === 0) {
    return {
      supplier,
      note: `${supplier} has no open gaps across ${report.itemsAssessed} assessed items — they are fully compliant with what you require today. There is nothing to chase.`,
    }
  }

  const deadline = args.deadline ?? "the end of the current quarter"
  const collaborative = (args.tone ?? "collaborative") === "collaborative"

  const lines = report.missingAttributes.map((a, i) => `${i + 1}. ${a.name} — missing on ${a.count} item${a.count === 1 ? "" : "s"}`)

  const body = [
    `Hello ${supplier} team,`,
    "",
    collaborative
      ? `We're reviewing product data completeness across the categories you supply us (${categories.join(", ")}), and wanted to share where we currently see gaps so we can close them together.`
      : `A review of your product data across ${categories.join(", ")} shows ${report.totalGaps} outstanding attribute gaps across ${report.itemsAssessed} items.`,
    "",
    `Current completeness: ${report.overallPct}% across ${report.itemsAssessed} assessed items, with ${report.totalGaps} open gaps.`,
    "",
    "The attributes most often missing:",
    ...lines,
    "",
    waived.length
      ? `For clarity, the following are covered by an active exception and are not part of this request: ${waived.join(", ")}.`
      : "",
    collaborative
      ? `If any of these are difficult to source on your side, tell us which and we'll look at whether an exception or a phased deadline makes sense. Otherwise we'd like these populated by ${deadline}.`
      : `Please populate these by ${deadline}.`,
    "",
    "Thank you,",
    "Catalogue Operations",
  ]
    .filter((l) => l !== "")
    .join("\n")

  return {
    supplier,
    subject: `Product data completeness — ${categories.join(", ")} (${report.totalGaps} open gaps)`,
    body,
    basedOn: {
      itemsAssessed: report.itemsAssessed,
      openGaps: report.totalGaps,
      compliancePct: report.overallPct,
      topMissingAttributes: report.missingAttributes.map((a) => a.name),
      excludedByActiveException: waived,
    },
    demo_note:
      "Draft only — nothing was sent, and no record of outreach is stored. Attributes under an Active exception for this vendor are excluded from the ask.",
  }
}

// ── Audit ────────────────────────────────────────────────────────────────────

/**
 * Let an administrator ask what their organisation's AI assistants have been
 * doing. Tenant-scoped and admin-only, matching the Access log screen exactly:
 * a capability that reads the audit trail must be governed by the same rules as
 * the screen that reads it, or the connector becomes the way around the gate.
 */
export function queryAccessLog(ctx: CallerContext, args: {
  outcome?: "allowed" | "denied" | "error"
  tool?: string
  limit?: number
}) {
  if (ctx.role !== "admin") {
    return {
      error:
        "The access log records every AI action taken across this organisation, so it is available to administrators only. Your account is a standard user.",
    }
  }

  const limit = Math.min(Math.max(args.limit ?? 25, 1), 100)
  let rows = listAudit(200).filter((e) => e.tenantId === ctx.tenantId)
  if (args.outcome) rows = rows.filter((e) => e.outcome === args.outcome)
  if (args.tool) {
    const q = args.tool.toLowerCase().trim()
    rows = rows.filter((e) => e.tool.toLowerCase().includes(q))
  }

  const truncated = rows.length > limit
  return {
    entries: rows.slice(0, limit).map((e) => ({
      timestamp: e.timestamp,
      actingAs: e.subjectType === "workload" ? `service identity (${e.agentId})` : e.subjectId,
      agent: e.agentId,
      tool: e.tool,
      requiredScope: e.requiredScope,
      outcome: e.outcome,
      reason: e.reason,
    })),
    returned: Math.min(rows.length, limit),
    matched: rows.length,
    truncated,
    note:
      "Only this organisation's activity is visible here, and only to administrators. Calls refused before an identity could be established are deliberately not attributed to any organisation and are not returned — they appear in the portal's Access log under 'Refused before sign-in'.",
  }
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
