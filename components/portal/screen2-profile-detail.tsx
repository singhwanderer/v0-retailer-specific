"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"

// ── Required-level badge ──────────────────────────────────────────────────────
// Mandatory  → red asterisk *
// Recommended → amber filled diamond ◆
// Optional   → grey filled circle ●

type RequiredLevel = "Mandatory" | "Recommended" | "Optional"

function RequiredBadge({ level }: { level: RequiredLevel }) {
  if (level === "Mandatory")
    return (
      <span className="text-base font-bold leading-none" style={{ color: "#DC2626" }}>
        *
      </span>
    )
  if (level === "Recommended")
    return (
      <span className="text-sm leading-none" style={{ color: "#F59E0B" }}>
        ◆
      </span>
    )
  return (
    <span className="text-sm leading-none" style={{ color: "#9CA3AF" }}>
      ●
    </span>
  )
}

function RequiredLevelSelect({ value }: { value: RequiredLevel }) {
  const colourMap: Record<RequiredLevel, string> = {
    Mandatory: "#DC2626",
    Recommended: "#F59E0B",
    Optional: "#6B7280",
  }
  return (
    <div className="flex items-center gap-1.5">
      <RequiredBadge level={value} />
      <select
        className="text-xs border rounded px-1.5 py-0.5 cursor-pointer"
        defaultValue={value}
        style={{ borderColor: "#E0E4E8", color: colourMap[value] }}
      >
        <option value="Mandatory">Mandatory</option>
        <option value="Recommended">Recommended</option>
        <option value="Optional">Optional</option>
      </select>
    </div>
  )
}

// ── Attribute row types ───────────────────────────────────────────────────────
interface AttributeRow {
  name: string
  level: RequiredLevel
  guidance: string
}

// ── Group 1 ───────────────────────────────────────────────────────────────────
const group1Rows: AttributeRow[] = [
  { name: "GTIN Description", level: "Mandatory", guidance: "Max 35 characters. Plain language product name." },
  { name: "NRF Color Code", level: "Mandatory", guidance: "Must match NRF standard code table. See NRF guide." },
  { name: "NRF Size Code", level: "Mandatory", guidance: "Primary and secondary codes both required." },
  { name: "Color Description", level: "Mandatory", guidance: "Max 10 characters. All caps." },
  { name: "Size Description", level: "Mandatory", guidance: "" },
  { name: "Country of Origin", level: "Mandatory", guidance: "" },
  { name: "CPSIA Certified Y/N", level: "Mandatory", guidance: "" },
  { name: "Material Country of Origin", level: "Recommended", guidance: "Required if Country of Origin is non-domestic." },
]

// ── Group 2 — 3 visible + 6 hidden ────────────────────────────────────────────
const group2VisibleRows: AttributeRow[] = [
  { name: "Heel Type", level: "Mandatory", guidance: "" },
  { name: "Heel Height", level: "Mandatory", guidance: "" },
  { name: "Toe Shape", level: "Recommended", guidance: "" },
]

// Placeholder rows for "Show 6 more" — confirmed as acceptable placeholders
const group2HiddenRows: AttributeRow[] = [
  { name: "Platform Height", level: "Mandatory", guidance: "" },
  { name: "Outsole Material", level: "Mandatory", guidance: "" },
  { name: "Upper Material", level: "Mandatory", guidance: "" },
  { name: "Lining Material", level: "Recommended", guidance: "" },
  { name: "Closure Type", level: "Recommended", guidance: "" },
  { name: "Shaft Height", level: "Optional", guidance: "" },
]

