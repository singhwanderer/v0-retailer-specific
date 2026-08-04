"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Search,
  X,
} from "lucide-react"
import { AssignCategoryModal } from "@/components/portal/assign-category-modal"
import { AttributeFillControl } from "@/components/portal/attribute-fill-control"
import { ConfirmFillAttributeModal } from "@/components/portal/confirm-fill-attribute-modal"
import { EnrichHandoffModal } from "@/components/portal/enrich-handoff-modal"
import type { Gs1Brick } from "@/lib/gs1-standard-library"
import type { GapTarget, MissingImage, SupplierProduct } from "@/lib/supplier-catalogue"
import {
  getCatalogueGaps,
  GS1_TARGET_LABEL,
  type ProductGapRow,
  type UnionGap,
} from "@/lib/supplier-gaps"

// ── Products Needing Enrichment ───────────────────────────────────────────────
// The one cross-target view. Every other supplier screen looks at gaps through a
// single compliance target reached via that retailer's selection codes; this one
// answers "what across my whole catalogue needs work" in a single list,
// irrespective of selection code, with the named gaps expandable in place.
//
// The row set and every number come from lib/supplier-gaps, which unions
// lib/supplier-catalogue's per-target gap records — so nothing here is a second
// opinion about compliance, and a value filled from this screen moves the
// per-target drill-down at the same time.

const PAGE_SIZE = 10

type GapFilter = "all" | "no-category" | "attributes" | "images"

interface SupplierGapsProps {
  products: SupplierProduct[]
  /** Back to the Compliance list, where this screen is reached from */
  onBack: () => void
  /** Manual categorisation — mutates the shared store */
  onAssignCategory: (ids: Set<string>, brickCode: string) => void
  /** Persist a supplier-supplied attribute value to the shared catalogue */
  onFillAttribute: (productId: string, attributeName: string, value: string) => void
  /** Open the image-upload flow for one missing image requirement */
  onUploadImage: (productId: string, target: GapTarget, image: MissingImage) => void
  /** Jump to the (out-of-scope) GTIN list for this product */
  onViewGtins: (productId: string) => void
  /** Drill into the per-target gap detail for one product */
  onOpenGapDetail: (productId: string, target: GapTarget) => void
}

