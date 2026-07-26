// In-memory demo store for the MCP server.
//
// Seeded from the same mock modules the portal screens render, then mutated
// by the MCP write tools so a "create" followed by a "list" in the same demo
// conversation shows the new data. State lives in module scope: it survives
// while the serverless instance stays warm and resets on cold start — every
// write tool says so in its response.

import { PORTAL_TENANT_ID } from "@/lib/mcp/tenants"
import {
  ATTRIBUTE_PROFILES,
  VENDOR_EXCEPTIONS,
  type AttributeProfile,
  type ExceptionRow,
  type ExceptionType,
} from "@/lib/retailer-requirements"

export interface AttributeRequirement {
  name: string
  gs1Name: string
  guidance: string
  source: "standard" | "custom"
  target: "core" | "extended"
}

export interface ImageRequirement {
  requirementName: string
  format: string
  background: string
  minDimensions: string
  maxFileSize: string
  shapeCrop: string
  guidanceNote?: string
}

export interface ProfileExtras {
  customAttributes: AttributeRequirement[]
  imageRequirements: ImageRequirement[]
  /**
   * Edits to a standard (GS1-inherited or baseline) row — keyed by gs1Name.
   * Standard rows aren't stored themselves (they're derived live from the GS1
   * brick / BASELINE_CORE_ATTRIBUTES), so an edit to one is recorded here
   * instead of mutating a row that doesn't otherwise exist in the store.
   */
  overrides: Record<string, { name?: string; guidance?: string }>
  /**
   * Standard (GS1-inherited or baseline) rows removed from this profile —
   * keyed by gs1Name. Standard rows aren't stored themselves, so removing one
   * is recorded as an exclusion rather than a deletion from an array.
   */
  excludedGs1Names: string[]
}

/** A vendor exception, with the synthetic id the store uses to match a later update. */
export interface VendorException extends ExceptionRow {
  id: string
}

export interface DemoStore {
  profiles: AttributeProfile[]
  /** Keyed by GS1 category (brick) code */
  profileExtras: Record<string, ProfileExtras>
  vendorExceptions: VendorException[]
}

// The 8 baseline core attributes every profile shares, regardless of category
// (mirrors Screen 2's BASELINE_CORE_ROWS).
export const BASELINE_CORE_ATTRIBUTES: AttributeRequirement[] = [
  { name: "Product ID", gs1Name: "Product ID", guidance: "", source: "standard", target: "core" },
  { name: "Product Description", gs1Name: "Product Description", guidance: "", source: "standard", target: "core" },
  { name: "GTIN code", gs1Name: "GTIN code", guidance: "", source: "standard", target: "core" },
  { name: "GTIN Description", gs1Name: "GTIN Description", guidance: "Max 35 characters. Plain language product name.", source: "standard", target: "core" },
  { name: "NRF Size Code", gs1Name: "NRF Size Code", guidance: "Primary and secondary codes both required.", source: "standard", target: "core" },
  { name: "NRF Color Code", gs1Name: "NRF Color Code", guidance: "Must match NRF standard code table. See NRF guide.", source: "standard", target: "core" },
  { name: "Size Description", gs1Name: "Size Description", guidance: "", source: "standard", target: "core" },
  { name: "Color Description", gs1Name: "Color Description", guidance: "Max 10 characters. All caps.", source: "standard", target: "core" },
]

function seed(): DemoStore {
  return {
    profiles: ATTRIBUTE_PROFILES.map((p) => ({ ...p })),
    profileExtras: {
      // Footwear (Shoes - General Purpose, 10001077) ships with the Hero Shot
      // image requirement Screen 2 displays.
      "10001077": {
        customAttributes: [],
        imageRequirements: [
          {
            requirementName: "Hero Shot",
            format: "JPEG",
            background: "Pure white (#FFFFFF)",
            minDimensions: "2000 × 2000 px",
            maxFileSize: "10 MB",
            shapeCrop: "Square, product centered",
            guidanceNote: "No mannequin, no props.",
          },
        ],
        overrides: {},
        excludedGs1Names: [],
      },
    },
    vendorExceptions: VENDOR_EXCEPTIONS.map((e, i) => ({ ...e, id: `seed-${i}` })),
  }
}

// ── Tenant-keyed storage ─────────────────────────────────────────────────────
//
// §4A row 5 requires the tenant to be re-checked on every tool call, which is
// only meaningful if tenants don't share storage in the first place. So the
// store is keyed by tenant rather than being one process-wide singleton.
//
// Honest demo caveats, both recorded in docs/mcp-enterprise-auth-trd.md:
//   - Every tenant seeds from the SAME mock fixture, so two retailer tenants
//     start out looking alike. What proves isolation is divergence: a write
//     made as one tenant is absent for the other. Production tenants hold
//     genuinely distinct data.
//   - This is still process memory. Production needs a real datastore with
//     tenant as a first-class column plus row-level security — per-tenant
//     isolation is not properly testable against module state.

