// Compliance Report engine — types, both evaluation engines, CSV export.
//
// A Compliance Report evaluates a catalogue against ONE attribute filter:
// either a trading partner's Account filter or a global System filter
// (lib/system-filters.ts). The supplier engine scans the supplier's own
// product store (proactive: "fix Retailer A's gaps before Retailer A pulls
// the data"); the retailer engine scans the retailer's vendor base
// (defensive: "surface gaps before ingestion"). Both are pure and
// deterministic — no randomness — so re-running an unchanged catalogue
// always yields the same scorecard, and running after fixing data visibly
// moves the numbers.

import {
  getCategory,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"
import {
  getProfileBricks,
  VENDOR_EXCEPTIONS,
  type AttributeProfile,
  type SupplierComplianceRow,
} from "@/lib/retailer-requirements"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import { assembleBrickAttributes } from "@/lib/mcp/attribute-assembly"
import { resolveAccountFilterAttributes } from "@/lib/partner-filters"
import {
  GUIDANCE_CORE_ATTRIBUTES,
  NRF_AUDIT_ATTRIBUTES,
  getSystemFilter,
  type SystemFilterId,
} from "@/lib/system-filters"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportFilterRef =
  | { kind: "system"; id: SystemFilterId }
  /** Supplier side: whose rules to scan against. Retailer side: always the
   *  retailer's own account — which profile is in `ReportRequest.profileName`. */
  | { kind: "account"; retailer: string }

export type ReportStatus = "Running" | "Complete"

export interface ReportOptions {
  /** Legacy TGC semantics: truncates the ranked missing-attribute list; 999 = all. */
  maxAttributes: number
  /** ISO date (yyyy-mm-dd) or "" — items last updated before this are excluded. */
  excludeUpdatedBefore?: string
  ignoreDiscontinued: boolean
}

export interface RankedAttribute {
  name: string
  code?: string
  /** How many assessed items are missing this attribute. */
  count: number
}

export type ReportRow =
  | {
      kind: "product"
      id: string
      description: string
      category: string
      gaps: number
      missing: string[]
    }
  | {
      kind: "vendor"
      supplier: string
      category: string
      productsTotal: number
      productsComplete: number
      openGaps: number
      pct: number
    }

export interface ReportResult {
  overallPct: number
  itemsAssessed: number
  itemsComplete: number
  totalGaps: number
  excluded: { uncategorised: number; discontinued: number; updatedBefore: number }
  /** Ranked desc by frequency, truncated to `maxAttributes`. */
  missingAttributes: RankedAttribute[]
  /** Distinct missing attributes BEFORE truncation → "top 10 of 23". */
  distinctMissingTotal: number
  byCategory: { category: string; total: number; complete: number; pct: number; gaps: number }[]
  rows: ReportRow[]
}

export interface ReportRequest {
  id: string
  side: "supplier" | "retailer"
  filter: ReportFilterRef
  /** Display string resolved at request time, e.g. "Belk — Account Filter". */
  filterLabel: string
  /** Retailer side, account mode: one profile name or "all-active". */
  profileName?: string
  /** Retailer side: one supplier name or "all". */
  vendorScope?: string
  options: ReportOptions
  requestedBy: string
  requestedAt: string
  status: ReportStatus
  durationMs?: number
  /** Legacy-style generated file name, shown in the parameters popover. */
  fileName: string
  /** Computed eagerly at request time, revealed when status flips to Complete. */
  result: ReportResult
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Gaps beyond the attribute pool fall to image requirements — the same
 *  overflow convention the supplier gap-detail screen uses. */
const IMAGE_OVERFLOW = ["Hero Shot", "Detail Shot"]

// Deterministic pseudo "last updated" dates. The product store doesn't track
// update timestamps, so we derive a stable one per item id: a tiny string
// hash mapped into the ~180 days before a fixed anchor. Fully deterministic —
// moving the exclude-before date visibly changes the assessed count, and
// re-running never reshuffles anything.
const UPDATED_ANCHOR = new Date("2026-03-15T00:00:00Z").getTime()
const DAY_MS = 24 * 60 * 60 * 1000

function pseudoUpdatedAt(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000
  return UPDATED_ANCHOR - (h % 180) * DAY_MS
}

function isExcludedByDate(id: string, excludeUpdatedBefore?: string): boolean {
  if (!excludeUpdatedBefore) return false
  const cutoff = new Date(excludeUpdatedBefore + "T00:00:00Z").getTime()
  if (Number.isNaN(cutoff)) return false
  return pseudoUpdatedAt(id) < cutoff
}

function pct(complete: number, total: number): number {
  return total === 0 ? 0 : Math.round((complete / total) * 100)
}

function rankMissing(
  counts: Map<string, { code?: string; count: number }>,
  maxAttributes: number
): { ranked: RankedAttribute[]; distinct: number } {
  const all = [...counts.entries()]
    .map(([name, { code, count }]) => ({ name, code, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const limit = maxAttributes >= 999 ? all.length : Math.max(1, maxAttributes)
  return { ranked: all.slice(0, limit), distinct: all.length }
}

// ── Supplier engine ───────────────────────────────────────────────────────────

/**
 * The attribute names a product's gap count resolves to under a filter.
 *
 * Account filters: the retailer's extras first, then the GS1 standard
 * extended set (see resolveAccountFilterAttributes), overflowing to image
 * requirements. GS1 Extended: the brick's standard extended set first —
 * the exact slice convention of the gap-detail screen — then images.
 * Core-scoped System filters (GS1 Core / NRF) allocate extended gaps first
 * by convention, so only a product with an unusually deep gap count has any
 * core gaps left over: core scorecards read greener than extended ones,
 * which is the coherent story ("core is nearly done; the work is extended").
 */
function supplierGapAllocation(
  product: SupplierProduct,
  filter: ReportFilterRef,
  rawGaps: number
): { effectiveGaps: number; missing: { name: string; code?: string }[] } {
  const brickCode = product.brickCode ?? ""

  if (filter.kind === "system" && (filter.id === "gs1-core" || filter.id === "nrf-retail-ready")) {
    const pool = (filter.id === "gs1-core" ? GUIDANCE_CORE_ATTRIBUTES : NRF_AUDIT_ATTRIBUTES).map(
      (name) => ({ name })
    )
    const effectiveGaps = Math.min(Math.max(0, rawGaps - 2), pool.length)
    return { effectiveGaps, missing: pool.slice(0, effectiveGaps) }
  }

  const pool =
    filter.kind === "account"
      ? resolveAccountFilterAttributes(filter.retailer, brickCode)
      : (getBrickByCode(brickCode)?.extendedAttributes ?? []).map((a) => ({
          name: a.name,
          code: a.code,
        }))

  const fromPool = Math.min(rawGaps, pool.length)
  const missing = pool.slice(0, fromPool)
  const overflow = Math.min(rawGaps - fromPool, IMAGE_OVERFLOW.length)
  for (let i = 0; i < overflow; i++) missing.push({ name: IMAGE_OVERFLOW[i] })
  return { effectiveGaps: missing.length, missing }
}

/**
 * Scan the supplier's catalogue against one filter. Assessability mirrors
 * getTargetCompletion exactly: only categorised products count, and for an
 * account filter only products that retailer publishes against — so a
 * Dillard's report's assessed count always equals the Compliance screen's
 * Dillard's product count.
 */
export function runSupplierReport(
  products: SupplierProduct[],
  filter: ReportFilterRef,
  options: ReportOptions
): ReportResult {
  const excluded = { uncategorised: 0, discontinued: 0, updatedBefore: 0 }
  const missingCounts = new Map<string, { code?: string; count: number }>()
  const byCat = new Map<string, { total: number; complete: number; gaps: number }>()
  const rows: ReportRow[] = []

  let assessed = 0
  let complete = 0
  let totalGaps = 0

  for (const p of products) {
    const category = getCategory(p)
    if (category === null) {
      excluded.uncategorised++
      continue
    }

    let rawGaps: number
    if (filter.kind === "account") {
      const rs = p.retailers?.find((r) => r.retailer === filter.retailer)
      if (!rs) continue // this retailer publishes nothing against the product
      rawGaps = rs.gaps === "complete" ? 0 : rs.gaps
    } else {
      rawGaps = p.gs1Gaps ?? 0
    }

    if (options.ignoreDiscontinued && p.discontinued) {
      excluded.discontinued++
      continue
    }
    if (isExcludedByDate(p.id, options.excludeUpdatedBefore)) {
      excluded.updatedBefore++
      continue
    }

    const { effectiveGaps, missing } = supplierGapAllocation(p, filter, rawGaps)

    assessed++
    if (effectiveGaps === 0) complete++
    totalGaps += effectiveGaps

    for (const m of missing) {
      const entry = missingCounts.get(m.name) ?? { code: m.code, count: 0 }
      entry.count++
      missingCounts.set(m.name, entry)
    }

    const cat = byCat.get(category) ?? { total: 0, complete: 0, gaps: 0 }
    cat.total++
    if (effectiveGaps === 0) cat.complete++
    cat.gaps += effectiveGaps
    byCat.set(category, cat)

    if (effectiveGaps > 0) {
      rows.push({
        kind: "product",
        id: p.id,
        description: p.description,
        category,
        gaps: effectiveGaps,
        missing: missing.map((m) => m.name),
      })
    }
  }

  rows.sort((a, b) => (b.kind === "product" && a.kind === "product" ? b.gaps - a.gaps : 0))
  const { ranked, distinct } = rankMissing(missingCounts, options.maxAttributes)

  return {
    overallPct: pct(complete, assessed),
    itemsAssessed: assessed,
    itemsComplete: complete,
    totalGaps,
    excluded,
    missingAttributes: ranked,
    distinctMissingTotal: distinct,
    byCategory: [...byCat.entries()]
      .map(([category, c]) => ({ category, ...c, pct: pct(c.complete, c.total) }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    rows,
  }
}

// ── Retailer engine ───────────────────────────────────────────────────────────

/** Attribute names an Active exception row waives for a vendor. Matched by
 *  case-insensitive substring in either direction so "Heel Height" waives
 *  "Heel Height Range" — the exception vocabulary predates the GS1 names. */
function waivedAttributes(supplier: string): string[] {
  return VENDOR_EXCEPTIONS.filter((e) => e.vendor === supplier && e.status === "Active").flatMap(
    (e) => e.attributes
  )
}

function isWaived(name: string, waived: string[]): boolean {
  const n = name.toLowerCase()
  return waived.some((w) => {
    const wl = w.toLowerCase()
    return n.includes(wl) || wl.includes(n)
  })
}

/**
 * Scan the retailer's vendor base. The vendor data is aggregate (per-vendor
 * gap counts, no product rows), so each vendor's openGaps are distributed
 * deterministically across its filter's attribute pool: the first
 * k = min(pool, gaps) attributes share the gaps as evenly as possible, so
 * ranked frequencies always sum exactly to the headline gap total.
 * Attributes waived by an Active vendor exception are removed from that
 * vendor's pool first — a waived attribute never appears as a gap.
 */
export function runRetailerReport(
  suppliers: SupplierComplianceRow[],
  profiles: AttributeProfile[],
  filter: ReportFilterRef,
  profileName: string | "all-active",
  vendorScope: string | "all",
  options: ReportOptions
): ReportResult {
  const excluded = { uncategorised: 0, discontinued: 0, updatedBefore: 0 }

  // Vendor scope, then (account mode) profile scope: only vendors whose GS1
  // category a selected profile actually covers are in the report.
  let scoped = vendorScope === "all" ? suppliers : suppliers.filter((s) => s.supplier === vendorScope)
  if (filter.kind === "account") {
    const coveredBricks = new Set(
      (profileName === "all-active"
        ? profiles.filter((p) => p.status === "Active")
        : profiles.filter((p) => p.name === profileName)
      ).flatMap((p) => getProfileBricks(p).map((b) => b.code))
    )
    scoped = scoped.filter((s) => coveredBricks.has(s.brickCode))
  }

  const missingCounts = new Map<string, { code?: string; count: number }>()
  const byCat = new Map<string, { total: number; complete: number; gaps: number }>()
  const rows: ReportRow[] = []

  let productsTotal = 0
  let productsComplete = 0
  let totalGaps = 0

  for (const s of scoped) {
    if (isExcludedByDate(s.supplier, options.excludeUpdatedBefore)) {
      excluded.updatedBefore++
      continue
    }

    // Attribute pool for this vendor's category under the chosen filter.
    let pool: { name: string; code?: string }[]
    if (filter.kind === "account") {
      pool = assembleBrickAttributes(s.brickCode).extendedAttributes.map((a) => ({
        name: a.name,
        code: a.source === "standard" ? a.gs1Name.match(/\(([^)]+)\)$/)?.[1] : undefined,
      }))
    } else if (filter.id === "gs1-extended") {
      pool = (getBrickByCode(s.brickCode)?.extendedAttributes ?? []).map((a) => ({
        name: a.name,
        code: a.code,
      }))
    } else {
      pool = (filter.id === "gs1-core" ? GUIDANCE_CORE_ATTRIBUTES : NRF_AUDIT_ATTRIBUTES).map(
        (name) => ({ name })
      )
    }
    const waived = waivedAttributes(s.supplier)
    pool = pool.filter((a) => !isWaived(a.name, waived))

    // Distribute this vendor's gaps over the first k pool attributes.
    const gaps = s.openGaps
    const k = Math.min(pool.length, gaps)
    for (let i = 0; i < k; i++) {
      const share = Math.floor(gaps / k) + (i < gaps % k ? 1 : 0)
      const entry = missingCounts.get(pool[i].name) ?? { code: pool[i].code, count: 0 }
      entry.count += share
      missingCounts.set(pool[i].name, entry)
    }

    productsTotal += s.productsTotal
    productsComplete += s.productsComplete
    totalGaps += gaps

    const cat = byCat.get(s.category) ?? { total: 0, complete: 0, gaps: 0 }
    cat.total += s.productsTotal
    cat.complete += s.productsComplete
    cat.gaps += gaps
    byCat.set(s.category, cat)

    rows.push({
      kind: "vendor",
      supplier: s.supplier,
      category: s.category,
      productsTotal: s.productsTotal,
      productsComplete: s.productsComplete,
      openGaps: gaps,
      pct: pct(s.productsComplete, s.productsTotal),
    })
  }

  rows.sort((a, b) => (a.kind === "vendor" && b.kind === "vendor" ? a.pct - b.pct : 0))
  const { ranked, distinct } = rankMissing(missingCounts, options.maxAttributes)

  return {
    overallPct: pct(productsComplete, productsTotal),
    itemsAssessed: productsTotal,
    itemsComplete: productsComplete,
    totalGaps,
    excluded,
    missingAttributes: ranked,
    distinctMissingTotal: distinct,
    byCategory: [...byCat.entries()]
      .map(([category, c]) => ({ category, ...c, pct: pct(c.complete, c.total) }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    rows,
  }
}

// ── Request assembly ──────────────────────────────────────────────────────────

/** Legacy-style report file name, e.g. "JRenee_Belk_Account_20260612-161130.csv". */
export function buildReportFileName(requestedBy: string, filterLabel: string): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "")
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  return `${clean(requestedBy)}_${clean(filterLabel)}_${stamp}.csv`
}

export function describeFilter(filter: ReportFilterRef): string {
  if (filter.kind === "system") return getSystemFilter(filter.id)?.name ?? filter.id
  return filter.retailer
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function reportToCsv(report: ReportRequest): string {
  const escape = (val: string | number) => {
    const s = String(val)
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const line = (...cells: (string | number)[]) => cells.map(escape).join(",")
  const r = report.result

  const lines: string[] = [
    line("Attribute Filter Compliance Report", report.id),
    line("Requested by", report.requestedBy),
    line("Requested at", report.requestedAt),
    line("Attribute Filter Name", report.filterLabel),
    line("Attribute Filter Type", report.filter.kind === "system" ? "System" : "Account"),
    ...(report.profileName ? [line("Attribute Profile", report.profileName)] : []),
    ...(report.vendorScope ? [line("Vendor Scope", report.vendorScope)] : []),
    line("Maximum Attributes to Report", report.options.maxAttributes),
    line("Exclude items updated before", report.options.excludeUpdatedBefore || "—"),
    line("Ignore discontinued items", String(report.options.ignoreDiscontinued)),
    "",
    line("Overall compliance", `${r.overallPct}%`),
    line("Items assessed", r.itemsAssessed),
    line("Items complete", r.itemsComplete),
    line("Open gaps", r.totalGaps),
    line(
      "Excluded",
      `${r.excluded.uncategorised} uncategorised / ${r.excluded.discontinued} discontinued / ${r.excluded.updatedBefore} updated before cutoff`
    ),
    "",
    line("Missing Attribute", "GS1 Code", "Items Missing It"),
    ...r.missingAttributes.map((a) => line(a.name, a.code ?? "", a.count)),
    "",
  ]

  const first = r.rows[0]
  if (first?.kind === "vendor") {
    lines.push(line("Supplier", "Category", "Products", "Complete", "Open Gaps", "% Complete"))
    for (const row of r.rows) {
      if (row.kind !== "vendor") continue
      lines.push(
        line(row.supplier, row.category, row.productsTotal, row.productsComplete, row.openGaps, `${row.pct}%`)
      )
    }
  } else {
    lines.push(line("Product ID", "Description", "Category", "Gaps", "Missing Attributes"))
    for (const row of r.rows) {
      if (row.kind !== "product") continue
      lines.push(line(row.id, row.description, row.category, row.gaps, row.missing.join("; ")))
    }
  }

  return lines.join("\n")
}
