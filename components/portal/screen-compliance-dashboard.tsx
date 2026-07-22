"use client"

// Compliance Dashboard — Retailer view
// Static snapshot of all-supplier performance across all categories against
// Dillard's requirements. All data is derived deterministically from the same
// RETAILER_SUPPLIERS + ATTRIBUTE_PROFILES sources used by the rest of the app.

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Package, Users, BarChart2, AlertTriangle } from "lucide-react"
import {
  RETAILER_SUPPLIERS,
  ATTRIBUTE_PROFILES,
  type SupplierComplianceRow,
} from "@/lib/retailer-requirements"
import {
  runRetailerReport,
  type ReportResult,
} from "@/lib/compliance-report"

// ── Static 6-month trend data (seeded per supplier) ─────────────────────────
// Months: Feb → Jul 2026. Values represent % compliance for that month.
// Derived deterministically from supplier names so they don't change between
// renders.
const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"]

function supplierSeed(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000
  return h
}

function buildTrend(supplier: string, currentPct: number): number[] {
  const seed = supplierSeed(supplier)
  // Work backwards from the current month: each prior month was ±3–8% lower
  const trend: number[] = [currentPct]
  for (let i = 1; i < 6; i++) {
    const delta = ((seed * (i + 3)) % 12) - 4 // -4 to +7
    const prev = Math.max(0, Math.min(100, trend[0] - delta))
    trend.unshift(Math.round(prev))
  }
  return trend
}

// ── KPI summary ──────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent: string
}
function KpiCard({ label, value, sub, icon, accent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}18` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#111827] leading-none">{value}</p>
        {sub && <p className="text-xs text-[#9CA3AF] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Mini sparkline (pure SVG) ─────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 64
  const H = 24
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x},${y}`
  })
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Trend arrow ───────────────────────────────────────────────────────────────
function TrendBadge({ values }: { values: number[] }) {
  const delta = values[values.length - 1] - values[0]
  if (delta > 2) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
      <TrendingUp size={12} />+{delta}%
    </span>
  )
  if (delta < -2) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
      <TrendingDown size={12} />{delta}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#9CA3AF]">
      <Minus size={12} />Stable
    </span>
  )
}

