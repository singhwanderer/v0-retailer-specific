// Trend history — one source of truth for both the Dashboard screen and the
// get_compliance_trend MCP tool (lib/mcp/tools.ts).
//
// This prototype still captures no real compliance history: nothing snapshots
// a number over time as it happens. What changed is HOW the missing months
// are produced. The previous version hashed a name into a percentage curve —
// numbers with no relationship to the compliance engine at all. This version
// reconstructs a plausible PAST CATALOGUE STATE for each month (rolling
// productsWithGaps / openGaps / productsComplete backwards along a seeded,
// deterministic trajectory per supplier+category) and then scores each
// reconstructed state with the SAME engine — runRetailerReport — that
// produces today's live number. Every point on the line is genuine engine
// output over some catalogue state; only the five past states themselves are
// synthetic. That is a materially stronger claim than "simulated", which is
// why the provenance tag below changed too — but it is still not captured
// history, and every consumer must relay that distinction. See
// docs/mcp-pm-presentation.md §4 ("The trend finding, stated plainly") and
// Appendix D.1.
//
// The one rule that keeps a conversational answer honest: reconstruction
// never invents "today". Month 0 (this month) is always the live
// RETAILER_SUPPLIERS data, untouched. Only the five months before it are
// rolled backward, so a chat answer and the dashboard can never disagree
// about the current number — only about a past nobody actually recorded.

import { RETAILER_SUPPLIERS, ATTRIBUTE_PROFILES, type AttributeProfile, type SupplierComplianceRow } from "./retailer-requirements"
import { runRetailerReport, type ReportFilterRef, type ReportResult } from "./compliance-report"

export interface TrendPoint {
  month: string
  pct: number
}

export const TREND_PROVENANCE = "reconstructed" as const

/**
 * Rolling 6-month window ending this month, e.g. Feb–Jul for a July "today".
 * Derives from the real clock so the window never goes stale in a doc or a
 * demo run months from now.
 */
export function getTrendMonths(asOf: Date = new Date()): string[] {
  const labels: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1)
    labels.push(d.toLocaleString("en-US", { month: "short" }))
  }
  return labels
}

export const MONTHS = getTrendMonths()

// mulberry32 — same small deterministic PRNG as scripts/generate-suppliers.ts,
// reused here (not imported — that file is a one-shot codegen script, this
// runs per request) so two independently-written generators don't drift.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000
  return h
}

/**
 * Per-(supplier, category) monthly drift, deterministic from the pair's own
 * identity. Roughly 1 in 5 series regresses instead of improving — a chart
 * where every single vendor gets steadily better is an obvious tell that the
 * data is synthetic, and would undercut the "reconstructed, not captured"
 * disclosure the moment someone actually looks at the shape of the line.
 */
function monthlyDriftRate(supplier: string, category: string): number {
  const rand = mulberry32(seedFrom(`${supplier}::${category}`))
  const regressing = rand() < 0.2
  const magnitude = 0.03 + rand() * 0.06 // 3%–9% of the gap closes (or reopens) per month back
  return regressing ? -magnitude : magnitude
}

/**
 * Reconstruct RETAILER_SUPPLIERS as it would plausibly have looked
 * `monthsBack` months ago. monthsBack === 0 returns the live rows,
 * byte-identical, so "today" in the trend is never anything but the real
 * number. productsTotal is held fixed — the variable this reconstructs is
 * DATA COMPLETION, which is what "improving" means for a compliance trend;
 * catalogue growth/shrinkage isn't modelled.
 */
function reconstructSuppliersAt(monthsBack: number): SupplierComplianceRow[] {
  if (monthsBack <= 0) return RETAILER_SUPPLIERS

  return RETAILER_SUPPLIERS.map((row) => {
    const drift = monthlyDriftRate(row.supplier, row.category)
    // Walking backward in time means UNDOING `monthsBack` months of
    // improvement, i.e. the gap fraction was drift*monthsBack HIGHER then.
    const gapFractionNow = row.productsTotal > 0 ? row.productsWithGaps / row.productsTotal : 0
    const gapFractionThen = Math.min(1, Math.max(0, gapFractionNow + drift * monthsBack))

    const productsWithGaps = Math.round(gapFractionThen * row.productsTotal)
    const productsComplete = row.productsTotal - productsWithGaps
    // openGaps scales with productsWithGaps at roughly the same per-vendor
    // gap intensity as today, so a vendor with chronically deep gaps stays
    // that way rather than the reconstruction inventing a different profile.
    const gapIntensity = row.productsWithGaps > 0 ? row.openGaps / row.productsWithGaps : 0
    const openGaps = Math.round(productsWithGaps * gapIntensity)

    return { ...row, productsWithGaps, productsComplete, openGaps }
  })
}

