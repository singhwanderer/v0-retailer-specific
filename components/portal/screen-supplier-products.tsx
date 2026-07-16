"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown, Search, Sparkles, X } from "lucide-react"
// The supplier "Assign category" picker is driven by the SAME GS1/GPC standard
// library the retailer screens use, so suppliers categorise against the exact
// brick codes retailers build their requirement profiles on.
import { searchBricks, getSegments, getBrickByCode, type Gs1Brick } from "@/lib/gs1-standard-library"

// ── SCOPE NOTES (supplier view) ───────────────────────────────────────────────
// - The supplier view is READ-ONLY with respect to retailer requirements and
//   guidance; the only actions available are downloading data and assigning a
//   GS1 category to the supplier's own product (below).
// - Draft retailer profiles are NOT visible to suppliers (handled on the
//   retailer side — drafts are simply never surfaced here).
// - Supplier image/data UPLOADS are out of scope for this prototype.
// - A supplier-level compliance overview and a per-product compliance dashboard
//   are NOT required and are intentionally not built.

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
  /** GS1 brick code for this product's category, used to compute superset gaps. */
  brickCode?: string
  retailers?: RetailerStatus[]
  /**
   * Superset compliance: the union of all gaps across all trading partners,
   * split by gap type so the supplier knows which to fix once vs per-retailer.
   *   gs1Gaps      — missing standard GS1 attrs (filling once satisfies all)
   *   customGaps   — retailer-specific custom attrs (must be done per-retailer)
   */
  superset?: { gs1Gaps: number; customGaps: number }
}