// ── Small presentational pieces ───────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
      style={{ backgroundColor: "#0168B3" }}
    >
      <CheckCircle className="w-4 h-4 shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg p-4 flex-1 min-w-[10rem]"
      style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-[#111827]">{value}</span>
      {sub && (
        <span className="text-[11px] font-light" style={{ color: "#6B7280" }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function TargetPill({ label, count }: { label: string; count: number }) {
  const isGs1 = label === GS1_TARGET_LABEL
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={
        isGs1
          ? { backgroundColor: "#EFF6FF", color: "#0168B3" }
          : { backgroundColor: "#FEF3C7", color: "#92400E" }
      }
    >
      {label}
      <span className="tabular-nums font-semibold">{count}</span>
    </span>
  )
}

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
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderTop: "1px solid #F3F4F6" }}
    >
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

// ── Expanded row ──────────────────────────────────────────────────────────────
// The payoff: every named gap for one product, with the targets that require
// each, without leaving the list. Filling a value here writes to the same shared
// catalogue the drill-down writes to, so the row re-renders with one gap fewer.
function ExpandedGaps({
  row,
  onPickValue,
  onUploadImage,
  onAssignCategory,
  onOpenGapDetail,
}: {
  row: ProductGapRow
  onPickValue: (gap: UnionGap, value: string) => void
  onUploadImage: (target: GapTarget, image: MissingImage) => void
  onAssignCategory: () => void
  onOpenGapDetail: () => void
}) {
  if (row.categoryMissing) {
    return (
      <div className="flex flex-col gap-3 px-6 py-4" style={{ backgroundColor: "#FFF7F7" }}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "#991B1B" }}>
              No GS1 category assigned
            </span>
            <p className="text-xs font-light leading-relaxed" style={{ color: "#991B1B" }}>
              Without a category this product carries no requirement set, so it cannot be assessed
              against the GS1 baseline or any retailer. Categorising it is the gap — its attribute
              requirements only exist once a category is chosen.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAssignCategory}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0168B3" }}
          >
            Assign Category
          </button>
          <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
            Or send it to AI Attributes Enrichment, which suggests one.
          </span>
        </div>
      </div>
    )
  }

  const attrGaps = row.gaps.filter((g) => g.kind === "attribute")
  const imageGaps = row.gaps.filter((g) => g.kind === "image")
  const firstTarget = row.affectedTargets[0]?.target ?? { kind: "gs1" as const }

  return (
    <div className="flex flex-col gap-4 px-6 py-4" style={{ backgroundColor: "#F9FAFB" }}>
      {/* Missing attributes */}
      {attrGaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
            Missing attributes ({attrGaps.length})
          </h3>
          <div
            className="rounded-md overflow-hidden"
            style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
          >
            {attrGaps.map((gap, idx) => (
              <div
                key={gap.name}
                className="flex items-center gap-3 px-3 py-2.5 flex-wrap"
                style={{ borderBottom: idx < attrGaps.length - 1 ? "1px solid #F3F4F6" : undefined }}
              >
                <div className="flex flex-col gap-0.5 min-w-[12rem] flex-1">
                  <span className="text-sm font-medium text-[#111827]">{gap.name}</span>
                  <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
                    Required by {gap.requiredBy.join(", ")}
                    {gap.waivedBy.length > 0 && ` · waived by ${gap.waivedBy.join(", ")}`}
                  </span>
                </div>
                <AttributeFillControl
                  attributeName={gap.name}
                  onPick={(value) => onPickValue(gap, value)}
                  className="h-8 w-52 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing images */}
      {imageGaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
            Missing images ({imageGaps.length})
          </h3>
          <div
            className="rounded-md overflow-hidden"
            style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
          >
            {imageGaps.map((gap, idx) => (
              <div
                key={gap.name}
                className="flex items-center gap-3 px-3 py-2.5 flex-wrap"
                style={{ borderBottom: idx < imageGaps.length - 1 ? "1px solid #F3F4F6" : undefined }}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
                <div className="flex flex-col gap-0.5 min-w-[12rem] flex-1">
                  <span className="text-sm font-medium text-[#111827]">{gap.name}</span>
                  <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
                    {gap.spec} · required by {gap.requiredBy.join(", ")}
                  </span>
                </div>
                <button
                  onClick={() =>
                    onUploadImage(firstTarget, { name: gap.name, spec: gap.spec ?? "" })
                  }
                  className="px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
                  style={{ borderColor: "#E0E4E8", color: "#0168B3" }}
                >
                  Upload
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waived — shown so a requirement never just vanishes without explanation */}
      {row.waivedOnly.length > 0 && (
        <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
          Also waived for you:{" "}
          {row.waivedOnly
            .map((g) => `${g.name} (by ${g.waivedBy.join(", ")})`)
            .join(", ")}
          . Not counted as gaps.
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-[11px] font-light leading-relaxed flex-1" style={{ color: "#9CA3AF" }}>
          A value you enter here applies to the whole product, so it clears this requirement for
          every target that wanted it — not just one retailer.
        </p>
        <button
          onClick={onOpenGapDetail}
          className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline shrink-0"
          style={{ color: "#0168B3" }}
        >
          Open full gap detail
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function ScreenSupplierGaps({
  products,
  onBack,
  onAssignCategory,
  onFillAttribute,
  onUploadImage,
  onViewGtins,
  onOpenGapDetail,
}: SupplierGapsProps) {
  const [search, setSearch] = useState("")
  const [gapFilter, setGapFilter] = useState<GapFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [targetFilter, setTargetFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen] = useState(false)
  /** Product IDs the assign modal will act on — the selection, or one row. */
  const [assignScope, setAssignScope] = useState<Set<string> | null>(null)
  const [enrichOpen, setEnrichOpen] = useState(false)
  const [pendingFill, setPendingFill] = useState<{
    row: ProductGapRow
    gap: UnionGap
    value: string
  } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Recomputed on every render from the shared catalogue, so a fill or a
  // categorisation is reflected the moment it lands.
  const summary = useMemo(() => getCatalogueGaps(products), [products])

  const categoryFilters = useMemo(() => {
    const categories = [...new Set(summary.rows.map((r) => r.category).filter(Boolean))].sort()
    return [
      { value: "all", label: "All categories" },
      ...categories.map((c) => ({ value: c as string, label: c as string })),
    ]
  }, [summary.rows])

  const targetFilters = useMemo(() => {
    const labels = new Set<string>()
    for (const row of summary.rows) for (const t of row.affectedTargets) labels.add(t.label)
    // GS1 first, then retailers alphabetically — the Compliance list's order.
    const retailers = [...labels].filter((l) => l !== GS1_TARGET_LABEL).sort()
    const ordered = labels.has(GS1_TARGET_LABEL) ? [GS1_TARGET_LABEL, ...retailers] : retailers
    return [{ value: "all", label: "All targets" }, ...ordered.map((l) => ({ value: l, label: l }))]
  }, [summary.rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return summary.rows.filter((row) => {
      if (q && !`${row.product.id} ${row.product.description}`.toLowerCase().includes(q)) {
        return false
      }
      if (gapFilter === "no-category" && !row.categoryMissing) return false
      if (gapFilter === "attributes" && row.attributeGapCount === 0) return false
      if (gapFilter === "images" && row.imageGapCount === 0) return false
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false
      // A target filter can only match a product that target actually assesses;
      // uncategorised products are assessed by nobody, so they drop out.
      if (targetFilter !== "all" && !row.affectedTargets.some((t) => t.label === targetFilter)) {
        return false
      }
      return true
    })
  }, [summary.rows, search, gapFilter, categoryFilter, targetFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const selectedRows = summary.rows.filter((r) => selected.has(r.product.id))
  const selectedProducts = selectedRows.map((r) => r.product)
  const uncategorisedSelected = selectedRows.filter((r) => r.categoryMissing).length
  // Assigning a category to an already-categorised product would silently
  // reclassify it, so the bulk action stays available only for a clean selection.
  const canBulkAssign = selected.size > 0 && uncategorisedSelected === selected.size

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.product.id))

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) for (const r of visible) next.delete(r.product.id)
      else for (const r of visible) next.add(r.product.id)
      return next
    })
  }

  function handleAssign(brick: Gs1Brick) {
    const ids = assignScope ?? selected
    const n = ids.size
    onAssignCategory(new Set(ids), brick.brickCode)
    showToast(
      `${n} product${n !== 1 ? "s" : ""} categorised as ${brick.brickName} — compliance recalculated against GS1 and all retailers.`
    )
    if (!assignScope) setSelected(new Set())
    setAssignScope(null)
  }

  // Hand-off is a signpost only — it does NOT change any product data.
  function handleEnrichHandoff() {
    setEnrichOpen(false)
    showToast(
      `${selected.size} product${selected.size !== 1 ? "s" : ""} handed off to AI Attributes Enrichment (out of scope for this prototype).`
    )
    setSelected(new Set())
  }

  function confirmFill() {
    if (!pendingFill) return
    onFillAttribute(pendingFill.row.product.id, pendingFill.gap.name, pendingFill.value)
    setPendingFill(null)
  }

  const nothingToDo = summary.rows.length === 0

  return (
    <>
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
          <span className="font-light text-[#6B7280]">Products Needing Enrichment</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#111827]">Products Needing Enrichment</h1>
          <p className="text-sm font-light text-[#6B7280]">
            Every product with an outstanding requirement, in one list — one row per product, with
            its gaps combined across the GS1 baseline and every retailer that assesses it,
            irrespective of selection code.
          </p>
        </div>

        {nothingToDo ? (
          <div
            className="flex items-start gap-2.5 rounded-lg px-4 py-4"
            style={{ backgroundColor: "#DCFCE7", border: "1px solid #BBF7D0" }}
          >
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium" style={{ color: "#15803D" }}>
                Nothing needs enrichment
              </span>
              <span className="text-xs font-light" style={{ color: "#15803D" }}>
                All {summary.totalProducts} products are categorised and satisfy every requirement
                published against them.
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Summary tiles */}
            <div className="flex gap-3 flex-wrap">
              <StatTile
                label="Need enrichment"
                value={String(summary.rows.length)}
                sub={`of ${summary.totalProducts} products`}
              />
              <StatTile
                label="No category"
                value={String(summary.uncategorisedCount)}
                sub="cannot be assessed at all"
              />
              <StatTile
                label="With data gaps"
                value={String(summary.productsWithGaps)}
                sub="missing attributes or images"
              />
              <StatTile
                label="Open gaps"
                value={String(summary.totalOpenGaps)}
                sub="distinct requirements, all targets"
              />
            </div>

            {/* Most common missing attributes */}
            {summary.topMissingAttributes.length > 0 && (
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}
                >
                  <h2 className="text-sm font-medium text-[#111827]">
                    Most common missing attributes
                  </h2>
                  <p className="text-[11px] font-light mt-0.5" style={{ color: "#9CA3AF" }}>
                    Fix these first — one value clears the attribute for every target that wants it.
                  </p>
                </div>
                {summary.topMissingAttributes.map((a, i) => {
                  const maxCount = summary.topMissingAttributes[0].products
                  return (
                    <div
                      key={a.name}
                      className="flex items-center gap-3 px-4 py-2"
                      style={{
                        borderBottom:
                          i < summary.topMissingAttributes.length - 1
                            ? "1px solid #F3F4F6"
                            : undefined,
                      }}
                    >
                      <span
                        className="text-xs font-light tabular-nums w-5 shrink-0"
                        style={{ color: "#9CA3AF" }}
                      >
                        {i + 1}
                      </span>
                      <span className="w-52 shrink-0 text-sm font-medium text-[#111827] truncate">
                        {a.name}
                      </span>
                      <div
                        className="flex-1 h-2.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#F1F5F9" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((a.products / maxCount) * 100)}%`,
                            backgroundColor: "#F59E0B",
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-10 text-right shrink-0 text-[#111827]">
                        {a.products}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[200px] max-w-xs"
                style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
              >
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
                <input
                  value={search}
                  onChange={(e) => resetPage(setSearch)(e.target.value)}
                  placeholder="Search by Product ID or description"
                  className="flex-1 text-sm font-light outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
                />
                {search && (
                  <button onClick={() => resetPage(setSearch)("")}>
                    <X className="w-3.5 h-3.5 text-[#9CA3AF] hover:text-[#374151]" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "no-category", label: "No category" },
                    { value: "attributes", label: "Missing attributes" },
                    { value: "images", label: "Missing images" },
                  ] as { value: GapFilter; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => resetPage(setGapFilter)(opt.value)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
                    style={
                      gapFilter === opt.value
                        ? { backgroundColor: "#0168B3", borderColor: "#0168B3", color: "#FFFFFF" }
                        : { backgroundColor: "#FFFFFF", borderColor: "#E0E4E8", color: "#6B7280" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div
                className="relative inline-flex items-center rounded-md"
                style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
              >
                <select
                  value={categoryFilter}
                  onChange={(e) => resetPage(setCategoryFilter)(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-md text-sm font-light outline-none bg-transparent text-[#374151]"
                >
                  {categoryFilters.map((c) => (
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

              <div
                className="relative inline-flex items-center rounded-md"
                style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
              >
                <select
                  value={targetFilter}
                  onChange={(e) => resetPage(setTargetFilter)(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-md text-sm font-light outline-none bg-transparent text-[#374151]"
                  aria-label="Required by"
                >
                  {targetFilters.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.value === "all" ? t.label : `Required by ${t.label}`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none"
                  style={{ color: "#9CA3AF" }}
                />
              </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-light text-[#6B7280]">
                <span className="font-medium text-[#111827]">{selected.size}</span> selected
              </span>
              {selected.size > 0 && !canBulkAssign && (
                <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
                  Assign Category needs a selection of uncategorised products only
                  {uncategorisedSelected > 0 && ` (${uncategorisedSelected} of ${selected.size} are)`}
                  .
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    setAssignScope(null)
                    setAssignOpen(true)
                  }}
                  disabled={!canBulkAssign}
                  className="px-3.5 py-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-40 hover:bg-[#F4F6F8]"
                  style={{ borderColor: "#E0E4E8", color: "#374151" }}
                >
                  Assign Category
                </button>
                <button
                  onClick={() => setEnrichOpen(true)}
                  disabled={selected.size === 0}
                  className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90 inline-flex items-center gap-1.5"
                  style={{ backgroundColor: "#0168B3" }}
                >
                  Send to AI Attributes Enrichment
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
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
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="Select all products on this page"
                        className="accent-[#0168B3]"
                      />
                    </th>
                    {["Product", "Category", "Gaps", "Required by", ""].map((h, i) => (
                      <th
                        key={h || `col-${i}`}
                        className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm font-light text-[#9CA3AF]"
                      >
                        No products match the current filter.
                      </td>
                    </tr>
                  ) : (
                    visible.map((row) => {
                      const id = row.product.id
                      const isExpanded = expanded === id
                      const extraTargets = row.affectedTargets.length - 3
                      return [
                        <tr
                          key={id}
                          style={{
                            borderBottom: "1px solid #F3F4F6",
                            backgroundColor: row.categoryMissing ? "#FFF7F7" : undefined,
                          }}
                          className="transition-colors hover:bg-[#F4F6F8]/40"
                        >
                          <td className="px-4 py-3 align-middle">
                            <input
                              type="checkbox"
                              checked={selected.has(id)}
                              onChange={() => toggle(id)}
                              aria-label={`Select ${id}`}
                              className="accent-[#0168B3]"
                            />
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-[#111827] tabular-nums">{id}</span>
                              <span className="text-xs font-light" style={{ color: "#6B7280" }}>
                                {row.product.description}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {row.categoryMissing ? (
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: "#DC2626" }}
                                />
                                No category
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm text-[#111827]">{row.category}</span>
                                <span
                                  className="text-[11px] font-light"
                                  style={{ color: "#9CA3AF" }}
                                >
                                  {row.brickLabel}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            {row.categoryMissing ? (
                              <span className="text-xs font-light" style={{ color: "#991B1B" }}>
                                Cannot be assessed
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className="text-sm font-semibold tabular-nums"
                                  style={{ color: "#92400E" }}
                                >
                                  {row.openGapCount} open
                                </span>
                                <span
                                  className="text-[11px] font-light"
                                  style={{ color: "#9CA3AF" }}
                                >
                                  {row.attributeGapCount} attribute
                                  {row.attributeGapCount !== 1 ? "s" : ""}
                                  {row.imageGapCount > 0 &&
                                    ` · ${row.imageGapCount} image${row.imageGapCount !== 1 ? "s" : ""}`}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {row.affectedTargets.length === 0 ? (
                              <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
                                No target can assess it
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap max-w-[16rem]">
                                {row.affectedTargets.slice(0, 3).map((t) => (
                                  <TargetPill key={t.label} label={t.label} count={t.count} />
                                ))}
                                {extraTargets > 0 && (
                                  <span
                                    className="text-[10px] font-light"
                                    style={{ color: "#9CA3AF" }}
                                  >
                                    +{extraTargets} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <button
                              onClick={() => setExpanded(isExpanded ? null : id)}
                              aria-label={isExpanded ? `Hide gaps for ${id}` : `View gaps for ${id}`}
                              aria-expanded={isExpanded}
                              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                              style={{ color: "#0168B3" }}
                            >
                              {isExpanded ? "Hide gaps" : "View gaps"}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>,
                        isExpanded && (
                          <tr key={`${id}-detail`} style={{ borderBottom: "1px solid #F3F4F6" }}>
                            <td colSpan={6} className="p-0">
                              <ExpandedGaps
                                row={row}
                                onPickValue={(gap, value) => setPendingFill({ row, gap, value })}
                                onUploadImage={(target, image) => onUploadImage(id, target, image)}
                                onAssignCategory={() => {
                                  setAssignScope(new Set([id]))
                                  setAssignOpen(true)
                                }}
                                onOpenGapDetail={() =>
                                  onOpenGapDetail(
                                    id,
                                    row.affectedTargets[0]?.target ?? { kind: "gs1" }
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ),
                      ]
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

              <p
                className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
                style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
              >
                Gaps are combined across every target that assesses a product, so a requirement
                wanted by three retailers counts once here and is cleared once. Products with no
                category carry no requirements at all until one is assigned. Sending products to AI
                Attributes Enrichment is a hand-off signpost in this prototype — it changes no data.
              </p>
            </div>
          </>
        )}
      </div>

      <AssignCategoryModal
        open={assignOpen}
        count={(assignScope ?? selected).size}
        onClose={() => {
          setAssignOpen(false)
          setAssignScope(null)
        }}
        onAssign={handleAssign}
      />

      <EnrichHandoffModal
        open={enrichOpen}
        products={selectedProducts}
        onClose={() => setEnrichOpen(false)}
        onConfirm={handleEnrichHandoff}
      />

      <ConfirmFillAttributeModal
        open={pendingFill !== null}
        onOpenChange={(open) => !open && setPendingFill(null)}
        attributeName={pendingFill?.gap.name ?? ""}
        value={pendingFill?.value ?? ""}
        productLabel={
          pendingFill ? `${pendingFill.row.product.id} — ${pendingFill.row.product.description}` : ""
        }
        onConfirm={confirmFill}
        onViewGtins={() => {
          const productId = pendingFill?.row.product.id
          setPendingFill(null)
          if (productId) onViewGtins(productId)
        }}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  )
}
