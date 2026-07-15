"use client"

interface TradingPartnerListProps {
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
  },
  {
    id: "belk",
    name: "Belk",
    accountNumber: "8712345000042",
    activeSince: "Jan 2021",
    selectionCodes: 2,
    totalGaps: 0,
    completeCodes: 2,
  },
  {
    id: "nordstrom",
    name: "Nordstrom",
    accountNumber: "8712345000078",
    activeSince: "Jun 2020",
    selectionCodes: 4,
    totalGaps: 14,
    completeCodes: 2,
  },
]

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

export function ScreenSupplierTradingPartners({ onSelectPartner }: TradingPartnerListProps) {
  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">Trading Partners</h1>
        <p className="text-sm font-light text-[#6B7280]">
          Retailers who have published attribute requirements against your account.
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
              {["Retailer", "Account Number (GLN)", "Active Since", "Selection Codes", "Compliance"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTNERS.map((partner, idx) => (
              <tr
                key={partner.id}
                style={{
                  borderBottom: idx < PARTNERS.length - 1 ? "1px solid #F3F4F6" : undefined,
                }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                <td className="px-4 py-3 align-middle">
                  <button
                    onClick={() => onSelectPartner(partner.id, partner.name)}
                    className="font-medium hover:underline text-left"
                    style={{ color: "#0168B3" }}
                  >
                    {partner.name}
                  </button>
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {partner.accountNumber}
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle">
                  {partner.activeSince}
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {partner.selectionCodes}
                </td>
                <td className="px-4 py-3 align-middle">
                  <ComplianceSummary
                    gaps={partner.totalGaps}
                    complete={partner.completeCodes}
                    total={partner.selectionCodes}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          Only retailers who have published category requirements against your account are shown here.
        </p>
      </div>
    </div>
  )
}
