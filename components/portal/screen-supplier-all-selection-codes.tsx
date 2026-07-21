"use client"

import { AlertCircle } from "lucide-react"
import { countUncategorised, getAllSelectionCodes, type SupplierProduct } from "@/lib/supplier-catalogue"

// ── Account-wide Selection Code List ─────────────────────────────────────────
// The real entry point for browsing your catalogue: a flat, account-wide list
// of the GS1 categories your products have been assigned to — no retailer
// filter, no compliance/gap column (this screen is about catalogue
// organisation, not compliance monitoring; that lives under Compliance).
// An "Uncategorised" row zero — the same pattern as the GS1 row on the
// Compliance list — leads into the existing assign/enrich flow for products
// that haven't been assigned a category yet.

interface SupplierAllSelectionCodesProps {
  products: SupplierProduct[]
  onSelectUncategorised: () => void
  onSelectCode: (brickCode: string, label: string) => void
}

export function ScreenSupplierAllSelectionCodes({
  products,
  onSelectUncategorised,
  onSelectCode,
}: SupplierAllSelectionCodesProps) {
  const codes = getAllSelectionCodes(products)
  const uncategorisedCount = countUncategorised(products)

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">Selection Code List</h1>
        <p className="text-sm font-light text-[#6B7280]">
          Your account-wide selection codes, grouped by GS1 category — independent of which
          retailer(s) require them.
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
              {["Selection Code", "Description", "Products"].map((h) => (
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
            {/* ── Row zero: Uncategorised ── */}
            {uncategorisedCount > 0 && (
              <tr
                style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#FEF2F2" }}
                className="hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                onClick={onSelectUncategorised}
              >
                <td className="px-4 py-3 align-middle" colSpan={2}>
                  <button
                    className="flex items-center gap-2 font-medium text-left"
                    style={{ color: "#991B1B" }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Uncategorised — assign a GS1 category
                  </button>
                </td>
                <td className="px-4 py-3 font-medium align-middle tabular-nums" style={{ color: "#991B1B" }}>
                  {uncategorisedCount}
                </td>
              </tr>
            )}

            {/* ── Discovered codes ── */}
            {codes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm font-light text-[#9CA3AF]">
                  No categorised products yet.
                </td>
              </tr>
            ) : (
              codes.map((sc, idx) => (
                <tr
                  key={sc.id}
                  style={{
                    borderBottom: idx < codes.length - 1 ? "1px solid #F3F4F6" : undefined,
                  }}
                  className="hover:bg-[#F4F6F8]/40 transition-colors cursor-pointer"
                  onClick={() => onSelectCode(sc.brickCode, sc.label)}
                >
                  <td className="px-4 py-3 align-middle">
                    <button
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
