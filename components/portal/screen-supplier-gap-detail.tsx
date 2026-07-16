"use client"

import { useState } from "react"
import { Check, Sparkles, X } from "lucide-react"

// ── SCOPE NOTES (supplier gap detail) ─────────────────────────────────────────
// - This screen is READ-ONLY: it shows each retailer's required attributes,
//   image requirements, and the retailer's own guidance notes. The supplier
//   cannot edit any of it.
// - The "Upload Image" action is intentionally disabled — supplier image/data
//   uploads are out of scope for this prototype.
// - Downloading data is the only export action offered to suppliers (handled on
//   the selection-code screen).

interface GapDetailProps {
  productName: string
  retailer: string
  selectionCode: string
  onBackToProducts: () => void
  onBackToPartner: () => void
  onBackToPartnerList: () => void
}

// ── Data shapes ───────────────────────────────────────────────────────────────

type MissingAttribute = {
  retailerLabel: string
  tgcName: string
  tgcCode: string
  /**
   * "standard" = GS1 attribute, AI can suggest a value (fill once = all retailers)
   * "custom"   = Retailer-specific attribute, AI does not suggest, must be per-retailer
   */
  source: "standard" | "custom"
  /**
   * The retailer's own guidance note for this attribute (authored on the
   * retailer side, Screen 2). Shown read-only to the supplier so they know
   * exactly how each retailer expects the value to be filled. This is how a
   * supplier sees per-retailer guidance across every retailer (up to 50) they
   * trade with — each trading partner's gap detail carries that retailer's
   * guidance.
   */
  guidance?: string
}

type ImageRow = {
  name: string
  provided: boolean
  guidanceSpec?: string
}

// ── Mock data per retailer ────────────────────────────────────────────────────

const DILLARDS_MISSING_ATTRS: MissingAttribute[] = [
  {
    retailerLabel: "Dress Silhouette",
    tgcName: "Dress Length",
    tgcCode: "GM03DRLN",
    source: "standard",
    guidance: "Use GS1 standard dress length values: Mini, Midi, Maxi, Knee, Floor.",
  },
  {
    retailerLabel: "Neckline",
    tgcName: "Neckline",
    tgcCode: "GM03NKLN",
    source: "standard",
    guidance: "Use GS1 neckline descriptors. V-neck, Scoop, Square, Crew, Cowl, etc.",
  },
  {
    retailerLabel: "Closure Type",
    tgcName: "Closure",
    tgcCode: "GM03CLOS",
    source: "standard",
    guidance: "Single closure type only. If multiple, list the primary fastening.",
  },
  {
    retailerLabel: "Dillard\u2019s Style Code",
    tgcName: "Dillard\u2019s Style Code",
    tgcCode: "DILL-STYLCD",
    source: "custom",
    guidance:
      "Internal Dillard\u2019s merchandise style code. Assigned by your account manager. Format: DSC-XXXXXX.",
  },
]

const DILLARDS_IMAGES: ImageRow[] = [
  {
    name: "Hero Shot",
    provided: false,
    guidanceSpec: "Dillard\u2019s spec: pure white background, 2000 \u00d7 2000 px, square. Guidance only \u2014 not verified by the system.",
  },
  {
    name: "Detail Shot",
    provided: true,
    guidanceSpec: "Dillard\u2019s spec: close-up of material/texture. Guidance only \u2014 not verified by the system.",
  },
]

// For Belk (Complete) — no missing attrs, all images provided
const BELK_IMAGES: ImageRow[] = [
  { name: "Hero Shot", provided: true },
  { name: "Detail Shot", provided: true },
]

// ── AI attribute value suggestions ────────────────────────────────────────────
// Simulated AI suggestions for standard attributes only. In production this
// would call an LLM with the product description + attribute name.
type AttrSuggestion = {
  tgcCode: string
  attributeName: string
  suggestedValue: string
  confidence: number
  reasoning: string
  accepted: boolean
}

