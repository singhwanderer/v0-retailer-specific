"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, X } from "lucide-react"

interface SupplierProductsProps {
  partnerName: string
  selectionCode: string
  onBack: () => void
  onNavigateToGapDetail: (productName: string, retailer: string) => void
}

type RetailerStatus = {
  retailer: string
  gaps: number | "complete"
}

type ProductRow = {
  id: string
  description: string
  state: "categorised" | "uncategorised" | "no-profile"
  category?: string
  retailers?: RetailerStatus[]
}

// Mock product catalogue — in a real app this would be fetched per partner + code
const ALL_PRODUCTS: ProductRow[] = [
  {
    id: "1TESTPROD1",
    description: "Floral Wrap Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [
      { retailer: "Dillard's", gaps: 3 },
      { retailer: "Belk", gaps: "complete" },
    ],
  },
  {
    id: "B11442",
    description: "Linen Shift Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Dillard's", gaps: 5 }],
  },
  {
    id: "B11443",
    description: "Printed Midi Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
  },
  {
    id: "B11444",
    description: "Velvet Evening Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [
      { retailer: "Dillard's", gaps: 2 },
      { retailer: "Belk", gaps: 1 },
    ],
  },
  {
    id: "B11445",
    description: "Jersey Wrap Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Belk", gaps: "complete" }],
  },
  {
    id: "B11446",
    description: "Denim Shirtdress",
    state: "uncategorised",
  },
  {
    id: "B11447",
    description: "Pleated Chiffon Gown",
    state: "uncategorised",
  },
  {
    id: "B11448",
    description: "Satin Slip Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
  },
  {
    id: "B11449",
    description: "Broderie Anglaise Dress",
    state: "uncategorised",
  },
  {
    id: "B11450",
    description: "Tiered Maxi Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Dillard's", gaps: 1 }],
  },
  {
    id: "B11451",
    description: "Cotton Sundress",
    state: "uncategorised",
  },
  {
    id: "B11452",
    description: "Crepe Sheath Dress",
    state: "categorised",
    category: "Women's Dresses (GS1: 10001234)",
    retailers: [{ retailer: "Belk", gaps: "complete" }],
  },
  {
    id: "B11453",
    description: "Silk Maxi Dress",
    state: "no-profile",
    category: "Women's Dresses (GS1: 10001234)",
  },
]

const PAGE_SIZE = 8

type StatusFilter = "all" | "gaps" | "complete" | "uncategorised"

