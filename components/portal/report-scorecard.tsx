"use client"

import { ChevronRight, Download, Globe, Building2 } from "lucide-react"
import { reportToCsv, type ReportRequest } from "@/lib/compliance-report"

// ── In-app scorecard for one completed Compliance Report ─────────────────────
// Pure presentational: stat tiles, ranked missing attributes, per-category
// breakdown, and the item rows (product rows on the supplier side, vendor
// rows on the retailer side). Bars are hand-rolled CSS like the rest of the
// portal (components/ui/chart.tsx + recharts exist if a later pass wants
// real charts).

export function downloadReportCsv(report: ReportRequest) {
  const csv = reportToCsv(report)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = report.fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function FilterTypePill({ kind }: { kind: "system" | "account" }) {
  const cfg =
    kind === "system"
      ? { bg: "#F3E8FF", text: "#7E22CE", Icon: Globe, label: "System" }
      : { bg: "#EFF6FF", text: "#0168B3", Icon: Building2, label: "Account" }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function toneFor(pct: number): string {
  return pct === 100 ? "#16A34A" : pct >= 50 ? "#0168B3" : "#F59E0B"
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg p-4 flex-1 min-w-[10rem]"
      style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-[#111827]">{value}</span>
      {sub && (
        <span className="text-[11px] font-light" style={{ color: "#6B7280" }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

interface ReportScorecardProps {
  report: ReportRequest
  accent: string
  onBack: () => void
}

export function ReportScorecard({ report, accent, onBack }: ReportScorecardProps) {
  const r = report.result
  const itemNoun = report.side === "supplier" ? "products" : "vendor products"
  const maxCount = r.missingAttributes[0]?.count ?? 1
  const excludedTotal = r.excluded.uncategorised + r.excluded.discontinued + r.excluded.updatedBefore
  const truncated = r.missingAttributes.length < r.distinctMissingTotal

  const optionSummary = [
    `Max ${report.options.maxAttributes >= 999 ? "all" : report.options.maxAttributes} attributes`,
    report.options.excludeUpdatedBefore
      ? `excluding items updated before ${report.options.excludeUpdatedBefore}`
      : null,
    report.options.ignoreDiscontinued ? "discontinued excluded" : "discontinued included",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="p-8 flex flex-col gap-6 max-w-5xl">
      {/* Breadcrumb + header */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button onClick={onBack} className="hover:underline" style={{ color: accent }}>
          Compliance Reports
        </button>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
        <span className="text-[#6B7280]">{report.id}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-[#111827]">{report.filterLabel}</h1>
            <FilterTypePill kind={report.filter.kind} />
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#16A34A" }} />
              Complete
            </span>
          </div>
          {/* Run parameters travel with the results — which rules produced this scorecard */}
          <p className="text-xs font-light" style={{ color: "#6B7280" }}>
            Run against: {report.filterLabel} · {report.filter.kind === "system" ? "System" : "Account"}{" "}
            filter{report.vendorScope && report.vendorScope !== "all" ? ` · Vendor: ${report.vendorScope}` : ""} ·{" "}
            {optionSummary}
          </p>
          <p className="text-xs font-light" style={{ color: "#9CA3AF" }}>
            Requested by {report.requestedBy} · {report.requestedAt}
          </p>
        </div>
        <button
          onClick={() => downloadReportCsv(report)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: accent }}
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </div>

      {/* Summary band */}
      <div className="flex gap-4 flex-wrap">
        <div
          className="flex flex-col gap-2 rounded-lg p-4 flex-1 min-w-[12rem]"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
            Overall compliance
          </span>
          <span className="text-2xl font-semibold tabular-nums" style={{ color: toneFor(r.overallPct) }}>
            {r.overallPct}%
          </span>
          <MiniBar pct={r.overallPct} color={toneFor(r.overallPct)} />
        </div>
        <StatTile
          label="Items assessed"
          value={String(r.itemsAssessed)}
          sub={`${r.itemsComplete} complete ${itemNoun}`}
        />
        <StatTile label="Open gaps" value={String(r.totalGaps)} sub="against this filter" />
        <StatTile
          label="Excluded"
          value={String(excludedTotal)}
          sub={`${r.excluded.uncategorised} uncategorised · ${r.excluded.discontinued} discontinued · ${r.excluded.updatedBefore} before cutoff`}
        />
      </div>

      {/* Top missing attributes */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
          <h2 className="text-sm font-medium text-[#111827]">Top missing attributes</h2>
        </div>
        {r.missingAttributes.length === 0 ? (
          <p className="px-4 py-6 text-sm font-light text-center" style={{ color: "#9CA3AF" }}>
            No missing attributes — every assessed item satisfies this filter.
          </p>
        ) : (
          <div className="flex flex-col">
            {r.missingAttributes.map((a, i) => (
              <div
                key={a.name}
                className="flex items-center gap-3 px-4 py-2"
                style={{
                  borderBottom: i < r.missingAttributes.length - 1 ? "1px solid #F3F4F6" : undefined,
                }}
              >
                <span className="text-xs font-light tabular-nums w-5 shrink-0" style={{ color: "#9CA3AF" }}>
                  {i + 1}
                </span>
                <div className="w-52 shrink-0 flex flex-col">
                  <span className="text-sm font-medium text-[#111827] truncate">{a.name}</span>
                </div>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((a.count / maxCount) * 100)}%`, backgroundColor: "#F59E0B" }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums w-10 text-right shrink-0 text-[#111827]">
                  {a.count}
                </span>
              </div>
            ))}
          </div>
        )}
        {truncated && (
          <p
            className="px-4 py-2.5 text-[11px] font-light"
            style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
          >
            Showing top {r.missingAttributes.length} of {r.distinctMissingTotal} missing attributes
            (Maximum Attributes to Report: {report.options.maxAttributes}). Set 999 to report all.
          </p>
        )}
      </div>

      {/* By category */}
      {r.byCategory.length > 0 && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
            <h2 className="text-sm font-medium text-[#111827]">By category</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
                {["Category", "Items", "Complete", "% Complete", "Gaps"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-[#6B7280] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.byCategory.map((c, i) => (
                <tr key={c.category} style={{ borderBottom: i < r.byCategory.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                  <td className="px-4 py-2.5 font-medium text-[#111827]">{c.category}</td>
                  <td className="px-4 py-2.5 tabular-nums font-light text-[#6B7280]">{c.total}</td>
                  <td className="px-4 py-2.5 tabular-nums font-light text-[#6B7280]">{c.complete}</td>
                  <td className="px-4 py-2.5 w-48">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums w-9" style={{ color: toneFor(c.pct) }}>
                        {c.pct}%
                      </span>
                      <div className="flex-1">
                        <MiniBar pct={c.pct} color={toneFor(c.pct)} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-light text-[#6B7280]">{c.gaps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item rows */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
          <h2 className="text-sm font-medium text-[#111827]">
            {report.side === "supplier" ? "Products with gaps" : "Vendors"}
          </h2>
        </div>
        {r.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm font-light text-center" style={{ color: "#9CA3AF" }}>
            {report.side === "supplier" ? "No products have gaps against this filter." : "No vendors in scope."}
          </p>
        ) : report.side === "supplier" ? (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
                {["Product ID", "Description", "Category", "Gaps", "Missing"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-[#6B7280] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map(
                (row, i) =>
                  row.kind === "product" && (
                    <tr key={row.id} style={{ borderBottom: i < r.rows.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                      <td className="px-4 py-2.5 font-medium text-[#111827] whitespace-nowrap">{row.id}</td>
                      <td className="px-4 py-2.5 font-light text-[#6B7280]">{row.description}</td>
                      <td className="px-4 py-2.5 font-light text-[#6B7280] whitespace-nowrap">{row.category}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#F59E0B" }} />
                          {row.gaps} gap{row.gaps !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-light text-xs" style={{ color: "#6B7280" }}>
                        {row.missing.join(", ")}
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
                {["Supplier", "Category", "Products", "Complete", "Open Gaps", "% Complete"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-[#6B7280] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map(
                (row, i) =>
                  row.kind === "vendor" && (
                    <tr key={row.supplier} style={{ borderBottom: i < r.rows.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                      <td className="px-4 py-2.5 font-medium text-[#111827] whitespace-nowrap">{row.supplier}</td>
                      <td className="px-4 py-2.5 font-light text-[#6B7280]">{row.category}</td>
                      <td className="px-4 py-2.5 tabular-nums font-light text-[#6B7280]">{row.productsTotal}</td>
                      <td className="px-4 py-2.5 tabular-nums font-light text-[#6B7280]">{row.productsComplete}</td>
                      <td className="px-4 py-2.5 tabular-nums font-light text-[#6B7280]">{row.openGaps}</td>
                      <td className="px-4 py-2.5 w-48">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums w-9" style={{ color: toneFor(row.pct) }}>
                            {row.pct}%
                          </span>
                          <div className="flex-1">
                            <MiniBar pct={row.pct} color={toneFor(row.pct)} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footnote */}
      <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
        {report.filter.kind === "system"
          ? "System attribute filters are configured globally: a supplier and a retailer running this same filter evaluate the exact same rule set, with no duplicated configuration on either side."
          : report.side === "supplier"
            ? "Account attribute filters are each retailer's bespoke rules. Re-run this report with another retailer's filter to isolate trading-partner-specific gaps before that retailer ever pulls the data."
            : "This report evaluates your vendors' canonical data against your own attribute profiles. Attributes waived by an active vendor exception are not counted as gaps."}
      </p>
    </div>
  )
}