const AI_ATTR_SUGGESTIONS: Record<string, { value: string; confidence: number; reasoning: string }> = {
  "GM03DRLN": { value: "Midi", confidence: 87, reasoning: "Product name 'Velvet Evening Dress' and formal occasion context strongly suggest a midi-length silhouette." },
  "GM03NKLN": { value: "V-Neck", confidence: 82, reasoning: "Evening dresses in this category most commonly feature V-neck styling; consistent with product description." },
  "GM03CLOS": { value: "Back Zip", confidence: 79, reasoning: "Velvet formal dresses typically use a concealed back-zip closure for clean silhouette." },
  "GM03HLTY": { value: "Flat", confidence: 85, reasoning: "Dress category — footwear heel attribute does not apply; defaulting to flat." },
  "GM03OUTS": { value: "Rubber", confidence: 72, reasoning: "Standard outsole material for dress shoes; most common in product class." },
}

function generateAttrSuggestions(missingAttrs: MissingAttribute[], productName: string): AttrSuggestion[] {
  return missingAttrs
    .filter((a) => a.source === "standard")
    .map((a) => {
      const hint = AI_ATTR_SUGGESTIONS[a.tgcCode] ?? {
        value: "— suggested value —",
        confidence: 70,
        reasoning: `Based on product "${productName}" and GS1 category context, this is the most likely value for ${a.tgcName}.`,
      }
      return {
        tgcCode: a.tgcCode,
        attributeName: a.retailerLabel,
        suggestedValue: hint.value,
        confidence: hint.confidence,
        reasoning: hint.reasoning,
        accepted: true,
      }
    })
}

function ConfidencePill({ value }: { value: number }) {
  const high = value >= 85
  const mid = value >= 75
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
      style={
        high
          ? { backgroundColor: "#DCFCE7", color: "#15803D" }
          : mid
          ? { backgroundColor: "#FEF9C3", color: "#A16207" }
          : { backgroundColor: "#FEE2E2", color: "#991B1B" }
      }
    >
      {value}%
    </span>
  )
}