// ── Compliance summary modal ──────────────────────────────────────────────────
function ComplianceModal({
  open,
  onClose,
  productId,
  retailers,
  onViewGap,
}: {
  open: boolean
  onClose: () => void
  productId: string
  retailers: RetailerStatus[]
  onViewGap: (retailer: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Compliance — {productId}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col divide-y" style={{ borderColor: "#F3F4F6" }}>
          {retailers.map((rs) => {
            const isComplete = rs.gaps === "complete"
            return (
              <div
                key={rs.retailer}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isComplete ? "#16A34A" : "#F59E0B" }}
                  />
                  <span className="text-sm font-medium text-[#111827]">{rs.retailer}</span>
                  <span
                    className="text-xs font-light"
                    style={{ color: isComplete ? "#15803D" : "#92400E" }}
                  >
                    {isComplete ? "Complete" : `${rs.gaps} gaps`}
                  </span>
                </div>
                {!isComplete && (
                  <button
                    onClick={() => { onViewGap(rs.retailer); onClose() }}
                    className="text-xs font-medium hover:underline"
                    style={{ color: "#0168B3" }}
                  >
                    View gaps
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Compliance trigger cell ───────────────────────────────────────────────────
function ComplianceTrigger({
  row,
  onOpenModal,
  onNavigateToGapDetail,
}: {
  row: ProductRow
  onOpenModal: () => void
  onNavigateToGapDetail: (retailer: string) => void
}) {
  if (row.state === "uncategorised") return <span className="text-[#6B7280]">&mdash;</span>
  if (row.state === "no-profile") return <span className="text-sm font-light text-[#6B7280]">No requirements set</span>
  if (!row.retailers) return null

  const totalRetailers = row.retailers.length
  const withGaps = row.retailers.filter((r) => r.gaps !== "complete").length
  const allComplete = withGaps === 0

  if (totalRetailers === 1) {
    const rs = row.retailers[0]
    const isComplete = rs.gaps === "complete"
    return (
      <button
        onClick={() => !isComplete && onNavigateToGapDetail(rs.retailer)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity ${!isComplete ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
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
        {rs.retailer} &mdash; {isComplete ? "Complete" : `${rs.gaps} gaps`}
      </button>
    )
  }

  // Multi-retailer: show summary trigger that opens modal
  return (
    <button
      onClick={onOpenModal}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
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
      {totalRetailers} retailer{totalRetailers !== 1 ? "s" : ""} &mdash;{" "}
      {allComplete ? "all complete" : `${withGaps} with gaps`}
    </button>
  )
}

// ── Pagination ───────────────────────────────────────────────────────��────────
function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid #F3F4F6" }}>
      <span className="text-xs font-light text-[#6B7280]">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1 rounded text-xs font-medium border disabled:opacity-30 hover:bg-[#F4F6F8] transition-colors"
          style={{ borderColor: "#E0E4E8", color: "#374151" }}
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-7 h-7 rounded text-xs font-medium border transition-colors"
            style={
              p === page
                ? { borderColor: "#0168B3", backgroundColor: "#0168B3", color: "#FFFFFF" }
                : { borderColor: "#E0E4E8", color: "#374151", backgroundColor: "transparent" }
            }
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-2.5 py-1 rounded text-xs font-medium border disabled:opacity-30 hover:bg-[#F4F6F8] transition-colors"
          style={{ borderColor: "#E0E4E8", color: "#374151" }}
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ScreenSupplierProducts({
  partnerName,
  selectionCode,
  onBack,
  onNavigateToGapDetail,
}: SupplierProductsProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [modalProduct, setModalProduct] = useState<ProductRow | null>(null)

  // ── Filter logic ────────────────────────────────────────────────────────────
  const filtered = ALL_PRODUCTS.filter((row) => {
    const matchesSearch =
      search.trim() === "" ||
      row.id.toLowerCase().includes(search.toLowerCase()) ||
      row.description.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "uncategorised" && row.state === "uncategorised") ||
      (statusFilter === "gaps" &&
        row.state === "categorised" &&
        row.retailers?.some((r) => r.gaps !== "complete")) ||
      (statusFilter === "complete" &&
        row.state === "categorised" &&
        row.retailers?.every((r) => r.gaps === "complete"))

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const safePageSize = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, safePageSize)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleFilterChange(f: StatusFilter) {
    setStatusFilter(f)
    setPage(1)
  }

  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
  }

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "gaps", label: "Has gaps" },
    { value: "complete", label: "Complete" },
    { value: "uncategorised", label: "Uncategorised" },
  ]

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        <button
          onClick={onBack}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          Compliance
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <button
          onClick={onBack}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          {partnerName}
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <span className="font-light text-[#6B7280]">Code {selectionCode}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">
          {partnerName} &mdash; Code {selectionCode}
        </h1>
        <p className="text-sm font-light text-[#6B7280]">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""} in this selection code.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[200px] max-w-xs"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by Product ID or description"
            className="flex-1 text-sm font-light outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
          />
          {search && (
            <button onClick={() => handleSearch("")}>
              <X className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#374151]" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
              style={
                statusFilter === opt.value
                  ? { backgroundColor: "#0168B3", borderColor: "#0168B3", color: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", borderColor: "#E0E4E8", color: "#6B7280" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Urgent banner — uncategorised products */}
      {(() => {
        const uncategorisedCount = ALL_PRODUCTS.filter((p) => p.state === "uncategorised").length
        if (uncategorisedCount === 0) return null
        return (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg"
            style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <span
              className="mt-0.5 w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: "#DC2626" }}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold" style={{ color: "#991B1B" }}>
                {uncategorisedCount} product{uncategorisedCount !== 1 ? "s" : ""} without a category
              </span>
              <span className="text-xs font-light leading-relaxed" style={{ color: "#B91C1C" }}>
                Compliance cannot be checked until a category is assigned. These products are
                treated as non-compliant by all retailers.
              </span>
            </div>
          </div>
        )
      })()}

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["Product ID", "Description", "Category", "Compliance Status"].map((h) => (
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
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm font-light text-[#9CA3AF]">
                  No products match the current filter.
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const isUncategorised = row.state === "uncategorised"
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: idx < pageRows.length - 1 ? "1px solid #F3F4F6" : undefined,
                      backgroundColor: isUncategorised ? "#FFF7F7" : undefined,
                    }}
                    className="transition-colors hover:brightness-[0.98]"
                  >
                    <td className="px-4 py-3 font-medium align-top tabular-nums"
                      style={{ color: isUncategorised ? "#991B1B" : "#111827" }}
                    >
                      {row.id}
                    </td>
                    <td className="px-4 py-3 font-light align-top"
                      style={{ color: isUncategorised ? "#B91C1C" : "#6B7280" }}
                    >
                      {row.description}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isUncategorised ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                            style={{ backgroundColor: "#DC2626" }}
                          />
                          <button
                            className="text-sm font-semibold hover:underline"
                            style={{ color: "#DC2626" }}
                            onClick={() => {}}
                          >
                            Assign category
                          </button>
                        </span>
                      ) : (
                        <span className="text-[#6B7280] font-light">{row.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isUncategorised ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: "#DC2626" }}
                          />
                          No category — unmet
                        </span>
                      ) : (
                        <ComplianceTrigger
                          row={row}
                          onOpenModal={() => setModalProduct(row)}
                          onNavigateToGapDetail={(retailer) =>
                            onNavigateToGapDetail(row.id, retailer)
                          }
                        />
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <Pagination
          page={currentPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />

        {/* Caption */}
        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          You keep one product. Each retailer&apos;s requirements are checked against it &mdash;
          filling a gap once satisfies every retailer who requires it. A product must have a
          category before its requirements can be checked. The system confirms whether required
          attributes and image types are present; it does not verify image content.
        </p>
      </div>

      {/* Compliance modal */}
      {modalProduct && (
        <ComplianceModal
          open={!!modalProduct}
          onClose={() => setModalProduct(null)}
          productId={modalProduct.id}
          retailers={modalProduct.retailers ?? []}
          onViewGap={(retailer) => onNavigateToGapDetail(modalProduct.id, retailer)}
        />
      )}
    </div>
  )
}
