"use client"

import { useState } from "react"
import { BadgeCheck, ChevronDown } from "lucide-react"
import { getBrickByCode } from "@/lib/gs1-standard-library"

// ── GS1 row-zero drill-down ───────────────────────────────────────────────────
// The supplier's own products assessed against the GS1 baseline. Where a
// retailer row drills down by selection code, the GS1 target drills down by
// category — because GS1 baseline requirements are defined per category brick.

interface Gs1ProductsProps {
  onBack: () => void
  onGoToCatalogue: () => void
}

type Gs1Product = {
  id: string
  description: string
  brickCode?: string // undefined = uncategorised
  gs1Gaps?: number // 0 = complete; only meaningful when categorised
}

const GS1_PRODUCTS: Gs1Product[] = [
  { id: "1TESTPROD1", description: "Floral Wrap Dress", brickCode: "10001333", gs1Gaps: 2 },
  { id: "B11442", description: "Linen Shift Dress", brickCode: "10001333", gs1Gaps: 3 },
  { id: "B11443", description: "Printed Midi Dress", brickCode: "10001333", gs1Gaps: 0 },
  { id: "B11444", description: "Velvet Evening Dress", brickCode: "10001333", gs1Gaps: 1 },
  { id: "B11445", description: "Jersey Wrap Dress", brickCode: "10001333", gs1Gaps: 0 },
  { id: "B11446", description: "Denim Shirtdress" },
  { id: "B11447", description: "Pleated Chiffon Gown" },
  { id: "B11448", description: "Satin Slip Dress", brickCode: "10001333", gs1Gaps: 0 },
  { id: "B11449", description: "Broderie Anglaise Dress" },
  { id: "B11450", description: "Tiered Maxi Dress", brickCode: "10005811", gs1Gaps: 0 },
  { id: "B11451", description: "Cotton Sundress" },
  { id: "B11452", description: "Crepe Sheath Dress", brickCode: "10005811", gs1Gaps: 0 },
  { id: "B11453", description: "Silk Maxi Dress", brickCode: "10001333", gs1Gaps: 0 },
]

const CATEGORY_FILTERS = [
  { value: "all", label: "All categories" },
  { value: "10001333", label: "Dresses (10001333)" },
  { value: "10005811", label: "Footwear (10005811)" },
  { value: "uncategorised", label: "Uncategorised" },
]

export function ScreenSupplierGs1Products({ onBack, onGoToCatalogue }: Gs1ProductsProps) {
  const [categoryFilter, setCategoryFilter] = useState("all")

  const filtered = GS1_PRODUCTS.filter((p) => {
    if (categoryFilter === "all") return true
    if (categoryFilter === "uncategorised") return !p.brickCode
    return p.brickCode === categoryFilter
  })

  const uncategorisedCount = GS1_PRODUCTS.filter((p) => !p.brickCode).length

  // When filtered to a single brick, show that brick's required attributes
  const activeBrick =
    categoryFilter !== "all" && categoryFilter !== "uncategorised"
      ? getBrickByCode(categoryFilter)
      : undefined

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
        <span className="font-light text-[#6B7280]">GS1 Standard</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-[#111827]">GS1 Standard</h1>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
          >
            <BadgeCheck className="w-3 h-3" />
            Baseline
          </span>
        </div>
        <p className="text-sm font-light text-[#6B7280]">
          Your products assessed against the GS1 standard attributes for their category. Satisfying
          the baseline advances every retailer at once.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="relative inline-flex items-center rounded-md"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-md text-sm font-light outline-none bg-transparent text-[#374151]"
          >
            {CATEGORY_FILTERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none"
            style={{ color: "#9CA3AF" }}
          />
        </div>
        <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Required attributes for the selected category */}
      {activeBrick && (
        <div
          className="rounded-lg px-4 py-3 flex flex-col gap-2"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: "#6B7280" }}>
            GS1 standard attributes for {activeBrick.brickName}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeBrick.extendedAttributes.map((attr) => (
              <span
                key={attr.code}
                className="inline-flex items-baseline gap-1.5 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: "#F4F6F8", color: "#374151", border: "1px solid #E0E4E8" }}
              >
                {attr.name}
                <span className="text-[9px] font-mono" style={{ color: "#9CA3AF" }}>
                  {attr.code}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Uncategorised banner */}
      {uncategorisedCount > 0 && categoryFilter !== "uncategorised" && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg flex-wrap"
          style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: "#DC2626" }}
            />
            <span className="text-sm font-medium" style={{ color: "#991B1B" }}>
              {uncategorisedCount} product{uncategorisedCount !== 1 ? "s" : ""} cannot be assessed —
              no category assigned
            </span>
          </div>
          <button
            onClick={onGoToCatalogue}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#DC2626" }}
          >
            Assign categories in Catalogue
          </button>
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
              {["Product ID", "Description", "Category", "GS1 Compliance"].map((h) => (
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
            {filtered.map((row, idx) => {
              const brick = row.brickCode ? getBrickByCode(row.brickCode) : undefined
              const isUncategorised = !row.brickCode
              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : undefined,
                    backgroundColor: isUncategorised ? "#FFF7F7" : undefined,
                  }}
                >
                  <td
                    className="px-4 py-3 font-medium align-middle tabular-nums"
                    style={{ color: isUncategorised ? "#991B1B" : "#111827" }}
                  >
                    {row.id}
                  </td>
                  <td
                    className="px-4 py-3 font-light align-middle"
                    style={{ color: isUncategorised ? "#B91C1C" : "#6B7280" }}
                  >
                    {row.description}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {isUncategorised ? (
                      <button
                        onClick={onGoToCatalogue}
                        className="text-sm font-semibold hover:underline"
                        style={{ color: "#DC2626" }}
                      >
                        Assign category
                      </button>
                    ) : (
                      <span className="text-[#6B7280] font-light">
                        {brick?.brickName}{" "}
                        <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>
                          {row.brickCode}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {isUncategorised ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: "#DC2626" }}
                        />
                        Cannot be assessed
                      </span>
                    ) : row.gs1Gaps === 0 ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: "#16A34A" }}
                        />
                        GS1 complete
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: "#F59E0B" }}
                        />
                        {row.gs1Gaps} GS1 gap{row.gs1Gaps !== 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          GS1 baseline requirements are defined per category, so this view filters by category
          where a retailer view filters by selection code. Requirements are maintained by GS1 and
          cannot be modified.
        </p>
      </div>
    </div>
  )
}
