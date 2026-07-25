// What a vendor exception actually *does* to the reported numbers.
//
// Only an Active "Attribute Waiver", scoped to a GS1 category the vendor
// really supplies, and naming at least one attribute in that category's pool,
// reduces a gap count. Everything else either re-ranks which attributes get
// blamed, or does nothing at all. That distinction is invisible from the raw
// row, so the exceptions screen computes it here — using the same matcher the
// engines use, so the explanation can never drift from the behaviour.

import { assembleBrickAttributes } from "@/lib/mcp/attribute-assembly"
import { BASELINE_CORE_ATTRIBUTES, isAttributeWaived, type VendorException } from "@/lib/mcp/store"
import type { SupplierComplianceRow } from "@/lib/retailer-requirements"

/** Core attributes are always populated, so they can never be a gap or a saving. */
const CORE_ATTR_NAMES = new Set(BASELINE_CORE_ATTRIBUTES.map((a) => a.name))

export type ExceptionEffect =
  /** Reduces this vendor's reported gap count in that category. */
  | { kind: "reduces"; gapsRemoved: number }
  /** Active, but the wrong type — changes which attributes are named, not how many are open. */
  | { kind: "reassigns" }
  | {
      kind: "none"
      reason: "expired" | "unscoped" | "no-matching-attributes" | "vendor-has-no-gaps"
    }

/**
 * Mirror of the reduction the retailer engine applies in runRetailerReport:
 * count the attributes in this brick's pool that the exception waives, capped
 * by the gaps the vendor actually has open there.
 */
export function describeExceptionEffect(
  exception: VendorException,
  suppliers: SupplierComplianceRow[]
): ExceptionEffect {
  if (exception.status !== "Active") return { kind: "none", reason: "expired" }
  if (!exception.brickCode) return { kind: "none", reason: "unscoped" }
  if (exception.exceptionType !== "Attribute Waiver") return { kind: "reassigns" }

  const row = suppliers.find(
    (s) => s.supplier === exception.vendor && s.brickCode === exception.brickCode
  )
  if (!row) return { kind: "none", reason: "unscoped" }
  if (row.openGaps === 0) return { kind: "none", reason: "vendor-has-no-gaps" }

  const pool = assembleBrickAttributes(exception.brickCode).extendedAttributes.filter(
    (a) => !CORE_ATTR_NAMES.has(a.name)
  )
  const hits = pool.filter((a) => isAttributeWaived(a.name, exception.attributes)).length
  if (hits === 0) return { kind: "none", reason: "no-matching-attributes" }

  return { kind: "reduces", gapsRemoved: Math.min(hits, row.openGaps) }
}

export function describeEffectText(effect: ExceptionEffect): string {
  switch (effect.kind) {
    case "reduces":
      return `Reduces reported gaps by ${effect.gapsRemoved}`
    case "reassigns":
      return "Re-ranks blame only — does not reduce gap counts"
    case "none":
      switch (effect.reason) {
        case "expired":
          return "No effect — expired"
        case "unscoped":
          return "No effect — not scoped to a category this vendor supplies"
        case "no-matching-attributes":
          return "No effect — no matching attributes in this category"
        case "vendor-has-no-gaps":
          return "No effect — vendor has no open gaps here"
      }
  }
}
