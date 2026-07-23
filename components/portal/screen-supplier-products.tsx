"use client"

import { useMemo, useState } from "react"
import { BadgeCheck, ChevronDown, Search, X } from "lucide-react"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import type { GapTarget, RetailerStatus, SupplierProduct } from "@/lib/supplier-catalogue"

// ── Shared product leaf ───────────────────────────────────────────────────────
// One product table, reached from three targets:
//   • retailer target — filtered by selection code, showing this partner's gaps
//   • gs1 target       — filtered by category, showing GS1 baseline gaps
//   • code target      — account-wide, locked to one GS1 brick/selection code,
//                         reached from the account-wide Selection Code List
// All land here because the leaf ("a product + its compliance → gap detail")
// is identical; only the filter axis and the compliance column differ.

type ProductsTarget =
  | { kind: "retailer"; partnerName: string; selectionCode: string; brickCode: string }
  | { kind: "gs1" }
  | { kind: "code"; brickCode: string; label: string }

interface SupplierProductsProps {
  target: ProductsTarget
  /** Shared supplier catalogue — the one source of truth */
  products: SupplierProduct[]
  /** "Compliance" breadcrumb — back to the compliance list (L1) */
  onBack: () => void
  /** Partner breadcrumb — back to this partner's selection codes (L2). Retailer target only. */
  onBackToPartner?: () => void
  onNavigateToGapDetail: (productId: string, target: GapTarget) => void
  /** View all attributes for a product (optional) */
  onViewAttributes?: (productId: string, target: GapTarget) => void
  /** GS1 target only — route uncategorised products to the Catalogue */
  onGoToCatalogue?: () => void
}

type ProductRow = SupplierProduct

const PAGE_SIZE = 8

type StatusFilter = "all" | "gaps" | "complete"

// ── Compliance trigger cell (retailer target) ─────────────────────────────────
// The view is scoped to a single partner, so this shows only that partner's
// status for the product — a gap count that drills into gap detail, or Complete.
function ComplianceTrigger({
  status,
  onNavigateToGapDetail,
}: {
  status?: RetailerStatus
  onNavigateToGapDetail: () => void
}) {
  if (!status) return <span className="text-sm font-light text-[#6B7280]">No requirements set</span>

  const isComplete = status.gaps === "complete"
  return (
    <button
      onClick={() => !isComplete && onNavigateToGapDetail()}
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
      {isComplete ? "Complete" : `${status.gaps} gap${status.gaps !== 1 ? "s" : ""}`}
    </button>
  )
}