function AiAttrFillPanel({
  missingAttrs,
  productName,
}: {
  missingAttrs: MissingAttribute[]
  productName: string
}) {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AttrSuggestion[]>([])

  const standardCount = missingAttrs.filter((a) => a.source === "standard").length
  const customCount = missingAttrs.filter((a) => a.source === "custom").length

  function handleOpen() {
    setSuggestions(generateAttrSuggestions(missingAttrs, productName))
    setOpen(true)
    setConfirmed(false)
  }

  function toggleAccepted(code: string) {
    setSuggestions((prev) => prev.map((s) => (s.tgcCode === code ? { ...s, accepted: !s.accepted } : s)))
  }

  function handleConfirm() {
    setConfirmed(true)
    setOpen(false)
  }

  const acceptedCount = suggestions.filter((s) => s.accepted).length

  if (standardCount === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Trigger row */}
      {!confirmed && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg"
          style={{ backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE" }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold" style={{ color: "#3730A3" }}>
              AI can suggest values for {standardCount} standard attribute{standardCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-light leading-relaxed" style={{ color: "#4338CA" }}>
              GS1-standard only. Fill once — satisfies all trading partners who require them.
              {customCount > 0 && (
                <> {customCount} custom attribute{customCount !== 1 ? "s" : ""} must be filled per-retailer.</>
              )}
            </span>
          </div>
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors hover:opacity-90 shrink-0"
            style={{ backgroundColor: "#4F46E5", color: "#FFFFFF" }}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Autofill with AI
          </button>
        </div>
      )}

      {/* Confirmed banner */}
      {confirmed && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg"
          style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          <Check className="w-4 h-4 shrink-0" style={{ color: "#16A34A" }} />
          <span className="text-sm font-semibold" style={{ color: "#15803D" }}>
            AI suggestions applied — standard attributes enriched
          </span>
          <button
            onClick={() => setConfirmed(false)}
            className="ml-auto"
            style={{ color: "#9CA3AF" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline suggestion panel */}
      {open && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #DDD6FE", backgroundColor: "#FAFAFA" }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #EDE9FE", backgroundColor: "#F5F3FF" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#4F46E5" }} />
              <span className="text-sm font-semibold" style={{ color: "#3730A3" }}>
                AI Attribute Suggestions
              </span>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#EDE9FE", color: "#6D28D9" }}
              >
                GS1 standard only
              </span>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: "#9CA3AF" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions */}
          <div className="divide-y" style={{ borderColor: "#EDE9FE" }}>
            {suggestions.map((s) => (
              <div key={s.tgcCode} className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.accepted}
                      onChange={() => toggleAccepted(s.tgcCode)}
                      className="mt-0.5 accent-[#4F46E5] cursor-pointer shrink-0"
                    />
                    <span className="text-sm font-medium text-[#111827]">{s.attributeName}</span>
                    <span className="text-[11px] font-mono text-[#9CA3AF]">{s.tgcCode}</span>
                  </div>
                  <ConfidencePill value={s.confidence} />
                </div>

                <div className="flex items-center gap-2 pl-5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    {s.suggestedValue}
                  </span>
                  <button
                    className="text-[11px] font-medium hover:underline"
                    style={{ color: expandedCode === s.tgcCode ? "#6B7280" : "#4F46E5" }}
                    onClick={() => setExpandedCode(expandedCode === s.tgcCode ? null : s.tgcCode)}
                  >
                    {expandedCode === s.tgcCode ? "Hide reasoning" : "Why?"}
                  </button>
                </div>

                {expandedCode === s.tgcCode && (
                  <p
                    className="pl-5 text-[11px] font-light leading-relaxed"
                    style={{ color: "#374151" }}
                  >
                    {s.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Custom attrs notice */}
          {customCount > 0 && (
            <div
              className="flex items-start gap-2 px-4 py-3"
              style={{ borderTop: "1px solid #FDE68A", backgroundColor: "#FFFBEB" }}
            >
              <span className="text-[11px] font-medium leading-relaxed" style={{ color: "#92400E" }}>
                <span className="font-semibold">{customCount} retailer-specific</span> attribute{customCount !== 1 ? "s" : ""} are
                not included — these cannot be autofilled as they are custom to this retailer
                and fall outside the GS1 standard.
              </span>
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid #EDE9FE" }}
          >
            <span className="text-xs font-light text-[#6B7280]">
              {acceptedCount} of {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} accepted
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
                style={{ borderColor: "#E0E4E8", color: "#374151" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={acceptedCount === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: "#4F46E5", color: "#FFFFFF" }}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                Apply {acceptedCount} suggestion{acceptedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 inline-block"
      style={{ backgroundColor: color }}
    />
  )
}

function SummaryPill({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={
        complete
          ? { backgroundColor: "#DCFCE7", color: "#15803D" }
          : { backgroundColor: "#FEF3C7", color: "#92400E" }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: complete ? "#16A34A" : "#F59E0B" }}
      />
      {label}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScreenSupplierGapDetail({
  productName,
  retailer,
  selectionCode,
  onBackToProducts,
  onBackToPartner,
  onBackToPartnerList,
}: GapDetailProps) {
  const isDillards = retailer === "Dillard's"
  const missingAttrs = isDillards ? DILLARDS_MISSING_ATTRS : []
  const imageRows = isDillards ? DILLARDS_IMAGES : BELK_IMAGES

  const providedAttrCount = isDillards ? 4 : 7
  const totalAttrCount = 7
  const providedImageCount = imageRows.filter((r) => r.provided).length
  const totalImageCount = imageRows.length
  const gapCount = (totalAttrCount - providedAttrCount) + (totalImageCount - providedImageCount)
  const isComplete = gapCount === 0

  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        <button
          onClick={onBackToPartnerList}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          Trading Partners
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <button
          onClick={onBackToPartner}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          {retailer}
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <button
          onClick={onBackToProducts}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          Code {selectionCode}
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <span className="font-light text-[#6B7280]">{productName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-[#111827]">
          Requirements Status &mdash; {retailer}
        </h1>
        <p className="text-sm font-light text-[#6B7280]">
          {productName} &middot; Women&apos;s Dresses
        </p>

        {/* Summary strip */}
        <div
          className="flex items-center gap-4 mt-2 px-4 py-3 rounded-md flex-wrap"
          style={{ backgroundColor: "#F9FAFB", border: "1px solid #E0E4E8" }}
        >
          <span className="text-sm font-light text-[#6B7280]">
            Attributes:{" "}
            <span className="font-medium text-[#111827]">
              {providedAttrCount} of {totalAttrCount} provided
            </span>
          </span>
          <span className="text-[#E0E4E8]">|</span>
          <span className="text-sm font-light text-[#6B7280]">
            Images:{" "}
            <span className="font-medium text-[#111827]">
              {providedImageCount} of {totalImageCount} provided
            </span>
          </span>
          <span className="text-[#E0E4E8]">|</span>
          <SummaryPill
            complete={isComplete}
            label={isComplete ? "Complete" : `${gapCount} gaps`}
          />
        </div>
      </div>

      {/* Section A — Missing Attributes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#111827]">Missing Attributes</h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          {isComplete || missingAttrs.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3">
              <Dot color="#16A34A" />
              <span className="text-sm font-light" style={{ color: "#15803D" }}>
                All required attributes provided.
              </span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {missingAttrs.map((attr, idx) => (
                  <tr
                    key={attr.tgcCode}
                    style={{
                      borderBottom:
                        idx < missingAttrs.length - 1 ? "1px solid #F3F4F6" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 w-8 align-top pt-3.5">
                      <Dot color="#F59E0B" />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-medium text-[#111827]">{attr.retailerLabel}</span>
                      <span className="ml-2 text-xs font-light text-[#9CA3AF]">
                        TGC: {attr.tgcName} ({attr.tgcCode})
                      </span>
                      {attr.guidance && (
                        <span
                          className="text-[11px] font-light leading-relaxed block mt-0.5"
                          style={{ color: "#9CA3AF" }}
                        >
                          {retailer} guidance: {attr.guidance}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top pt-3.5">
                      <span className="text-xs font-light text-[#92400E]">Not provided</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Section B — Image Requirements */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#111827]">Image Requirements</h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          {imageRows.every((r) => r.provided) ? (
            <div className="flex items-center gap-2 px-4 py-3">
              <Dot color="#16A34A" />
              <span className="text-sm font-light" style={{ color: "#15803D" }}>
                All required image types provided.
              </span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {imageRows.map((img, idx) => (
                  <tr
                    key={img.name}
                    style={{
                      borderBottom:
                        idx < imageRows.length - 1 ? "1px solid #F3F4F6" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 w-8 align-top pt-3.5">
                      <Dot color={img.provided ? "#16A34A" : "#F59E0B"} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-medium text-[#111827] block">{img.name}</span>
                      {img.guidanceSpec && (
                        <span
                          className="text-[11px] font-light leading-relaxed block mt-0.5"
                          style={{ color: "#9CA3AF" }}
                        >
                          {img.guidanceSpec}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className="text-xs font-light"
                        style={{ color: img.provided ? "#15803D" : "#92400E" }}
                      >
                        {img.provided ? "Image provided" : "Required image not provided"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      {!img.provided && (
                        <button
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-white transition-opacity hover:opacity-80 cursor-not-allowed opacity-60"
                          style={{ backgroundColor: "#0168B3" }}
                          onClick={() => {}}
                          disabled
                        >
                          Upload Image
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Caption */}
      <p
        className="text-[11px] font-light leading-relaxed"
        style={{ color: "#9CA3AF" }}
      >
        This shows the attributes and image types {retailer} requires that are not yet on your
        product. You keep one product &mdash; filling a gap adds it to that product and satisfies
        every retailer who requires it. Image requirements are confirmed as a matching image type
        being present; image content is not verified.
      </p>
    </div>
  )
}
