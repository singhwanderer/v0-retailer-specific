// Trend history — one source of truth for both the Dashboard screen and the
// get_compliance_trend MCP tool (lib/mcp/tools.ts).
//
// This prototype has no real compliance history: nothing snapshots a number
// over time. Before this file existed, the dashboard fabricated a trend line
// inside the React component itself (a since-removed buildTrend()), which
// meant no tool could ever read it — the fake data had nowhere to live but
// the render. Moving the same algorithm here doesn't make the history real;
// it makes it a shared, queryable value instead of a rendering side effect,
// which is the difference between "the chart shows a trend" and "the trend
// is data." Every consumer must relay TREND_PROVENANCE — see the tool
// description in lib/mcp/manifest.ts.
//
// The one rule that keeps a conversational answer honest: the algorithm never
// invents "today." It is always anchored to the live percentage the caller
// supplies (from runRetailerReport), and only fabricates the five months
// leading up to it — so a chat answer and the dashboard can never disagree
// about the current number, only about a past nobody actually recorded.

export interface TrendPoint {
  month: string
  pct: number
}

export const TREND_PROVENANCE = "simulated" as const

/** Months: Feb → Jul 2026, matching the dashboard's existing rolling window. */
export const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"]

function seedFrom(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000
  return h
}

/**
 * Deterministic 6-point trend, anchored on `currentPct`. `seedKey` is any
 * stable identity for the series — a supplier name, a profile name, or a
 * System filter id — so unrelated series don't happen to produce the same
 * shape.
 */
function buildTrend(seedKey: string, currentPct: number): TrendPoint[] {
  const seed = seedFrom(seedKey)
  const values: number[] = [currentPct]
  for (let i = 1; i < MONTHS.length; i++) {
    const delta = ((seed * (i + 3)) % 12) - 4 // -4 to +7
    const prev = Math.max(0, Math.min(100, values[0] - delta))
    values.unshift(Math.round(prev))
  }
  return MONTHS.map((month, i) => ({ month, pct: values[i] }))
}

/** Per-supplier trend, as shown on the Dashboard's supplier table. */
export function getSupplierTrend(supplier: string, currentPct: number): TrendPoint[] {
  return buildTrend(supplier, currentPct)
}

/** Per-filter (profile or System filter) aggregate trend, for the MCP tool. */
export function getFilterTrend(filterLabel: string, currentPct: number): TrendPoint[] {
  return buildTrend(filterLabel, currentPct)
}