// ── Shared pill ───────────────────────────────────────────────────────────────
// One pill for every target status. Clickable when it carries open gaps, so
// every gap shown anywhere in the leaf drills into its gap detail.
function StatusPill({
  tone,
  label,
  onClick,
}: {
  tone: "green" | "amber" | "red"
  label: string
  onClick?: () => void
}) {
  const cfg = {
    green: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
    amber: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
    red: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  }[tone]
  const content = (
    <>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {label}
    </>
  )
  const className = "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
  if (!onClick) {
    return (
      <span className={className} style={{ backgroundColor: cfg.bg, color: cfg.text }}>
        {content}
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`${className} hover:opacity-80 transition-opacity cursor-pointer`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {content}
    </button>
  )
}

// ── GS1 compliance cell (gs1 target) ──────────────────────────────────────────
function Gs1Status({
  row,
  onNavigateToGapDetail,
}: {
  row: ProductRow
  onNavigateToGapDetail: () => void
}) {
  if (row.state === "uncategorised") {
    return <StatusPill tone="red" label="Cannot be assessed" />
  }
  if ((row.gs1Gaps ?? 0) === 0) {
    return <StatusPill tone="green" label="GS1 complete" />
  }
  return (
    <StatusPill
      tone="amber"
      label={`${row.gs1Gaps} GS1 gap${row.gs1Gaps !== 1 ? "s" : ""}`}
      onClick={onNavigateToGapDetail}
    />
  )
}

// ── Compliance cell (code target) ─────────────────────────────────────────────
// Stacked per-target pills: the GS1 baseline plus one pill per retailer with
// open gaps (each drilling into that target's gap detail); retailers that are
// complete collapse into a single green summary pill to keep the row quiet.
function CodeComplianceCell({
  row,
  onNavigateToGapDetail,
}: {
  row: ProductRow
  onNavigateToGapDetail: (target: GapTarget) => void
}) {
  const gs1Gaps = row.gs1Gaps ?? 0
  const retailers = row.retailers ?? []
  const withGaps = retailers.filter((r) => r.gaps !== "complete")
  const completeCount = retailers.length - withGaps.length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {gs1Gaps > 0 ? (
        <StatusPill
          tone="amber"
          label={`GS1 · ${gs1Gaps} gap${gs1Gaps !== 1 ? "s" : ""}`}
          onClick={() => onNavigateToGapDetail({ kind: "gs1" })}
        />
      ) : (
        <StatusPill tone="green" label="GS1 complete" />
      )}
      {withGaps.map((r) => (
        <StatusPill
          key={r.retailer}
          tone="amber"
          label={`${r.retailer} · ${r.gaps}`}
          onClick={() => onNavigateToGapDetail({ kind: "retailer", name: r.retailer })}
        />
      ))}
      {completeCount > 0 && (
        <StatusPill
          tone="green"
          label={`${completeCount} retailer${completeCount !== 1 ? "s" : ""} complete`}
        />
      )}
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
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
  target,
  products,
  onBack,
  onBackToPartner,
  onNavigateToGapDetail,
  onViewAttributes,
  onGoToCatalogue,
}: SupplierProductsProps) {
  const isGs1 = target.kind === "gs1"
  const partnerName = target.kind === "retailer" ? target.partnerName : ""

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [page, setPage] = useState(1)

  // In retailer mode, a product's compliance is only what THIS partner requires.
  // Narrow each row's retailers to the target partner so badges, filters, and
  // gap detail never surface another retailer's status inside this view.
  function partnerStatus(row: ProductRow) {
    return row.retailers?.find((r) => r.retailer === partnerName)
  }

  // ── Filter logic (branches by target) ──────────────────────────────────────
  const filtered = products.filter((row) => {
    if (isGs1) {
      if (categoryFilter === "all") return true
      if (categoryFilter === "uncategorised") return row.state === "uncategorised"
      return row.brickCode === categoryFilter
    }
    if (target.kind === "code") {
      // Account-wide, locked to this one brick — compliance covers every
      // target: the GS1 baseline plus each retailer's requirements.
      if (row.state !== "categorised" || row.brickCode !== target.brickCode) return false
      const matchesSearch =
        search.trim() === "" ||
        row.id.toLowerCase().includes(search.toLowerCase()) ||
        row.description.toLowerCase().includes(search.toLowerCase())
      const hasAnyGap =
        (row.gs1Gaps ?? 0) > 0 || (row.retailers ?? []).some((r) => r.gaps !== "complete")
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "gaps" && hasAnyGap) ||
        (statusFilter === "complete" && !hasAnyGap)
      return matchesSearch && matchesStatus
    }
    // Retailer mode: only products in this selection code's category that this
    // partner actually requires.
    if (target.kind !== "retailer") return false
    if (row.state !== "categorised") return false
    if (row.brickCode !== target.brickCode) return false
    const rs = partnerStatus(row)
    if (!rs) return false
    const matchesSearch =
      search.trim() === "" ||
      row.id.toLowerCase().includes(search.toLowerCase()) ||
      row.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "gaps" && rs.gaps !== "complete") ||
      (statusFilter === "complete" && rs.gaps === "complete")
    return matchesSearch && matchesStatus
  })

  const safePageSize = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, safePageSize)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Uncategorised products are only surfaced in the GS1 view — the retailer
  // view is scoped to categorised products this partner requires.
  const uncategorisedCount = isGs1 ? products.filter((p) => p.state === "uncategorised").length : 0

  // GS1 view: category filter derived from the categories actually present in
  // the catalogue, instead of a hardcoded subset.
  const categoryFilters = useMemo(() => {
    const codes = [
      ...new Set(
        products
          .filter((p) => p.state === "categorised" && p.brickCode)
          .map((p) => p.brickCode!)
      ),
    ].sort()
    return [
      { value: "all", label: "All categories" },
      ...codes.map((code) => ({
        value: code,
        label: `${getBrickByCode(code)?.brickName ?? code} (${code})`,
      })),
      { value: "uncategorised", label: "Uncategorised" },
    ]
  }, [products])

  // Attribute chips stay a GS1-view explainer only — on the code drill-down
  // they read as noise next to the per-target compliance pills.
  const activeBrick =
    isGs1 && categoryFilter !== "all" && categoryFilter !== "uncategorised"
      ? getBrickByCode(categoryFilter)
      : undefined

  const statusColHeader = isGs1
    ? "GS1 Compliance"
    : target.kind === "code"
    ? "Compliance"
    : "Compliance Status"

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        <button onClick={onBack} className="font-light hover:underline" style={{ color: "#0168B3" }}>
          {target.kind === "code" ? "Selection Code List" : "Compliance"}
        </button>
        {target.kind === "gs1" ? (
          <>
            <span style={{ color: "#9CA3AF" }}>›</span>
            <span className="font-light text-[#6B7280]">GS1 Standard</span>
          </>
        ) : target.kind === "code" ? (
          <>
            <span style={{ color: "#9CA3AF" }}>›</span>
            <span className="font-light text-[#6B7280]">{target.label}</span>
          </>
        ) : (
          <>
            <span style={{ color: "#9CA3AF" }}>›</span>
            <button onClick={onBackToPartner} className="font-light hover:underline" style={{ color: "#0168B3" }}>
              {target.partnerName}
            </button>
            <span style={{ color: "#9CA3AF" }}>›</span>
            <span className="font-light text-[#6B7280]">Code {target.selectionCode}</span>
          </>
        )}
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-1">
        {target.kind === "gs1" ? (
          <>
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
              Your products assessed against the GS1 standard attributes for their category.
              Satisfying the baseline advances every retailer at once.
            </p>
          </>
        ) : target.kind === "code" ? (
          <>
            <h1 className="text-xl font-semibold text-[#111827]">{target.label}</h1>
            <p className="text-sm font-light text-[#6B7280]">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} under this selection code,
              account-wide, assessed against the GS1 baseline.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[#111827]">
              {target.partnerName} &mdash; Code {target.selectionCode}
            </h1>
            <p className="text-sm font-light text-[#6B7280]">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} you supply {target.partnerName} under this code.
            </p>
          </>
        )}
      </div>

      {/* Filter bar (branches by target) */}
      {target.kind === "gs1" ? (
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="relative inline-flex items-center rounded-md"
            style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
          >
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="appearance-none pl-3 pr-8 py-2 rounded-md text-sm font-light outline-none bg-transparent text-[#374151]"
            >
              {categoryFilters.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
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
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[200px] max-w-xs"
            style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by Product ID or description"
              className="flex-1 text-sm font-light outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1) }}>
                <X className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#374151]" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {([
              { value: "all", label: "All" },
              { value: "gaps", label: "Has gaps" },
              { value: "complete", label: "Complete" },
            ] as { value: StatusFilter; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1) }}
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
      )}

      {/* GS1: required attributes for the selected category */}
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
                <span className="text-[9px] font-mono" style={{ color: "#9CA3AF" }}>{attr.code}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Urgent banner — uncategorised products */}
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
                Compliance cannot be checked until a category is assigned. These products are treated
                as non-compliant by every target.
              </span>
            </div>
          </div>
          {isGs1 && onGoToCatalogue && (
            <button
              onClick={onGoToCatalogue}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity self-center"
              style={{ backgroundColor: "#DC2626" }}
            >
              Assign categories in Catalogue
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
              {["Product ID", "Description", "Category", statusColHeader].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">
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
                const brick = row.brickCode ? getBrickByCode(row.brickCode) : undefined
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: idx < pageRows.length - 1 ? "1px solid #F3F4F6" : undefined,
                      backgroundColor: isUncategorised ? "#FFF7F7" : undefined,
                    }}
                    className="transition-colors hover:brightness-[0.98]"
                  >
                    <td
                      className="px-4 py-3 font-medium align-top tabular-nums"
                      style={{ color: isUncategorised ? "#991B1B" : "#111827" }}
                    >
                      {row.id}
                    </td>
                    <td
                      className="px-4 py-3 font-light align-top"
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
                            onClick={() => onGoToCatalogue?.()}
                          >
                            Assign category
                          </button>
                        </span>
                      ) : (
                        <span className="text-[#6B7280] font-light">
                          {brick?.brickName}{" "}
                          <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>
                            {row.brickCode}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {target.kind === "code" ? (
                        <CodeComplianceCell
                          row={row}
                          onNavigateToGapDetail={(t) => onNavigateToGapDetail(row.id, t)}
                        />
                      ) : isGs1 ? (
                        <Gs1Status
                          row={row}
                          onNavigateToGapDetail={() =>
                            onNavigateToGapDetail(row.id, { kind: "gs1" })
                          }
                        />
                      ) : (
                        <ComplianceTrigger
                          status={partnerStatus(row)}
                          onNavigateToGapDetail={() =>
                            onNavigateToGapDetail(row.id, { kind: "retailer", name: partnerName })
                          }
                        />
                      )}
                    </td>
                    {onViewAttributes && (
                      <td className="px-4 py-3 text-right align-top">
                        <button
                          onClick={() => {
                            const target_ =
                              target.kind === "code"
                                ? { kind: "gs1" as const }
                                : target.kind === "gs1"
                                  ? { kind: "gs1" as const }
                                  : { kind: "retailer" as const, name: partnerName }
                            onViewAttributes(row.id, target_)
                          }}
                          className="text-xs font-medium px-2.5 py-1.5 rounded hover:bg-[#F3F4F6] transition-colors"
                          style={{ color: "#0168B3" }}
                        >
                          Attributes
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <Pagination page={currentPage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

        {/* Caption */}
        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          {target.kind === "gs1"
            ? "GS1 baseline requirements are defined per category, so this view filters by category where a retailer view filters by selection code. Requirements are maintained by GS1 and cannot be modified."
            : target.kind === "code"
            ? "This selection code groups every product assigned to this GS1 category, account-wide. Compliance covers every target — the GS1 baseline plus each retailer that requires the product. Click a pill with gaps to see exactly which attributes and images are missing for that target."
            : "You keep one product. Each retailer's requirements are checked against it — filling a gap once satisfies every retailer who requires it. A product must have a category before its requirements can be checked."}
        </p>
      </div>

    </div>
  )
}