// ── Attribute table sub-component ────────────────────────────────────────────
function AttributeTable({ rows }: { rows: AttributeRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
          <th className="text-left px-4 py-2.5 font-medium text-[#6B7280] w-[30%]">
            Attribute Name
          </th>
          <th className="text-left px-4 py-2.5 font-medium text-[#6B7280] w-[22%]">
            Required Level
          </th>
          <th className="text-left px-4 py-2.5 font-medium text-[#6B7280]">
            Supplier Guidance Note
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            key={row.name}
            style={{ borderBottom: idx < rows.length - 1 ? "1px solid #F3F4F6" : undefined }}
            className="hover:bg-[#F4F6F8]/40 transition-colors"
          >
            <td className="px-4 py-2.5 font-medium text-[#111827]">{row.name}</td>
            <td className="px-4 py-2.5">
              <RequiredLevelSelect value={row.level} />
            </td>
            <td className="px-4 py-2.5 text-[#6B7280] text-xs leading-relaxed">
              {row.guidance || <span className="text-[#D1D5DB]">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Collapsible group ─────────────────────────────────────────────────────────
interface GroupProps {
  title: string
  count: number
  defaultExpanded?: boolean
  children: React.ReactNode
}

function AttributeGroup({ title, count, defaultExpanded = false, children }: GroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#E0E4E8" }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[#F4F6F8]/60 transition-colors"
        style={{ backgroundColor: "#F9FAFB" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#6B7280]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6B7280]" />
          )}
          <span className="text-sm font-semibold text-[#111827]">{title}</span>
          <span className="text-xs text-[#6B7280]">— {count} attributes</span>
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-medium hover:underline cursor-pointer"
          style={{ color: "#0168B3" }}
        >
          + Add Attribute
        </button>
      </div>
      {expanded && <div className="bg-white">{children}</div>}
    </div>
  )
}

// ── Group 2 with "Show 6 more" ────────────────────────────────────────────────
function Group2() {
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? [...group2VisibleRows, ...group2HiddenRows] : group2VisibleRows
  return (
    <AttributeGroup title="Physical Attributes" count={9} defaultExpanded>
      <AttributeTable rows={rows} />
      {!showAll && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid #F3F4F6" }}>
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-[#6B7280] hover:text-[#111827] hover:underline cursor-pointer transition-colors"
          >
            Show 6 more
          </button>
        </div>
      )}
      {showAll && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid #F3F4F6" }}>
          <button
            onClick={() => setShowAll(false)}
            className="text-xs text-[#6B7280] hover:text-[#111827] hover:underline cursor-pointer transition-colors"
          >
            Show fewer
          </button>
        </div>
      )}
    </AttributeGroup>
  )
}

// ── Right column — Profile summary card ──────────────────────────────────────
function ProfileSummaryCard() {
  return (
    <div
      className="rounded-lg border bg-white overflow-hidden"
      style={{ borderColor: "#E0E4E8", borderTopColor: "#0168B3", borderTopWidth: "4px" }}
    >
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#111827]">Profile Summary</h2>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Attributes Required", value: "34" },
            { label: "Mandatory", value: "26" },
            { label: "Recommended", value: "6" },
            { label: "Optional", value: "2" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-md p-3 flex flex-col gap-0.5"
              style={{ backgroundColor: "#F4F6F8" }}
            >
              <span className="text-[10px] text-[#6B7280] leading-tight">{label}</span>
              <span className="text-xl font-semibold text-[#111827]">{value}</span>
            </div>
          ))}
        </div>

        <hr style={{ borderColor: "#E0E4E8" }} />

        {/* Supplier Visibility */}
        <div>
          <p className="text-xs font-medium text-[#111827] mb-1.5">Supplier Visibility</p>
          <div className="flex items-start gap-2 text-xs text-[#374151] leading-relaxed">
            <span
              className="w-2 h-2 rounded-full mt-0.5 shrink-0"
              style={{ backgroundColor: "#16A34A" }}
            />
            Visible to all Dillard&apos;s suppliers in the Footwear category.
          </div>
        </div>

        <hr style={{ borderColor: "#E0E4E8" }} />

        {/* Compliance Impact */}
        <div>
          <p className="text-xs font-medium text-[#111827] mb-2">Compliance Impact</p>
          <table className="w-full text-xs">
            <tbody>
              {[
                { label: "Suppliers affected", value: "847" },
                { label: "Average current fill rate", value: "41%" },
                { label: "Suppliers meeting profile", value: "312 of 847" },
              ].map(({ label, value }) => (
                <tr key={label} className="border-b last:border-0" style={{ borderColor: "#F3F4F6" }}>
                  <td className="py-1.5 text-[#6B7280]">{label}</td>
                  <td className="py-1.5 text-right font-medium text-[#111827]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Amber callout */}
        <div
          className="rounded-md p-3 text-xs leading-relaxed flex items-start gap-2"
          style={{ backgroundColor: "#FFFBEB", color: "#92400E" }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <span>
            <strong className="font-semibold">535 suppliers</strong> are below profile
            requirements. A compliance gap report can be sent from the Reports section.
          </span>
        </div>

        {/* Compliance gap link */}
        <button
          className="flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer self-start"
          style={{ color: "#0168B3" }}
        >
          View Compliance Gap
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Main Screen 2 ─────────────────────────────────────────────────────────────
interface Screen2Props {
  onBack: () => void
}

export function Screen2ProfileDetail({ onBack }: Screen2Props) {
  return (
    <div className="flex flex-col gap-0 p-8 max-w-[1200px]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-5">
        <button
          onClick={onBack}
          className="hover:underline cursor-pointer"
          style={{ color: "#0168B3" }}
        >
          Attribute Profiles
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[#111827] font-medium">Footwear — Core Compliance</span>
      </nav>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left column — 65% */}
        <div className="flex flex-col gap-5" style={{ flex: "0 0 65%" }}>
          {/* Title row */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[#111827]">
                Footwear — Core Compliance
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                Active
              </span>
              <button className="ml-1 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Category: Footwear · 34 attributes required · Last edited Mar 8, 2026 by{" "}
              <span className="text-[#0168B3]">Anita.Rogers@dillards.com</span>
            </p>
          </div>

          {/* Info banner */}
          <div
            className="flex items-start gap-3 p-3.5 rounded-md text-sm leading-relaxed"
            style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
            <span style={{ color: "#1E40AF" }}>
              Suppliers uploading GTINs in the Footwear category will see these requirements
              and receive warnings for any attributes left empty.
            </span>
          </div>

          {/* Attribute groups */}
          <div className="flex flex-col gap-3">
            {/* Group 1 */}
            <AttributeGroup title="Core Identification" count={8} defaultExpanded>
              <AttributeTable rows={group1Rows} />
            </AttributeGroup>

            {/* Group 2 */}
            <Group2 />

            {/* Group 3 — collapsed */}
            <AttributeGroup title="Packaging & Logistics" count={11}>
              <div />
            </AttributeGroup>

            {/* Group 4 — collapsed */}
            <AttributeGroup title="Sustainability & Compliance" count={6}>
              <div />
            </AttributeGroup>
          </div>

          {/* Add attribute dashed box */}
          <div
            className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6"
            style={{ borderColor: "#E0E4E8" }}
          >
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: "#0168B3" }}
            >
              <Plus className="w-4 h-4" />
              Add Attribute
            </button>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              Search from 700 available AC attributes
            </p>
          </div>

          {/* Bottom action bar */}
          <div
            className="flex items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #E0E4E8" }}
          >
            <button
              className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0168B3" }}
            >
              Save Changes
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium border hover:bg-[#F4F6F8] transition-colors"
              style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              className="ml-auto text-sm font-medium hover:underline cursor-pointer"
              style={{ color: "#DC2626" }}
            >
              Deactivate Profile
            </button>
          </div>
        </div>

        {/* Right column — 35% */}
        <div style={{ flex: "0 0 35%" }}>
          <ProfileSummaryCard />
        </div>
      </div>
    </div>
  )
}
