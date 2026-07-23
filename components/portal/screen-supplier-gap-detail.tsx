"use client"

import { useState } from "react"
import { BadgeCheck } from "lucide-react"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import {
  getGapRecords,
  IMAGE_REQUIREMENT_POOL,
  type GapTarget,
  type MissingAttribute,
  type MissingImage,
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

export type GapDetailCrumb = { label: string; onClick: () => void }

interface GapDetailProps {
  /** Product ID in the shared catalogue */
  productId: string
  /** Compliance target this detail is scoped to — a retailer, or the GS1 baseline */
  target: GapTarget
  /** Shared supplier catalogue — the one source of truth */
  products: SupplierProduct[]
  /** Ancestor crumbs (the product itself is appended as the terminal crumb) */
  breadcrumbs: GapDetailCrumb[]
  /** Open the image-upload flow for one missing image requirement */
  onUploadImage: (image: MissingImage) => void
  /** Persist a supplier-supplied attribute value to the shared catalogue */
  onFillAttribute: (productId: string, attributeCode: string, value: string) => void
  /** Jump to the (out-of-scope) GTIN list for this product */
  onViewGtins: (productId: string) => void
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
  productId,
  target,
  products,
  breadcrumbs,
  onUploadImage,
  onFillAttribute,
  onViewGtins,
}: GapDetailProps) {
  const product = products.find((p) => p.id === productId)
  const brick = product?.brickCode ? getBrickByCode(product.brickCode) : undefined
  const categoryLabel = brick?.brickName ?? "Uncategorised"
  const productDescription = product?.description ?? ""

  // A value the supplier has chosen but not yet confirmed — drives the confirm
  // modal. Cleared on confirm or cancel.
  const [pendingFill, setPendingFill] = useState<{ attr: MissingAttribute; value: string } | null>(
    null
  )

  const isGs1 = target.kind === "gs1"
  const targetLabel = isGs1 ? "GS1 Standard" : target.name

  // Canonical gap records — the same derivation every other screen uses, so the
  // named gaps here always add up to the count that was clicked.
  const { missingAttrs, missingImages, totalAttrCount, totalImageCount } =
    getGapRecords(product, target)
  const missingImageNames = new Set(missingImages.map((img) => img.name))

  const providedAttrCount = totalAttrCount - missingAttrs.length
  const providedImageCount = totalImageCount - missingImages.length
  const gapCount = missingAttrs.length + missingImages.length
  const isComplete = gapCount === 0

  return (
    <>
    <div className="p-8 flex flex-col gap-6 max-w-3xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        {breadcrumbs.map((crumb) => (
          <span key={crumb.label} className="flex items-center gap-1.5">
            <button
              onClick={crumb.onClick}
              className="font-light hover:underline"
              style={{ color: "#0168B3" }}
            >
              {crumb.label}
            </button>
            <span style={{ color: "#9CA3AF" }}>›</span>
          </span>
        ))}
        <span className="font-light text-[#6B7280]">{productDescription || productId}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-[#111827]">
            Requirements Status &mdash; {targetLabel}
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
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-[#111827]">Missing Attributes</h2>
          {missingAttrs.length > 0 && (
            <p className="text-xs font-light text-[#6B7280]">
              Pick a value from the GS1 standard list to fill an attribute. It applies to every
              GTIN within this product.
            </p>
          )}
        </div>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          {missingAttrs.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3">
              <Dot color="#16A34A" />
              <span className="text-sm font-light" style={{ color: "#15803D" }}>
                All required attributes provided.
              </span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {missingAttrs.map((attr, idx) => {
                  const allowedValues = getAllowedValues(attr.code)
                  return (
                    <tr
                      key={attr.code}
                      style={{
                        borderBottom:
                          idx < missingAttrs.length - 1 ? "1px solid #F3F4F6" : undefined,
                      }}
                    >
                      <td className="px-4 py-3 w-8 align-middle">
                        <Dot color="#F59E0B" />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-medium text-[#111827]">{attr.name}</span>
                        <span className="ml-2 text-xs font-light text-[#9CA3AF]">
                          TGC: {attr.name} ({attr.code})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle w-56">
                        {allowedValues && allowedValues.length > 0 ? (
                          <Select
                            value=""
                            onValueChange={(value) => setPendingFill({ attr, value })}
                          >
                            <SelectTrigger
                              className="ml-auto h-8 w-52 text-xs"
                              aria-label={`Select a value for ${attr.name}`}
                            >
                              <SelectValue placeholder="Select a value…" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedValues.map((v) => (
                                <SelectItem key={v.value} value={v.value} className="text-xs">
                                  {v.value}
                                  {v.code && (
                                    <span className="ml-1.5 font-mono text-[10px] text-[#9CA3AF]">
                                      {v.code}
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter a value…"
                            aria-label={`Enter a value for ${attr.name}`}
                            className="ml-auto h-8 w-52 text-xs rounded-md border px-2.5 outline-none focus:ring-2"
                            style={{ borderColor: "#E0E4E8" }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                const value = e.currentTarget.value.trim()
                                if (value) setPendingFill({ attr, value })
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.currentTarget.value.trim()
                              if (value) setPendingFill({ attr, value })
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
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
          {missingImages.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3">
              <Dot color="#16A34A" />
              <span className="text-sm font-light" style={{ color: "#15803D" }}>
                All required image types provided.
              </span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {IMAGE_REQUIREMENT_POOL.map((img, idx) => {
                  const provided = !missingImageNames.has(img.name)
                  return (
                    <tr
                      key={img.name}
                      style={{
                        borderBottom:
                          idx < IMAGE_REQUIREMENT_POOL.length - 1
                            ? "1px solid #F3F4F6"
                            : undefined,
                      }}
                    >
                      <td className="px-4 py-3 w-8 align-top pt-3.5">
                        <Dot color={provided ? "#16A34A" : "#F59E0B"} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-medium text-[#111827] block">{img.name}</span>
                        <span
                          className="text-[11px] font-light leading-relaxed block mt-0.5"
                          style={{ color: "#9CA3AF" }}
                        >
                          {targetLabel} spec: {img.spec}. Guidance only &mdash; not verified by
                          the system.
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className="text-xs font-light"
                          style={{ color: provided ? "#15803D" : "#92400E" }}
                        >
                          {provided ? "Image provided" : "Required image not provided"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {!provided && (
                          <button
                            onClick={() => onUploadImage(img)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: "#0168B3" }}
                          >
                            Upload Image
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
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
        {isGs1
          ? "This shows the GS1 standard attributes and image types for this product's category that are not yet on your product. Filling a baseline gap advances every retailer at once."
          : `This shows the attributes and image types ${targetLabel} requires that are not yet on your product. You keep one product — filling a gap adds it to that product and satisfies every retailer who requires it.`}{" "}
        Image requirements are confirmed as a matching image type being present; image content is
        not verified.
      </p>
    </div>

    <ConfirmFillAttributeModal
      open={pendingFill !== null}
      onOpenChange={(open) => !open && setPendingFill(null)}
      attributeName={pendingFill?.attr.name ?? ""}
      value={pendingFill?.value ?? ""}
      productLabel={productDescription || productId}
      onViewGtins={() => onViewGtins(productId)}
      onConfirm={() => {
        if (pendingFill) onFillAttribute(productId, pendingFill.attr.code, pendingFill.value)
        setPendingFill(null)
      }}
    />
    </>
  )
}
