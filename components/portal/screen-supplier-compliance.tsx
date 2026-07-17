"use client"

import { BadgeCheck } from "lucide-react"
import {
  countBaselineGaps,
  countUncategorised,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"

// ── Merged Compliance list ────────────────────────────────────────────────────
// Evolved from the former Trading Partners screen: the same list of retailers
// who publish requirements against this account, now preceded by GS1 Standard
// as "row zero" — the baseline every product is assessed against. Each row is a
// compliance target that drills into the same product-and-gaps leaf.

interface SupplierComplianceProps {
  products: SupplierProduct[]
  onSelectGs1: () => void
  onSelectPartner: (partnerId: string, partnerName: string) => void
}

type Partner = {
  id: string
  name: string
  accountNumber: string
  activeSince: string
  selectionCodes: number
  totalGaps: number
  completeCodes: number
  /** Retailer-specific attributes required on top of the GS1 baseline */
  extras: number
}

const PARTNERS: Partner[] = [
  {
    id: "dillards",
    name: "Dillard's",
    accountNumber: "8712345000001",
    activeSince: "Mar 2019",
    selectionCodes: 3,
    totalGaps: 8,
    completeCodes: 1,
    extras: 3,
  },
  {
    id: "belk",
    name: "Belk",
    accountNumber: "8712345000042",
    activeSince: "Jan 2021",
    selectionCodes: 2,
    totalGaps: 0,
    completeCodes: 2,
    extras: 1,
  },
  {
    id: "nordstrom",
    name: "Nordstrom",
    accountNumber: "8712345000078",
    activeSince: "Jun 2020",
    selectionCodes: 4,
    totalGaps: 14,
    completeCodes: 2,
    extras: 5,
  },
]

// Reused from the former Trading Partners screen — the retailer-row status pill.
function ComplianceSummary({ gaps, complete, total }: { gaps: number; complete: number; total: number }) {
  const allComplete = gaps === 0
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
      style={
        allComplete
          ? { backgroundColor: "#DCFCE7", color: "#15803D" }
          : { backgroundColor: "#FEF3C7", color: "#92400E" }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: allComplete ? "#16A34A" : "#F59E0B" }}
      />
      {allComplete
        ? `${complete} of ${total} codes complete`
        : `${gaps} gaps across ${total - complete} code${total - complete !== 1 ? "s" : ""}`}
    </span>
  )
}

function Pill({ tone, label }: { tone: "green" | "amber" | "red"; label: string }) {
  const cfg = {
    green: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
    amber: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
    red: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  }[tone]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {label}
    </span>
  )
}

export function ScreenSupplierCompliance({
  products,
  onSelectGs1,
  onSelectPartner,
}: SupplierComplianceProps) {
  // GS1 row-zero status derived live from the shared catalogue
  const gs1Stats = {
    uncategorised: countUncategorised(products),
    baselineGaps: countBaselineGaps(products),
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">Compliance</h1>
        <p className="text-sm font-light text-[#6B7280]">
          Everything your products are assessed against: the GS1 industry baseline, plus each
          retailer who has published requirements against your account.
        </p>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["Compliance Target", "Account Number (GLN)", "Active Since", "Requirements", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {/* ── Row zero: GS1 Standard ── */}
            <tr
              style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F8FAFF" }}
              className="hover:bg-[#EFF6FF]/60 transition-colors"
            >
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSelectGs1}
                    className="font-medium hover:underline text-left"
                    style={{ color: "#0168B3" }}
                  >
                    GS1 Standard
                  </button>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
                  >
                    <BadgeCheck className="w-3 h-3" />
                    Baseline
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 font-light text-[#9CA3AF] align-middle">&mdash;</td>
              <td className="px-4 py-3 font-light text-[#6B7280] align-middle">Always</td>
              <td className="px-4 py-3 font-light text-[#6B7280] align-middle">
                Standard attributes per category
              </td>
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-2 flex-wrap">
                  {gs1Stats.uncategorised > 0 && (
                    <button onClick={onSelectGs1} className="hover:opacity-80 transition-opacity">
                      <Pill
                        tone="red"
                        label={`${gs1Stats.uncategorised} uncategorised — cannot be assessed`}
                      />
                    </button>
                  )}
                  <button onClick={onSelectGs1} className="hover:opacity-80 transition-opacity">
                    <Pill
                      tone={gs1Stats.baselineGaps > 0 ? "amber" : "green"}
                      label={
                        gs1Stats.baselineGaps > 0
                          ? `${gs1Stats.baselineGaps} baseline gaps`
                          : "Baseline complete"
                      }
                    />
                  </button>
                </div>
              </td>
            </tr>

            {/* ── Retailer rows (unchanged from Trading Partners) ── */}
            {PARTNERS.map((partner, idx) => (
              <tr
                key={partner.id}
                style={{
                  borderBottom: idx < PARTNERS.length - 1 ? "1px solid #F3F4F6" : undefined,
                }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => onSelectPartner(partner.id, partner.name)}
                      className="font-medium hover:underline text-left"
                      style={{ color: "#0168B3" }}
                    >
                      {partner.name}
                    </button>
                    <span className="text-[10px] font-light" style={{ color: "#9CA3AF" }}>
                      GS1 baseline + {partner.extras} extra{partner.extras !== 1 ? "s" : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {partner.accountNumber}
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle">
                  {partner.activeSince}
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {partner.selectionCodes} selection code{partner.selectionCodes !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 align-middle">
                  <button
                    onClick={() => onSelectPartner(partner.id, partner.name)}
                    className="text-left"
                  >
                    <ComplianceSummary
                      gaps={partner.totalGaps}
                      complete={partner.completeCodes}
                      total={partner.selectionCodes}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          GS1 Standard is the baseline every product is assessed against, regardless of retailer.
          Retailer requirements build on that baseline with their own extras — filling a baseline
          gap once advances every retailer at the same time. Products without a category cannot be
          assessed against any target.
        </p>
      </div>
    </div>
  )
}
