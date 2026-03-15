"use client"

import { useState } from "react"
import { Plus, Search, X, ChevronDown } from "lucide-react"

// ── Pill components ───────────────────────────────────────────────────────────
type ExceptionType = "Attribute Waiver" | "Extended Deadline" | "Reduced Scope"
type ExceptionStatus = "Active" | "Expired"

function ExceptionTypePill({ type }: { type: ExceptionType }) {
  const cfg: Record<ExceptionType, { bg: string; text: string }> = {
    "Attribute Waiver": { bg: "#FEF3C7", text: "#92400E" },
    "Extended Deadline": { bg: "#DBEAFE", text: "#1E40AF" },
    "Reduced Scope": { bg: "#F3F4F6", text: "#374151" },
  }
  const { bg, text } = cfg[type]
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
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

// ── Table data ────────────────────────────────────────────────────────────────
interface ExceptionRow {
  vendor: string
  profile: string
  exceptionType: ExceptionType
  attributes: string[]
  validUntil: string
  status: ExceptionStatus
  actions: string[]
}

const exceptions: ExceptionRow[] = [
  {
    vendor: "J.Renée",
    profile: "Footwear — Core Compliance",
    exceptionType: "Attribute Waiver",
    attributes: ["Heel Height", "Platform Height"],
    validUntil: "Jun 30, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Levi Strauss & Co.",
    profile: "Apparel — Extended Sustainability",
    exceptionType: "Extended Deadline",
    attributes: ["Sustainable Materials Y/N", "Sustainable Materials Desc"],
    validUntil: "Apr 15, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Fossil Group",
    profile: "Jewellery — Base Requirements",
    exceptionType: "Attribute Waiver",
    attributes: ["CPSIA Certified Y/N"],
    validUntil: "Dec 31, 2026",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
  {
    vendor: "Calvin Klein",
    profile: "Apparel — Extended Sustainability",
    exceptionType: "Extended Deadline",
    attributes: ["Chemical Certifications", "Social Certifications"],
    validUntil: "Mar 1, 2026",
    status: "Expired",
    actions: ["Renew", "Archive"],
  },
  {
    vendor: "York and Jones",
    profile: "Jewellery — Base Requirements",
    exceptionType: "Reduced Scope",
    attributes: ["Gold Karat", "Stone Details", "Stone"],
    validUntil: "Permanent",
    status: "Active",
    actions: ["Edit", "Revoke"],
  },
]

// ── Add Exception Modal ────────────────────────────────────────────────────────
function AddExceptionModal({ onClose }: { onClose: () => void }) {
  const [permanent, setPermanent] = useState(false)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ border: "1px solid #E0E4E8" }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid #E0E4E8" }}
        >
          <h2 className="text-base font-semibold text-[#111827]">Add Vendor Exception</h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="flex flex-col gap-5">
            {/* Row 1: Vendor Name + Affected Profile */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#374151]">
                  Vendor Name <span className="text-[#DC2626]">*</span>
                </label>
                <div
                  className="flex items-center gap-2 border rounded-md px-3 py-2"
                  style={{ borderColor: "#E0E4E8" }}
                >
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                  <input
                    type="text"
                    className="flex-1 text-sm outline-none placeholder:text-[#9CA3AF]"
                    placeholder="Search vendor by name or account ID"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#374151]">
                  Affected Profile <span className="text-[#DC2626]">*</span>
                </label>
                <div
                  className="flex items-center border rounded-md px-3 py-2"
                  style={{ borderColor: "#E0E4E8" }}
                >
                  <select className="flex-1 text-sm outline-none bg-transparent text-[#9CA3AF] cursor-pointer">
                    <option value="">Select profile</option>
                    <option value="footwear">Footwear Core Compliance</option>
                    <option value="apparel">Apparel Extended Sustainability</option>
                    <option value="jewellery">Jewellery Base Requirements</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Attributes to Except + Valid Until */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#374151]">
                  Attributes to Except <span className="text-[#DC2626]">*</span>
                </label>
                <div
                  className="flex items-center gap-2 border rounded-md px-3 py-2 min-h-[38px]"
                  style={{ borderColor: "#E0E4E8" }}
                >
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                  <input
                    type="text"
                    className="flex-1 text-sm outline-none placeholder:text-[#9CA3AF]"
                    placeholder="Search and select attributes"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#374151]">
                  Valid Until <span className="text-[#DC2626]">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    disabled={permanent}
                    className="border rounded-md px-3 py-2 text-sm outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "#E0E4E8" }}
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permanent}
                      onChange={(e) => setPermanent(e.target.checked)}
                      className="cursor-pointer accent-[#0168B3]"
                    />
                    <span className="text-xs text-[#6B7280]">Make permanent</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Internal Reason */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#374151]">
                Internal Reason{" "}
                <span className="text-[#9CA3AF] font-normal">(for audit trail)</span>
              </label>
              <textarea
                className="border rounded-md px-3 py-2 text-sm outline-none resize-none leading-relaxed placeholder:text-[#9CA3AF]"
                style={{ borderColor: "#E0E4E8" }}
                rows={3}
                placeholder="e.g. Brand-specific product construction does not use standard heel height measurement."
              />
            </div>


          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid #E0E4E8" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium border hover:bg-[#F4F6F8] transition-colors cursor-pointer"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: "#0168B3" }}
          >
            Save Exception
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Screen 3 ─────────────────────────────────────────────────────────────
export function Screen3VendorExceptions() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-6 p-8 max-w-7xl">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] text-balance">
            Vendor-Level Attribute Exceptions
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
            Override profile requirements for specific suppliers. Exceptions apply only to
            the named vendor and do not affect the published profile.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
              style={{ backgroundColor: "#0168B3" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Exception
            </button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-3 flex-wrap">
            {["All Profiles", "All Categories", "Status: All"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm cursor-pointer hover:bg-[#F4F6F8] transition-colors"
                style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
              >
                {label}
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            ))}
            <div
              className="flex items-center gap-2 border rounded-md px-3 py-1.5 flex-1 max-w-xs"
              style={{ borderColor: "#E0E4E8" }}
            >
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
              <input
                type="text"
                className="flex-1 text-sm outline-none placeholder:text-[#9CA3AF]"
                placeholder="Search vendor name"
              />
            </div>
          </div>
        </div>

        {/* Exceptions table */}
        <div
          className="rounded-lg border bg-white overflow-hidden"
          style={{ borderColor: "#E0E4E8" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F4F6F8" }}>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Vendor Name</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Affected Profile</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Attributes Affected</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Valid Until</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((row, idx) => (
                <tr
                  key={row.vendor}
                  style={{
                    borderBottom: idx < exceptions.length - 1 ? "1px solid #E0E4E8" : undefined,
                  }}
                  className="hover:bg-[#F4F6F8]/50 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-medium cursor-pointer hover:underline" style={{ color: "#0168B3" }}>
                      {row.vendor}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#374151] text-xs">{row.profile}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {row.attributes.map((attr) => (
                        <AttributeChip key={attr} label={attr} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[#374151] text-xs whitespace-nowrap">
                    {row.validUntil}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {row.actions.map((action, i) => (
                        <span key={action} className="flex items-center gap-3">
                          <button
                            className="text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer text-xs"
                          >
                            {action}
                          </button>
                          {i < row.actions.length - 1 && (
                            <span className="text-[#E0E4E8]">·</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


      </div>

      {/* Modal */}
      {modalOpen && <AddExceptionModal onClose={() => setModalOpen(false)} />}
    </>
  )
}