const globalScope = globalThis as typeof globalThis & {
  __tgcDemoStores?: Record<string, DemoStore>
}

/**
 * The demo store for one tenant.
 *
 * `tenantId` defaults to the portal's own tenant so the in-portal prototype
 * (which calls this layer in-process, not over MCP) keeps working unchanged.
 * The MCP path never relies on that default — it always passes the tenant
 * derived from the authenticated identity.
 */
export function getStore(tenantId: string = PORTAL_TENANT_ID): DemoStore {
  globalScope.__tgcDemoStores ??= {}
  globalScope.__tgcDemoStores[tenantId] ??= seed()
  return globalScope.__tgcDemoStores[tenantId]
}

/**
 * Replace the client-side copy of the exception list with the server's.
 *
 * The demo store is a module global, so the browser bundle gets its own copy
 * seeded from VENDOR_EXCEPTIONS and never sees exceptions written by the MCP
 * server, which run in the Node process. The supplier portal polls
 * /api/supplier-exceptions and hands the result here, so a waiver granted in
 * chat shows up in the supplier's gap counts and notifications.
 */
export function hydrateVendorExceptions(exceptions: VendorException[]): void {
  getStore().vendorExceptions = exceptions
}

/** Active exceptions for one vendor — the shape the compliance-report engine needs. */
export function activeExceptionsForVendor(
  vendor: string,
  exceptionType?: ExceptionType,
  tenantId: string = PORTAL_TENANT_ID
): VendorException[] {
  return getStore(tenantId).vendorExceptions.filter(
    (e) =>
      e.status === "Active" &&
      e.vendor.toLowerCase() === vendor.toLowerCase() &&
      (exceptionType === undefined || e.exceptionType === exceptionType)
  )
}

// ── Shared waiver vocabulary ─────────────────────────────────────────────────
// Both gap engines — the retailer one (lib/compliance-report.ts, vendor
// aggregates) and the supplier one (lib/supplier-catalogue.ts, per product) —
// resolve waivers through these two functions, so the two sides can never
// disagree about which attributes an exception covers. They live here because
// supplier-catalogue cannot import compliance-report without a cycle.

/**
 * Case-insensitive substring match in either direction, so an exception naming
 * "Heel Height" also waives "Heel Height Range" — the exception vocabulary
 * predates the GS1 attribute names. Note this is deliberately loose: a name
 * that is a substring of a sibling attribute waives that sibling too, which
 * is why the seed is collision-checked (scripts/check-exception-seed.ts).
 */
export function isAttributeWaived(attributeName: string, waivedNames: string[]): boolean {
  const n = attributeName.toLowerCase()
  return waivedNames.some((w) => {
    const wl = w.toLowerCase()
    return n.includes(wl) || wl.includes(n)
  })
}

/**
 * Attribute names covered by a vendor's Active exceptions. Narrow with
 * `exceptionType` (only "Attribute Waiver" reduces gap counts) and/or
 * `brickCode` (an exception only applies to the category it was scoped to —
 * an exception with no brickCode matches nothing when a brickCode is asked
 * for, so unscoped rows can never reduce a count).
 */
export function waivedAttributeNames(
  vendor: string,
  opts?: { exceptionType?: ExceptionType; brickCode?: string; tenantId?: string }
): string[] {
  return activeExceptionsForVendor(vendor, opts?.exceptionType, opts?.tenantId ?? PORTAL_TENANT_ID)
    .filter((e) => opts?.brickCode === undefined || e.brickCode === opts.brickCode)
    .flatMap((e) => e.attributes)
}

/** Read-only view of a profile's extras — never persists a new entry. */
export function readProfileExtras(brickCode: string, tenantId: string = PORTAL_TENANT_ID): ProfileExtras {
  return (
    getStore(tenantId).profileExtras[brickCode] ?? {
      customAttributes: [],
      imageRequirements: [],
      overrides: {},
      excludedGs1Names: [],
    }
  )
}

/** Mutable extras for a brick — creates and persists an entry if none exists.
 *  Only call from write paths that have already confirmed a profile exists. */
export function getProfileExtras(brickCode: string, tenantId: string = PORTAL_TENANT_ID): ProfileExtras {
  const store = getStore(tenantId)
  store.profileExtras[brickCode] ??= {
    customAttributes: [],
    imageRequirements: [],
    overrides: {},
    excludedGs1Names: [],
  }
  return store.profileExtras[brickCode]
}
