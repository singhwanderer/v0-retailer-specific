"use client"

import { useMemo, useState } from "react"
import { Info, Search } from "lucide-react"

import { RETAILER_SUPPLIERS, type ExceptionType, type ExceptionStatus } from "@/lib/retailer-requirements"
import type { VendorException } from "@/lib/mcp/store"
import { describeExceptionEffect, describeEffectText } from "@/lib/vendor-exceptions"
import { getBrickByCode } from "@/lib/gs1-standard-library"

// ── Vendor-level attribute exceptions — read-only ────────────────────────────
// Authoring exceptions happens conversationally through the AI connector
// (set_vendor_exception); this screen is the record of what's on file and,
// crucially, what each row actually does to the reported numbers. Only an
// Active Attribute Waiver scoped to a category the vendor really supplies
// reduces a gap count — without saying so, a reader reasonably assumes all
// three types behave the same and concludes the dashboard is wrong.

function ExceptionTypePill({ type }: { type: ExceptionType }) {
  const cfg: Record<ExceptionType, { bg: string; text: string }> = {
    "Attribute Waiver": { bg: "#FEF3C7", text: "#92400E" },
    "Extended Deadline": { bg: "#DBEAFE", text: "#1E40AF" },
    "Reduced Scope": { bg: "#F3F4F6", text: "#374151" },
  }
  const { bg, text } = cfg[type]
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {type}
    </span>
  )
}

function StatusPill({ status }: { status: ExceptionStatus }) {
  const cfg: Record<ExceptionStatus, { bg: string; text: string; dot: string }> = {
    Active: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
    Expired: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  }
  const { bg, text, dot } = cfg[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      {status}
    </span>
  )
}

function AttributeChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-xs"
      style={{ backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #E0E4E8" }}
    >
      {label}
    </span>
  )
}

function EffectCell({ exception }: { exception: VendorException }) {
  const effect = describeExceptionEffect(exception, RETAILER_SUPPLIERS)
  const color =
    effect.kind === "reduces" ? "#15803D" : effect.kind === "reassigns" ? "#1E40AF" : "#9CA3AF"
  return (
    <span className="text-xs font-light leading-snug" style={{ color }}>
      {describeEffectText(effect)}
    </span>
  )
}

interface Screen3Props {
  /** Exceptions on file — passed in so the data source stays a single call site. */
  exceptions: VendorException[]
}

export function Screen3VendorExceptions({ exceptions }: Screen3Props) {
  const [query, setQuery] = useState("")

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return exceptions
    return exceptions.filter(
      (e) =>
        e.vendor.toLowerCase().includes(q) ||
        e.profile.toLowerCase().includes(q) ||
        e.attributes.some((a) => a.toLowerCase().includes(q))
    )
  }, [exceptions, query])

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] text-balance">
          Vendor-Level Attribute Exceptions
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
          Requirements relaxed for a specific supplier in a specific category. Exceptions apply
          only to the named vendor and category, and never change the published profile.
        </p>
      </div>

      {/* How exceptions affect the numbers — the thing the raw row doesn't tell you */}
      <div
        className="flex items-start gap-2.5 rounded-md px-4 py-3"
        style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#1E40AF" }}>
          Only an <span className="font-semibold">Active Attribute Waiver</span>, scoped to a
          category the vendor actually supplies, reduces reported gap counts on the Dashboard and
          in Compliance Reports. <span className="font-semibold">Extended Deadline</span> and{" "}
          <span className="font-semibold">Reduced Scope</span> change which attributes get named as
          gaps, but the gaps stay open. Suppliers see the same waivers reflected in their own
          Compliance screens.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 border rounded-md px-3 py-1.5 flex-1 max-w-xs"
          style={{ borderColor: "#E0E4E8" }}
        >
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-[#9CA3AF]"
            placeholder="Search vendor, category or attribute"
          />
        </div>
        <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
          {rows.length} of {exceptions.length} exception{exceptions.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["Vendor", "Category", "Type", "Attributes", "Valid Until", "Status", "Effect"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 font-medium text-[#6B7280] whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-sm font-light text-center"
                  style={{ color: "#9CA3AF" }}
                >
                  No exceptions match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            ) : (
              rows.map((e, i) => {
                const brickName = e.brickCode ? getBrickByCode(e.brickCode)?.brickName : undefined
                return (
                  <tr
                    key={e.id}
                    style={{ borderBottom: i < rows.length - 1 ? "1px solid #F3F4F6" : undefined }}
                  >
                    <td className="px-4 py-3 font-medium text-[#111827] align-top whitespace-nowrap">
                      {e.vendor}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-[#111827]">{e.profile}</span>
                      {brickName && (
                        <span className="block text-[11px] font-light mt-0.5" style={{ color: "#9CA3AF" }}>
                          {brickName} · {e.brickCode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ExceptionTypePill type={e.exceptionType} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="flex flex-wrap gap-1">
                        {e.attributes.map((a) => (
                          <AttributeChip key={a} label={a} />
                        ))}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 align-top font-light whitespace-nowrap"
                      style={{ color: "#6B7280" }}
                    >
                      {e.validUntil}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-4 py-3 align-top max-w-[14rem]">
                      <EffectCell exception={e} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
        Read-only in this prototype. Exceptions are granted and revoked conversationally through
        the AI connector (<span className="font-mono">set_vendor_exception</span>); changes made
        that way appear here on the next reload.
      </p>
    </div>
  )
}
