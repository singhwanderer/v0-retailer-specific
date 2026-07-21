// System attribute filters — global, perspective-agnostic rule sets.
//
// In the live TGC product, a Compliance Report can run against either an
// "Account" attribute filter (one trading partner's bespoke rules) or a
// "System" attribute filter (a global standard configured by OpenText
// administrators). This module is the prototype's System-filter catalogue:
// the SAME filter definition is offered to both the supplier and the
// retailer perspective, so both sides demonstrably evaluate the exact same
// rule set without duplicating each other's configuration.

import { getBrickByCode } from "@/lib/gs1-standard-library"
import { BASELINE_CORE_ATTRIBUTES } from "@/lib/mcp/store"

export type SystemFilterId = "gs1-core" | "gs1-extended" | "nrf-retail-ready"

export interface SystemFilter {
  id: SystemFilterId
  name: string
  /** One-liner shown under the filter option in the report request dialog. */
  description: string
  scope: "core" | "core+extended"
}

export const SYSTEM_FILTERS: SystemFilter[] = [
  {
    id: "gs1-core",
    name: "GS1 Core Scorecard",
    description:
      "The 8 baseline core attributes every product needs, regardless of category.",
    scope: "core",
  },
  {
    id: "gs1-extended",
    name: "GS1 Extended Scorecard",
    description:
      "Baseline core plus each GS1 category's standard extended attributes.",
    scope: "core+extended",
  },
  {
    id: "nrf-retail-ready",
    name: "NRF Retail-Ready",
    description:
      "NRF size/color codes and plain-language descriptions required for US retail exchange.",
    scope: "core",
  },
]

export function getSystemFilter(id: string): SystemFilter | undefined {
  return SYSTEM_FILTERS.find((f) => f.id === id)
}

/**
 * The subset of baseline core rows that carry data-entry guidance — the rows
 * a "core" scorecard audits most closely (the identifier rows like Product
 * ID / GTIN code are always present by construction).
 */
export const GUIDANCE_CORE_ATTRIBUTES = [
  "GTIN Description",
  "NRF Size Code",
  "NRF Color Code",
  "Color Description",
] as const

/** The NRF code rows the NRF Retail-Ready filter audits. */
export const NRF_AUDIT_ATTRIBUTES = [
  "NRF Size Code",
  "NRF Color Code",
  "Size Description",
  "Color Description",
] as const

/**
 * The full attribute set a System filter requires for a given GS1 brick —
 * what "this filter's rules" means, identically on either side of the
 * network. Extended rows come from the same GS1 brick library the rest of
 * the prototype reads, so a System scorecard never disagrees with the
 * category screens about what an attribute is called.
 */
export function resolveSystemFilterAttributes(
  id: SystemFilterId,
  brickCode: string
): { name: string; code?: string }[] {
  if (id === "nrf-retail-ready") {
    return NRF_AUDIT_ATTRIBUTES.map((name) => ({ name }))
  }
  const core = BASELINE_CORE_ATTRIBUTES.map((a) => ({ name: a.name }))
  if (id === "gs1-core") return core
  const extended = (getBrickByCode(brickCode)?.extendedAttributes ?? []).map((a) => ({
    name: a.name,
    code: a.code,
  }))
  return [...core, ...extended]
}
