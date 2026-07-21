"use client"

import { useState } from "react"
import { CheckCircle, Download, FileChartColumn, Info, Plus, X } from "lucide-react"
import type { AttributeProfile } from "@/lib/retailer-requirements"
import type { ReportRequest } from "@/lib/compliance-report"
import {
  ReportRequestModal,
  type ReportRequestPayload,
} from "@/components/portal/report-request-modal"
import {
  ReportScorecard,
  FilterTypePill,
  downloadReportCsv,
} from "@/components/portal/report-scorecard"

// ── Compliance Reports — shared queue + scorecard screen ─────────────────────
// One screen serves both personas: the supplier runs proactive scans against
// any retailer's account filter (or a System filter), the retailer runs
// defensive scans of its vendor base against its own profiles (or the same
// System filters). Only the accent color, identity, and request-modal
// contents differ. The queue ↔ scorecard flip is internal state, like
// dialogs owning their open state elsewhere in the portal.

interface ScreenComplianceReportsProps {
  side: "supplier" | "retailer"
  accent: string
  requestedBy: string
  reports: ReportRequest[]
  /** Retailer side: the live attribute-profile list for the request modal. */
  profiles?: AttributeProfile[]
  onRequestReport: (payload: ReportRequestPayload) => string
}

function StatusPill({ status }: { status: ReportRequest["status"] }) {
  const running = status === "Running"
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={
        running
          ? { backgroundColor: "#FEF3C7", color: "#92400E" }
          : { backgroundColor: "#DCFCE7", color: "#15803D" }
      }
    >
      <span
        className={running ? "w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" : "w-1.5 h-1.5 rounded-full shrink-0"}
        style={{ backgroundColor: running ? "#F59E0B" : "#16A34A" }}
      />
      {running ? "Running…" : "Complete"}
    </span>
  )
}

// The legacy product surfaces the full parameter set as a hover card on the
// queue row — modernized here as a click-toggled popover so it also works on
// touch, with the same content: filter name/type, options, and file name.
function ParamsPopover({ report, onClose }: { report: ReportRequest; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Attribute Filter Name", report.filterLabel],
    ["Attribute Filter Type", report.filter.kind === "system" ? "System" : "Account"],
    ...(report.profileName
      ? ([["Attribute Profile", report.profileName === "all-active" ? "All active profiles" : report.profileName]] as [string, string][])
      : []),
    ...(report.vendorScope
      ? ([["Vendor Scope", report.vendorScope === "all" ? "All vendors" : report.vendorScope]] as [string, string][])
      : []),
    ["Maximum Attributes to Report", String(report.options.maxAttributes)],
    ["Exclude items updated before", report.options.excludeUpdatedBefore || "—"],
    ["Ignore discontinued items", report.options.ignoreDiscontinued ? "true" : "false"],
    ["File Name", report.fileName],
  ]
  return (
    <>
      {/* click-away layer */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute z-40 top-full left-0 mt-1 w-96 rounded-lg shadow-lg p-4 flex flex-col gap-2"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E0E4E8" }}
      >
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "#6B7280" }}>
              {label}
            </span>
            <span className="text-[11px] font-semibold text-right break-all text-[#111827]">{value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Toast({ message, accent, onDismiss }: { message: string; accent: string; onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
      style={{ backgroundColor: accent }}
    >
      <CheckCircle className="w-4 h-4 shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ScreenComplianceReports({
  side,
  accent,
  requestedBy,
  reports,
  profiles,
  onRequestReport,
}: ScreenComplianceReportsProps) {
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [paramsFor, setParamsFor] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const selected = reports.find((r) => r.id === selectedReportId)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleSubmit(payload: ReportRequestPayload) {
    const id = onRequestReport(payload)
    showToast(`Report ${id} queued — running against ${payload.filterLabel}.`)
  }

  // ── Scorecard view ──
  if (selected && selected.status === "Complete") {
    return <ReportScorecard report={selected} accent={accent} onBack={() => setSelectedReportId(null)} />
  }

  // ── Queue view ──
  return (
    <div className="p-8 flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#111827]">Compliance Reports</h1>
          <p className="text-sm font-light text-[#6B7280]">
            {side === "supplier"
              ? "Audit your catalogue against any retailer's account attribute filter — or a global system filter — before that retailer ever pulls the data."
              : "Scan your vendor base against your own attribute profiles — or a global system filter — to surface gaps before ingestion."}
          </p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: accent }}
        >
          <Plus className="w-3.5 h-3.5" />
          Request Report
        </button>
      </div>

      {/* Queue */}
      {reports.length === 0 ? (
        <div
          className="rounded-lg flex flex-col items-center gap-3 py-14"
          style={{ border: "1px dashed #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F4F6F8" }}>
            <FileChartColumn className="w-5 h-5" style={{ color: "#9CA3AF" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#111827]">No reports yet</p>
            <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "#6B7280" }}>
              {side === "supplier"
                ? "Request a report to see exactly which required fields are missing for a specific retailer."
                : "Request a report to see which vendors are behind on your requirements, and on what."}
            </p>
          </div>
          <button
            onClick={() => setRequestOpen(true)}
            className="mt-1 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Request Report
          </button>
        </div>
      ) : (
        <div className="rounded-lg overflow-visible" style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
                {["Report", "Filter", "Status", "Requested by", "Requested", "Duration", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => {
                const complete = report.status === "Complete"
                return (
                  <tr
                    key={report.id}
                    style={{ borderBottom: idx < reports.length - 1 ? "1px solid #F3F4F6" : undefined }}
                    className="hover:bg-[#F4F6F8]/40 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {complete ? (
                        <button
                          onClick={() => setSelectedReportId(report.id)}
                          className="font-medium hover:underline"
                          style={{ color: accent }}
                        >
                          {report.id}
                        </button>
                      ) : (
                        <span className="font-medium" style={{ color: "#9CA3AF" }}>
                          {report.id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-flex items-center gap-2">
                        <span className="font-medium text-[#111827]">{report.filterLabel}</span>
                        <FilterTypePill kind={report.filter.kind} />
                        <button
                          onClick={() => setParamsFor(paramsFor === report.id ? null : report.id)}
                          className="transition-opacity hover:opacity-70"
                          title="Report parameters"
                        >
                          <Info className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                        </button>
                        {paramsFor === report.id && (
                          <ParamsPopover report={report} onClose={() => setParamsFor(null)} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={report.status} />
                    </td>
                    <td className="px-4 py-3 font-light text-[#6B7280] whitespace-nowrap">{report.requestedBy}</td>
                    <td className="px-4 py-3 font-light text-[#6B7280] whitespace-nowrap tabular-nums">
                      {report.requestedAt}
                    </td>
                    <td className="px-4 py-3 font-light text-[#6B7280] whitespace-nowrap tabular-nums">
                      {report.durationMs != null ? `${(report.durationMs / 1000).toFixed(1)} sec` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => complete && downloadReportCsv(report)}
                        disabled={!complete}
                        className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-30"
                        style={{ color: accent }}
                        title="Download CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footnote */}
      <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
        Reports run on demand against the current catalogue state — fix a gap or assign a category,
        re-run the same filter, and the numbers move. System filters evaluate the exact same rule
        set on the supplier and retailer side of the network.
      </p>

      {/* Request modal */}
      <ReportRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        side={side}
        accent={accent}
        profiles={profiles}
        onSubmit={handleSubmit}
      />

      {/* Toast */}
      {toast && <Toast message={toast} accent={accent} onDismiss={() => setToast(null)} />}
    </div>
  )
}
