// Shared tool layer for the TGC demo MCP server.
//
// Pure functions over the prototype's mock data modules. This is the single
// tool inventory described in docs/mcp-concept.md — consumed today by the
// external MCP endpoint (app/api/[transport]/route.ts) and, in a later phase,
// by an embedded portal assistant.

import { getBrickByCode, searchBricks } from "@/lib/gs1-standard-library"
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
  return status ? profiles.filter((p) => p.status === status) : profiles
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
  const rows = SUPPLIER_PRODUCTS_SEED.flatMap((product) =>
    (product.retailers ?? [])
      .filter((r) => r.gaps !== "complete" && (!vendor || r.retailer.toLowerCase().includes(vendor.toLowerCase())))
      .map((r) => ({
        productId: product.id,
        product: product.description,
        brickCode: product.brickCode,
        category: product.brickCode ? getBrickByCode(product.brickCode)?.brickName : undefined,
        retailer: r.retailer,
        openGaps: r.gaps,
      }))
  )
  return rows.sort((a, b) => (b.openGaps as number) - (a.openGaps as number))
}

export function listVendorExceptions(status?: ExceptionRow["status"], vendor?: string) {
  return getStore().exceptions.filter(
    (e) =>
      (!status || e.status === status) &&
      (!vendor || e.vendor.toLowerCase().includes(vendor.toLowerCase()))
  )
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
