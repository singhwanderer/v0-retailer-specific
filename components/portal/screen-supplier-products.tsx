"use client"

interface SupplierProductsProps {
  onNavigateToGapDetail: (productName: string, retailer: string) => void
}

type RetailerStatus = {
  retailer: string
  gaps: number | "complete"
}

type ProductRow = {
  name: string
  description: string
  state: "categorised" | "uncategorised" | "no-profile"
  category?: string
  retailers?: RetailerStatus[]
}

const PRODUCTS: ProductRow[] = [
  {
    name: "1TESTPROD1",
    description: "Floral Wrap Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [
      { retailer: "Dillard's", gaps: 3 },
      { retailer: "Belk", gaps: "complete" },
    ],
  },
  {
    name: "B11442",
    description: "Linen Shift Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Dillard's", gaps: 5 }],
  },
  {
    name: "B11451",
    description: "Cotton Sundress",
    state: "uncategorised",
  },
  {
    name: "B11453",
    description: "Silk Maxi Dress",
    state: "no-profile",
    category: "Women's Dresses (GS1: 10001234)",
  },
]

function StatusPill({
  gaps,
  retailer,
  onClick,
}: {
  gaps: number | "complete"
  retailer: string
  onClick: () => void
}) {
  const isComplete = gaps === "complete"
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-80 cursor-pointer"
      style={
        isComplete
          ? { backgroundColor: "#DCFCE7", color: "#15803D" }
          : { backgroundColor: "#FEF3C7", color: "#92400E" }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: isComplete ? "#16A34A" : "#F59E0B" }}
      />
      {retailer} &mdash; {isComplete ? "Complete" : `${gaps} gaps`}
    </button>
  )
}

export function ScreenSupplierProducts({ onNavigateToGapDetail }: SupplierProductsProps) {
  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">Catalogue</h1>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-[#111827]">
            Selection Code: 001 &mdash; DRESSES
          </p>
          <p className="text-sm font-light text-[#6B7280]">
            Products in this selection code. Category and compliance are shown per product.
          </p>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["Product Name", "Description", "Category", "Compliance Status"].map((h) => (
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
            {PRODUCTS.map((row, idx) => (
              <tr
                key={row.name}
                style={{
                  borderBottom: idx < PRODUCTS.length - 1 ? "1px solid #F3F4F6" : undefined,
                }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                {/* Product Name */}
                <td className="px-4 py-3 font-medium text-[#111827] align-top">
                  {row.name}
                </td>

                {/* Description */}
                <td className="px-4 py-3 text-[#6B7280] font-light align-top">
                  {row.description}
                </td>

                {/* Category */}
                <td className="px-4 py-3 align-top">
                  {row.state === "uncategorised" ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: "#F59E0B" }}
                      />
                      <button
                        className="font-light hover:underline"
                        style={{ color: "#0168B3" }}
                        onClick={() => {}}
                      >
                        + Add category to see requirements
                      </button>
                    </span>
                  ) : (
                    <span className="text-[#6B7280] font-light">{row.category}</span>
                  )}
                </td>

                {/* Compliance Status */}
                <td className="px-4 py-3 align-top">
                  {row.state === "uncategorised" && (
                    <span className="text-[#6B7280]">&mdash;</span>
                  )}
                  {row.state === "no-profile" && (
                    <span className="text-sm font-light text-[#6B7280]">No requirements set</span>
                  )}
                  {row.state === "categorised" && row.retailers && (
                    <div className="flex flex-col gap-1">
                      {row.retailers.map((rs) => (
                        <StatusPill
                          key={rs.retailer}
                          gaps={rs.gaps}
                          retailer={rs.retailer}
                          onClick={() => onNavigateToGapDetail(row.name, rs.retailer)}
                        />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Caption */}
        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          Compliance is shown per retailer. A product must have a category before its requirements
          can be checked. The system confirms whether required attributes and images were provided
          &mdash; it does not verify image content.
        </p>
      </div>
    </div>
  )
}
