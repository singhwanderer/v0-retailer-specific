"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Edit2, ChevronLeft, FlaskConical } from "lucide-react"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import {
  getGapRecords,
  getProductAttributes,
  type GapTarget,
  type MissingAttribute,
  type MissingImage,
  type ResolvedAttribute,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"
import { getAllowedValues } from "@/lib/gs1-attribute-values"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmFillAttributeModal } from "@/components/portal/confirm-fill-attribute-modal"

interface ProductAttributesProps {
  /** Product ID in the shared catalogue */
  productId: string
  /** Compliance target — a retailer, or the GS1 baseline */
  target: GapTarget
  /** Shared supplier catalogue — the one source of truth */
  products: SupplierProduct[]
  /** Back to gap detail or product list */
  onBack: () => void
  /** Persist a supplier-supplied attribute value to the shared catalogue */
  onFillAttribute: (productId: string, attributeCode: string, value: string) => void
  /** Jump to the (out-of-scope) GTIN list for this product */
  onViewGtins: (productId: string) => void
  /** Open the image-upload flow for one missing image requirement */
  onUploadImage: (image: MissingImage) => void
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

const STATUS_TONE = {
  provided: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  missing: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  waived: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
} as const

/**
 * Value entry for one attribute — a GS1 pick-list where the attribute has an
 * enumerated code list, a free-text box otherwise. Used for both filling a gap
 * and editing a value that is already on the product, so the two paths can't
 * drift apart.
 */
function AttributeValueEditor({
  attr,
  initialValue,
  onSubmit,
}: {
  attr: { name: string }
  initialValue: string
  onSubmit: (value: string) => void
}) {
  const allowedValues = getAllowedValues(attr.name)

  if (allowedValues && allowedValues.length > 0) {
    return (
      <Select value={initialValue || undefined} onValueChange={onSubmit}>
        <SelectTrigger className="ml-auto h-8 w-52 text-xs" aria-label={`Select a value for ${attr.name}`}>
          <SelectValue placeholder="Select a value…" />
        </SelectTrigger>
        <SelectContent>
          {allowedValues.map((v) => (
            <SelectItem key={v.value} value={v.value} className="text-xs">
              {v.value}
              {v.code && (
                <span className="ml-1.5 font-mono text-[10px] text-[#9CA3AF]">{v.code}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <input
      type="text"
      defaultValue={initialValue}
      autoFocus={Boolean(initialValue)}
      placeholder="Enter a value…"
      aria-label={`Enter a value for ${attr.name}`}
      className="ml-auto h-8 w-52 text-xs rounded-md border px-2.5 outline-none focus:ring-2"
      style={{ borderColor: "#E0E4E8" }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === "Enter") {
          const value = e.currentTarget.value.trim()
          if (value) onSubmit(value)
        }
      }}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim()
        if (value && value !== initialValue) onSubmit(value)
      }}
    />
  )
}

// ── Discreet eval trigger (personal debug tool; hidden unless enabled) ────────
// Enable once per browser by visiting this screen with ?tools=1 in the URL —
// after that it's remembered (localStorage) and the small button below
// appears in the bottom-right corner. Nobody else sees it unless they know to
// add that query param themselves. The click calls /api/admin/run-eval, which
// itself stays off unless ENABLE_EVAL_TRIGGER is set on the deployment.

const EVAL_TOOLS_STORAGE_KEY = "tgc_eval_tools_visible"

function useEvalToolsVisible() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("tools") === "1") {
      window.localStorage.setItem(EVAL_TOOLS_STORAGE_KEY, "1")
    }
    setVisible(window.localStorage.getItem(EVAL_TOOLS_STORAGE_KEY) === "1")
  }, [])

  return visible
}