// Mock product catalogue — in a real app this would be fetched per partner + code
// superset.gs1Gaps  = GS1-standard attributes missing (fill once, satisfies all retailers)
// superset.customGaps = retailer-specific custom attributes missing (per-retailer residual)
const ALL_PRODUCTS: ProductRow[] = [
  {
    id: "1TESTPROD1",
    description: "Floral Wrap Dress",
    state: "categorised",
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [
      { retailer: "Dillard's", gaps: 3 },
      { retailer: "Belk", gaps: "complete" },
    ],
    superset: { gs1Gaps: 2, customGaps: 1 },
  },
  {
    id: "B11442",
    description: "Linen Shift Dress",
    state: "categorised",
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [{ retailer: "Dillard's", gaps: 5 }],
    superset: { gs1Gaps: 3, customGaps: 2 },
  },
  {
    id: "B11443",
    description: "Printed Midi Dress",
    state: "categorised",
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
    superset: { gs1Gaps: 0, customGaps: 0 },
  },
  {
    id: "B11444",
    description: "Velvet Evening Dress",
    state: "categorised",
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [
      { retailer: "Dillard's", gaps: 2 },
      { retailer: "Belk", gaps: 1 },
    ],
    superset: { gs1Gaps: 1, customGaps: 1 },
  },
  {
    id: "B11445",
    description: "Jersey Wrap Dress",
    state: "categorised",
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [{ retailer: "Belk", gaps: "complete" }],
    superset: { gs1Gaps: 0, customGaps: 0 },
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
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [{ retailer: "Dillard's", gaps: "complete" }],
    superset: { gs1Gaps: 0, customGaps: 0 },
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
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [{ retailer: "Dillard's", gaps: 1 }],
    superset: { gs1Gaps: 1, customGaps: 0 },
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
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    retailers: [{ retailer: "Belk", gaps: "complete" }],
    superset: { gs1Gaps: 0, customGaps: 0 },
  },
  {
    id: "B11453",
    description: "Silk Maxi Dress",
    state: "no-profile",
    category: "Dresses (GS1: 10001333)",
    brickCode: "10001333",
    superset: { gs1Gaps: 4, customGaps: 0 },
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

// ── Pagination ───────────────────────────────────────────────────────���────────
// ── Superset compliance badge ─────────────────────────────────────────────────
// Shows the union of all trading partner gaps for a product, split into
// GS1-standard (fill once = satisfies all) vs retailer-custom (per-retailer).
function SupersetBadge({ superset }: { superset: ProductRow["superset"] }) {
  if (!superset) return null
  const totalGaps = superset.gs1Gaps + superset.customGaps
  if (totalGaps === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#16A34A" }} />
        Superset complete
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {superset.gs1Gaps > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
          title="Standard GS1 attributes — fill once to satisfy all trading partners"
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#6366F1" }} />
          {superset.gs1Gaps} GS1
        </span>
      )}
      {superset.customGaps > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          title="Retailer-specific custom attributes — must be filled per retailer"
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#F59E0B" }} />
          {superset.customGaps} custom
        </span>
      )}
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

// ── Assign Category modal ─────────────────────────────────────────────────────
// A searchable GS1 brick picker. Options come from the shared GS1 standard
// library (searchBricks / getSegments) — the identical GPC source the retailer
// uses when defining requirement profiles.

// ── AI Bulk Category Assignment modal ─────────────────────────────────────────
// Step 1 (review): Shows AI suggestions with confidence % and reasoning for each
//                  uncategorised product. Supplier can accept or override each.
// Step 2 (confirm): Summary of what will be applied, with "Confirm enrichment" CTA.
// Only operates on standard GS1 attributes — never on custom retailer attrs.

type AiSuggestion = {
  productId: string
  description: string
  suggestedBrick: Gs1Brick
  confidence: number      // 0–100
  reasoning: string
  accepted: boolean
  overrideCode: string | null
}

// Simulate AI suggestions for uncategorised products.
// In a real implementation this would call an LLM with product descriptions.
function generateAiSuggestions(products: ProductRow[]): AiSuggestion[] {
  // Hardcoded plausible suggestions for the mock product catalogue
  const suggestions: Record<string, { brickCode: string; confidence: number; reasoning: string }> = {
    "B11446": { brickCode: "10001333", confidence: 94, reasoning: "Product name 'Denim Shirtdress' matches GS1 Dresses brick; dress suffix and shirt construction are characteristic of this category." },
    "B11447": { brickCode: "10001333", confidence: 89, reasoning: "Product name 'Pleated Chiffon Gown' indicates a formal dress garment. Chiffon construction and gown silhouette map to GS1 Dresses brick." },
    "B11449": { brickCode: "10001333", confidence: 91, reasoning: "Product name 'Broderie Anglaise Dress' contains explicit dress suffix and embroidery technique; maps with high confidence to GS1 Dresses brick." },
    "B11451": { brickCode: "10001333", confidence: 96, reasoning: "Product name 'Cotton Sundress' unambiguously identifies a dress garment; sundress is a specific dress silhouette in GS1 Dresses brick." },
  }

  return products
    .filter((p) => p.state === "uncategorised")
    .map((p) => {
      const hint = suggestions[p.id] ?? {
        brickCode: "10001333",
        confidence: 78,
        reasoning: `Product description "${p.description}" indicates a women's apparel item; GS1 Dresses brick is the closest match.`,
      }
      const brick = getBrickByCode(hint.brickCode)!
      return {
        productId: p.id,
        description: p.description,
        suggestedBrick: brick,
        confidence: hint.confidence,
        reasoning: hint.reasoning,
        accepted: true,
        overrideCode: null,
      }
    })
}

function ConfidencePill({ value }: { value: number }) {
  const high = value >= 90
  const mid = value >= 75
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
      style={
        high
          ? { backgroundColor: "#DCFCE7", color: "#15803D" }
          : mid
          ? { backgroundColor: "#FEF9C3", color: "#A16207" }
          : { backgroundColor: "#FEE2E2", color: "#991B1B" }
      }
    >
      {value}% confidence
    </span>
  )
}

function AiBulkCategoryModal({
  open,
  uncategorisedProducts,
  onClose,
  onConfirm,
}: {
  open: boolean
  uncategorisedProducts: ProductRow[]
  onClose: () => void
  onConfirm: (accepted: AiSuggestion[]) => void
}) {
  const [step, setStep] = useState<"review" | "confirm">("review")
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null)
  const allBricks = searchBricks("")

  // Generate suggestions whenever the modal opens
  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setSuggestions(generateAiSuggestions(uncategorisedProducts))
      setStep("review")
      setExpandedReasoning(null)
    } else {
      onClose()
    }
  }

  function toggleAccepted(productId: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.productId === productId ? { ...s, accepted: !s.accepted } : s)),
    )
  }

  function setOverride(productId: string, brickCode: string) {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.productId !== productId) return s
        const brick = getBrickByCode(brickCode)
        return brick ? { ...s, overrideCode: brickCode, suggestedBrick: brick } : s
      }),
    )
  }

  const acceptedCount = suggestions.filter((s) => s.accepted).length
  const totalAttrsToFill = suggestions
    .filter((s) => s.accepted)
    .reduce((sum, s) => sum + s.suggestedBrick.extendedAttributes.length, 0)

  function handleConfirm() {
    onConfirm(suggestions.filter((s) => s.accepted))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full"
              style={{ backgroundColor: "#EEF2FF" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#4F46E5" }} />
            </span>
            <DialogTitle className="text-base font-semibold text-[#111827]">
              {step === "review" ? "AI Category Suggestions" : "Confirm Enrichment"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === "review" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
              AI has analysed each product description and suggested a GS1 category. Each suggestion
              shows confidence and reasoning. Accept, override the category with a dropdown, or
              deselect any product before confirming.
            </p>

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-medium text-[#6B7280]">Confidence:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>90%+ high</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: "#FEF9C3", color: "#A16207" }}>75–89% medium</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>&lt;75% low</span>
            </div>

            {/* Review table */}
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E0E4E8" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
                    {["", "Product", "AI Suggestion", "Confidence", "Reasoning", "Category"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-[#6B7280] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s, idx) => (
                    <tr
                      key={s.productId}
                      style={{
                        borderBottom: idx < suggestions.length - 1 ? "1px solid #F3F4F6" : undefined,
                        backgroundColor: s.accepted ? undefined : "#F9FAFB",
                        opacity: s.accepted ? 1 : 0.55,
                      }}
                    >
                      {/* Accept toggle */}
                      <td className="px-3 py-3 align-top w-8">
                        <input
                          type="checkbox"
                          checked={s.accepted}
                          onChange={() => toggleAccepted(s.productId)}
                          className="mt-0.5 accent-[#4F46E5] cursor-pointer"
                          title="Include in enrichment"
                        />
                      </td>

                      {/* Product */}
                      <td className="px-3 py-3 align-top">
                        <span className="block text-xs font-semibold text-[#111827]">{s.productId}</span>
                        <span className="text-[11px] font-light text-[#6B7280]">{s.description}</span>
                      </td>

                      {/* AI suggestion */}
                      <td className="px-3 py-3 align-top">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
                        >
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          {s.suggestedBrick.brickName}
                        </span>
                        <span className="block text-[10px] font-mono text-[#9CA3AF] mt-0.5">{s.suggestedBrick.brickCode}</span>
                      </td>

                      {/* Confidence */}
                      <td className="px-3 py-3 align-top">
                        <ConfidencePill value={s.confidence} />
                      </td>

                      {/* Reasoning (expandable) */}
                      <td className="px-3 py-3 align-top max-w-[200px]">
                        {expandedReasoning === s.productId ? (
                          <div className="flex flex-col gap-1">
                            <p className="text-[11px] font-light leading-relaxed text-[#374151]">{s.reasoning}</p>
                            <button
                              className="text-[11px] font-medium hover:underline text-left"
                              style={{ color: "#6B7280" }}
                              onClick={() => setExpandedReasoning(null)}
                            >
                              Show less
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-[11px] font-medium hover:underline text-left"
                            style={{ color: "#4F46E5" }}
                            onClick={() => setExpandedReasoning(s.productId)}
                          >
                            View reasoning
                          </button>
                        )}
                      </td>

                      {/* Override dropdown */}
                      <td className="px-3 py-3 align-top">
                        <div className="relative">
                          <select
                            value={s.overrideCode ?? s.suggestedBrick.brickCode}
                            onChange={(e) => setOverride(s.productId, e.target.value)}
                            disabled={!s.accepted}
                            className="appearance-none text-[11px] font-medium pl-2.5 pr-6 py-1 rounded-md border outline-none bg-white cursor-pointer disabled:cursor-default disabled:opacity-50"
                            style={{ borderColor: "#E0E4E8", color: "#111827", maxWidth: 160 }}
                          >
                            {allBricks.map((b) => (
                              <option key={b.brickCode} value={b.brickCode}>
                                {b.brickName} ({b.brickCode})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#9CA3AF" }} />
                        </div>
                        {s.overrideCode && s.overrideCode !== suggestions.find((x) => x.productId === s.productId)?.suggestedBrick.brickCode && (
                          <span
                            className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                          >
                            Overridden
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-light text-[#6B7280]">
                {acceptedCount} of {suggestions.length} product{suggestions.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
                  style={{ borderColor: "#E0E4E8", color: "#374151" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={acceptedCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "#4F46E5", color: "#FFFFFF" }}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Review enrichment
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col gap-4">
            {/* Summary card */}
            <div
              className="rounded-lg p-4 flex flex-col gap-3"
              style={{ backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE" }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#4F46E5" }} />
                <span className="text-sm font-semibold" style={{ color: "#3730A3" }}>
                  Ready to enrich {acceptedCount} product{acceptedCount !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                <li className="text-xs font-light leading-relaxed" style={{ color: "#4338CA" }}>
                  — Categories will be assigned from GS1 standard bricks (AI-suggested, supplier-reviewed)
                </li>
                <li className="text-xs font-light leading-relaxed" style={{ color: "#4338CA" }}>
                  — {totalAttrsToFill} standard attributes will become required across the selected products
                </li>
                <li className="text-xs font-light leading-relaxed" style={{ color: "#4338CA" }}>
                  — Compliance status will update immediately for all trading partners using these categories
                </li>
              </ul>
              <div
                className="rounded-md px-3 py-2 text-[11px] font-light leading-relaxed"
                style={{ backgroundColor: "#EDE9FE", color: "#5B21B6" }}
              >
                AI works on GS1 standard attributes only. Retailer-specific custom attributes are
                not included in this enrichment and must be completed per-retailer.
              </div>
            </div>

            {/* Per-product summary */}
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E0E4E8" }}>
              {suggestions.filter((s) => s.accepted).map((s, idx, arr) => (
                <div
                  key={s.productId}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: idx < arr.length - 1 ? "1px solid #F3F4F6" : undefined }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#111827]">{s.productId} &mdash; {s.description}</span>
                    <span className="text-[11px] font-light text-[#6B7280]">
                      {s.suggestedBrick.brickName} · {s.suggestedBrick.extendedAttributes.length} attrs
                      {s.overrideCode ? " · overridden by you" : " · AI suggestion"}
                    </span>
                  </div>
                  <ConfidencePill value={s.confidence} />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setStep("review")}
                className="text-xs font-medium hover:underline"
                style={{ color: "#6B7280" }}
              >
                Back to review
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
                  style={{ borderColor: "#E0E4E8", color: "#374151" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors"
                  style={{ backgroundColor: "#4F46E5", color: "#FFFFFF" }}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Confirm enrichment
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Assign Category modal ─────────────────────────────────────────────────────
// A searchable GS1 brick picker. Options come from the shared GS1 standard
function AssignCategoryModal({
  open,
  product,
  onClose,
  onAssign,
}: {
  open: boolean
  product: ProductRow | null
  onClose: () => void
  onAssign: (brick: Gs1Brick) => void
}) {
  const [query, setQuery] = useState("")
  const [segment, setSegment] = useState("All")

  const segments = ["All", ...getSegments()]
  const bricks = searchBricks(query).filter((b) => segment === "All" || b.segment === segment)

  function handleClose() {
    setQuery("")
    setSegment("All")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Assign Category{product ? ` — ${product.id}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
            Choose a GS1 category (GPC brick) for this product. These are the same
            standard categories retailers build their requirements on.
          </p>

          {/* Segment filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {segments.map((s) => (
              <button
                key={s}
                onClick={() => setSegment(s)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
                style={
                  segment === s
                    ? { backgroundColor: "#0168B3", borderColor: "#0168B3", color: "#FFFFFF" }
                    : { backgroundColor: "#FFFFFF", borderColor: "#E0E4E8", color: "#6B7280" }
                }
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md border"
            style={{ borderColor: "#E0E4E8" }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search category name or GS1 code"
              className="flex-1 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
            />
          </div>

          {/* Brick list */}
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "#E0E4E8", maxHeight: 300, overflowY: "auto" }}
          >
            {bricks.length === 0 ? (
              <p className="px-4 py-3 text-sm font-light text-[#9CA3AF]">No categories found.</p>
            ) : (
              bricks.map((b) => (
                <button
                  key={b.brickCode}
                  onClick={() => { onAssign(b); handleClose() }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#F4F6F8] transition-colors"
                  style={{ borderBottom: "1px solid #F3F4F6" }}
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-[#111827]">{b.brickName}</span>
                    <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
                      {b.segment}
                    </span>
                  </span>
                  <span className="text-xs font-mono" style={{ color: "#9CA3AF" }}>{b.brickCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  // Local, session-only copy so assigning a category persists while browsing.
  const [products, setProducts] = useState<ProductRow[]>(ALL_PRODUCTS)
  // The product currently being assigned a category (drives the picker modal).
  const [assignProduct, setAssignProduct] = useState<ProductRow | null>(null)
  // AI bulk assignment modal
  const [aiBulkOpen, setAiBulkOpen] = useState(false)

  // Assign the chosen GS1 brick to the product: it becomes categorised. No
  // retailer requirement profile is matched here, so it shows "No requirements
  // set" until a retailer defines one.
  function handleAssignCategory(brick: Gs1Brick) {
    if (!assignProduct) return
    setProducts((prev) =>
      prev.map((p) =>
        p.id === assignProduct.id
          ? {
              ...p,
              state: "no-profile",
              category: `${brick.brickName} (GS1: ${brick.brickCode})`,
              brickCode: brick.brickCode,
              superset: { gs1Gaps: brick.extendedAttributes.length, customGaps: 0 },
            }
          : p,
      ),
    )
    setAssignProduct(null)
  }

  // AI bulk confirm: apply all accepted suggestions at once
  function handleAiBulkConfirm(accepted: AiSuggestion[]) {
    setProducts((prev) =>
      prev.map((p) => {
        const suggestion = accepted.find((s) => s.productId === p.id)
        if (!suggestion) return p
        return {
          ...p,
          state: "no-profile" as const,
          category: `${suggestion.suggestedBrick.brickName} (GS1: ${suggestion.suggestedBrick.brickCode})`,
          brickCode: suggestion.suggestedBrick.brickCode,
          superset: {
            gs1Gaps: suggestion.suggestedBrick.extendedAttributes.length,
            customGaps: 0,
          },
        }
      }),
    )
  }

  // ── Filter logic ────────────────────────────────────────────────────────────
  const filtered = products.filter((row) => {
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
          Trading Partners
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
        const uncategorisedCount = products.filter((p) => p.state === "uncategorised").length
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
            <div className="flex flex-1 items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold" style={{ color: "#991B1B" }}>
                  {uncategorisedCount} product{uncategorisedCount !== 1 ? "s" : ""} without a category
                </span>
                <span className="text-xs font-light leading-relaxed" style={{ color: "#B91C1C" }}>
                  Compliance cannot be checked until a category is assigned. These products are
                  treated as non-compliant by all retailers.
                </span>
              </div>
              <button
                onClick={() => setAiBulkOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors hover:opacity-90 shrink-0"
                style={{ backgroundColor: "#4F46E5", color: "#FFFFFF" }}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Assign with AI
              </button>
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
              {["Product ID", "Description", "Category", "Superset", "Per-Retailer Status"].map((h) => (
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
                <td colSpan={5} className="px-4 py-8 text-center text-sm font-light text-[#9CA3AF]">
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
                            onClick={() => setAssignProduct(row)}
                          >
                            Assign category
                          </button>
                        </span>
                      ) : (
                        <span className="text-[#6B7280] font-light">{row.category}</span>
                      )}
                    </td>
                    {/* Superset column */}
                    <td className="px-4 py-3 align-top">
                      {isUncategorised ? (
                        <span className="text-xs font-light text-[#9CA3AF]">&mdash;</span>
                      ) : (
                        <SupersetBadge superset={row.superset} />
                      )}
                    </td>

                    {/* Per-retailer status column */}
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

      {/* Assign category picker (GS1/GPC bricks) */}
      <AssignCategoryModal
        open={!!assignProduct}
        product={assignProduct}
        onClose={() => setAssignProduct(null)}
        onAssign={handleAssignCategory}
      />

      {/* AI bulk category assignment */}
      <AiBulkCategoryModal
        open={aiBulkOpen}
        uncategorisedProducts={products.filter((p) => p.state === "uncategorised")}
        onClose={() => setAiBulkOpen(false)}
        onConfirm={handleAiBulkConfirm}
      />
    </div>
  )
}