function runAt(
  monthsBack: number,
  filter: ReportFilterRef,
  profileName: string | "all-active",
  vendorScope: string | "all",
  profiles: AttributeProfile[],
  tenantId?: string
): ReportResult {
  return runRetailerReport(
    reconstructSuppliersAt(monthsBack),
    profiles,
    filter,
    profileName,
    vendorScope,
    { maxAttributes: 10, ignoreDiscontinued: true, tenantId }
  )
}

/**
 * Per-supplier trend, as shown on the Dashboard's supplier table sparkline.
 * Deliberately cheap: a supplier's overall pct is exactly
 * productsComplete/productsTotal (see runRetailerReport), so this reads that
 * ratio straight off the reconstructed rows for the six months without
 * re-running the full report engine per row — consistent with the engine by
 * construction, not by re-deriving it 6x per row on every render.
 */
export function getSupplierTrend(supplier: string, currentPct: number): TrendPoint[] {
  const months = getTrendMonths()
  return months.map((month, i) => {
    const monthsBack = months.length - 1 - i
    if (monthsBack === 0) return { month, pct: currentPct }
    const rows = reconstructSuppliersAt(monthsBack).filter((r) => r.supplier === supplier)
    if (rows.length === 0) return { month, pct: currentPct }
    const total = rows.reduce((s, r) => s + r.productsTotal, 0)
    const complete = rows.reduce((s, r) => s + r.productsComplete, 0)
    const pct = total > 0 ? Math.round((complete / total) * 100) : currentPct
    return { month, pct }
  })
}

/**
 * Per-filter (profile or System filter) aggregate trend, for the MCP tool.
 * `currentPct` is the caller's already-computed live number (from
 * runRetailerReport for the same scope) — asserted equal to month 0 here by
 * construction, since month 0 always runs the real, unmodified supplier rows.
 * No seed key needed: unlike the old hash-based version, this reconstructs
 * from the underlying supplier+category trajectories, not from the filter's
 * own name.
 */
export function getFilterTrend(
  currentPct: number,
  filter: ReportFilterRef,
  profileName: string | "all-active",
  vendorScope: string | "all",
  profiles: AttributeProfile[] = ATTRIBUTE_PROFILES,
  tenantId?: string
): TrendPoint[] {
  const months = getTrendMonths()
  return months.map((month, i) => {
    const monthsBack = months.length - 1 - i
    if (monthsBack === 0) return { month, pct: currentPct }
    return { month, pct: runAt(monthsBack, filter, profileName, vendorScope, profiles, tenantId).overallPct }
  })
}

/**
 * Per-supplier, per-category trend — answers "is X vendor improving in Y
 * category?", which the aggregate-only version of this tool couldn't. Scoped
 * with an account-mode filter so byCategory reflects that vendor's own
 * category's attribute pool, then reads that one category's pct out of each
 * reconstructed month.
 */
export function getSupplierCategoryTrend(supplier: string, category: string, currentPct: number): TrendPoint[] {
  const months = getTrendMonths()
  return months.map((month, i) => {
    const monthsBack = months.length - 1 - i
    if (monthsBack === 0) return { month, pct: currentPct }
    const rows = reconstructSuppliersAt(monthsBack).filter((r) => r.supplier === supplier && r.category === category)
    if (rows.length === 0) return { month, pct: currentPct }
    const total = rows.reduce((s, r) => s + r.productsTotal, 0)
    const complete = rows.reduce((s, r) => s + r.productsComplete, 0)
    const pct = total > 0 ? Math.round((complete / total) * 100) : currentPct
    return { month, pct }
  })
}
