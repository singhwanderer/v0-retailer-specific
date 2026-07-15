"use client"

interface SelectionCodeListProps {
  partnerName: string
  onBack: () => void
  onSelectCode: (codeId: string, codeLabel: string) => void
}

type SelectionCode = {
  id: string
  code: string
  description: string
  products: number
  gaps: number
  complete: number
}

// Mock data keyed by partner — in a real app this would be fetched
const CODES_BY_PARTNER: Record<string, SelectionCode[]> = {
  "Dillard's": [
    { id: "001", code: "001", description: "Dresses", products: 48, gaps: 5, complete: 43 },
    { id: "002", code: "002", description: "Footwear", products: 31, gaps: 3, complete: 28 },
    { id: "003", code: "003", description: "Accessories", products: 12, gaps: 0, complete: 12 },
  ],
  Belk: [
    { id: "001", code: "001", description: "Dresses", products: 48, gaps: 0, complete: 48 },
    { id: "004", code: "004", description: "Tops", products: 22, gaps: 0, complete: 22 },
  ],
  Nordstrom: [
    { id: "001", code: "001", description: "Dresses", products: 48, gaps: 8, complete: 40 },
    { id: "002", code: "002", description: "Footwear", products: 31, gaps: 4, complete: 27 },
    { id: "005", code: "005", description: "Swimwear", products: 18, gaps: 2, complete: 16 },
    { id: "006", code: "006", description: "Denim", products: 9, gaps: 0, complete: 9 },
  ],
}

function GapBadge({ gaps, complete, total }: { gaps: number; complete: number; total: number }) {
  const allComplete = gaps === 0
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
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
      {allComplete ? `${complete} complete` : `${gaps} gaps · ${complete} complete`}
    </span>
  )
}

export function ScreenSupplierSelectionCodes({
  partnerName,
  onBack,
  onSelectCode,
}: SelectionCodeListProps) {
  const codes = CODES_BY_PARTNER[partnerName] ?? []

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={onBack}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          Trading Partners
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <span className="font-light text-[#6B7280]">{partnerName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">{partnerName} — Selection Codes</h1>
        <p className="text-sm font-light text-[#6B7280]">
          Each code groups the products you supply under this trading relationship. Select a code to
          view and manage compliance for those products.
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
              {["Code", "Description", "Products", "Compliance"].map((h) => (
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
            {codes.map((sc, idx) => (
              <tr
                key={sc.id}
                style={{
                  borderBottom: idx < codes.length - 1 ? "1px solid #F3F4F6" : undefined,
                }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                <td className="px-4 py-3 align-middle">
                  <button
                    onClick={() =>
                      onSelectCode(sc.id, `${sc.code} — ${sc.description}`)
                    }
                    className="font-medium tabular-nums hover:underline"
                    style={{ color: "#0168B3" }}
                  >
                    {sc.code}
                  </button>
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle">
                  {sc.description}
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {sc.products}
                </td>
                <td className="px-4 py-3 align-middle">
                  <GapBadge gaps={sc.gaps} complete={sc.complete} total={sc.products} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