function EvalTriggerButton() {
  const visible = useEvalToolsVisible()
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [experimentName, setExperimentName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!visible) return null

  async function handleClick() {
    setStatus("running")
    setExperimentName(null)
    setErrorMessage(null)
    try {
      const secret = process.env.NEXT_PUBLIC_EVAL_TRIGGER_SECRET ?? ""
      const res = await fetch(`/api/admin/run-eval?secret=${encodeURIComponent(secret)}`, {
        method: "POST",
      })
      if (res.status === 404) {
        setStatus("error")
        setErrorMessage("Not enabled on this deployment yet.")
        return
      }
      const data = await res.json()
      if (data.ok) {
        setStatus("done")
        setExperimentName(data.experimentName ?? null)
      } else {
        setStatus("error")
        setErrorMessage(data.error ?? "Something went wrong.")
      }
    } catch {
      setStatus("error")
      setErrorMessage("Couldn't reach the server.")
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {status === "done" && (
        <a
          href="https://smith.langchain.com/"
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 rounded-md shadow-sm text-right"
          style={{ backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #DCFCE7" }}
        >
          Done{experimentName ? ` — experiment: ${experimentName}` : ""}. Open LangSmith →
        </a>
      )}
      {status === "error" && errorMessage && (
        <span
          className="text-xs px-3 py-1.5 rounded-md shadow-sm"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
        >
          {errorMessage}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={status === "running"}
        aria-label="Run golden-set evaluation"
        title="Run golden-set evaluation"
        className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm opacity-40 hover:opacity-100 transition-opacity disabled:opacity-70"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E0E4E8" }}
      >
        <FlaskConical
          className={`w-4 h-4 ${status === "running" ? "animate-pulse" : ""}`}
          style={{ color: "#6B7280" }}
        />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScreenSupplierProductAttributes({
  productId,
  target,
  products,
  onBack,
  onFillAttribute,
  onViewGtins,
  onUploadImage,
}: ProductAttributesProps) {
  const product = products.find((p) => p.id === productId)
  const brick = product?.brickCode ? getBrickByCode(product.brickCode) : undefined
  const categoryLabel = brick?.brickName ?? "Uncategorised"
  const productDescription = product?.description ?? ""

  const [pendingFill, setPendingFill] = useState<{ attr: MissingAttribute; value: string } | null>(
    null
  )
  const [editingAttrName, setEditingAttrName] = useState<string | null>(null)

  const isGs1 = target.kind === "gs1"
  const targetLabel = isGs1 ? "GS1 Standard" : target.name

  // Image gaps still come from the gap engine; attributes come from the shared
  // full-attribute derivation so this screen lists the whole category pool —
  // provided, missing and waived — rather than only the outstanding gaps.
  const { missingImages } = getGapRecords(product, target)
  const attributes = getProductAttributes(product, target)

  const providedCount = attributes.filter((a) => a.status === "provided").length
  const missingCount = attributes.filter((a) => a.status === "missing").length
  const waivedCount = attributes.filter((a) => a.status === "waived").length

  const handleConfirm = () => {
    if (pendingFill) {
      onFillAttribute(productId, pendingFill.attr.name, pendingFill.value)
      setPendingFill(null)
      setEditingAttrName(null)
    }
  }

  const handleSubmitValue = (attr: ResolvedAttribute, value: string) => {
    if (!value || value === attr.value) {
      setEditingAttrName(null)
      return
    }
    setPendingFill({ attr: { name: attr.name }, value })
  }

  return (
    <>
      <div className="p-8 flex flex-col gap-6 max-w-4xl">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-light hover:underline mb-2"
          style={{ color: "#0168B3" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#111827]">
              All Attributes &mdash; {targetLabel}
            </h1>
            {isGs1 && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
              >
                <BadgeCheck className="w-3 h-3" />
                Baseline
              </span>
            )}
          </div>
          <p className="text-sm font-light text-[#6B7280]">
            {productDescription || productId} &middot; {categoryLabel}
          </p>

          {/* Summary counts */}
          <div
            className="flex items-center gap-4 mt-3 px-4 py-3 rounded-md flex-wrap text-sm"
            style={{ backgroundColor: "#F9FAFB", border: "1px solid #E0E4E8" }}
          >
            <div className="flex items-center gap-2">
              <Dot color="#16A34A" />
              <span className="font-light text-[#6B7280]">
                <span className="font-medium text-[#111827]">
                  {providedCount} of {attributes.length}
                </span>{" "}
                provided
              </span>
            </div>
            <span style={{ color: "#E0E4E8" }}>|</span>
            <div className="flex items-center gap-2">
              <Dot color="#F59E0B" />
              <span className="font-light text-[#6B7280]">
                <span className="font-medium text-[#111827]">{missingCount}</span> missing/gap
              </span>
            </div>
            {waivedCount > 0 && (
              <>
                <span style={{ color: "#E0E4E8" }}>|</span>
                <div className="flex items-center gap-2">
                  <Dot color="#9CA3AF" />
                  <span className="font-light text-[#6B7280]">
                    <span className="font-medium text-[#111827]">{waivedCount}</span> waived
                  </span>
                </div>
              </>
            )}
            {missingImages.length > 0 && (
              <>
                <span style={{ color: "#E0E4E8" }}>|</span>
                <div className="flex items-center gap-2">
                  <Dot color="#F59E0B" />
                  <span className="font-light text-[#6B7280]">
                    <span className="font-medium text-[#111827]">{missingImages.length}</span> image
                    requirement{missingImages.length !== 1 ? "s" : ""} missing
                  </span>
                </div>
                <button
                  onClick={() => onUploadImage(missingImages[0])}
                  className="ml-auto px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#0168B3" }}
                >
                  Upload Image
                </button>
              </>
            )}
          </div>
        </div>

        {/* Every attribute in this category — provided, missing and waived, in
            pool order, each one editable. */}
        {attributes.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-[#111827]">All Attributes</h2>
              <p className="text-xs font-light text-[#6B7280]">
                Every attribute {targetLabel} assesses for this category. Click a value to change it
                — the value applies to every GTIN within this product.
              </p>
            </div>
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
            >
              <table className="w-full text-sm">
                <tbody>
                  {attributes.map((attr, idx) => {
                    const tone = STATUS_TONE[attr.status]
                    const isEditing = editingAttrName === attr.name
                    const isWaived = attr.status === "waived"
                    return (
                      <tr
                        key={attr.name}
                        style={{
                          borderBottom:
                            idx < attributes.length - 1 ? "1px solid #F3F4F6" : undefined,
                        }}
                      >
                        <td className="px-4 py-3 w-8 align-middle">
                          <Dot color={tone.dot} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className="font-medium"
                            style={{ color: isWaived ? "#6B7280" : "#111827" }}
                          >
                            {attr.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-right w-64">
                          {isWaived ? (
                            <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
                              Waived by {targetLabel}
                            </span>
                          ) : attr.status === "missing" || isEditing ? (
                            <AttributeValueEditor
                              attr={attr}
                              initialValue={attr.value}
                              onSubmit={(value) => handleSubmitValue(attr, value)}
                            />
                          ) : (
                            <span className="text-sm text-[#6B7280]">{attr.value}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right align-middle w-12">
                          {attr.status === "provided" && !isEditing && (
                            <button
                              onClick={() => setEditingAttrName(attr.name)}
                              className="inline-flex items-center justify-center p-1.5 rounded hover:bg-[#F3F4F6] transition-colors"
                              aria-label={`Edit ${attr.name}`}
                            >
                              <Edit2 className="w-4 h-4" style={{ color: "#6B7280" }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty state */}
        {attributes.length === 0 && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #DCFCE7" }}
          >
            <Dot color="#16A34A" />
            <span className="text-sm font-light" style={{ color: "#15803D" }}>
              No attributes defined for this product.
            </span>
          </div>
        )}
      </div>

      <EvalTriggerButton />

      {/* Confirm fill modal */}
      <ConfirmFillAttributeModal
        open={pendingFill !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFill(null)
            setEditingAttrName(null)
          }
        }}
        attributeName={pendingFill?.attr.name ?? ""}
        value={pendingFill?.value ?? ""}
        productLabel={productDescription || productId}
        onConfirm={handleConfirm}
        onViewGtins={() => onViewGtins(productId)}
      />
    </>
  )
}