// ── Compliance pill ────────────────────────────────────────────────────────────
function CompliancePill({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "#16A34A" :
    pct >= 60 ? "#D97706" :
    "#DC2626"
  const bg =
    pct >= 80 ? "#F0FDF4" :
    pct >= 60 ? "#FFFBEB" :
    "#FEF2F2"
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      {pct}%
    </span>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium text-[#374151] w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Main Dashboard component ──────────────────────────────────────────────────
export function ScreenComplianceDashboard() {
  // Compute the report once using the account filter against all active profiles + all vendors.
  const report: ReportResult = useMemo(() => {
    return runRetailerReport(
      RETAILER_SUPPLIERS,
      ATTRIBUTE_PROFILES,
      { kind: "account", retailer: "Dillard's" },
      "all-active",
      "all",
      { maxAttributes: 10, ignoreDiscontinued: false }
    )
  }, [])

  // Per-supplier rows from the report
  const vendorRows = useMemo(() => {
    return report.rows
      .filter((r) => r.kind === "vendor")
      .map((r) => {
        if (r.kind !== "vendor") return null
        const trend = buildTrend(r.supplier, r.pct)
        return { ...r, trend }
      })
      .filter(Boolean) as Array<Extract<typeof report.rows[number], { kind: "vendor" }> & { trend: number[] }>
  }, [report])

  // Category performance
  const catRows = useMemo(() => {
    return [...report.byCategory].sort((a, b) => a.pct - b.pct)
  }, [report])

  // Top missing attributes (already core-filtered by the engine)
  const topMissing = report.missingAttributes.slice(0, 8)

  const accentBlue = "#0168B3"

  return (
    <div className="p-8 space-y-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Compliance Dashboard</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          All supplier performance across all categories against Dillard&apos;s requirements
        </p>
        <p className="text-xs text-[#9CA3AF] mt-0.5 italic">
          Mock data for illustration only · Snapshot as of Jul 2026
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Overall compliance"
          value={`${report.overallPct}%`}
          sub={`${report.itemsComplete} of ${report.itemsAssessed} products complete`}
          icon={<CheckCircle2 size={20} />}
          accent={accentBlue}
        />
        <KpiCard
          label="Open gaps"
          value={report.totalGaps.toLocaleString()}
          sub={`Across ${vendorRows.length} suppliers`}
          icon={<AlertCircle size={20} />}
          accent="#DC2626"
        />
        <KpiCard
          label="Suppliers tracked"
          value={vendorRows.length}
          sub={`${vendorRows.filter((v) => v.pct >= 80).length} meeting 80% threshold`}
          icon={<Users size={20} />}
          accent="#0168B3"
        />
        <KpiCard
          label="Categories covered"
          value={catRows.length}
          sub={`${catRows.filter((c) => c.pct < 60).length} below 60%`}
          icon={<Package size={20} />}
          accent="#D97706"
        />
      </div>

      {/* Two-column section: supplier table + category chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Supplier performance table (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <Users size={16} className="text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-[#111827]">Supplier Performance</h2>
            <span className="ml-auto text-xs text-[#9CA3AF]">6-month trend</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Supplier</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Compliance</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Gaps</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Trend</th>
                </tr>
              </thead>
              <tbody>
                {vendorRows.map((row, i) => (
                  <tr
                    key={row.supplier}
                    className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {row.pct < 60 && <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />}
                        <span className="font-medium text-[#111827] text-sm">{row.supplier}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#6B7280] truncate max-w-[140px] block">{row.category}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CompliancePill pct={row.pct} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs font-medium text-[#374151]">{row.openGaps}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Sparkline
                          values={row.trend}
                          color={
                            row.trend[5] >= row.trend[0] ? "#16A34A" : "#DC2626"
                          }
                        />
                        <TrendBadge values={row.trend} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category compliance chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <BarChart2 size={16} className="text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-[#111827]">Compliance by Category</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {catRows.map((cat) => {
              const color =
                cat.pct >= 80 ? "#16A34A" :
                cat.pct >= 60 ? "#D97706" :
                "#DC2626"
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#374151] truncate max-w-[160px]">
                      {cat.category}
                    </span>
                    <span className="text-xs text-[#9CA3AF] ml-2">
                      {cat.complete}/{cat.total}
                    </span>
                  </div>
                  <Bar pct={cat.pct} color={color} />
                </div>
              )
            })}
            {catRows.length === 0 && (
              <p className="text-xs text-[#9CA3AF] text-center py-6">No category data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Top missing attributes */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
          <AlertCircle size={16} className="text-[#6B7280]" />
          <h2 className="text-sm font-semibold text-[#111827]">Most Frequently Missing Attributes</h2>
          <span className="ml-auto text-xs text-[#9CA3AF]">
            Top {topMissing.length} of {report.distinctMissingTotal} distinct attributes with gaps
          </span>
        </div>
        <div className="px-5 py-4">
          {topMissing.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] text-center py-6">No missing attributes detected.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topMissing.map((attr, i) => {
                const maxCount = topMissing[0].count
                const barPct = Math.round((attr.count / maxCount) * 100)
                return (
                  <div key={attr.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#9CA3AF] w-4 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#374151] truncate">{attr.name}</span>
                        <span className="text-xs text-[#9CA3AF] ml-2 flex-shrink-0">{attr.count} suppliers</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barPct}%`, backgroundColor: accentBlue }}
                        />
                      </div>
                    </div>
                    {attr.code && (
                      <span className="text-[10px] font-mono text-[#9CA3AF] flex-shrink-0 hidden md:inline">
                        {attr.code}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
