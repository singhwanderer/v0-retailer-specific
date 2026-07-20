"use client"

import { Download } from "lucide-react"
import { countUncategorised, getSelectionCodesForPartner, type SupplierProduct } from "@/lib/supplier-catalogue"

// ── CSV generation ────────────────────────────────────────────────────────────
// Columns: Product ID, Description, Category, Category Brick Code (GS1),
// then one column per required attribute. Rows are the actual products under
// this partner + selection code, so the file matches whatever code was
// clicked instead of a fixed mock sample. Attribute values are left blank —
// the product store doesn't track per-attribute values, only gap counts.
const ATTRIBUTE_TEMPLATE_HEADERS = [
  "Colour",
  "Size",
  "Material Composition",
  "Care Instructions",
  "Country of Origin",
  "Brand",
]

function generateCsv(products: SupplierProduct[], brickCode: string, categoryLabel: string): string {
  const headers = [
    "Product ID",
    "Description",
    "Category",
    "Category Brick Code (GS1)",
    ...ATTRIBUTE_TEMPLATE_HEADERS,
  ]

  const rows = products
    .filter((p) => p.brickCode === brickCode)
    .map((p) => [p.id, p.description, categoryLabel, brickCode, ...ATTRIBUTE_TEMPLATE_HEADERS.map(() => "")])

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
  products: SupplierProduct[],
  partnerName: string,
  codeId: string,
  brickCode: string,
  categoryLabel: string
) {
  const csv = generateCsv(products, brickCode, categoryLabel)
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
  products: SupplierProduct[]
  onBack: () => void
  onSelectCode: (codeId: string, codeLabel: string, brickCode: string) => void
  onGoToCatalogue?: () => void
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
  products,
  onBack,
  onSelectCode,
  onGoToCatalogue,
}: SelectionCodeListProps) {
  const codes = getSelectionCodesForPartner(products, partnerName)
  const uncategorisedCount = countUncategorised(products)

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={onBack}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          Compliance
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

      {/* Uncategorised banner — account-wide, since products without a category
          aren't tied to any retailer (or selection code) yet */}
      {uncategorisedCount > 0 && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg justify-between flex-wrap"
          style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: "#DC2626" }}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold" style={{ color: "#991B1B" }}>
                {uncategorisedCount} product{uncategorisedCount !== 1 ? "s" : ""} without a category
              </span>
              <span className="text-xs font-light leading-relaxed" style={{ color: "#B91C1C" }}>
                This is account-wide, not specific to {partnerName}. Click here to use AI to enrich
                your selection codes, or manually add a category to the classification fields in
                GTIN attributes.
              </span>
            </div>
          </div>
          {onGoToCatalogue && (
            <button
              onClick={onGoToCatalogue}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity self-center"
              style={{ backgroundColor: "#DC2626" }}
            >
              Enrich or assign categories in Catalogue
            </button>
          )}
        </div>
      )}

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
            {codes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm font-light text-[#9CA3AF]">
                  No categorised products under {partnerName} yet.
                </td>
              </tr>
            ) : (
              codes.map((sc, idx) => (
                <tr
                  key={sc.id}
                  style={{
                    borderBottom: idx < codes.length - 1 ? "1px solid #F3F4F6" : undefined,
                  }}
                  className="hover:bg-[#F4F6F8]/40 transition-colors"
                >
                  <td className="px-4 py-3 align-middle">
                    <button
                      onClick={() => onSelectCode(sc.id, `${sc.id} — ${sc.label}`, sc.brickCode)}
                      className="font-medium tabular-nums hover:underline"
                      style={{ color: "#0168B3" }}
                    >
                      {sc.id}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-light text-[#6B7280] align-middle">
                    {sc.label}
                  </td>
                  <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                    {sc.products}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <GapBadge gaps={sc.gaps} complete={sc.complete} total={sc.products} />
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <button
                      onClick={() => downloadCsv(products, partnerName, sc.id, sc.brickCode, sc.label)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
                      style={{ borderColor: "#E0E4E8", color: "#374151" }}
                      title="Download attribute template CSV"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                  </td>
                </tr>
              ))
            )}
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
