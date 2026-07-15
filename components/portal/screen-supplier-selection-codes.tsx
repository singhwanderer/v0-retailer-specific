"use client"

import { Download } from "lucide-react"

// ── CSV generation ────────────────────────────────────────────────────────────
// Columns: Product ID, Description, Category, Category Brick Code (GS1),
// then one column per required attribute. Existing values are pre-populated;
// missing values are left blank for the supplier to fill in.
type AttributeTemplate = {
  name: string
  existingValue?: string
}

const ATTRIBUTE_TEMPLATE: AttributeTemplate[] = [
  { name: "Colour", existingValue: "" },
  { name: "Size", existingValue: "" },
  { name: "Material Composition", existingValue: "" },
  { name: "Care Instructions", existingValue: "" },
  { name: "Country of Origin", existingValue: "" },
  { name: "Brand", existingValue: "" },
]

function generateCsv(partnerName: string, codeId: string, codeDescription: string): string {
  const attrHeaders = ATTRIBUTE_TEMPLATE.map((a) => a.name)
  const headers = [
    "Product ID",
    "Description",
    "Category",
    "Category Brick Code (GS1)",
    ...attrHeaders,
  ]

  // Mock product rows — in a real app these would come from the product store
  const rows = [
    ["1TESTPROD1", "Floral Wrap Dress", "Women's Dresses", "10001234", "", "", "", "", "", ""],
    ["B11442", "Linen Shift Dress", "Women's Dresses", "10001234", "Beige", "10", "100% Linen", "", "China", "J.Renée"],
    ["B11443", "Printed Midi Dress", "Women's Dresses", "10001234", "Multi", "12", "95% Cotton 5% Elastane", "Machine wash cold", "India", "J.Renée"],
    ["B11446", "Denim Shirtdress", "", "", "", "", "", "", "", ""],
    ["B11447", "Pleated Chiffon Gown", "", "", "", "", "", "", "", ""],
  ]

  const escape = (val: string) =>
    val.includes(",") || val.includes('"') || val.includes("\n")
      ? `"${val.replace(/"/g, '""')}"`
      : val

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ]

  return lines.join("\n")
}

function downloadCsv(
  partnerName: string,
  codeId: string,
  codeDescription: string
) {
  const csv = generateCsv(partnerName, codeId, codeDescription)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${partnerName.replace(/\s+/g, "_")}_Code${codeId}_attributes.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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
              {["Code", "Description", "Products", "Compliance", ""].map((h) => (
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
                <td className="px-4 py-3 align-middle text-right">
                  <button
                    onClick={() => downloadCsv(partnerName, sc.code, sc.description)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
                    style={{ borderColor: "#E0E4E8", color: "#374151" }}
                    title="Download attribute template CSV"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* CSV caption */}
        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          The CSV includes all required attributes for that selection code. Category Brick Code (GS1)
          and any values already on your products are pre-populated. Fill in the remaining columns
          and upload the completed file on the supplier portal.
        </p>
      </div>
    </div>
  )
}
