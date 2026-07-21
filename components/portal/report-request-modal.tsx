"use client"

import { useState } from "react"
import { Check, Globe, Building2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RETAILER_SUPPLIERS, type AttributeProfile } from "@/lib/retailer-requirements"
import { PARTNERS } from "@/lib/partner-filters"
import { SYSTEM_FILTERS, type SystemFilterId } from "@/lib/system-filters"
import type { ReportFilterRef, ReportOptions } from "@/lib/compliance-report"

// What the wizard hands back — page.tsx turns it into a full ReportRequest.
export interface ReportRequestPayload {
  filter: ReportFilterRef
  filterLabel: string
  profileName?: string
  vendorScope?: string
  options: ReportOptions
}

interface ReportRequestModalProps {
  open: boolean
  onClose: () => void
  side: "supplier" | "retailer"
  /** Persona accent: retailer blue #0168B3, supplier green #15803D. */
  accent: string
  /** Retailer side only: the live attribute-profile list. */
  profiles?: AttributeProfile[]
  onSubmit: (payload: ReportRequestPayload) => void
}

// Local copy of the Screen 1 wizard's step indicator, with the active color
// parameterized per persona (the original is private to that screen).
function StepIndicator({ current, accent }: { current: 1 | 2 | 3; accent: string }) {
  const steps = [
    { n: 1, label: "Filter" },
    { n: 2, label: "Options" },
    { n: 3, label: "Review & Run" },
  ] as const

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, i) => {
        const done = current > step.n
        const active = current === step.n
        return (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: done ? "#16A34A" : active ? accent : "#E0E4E8",
                  color: done || active ? "#fff" : "#9CA3AF",
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.n}
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{ color: active ? accent : done ? "#16A34A" : "#9CA3AF" }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-px w-12 mx-1 mb-4"
                style={{ backgroundColor: current > step.n ? "#16A34A" : "#E0E4E8" }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// The retailer's vendor roster for the scope dropdown — names only.
const VENDOR_NAMES = [...new Set(RETAILER_SUPPLIERS.map((s) => s.supplier))]

const selectClass =
  "px-3 py-2 rounded-md text-sm border outline-none bg-white text-[#111827] w-full"

export function ReportRequestModal({
  open,
  onClose,
  side,
  accent,
  profiles = [],
  onSubmit,
}: ReportRequestModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 — filter choice (the legacy System Filter / Account Filter radios)
  const [filterType, setFilterType] = useState<"account" | "system">("account")
  const [accountRetailer, setAccountRetailer] = useState(PARTNERS[0].name)
  const [systemFilterId, setSystemFilterId] = useState<SystemFilterId>(SYSTEM_FILTERS[0].id)
  const [profileName, setProfileName] = useState<string>("all-active")
  const [vendorScope, setVendorScope] = useState<string>("all")

  // Step 2 — legacy report options
  const [maxAttributes, setMaxAttributes] = useState("10")
  const [excludeBefore, setExcludeBefore] = useState("")
  const [ignoreDiscontinued, setIgnoreDiscontinued] = useState(true)

  const activeProfiles = profiles.filter((p) => p.status === "Active")
  const systemFilter = SYSTEM_FILTERS.find((f) => f.id === systemFilterId)!

  const filterLabel =
    filterType === "system"
      ? systemFilter.name
      : side === "supplier"
        ? accountRetailer
        : profileName === "all-active"
          ? "All active profiles"
          : profileName

  function reset() {
    setStep(1)
    setFilterType("account")
    setAccountRetailer(PARTNERS[0].name)
    setSystemFilterId(SYSTEM_FILTERS[0].id)
    setProfileName("all-active")
    setVendorScope("all")
    setMaxAttributes("10")
    setExcludeBefore("")
    setIgnoreDiscontinued(true)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleRun() {
    const parsedMax = parseInt(maxAttributes, 10)
    const filter: ReportFilterRef =
      filterType === "system"
        ? { kind: "system", id: systemFilterId }
        : { kind: "account", retailer: side === "supplier" ? accountRetailer : "Dillard's" }
    onSubmit({
      filter,
      filterLabel,
      profileName: side === "retailer" && filterType === "account" ? profileName : undefined,
      vendorScope: side === "retailer" ? vendorScope : undefined,
      options: {
        maxAttributes: Number.isNaN(parsedMax) ? 10 : Math.max(1, parsedMax),
        excludeUpdatedBefore: excludeBefore || undefined,
        ignoreDiscontinued,
      },
    })
    reset()
    onClose()
  }

  const radioOption = (
    value: "account" | "system",
    label: string,
    description: string,
    Icon: typeof Globe
  ) => (
    <label
      className="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
      style={{
        borderColor: filterType === value ? accent : "#E0E4E8",
        backgroundColor: filterType === value ? "#F8FAFF" : "#FFFFFF",
      }}
    >
      <input
        type="radio"
        name="filter-type"
        value={value}
        checked={filterType === value}
        onChange={() => setFilterType(value)}
        className="mt-0.5"
        style={{ accentColor: accent }}
      />
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-[#111827]">
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          {label}
        </span>
        <span className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>
          {description}
        </span>
      </div>
    </label>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Attribute Filter Compliance Report Request
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} accent={accent} />

        {/* ── Step 1: Filter ── */}
        {step === 1 && (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              {side === "supplier"
                ? "Choose which rules to scan your catalogue against — any retailer's account attribute filter, or a global system filter."
                : "Choose which rules to scan your vendor base against — your own account attribute filters, or a global system filter."}
            </p>

            {radioOption(
              "account",
              "Account Filter",
              side === "supplier"
                ? "A trading partner's bespoke attribute filter — audit your data as that retailer will see it."
                : "Your own attribute profiles — the requirements you publish to suppliers.",
              Building2
            )}
            {radioOption(
              "system",
              "System Filter",
              "A global standard configured by OpenText administrators. Suppliers and retailers evaluate the exact same rule set.",
              Globe
            )}

            {filterType === "account" && side === "supplier" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#111827]">Retailer account filter</label>
                <select
                  value={accountRetailer}
                  onChange={(e) => setAccountRetailer(e.target.value)}
                  className={selectClass}
                  style={{ borderColor: "#E0E4E8" }}
                >
                  {PARTNERS.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — GS1 baseline + {p.extras} extra{p.extras !== 1 ? "s" : ""}
                      {p.name === "Dillard's" ? " (live profiles)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "account" && side === "retailer" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#111827]">Attribute profile</label>
                <select
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={selectClass}
                  style={{ borderColor: "#E0E4E8" }}
                >
                  <option value="all-active">All active profiles ({activeProfiles.length})</option>
                  {activeProfiles.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "system" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#111827]">System attribute filter</label>
                <select
                  value={systemFilterId}
                  onChange={(e) => setSystemFilterId(e.target.value as SystemFilterId)}
                  className={selectClass}
                  style={{ borderColor: "#E0E4E8" }}
                >
                  {SYSTEM_FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                  {systemFilter.description}
                </p>
              </div>
            )}

            {side === "retailer" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#111827]">Vendor scope</label>
                <select
                  value={vendorScope}
                  onChange={(e) => setVendorScope(e.target.value)}
                  className={selectClass}
                  style={{ borderColor: "#E0E4E8" }}
                >
                  <option value="all">All vendors</option>
                  {VENDOR_NAMES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Options ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#111827]">Maximum Attributes to Report</label>
              <input
                type="number"
                min={1}
                max={999}
                value={maxAttributes}
                onChange={(e) => setMaxAttributes(e.target.value)}
                className="px-3 py-2 rounded-md text-sm border outline-none text-[#111827] w-28"
                style={{ borderColor: "#E0E4E8" }}
              />
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                Enter 999 to report all attributes.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#111827]">Exclude items updated before</label>
              <input
                type="date"
                value={excludeBefore}
                onChange={(e) => setExcludeBefore(e.target.value)}
                className="px-3 py-2 rounded-md text-sm border outline-none text-[#111827] w-44"
                style={{ borderColor: "#E0E4E8" }}
              />
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                Leave blank to assess the full catalogue.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreDiscontinued}
                onChange={(e) => setIgnoreDiscontinued(e.target.checked)}
                style={{ accentColor: accent }}
              />
              Ignore discontinued items
            </label>
          </div>
        )}

        {/* ── Step 3: Review & Run ── */}
        {step === 3 && (
          <div className="flex flex-col gap-3 py-1">
            <div
              className="rounded-md p-4 text-sm flex flex-col gap-2"
              style={{ backgroundColor: "#F4F6F8" }}
            >
              {[
                ["Attribute Filter Name", filterLabel],
                ["Attribute Filter Type", filterType === "system" ? "System" : "Account"],
                ...(side === "retailer" ? [["Vendor scope", vendorScope === "all" ? "All vendors" : vendorScope]] : []),
                ["Maximum Attributes to Report", maxAttributes],
                ["Exclude items updated before", excludeBefore || "—"],
                ["Ignore discontinued items", ignoreDiscontinued ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                    {label}
                  </span>
                  <span className="text-xs font-semibold text-right text-[#111827]">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>
              The report runs against the current catalogue state and appears in the queue below —
              open it there for the scorecard and CSV download.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="mt-2">
          <button
            onClick={handleClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>

          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
              style={{ borderColor: "#E0E4E8", color: "#374151" }}
            >
              Back
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Next
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleRun}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Run Report
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
