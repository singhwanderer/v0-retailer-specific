"use client"

import { getBrickByCode } from "@/lib/gs1-standard-library"
import type { SupplierProduct } from "@/lib/supplier-catalogue"

interface GapDetailProps {
  productName: string
  retailer: string
  selectionCode: string
  /** Shared supplier catalogue — the one source of truth */
  products: SupplierProduct[]
  onBackToProducts: () => void
  onBackToPartner: () => void
  onBackToPartnerList: () => void
}

// ── Data shapes ───────────────────────────────────────────────────────────────

type MissingAttribute = {
  retailerLabel: string
  tgcName: string
  tgcCode: string
}

type ImageRow = {
  name: string
  provided: boolean
  guidanceSpec?: string
}

// ── Derivation ────────────────────────────────────────────────────────────────
// The gap detail is built from the shared product store, so it always matches
// the gap count the product list showed for this product + retailer. The
// retailer's open-gap number is allocated first to missing attributes (drawn
// from the product's GS1 category), then to image requirements — so a product
// with 3 gaps here shows exactly 3, whichever retailer sent you.

const IMAGE_POOL: { name: string; spec: string }[] = [
  { name: "Hero Shot", spec: "pure white background, 2000 × 2000 px, square" },
  { name: "Detail Shot", spec: "close-up of material/texture" },
]

function deriveGapData(product: SupplierProduct | undefined, retailer: string) {
  const brick = product?.brickCode ? getBrickByCode(product.brickCode) : undefined
  const attrPool = brick?.extendedAttributes ?? []
  const rs = product?.retailers?.find((r) => r.retailer === retailer)
  const gapCount = !rs || rs.gaps === "complete" ? 0 : rs.gaps

  const missingCount = Math.min(gapCount, attrPool.length)
  const missingAttrs: MissingAttribute[] = attrPool.slice(0, missingCount).map((a) => ({
    retailerLabel: a.name,
    tgcName: a.name,
    tgcCode: a.code,
  }))

  // Any gaps beyond the attribute pool fall to image requirements.
  const imageGaps = Math.min(gapCount - missingCount, IMAGE_POOL.length)
  const imageRows: ImageRow[] = IMAGE_POOL.map((img, i) => ({
    name: img.name,
    provided: i >= imageGaps,
    guidanceSpec: `${retailer} spec: ${img.spec}. Guidance only — not verified by the system.`,
  }))

  return {
    productDescription: product?.description ?? "",
    categoryLabel: brick?.brickName ?? "Uncategorised",
    missingAttrs,
    imageRows,
    totalAttrCount: attrPool.length,
  }
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
  products,
  onBackToProducts,
  onBackToPartner,
  onBackToPartnerList,
}: GapDetailProps) {
  // productName is the product ID passed from the product leaf.
  const product = products.find((p) => p.id === productName)
  const { productDescription, categoryLabel, missingAttrs, imageRows, totalAttrCount } =
    deriveGapData(product, retailer)

  const providedAttrCount = totalAttrCount - missingAttrs.length
  const providedImageCount = imageRows.filter((r) => r.provided).length
  const totalImageCount = imageRows.length
  const gapCount = missingAttrs.length + (totalImageCount - providedImageCount)
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
          Compliance
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
        <span className="font-light text-[#6B7280]">{productDescription || productName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-[#111827]">
          Requirements Status &mdash; {retailer}
        </h1>
        <p className="text-sm font-light text-[#6B7280]">
          {productDescription || productName} &middot; {categoryLabel}
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
                {missingAttrs.map((attr, idx) => (
                  <tr
                    key={attr.tgcCode}
                    style={{
                      borderBottom:
                        idx < missingAttrs.length - 1 ? "1px solid #F3F4F6" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 w-8 align-middle">
                      <Dot color="#F59E0B" />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="font-medium text-[#111827]">{attr.retailerLabel}</span>
                      <span className="ml-2 text-xs font-light text-[#9CA3AF]">
                        TGC: {attr.tgcName} ({attr.tgcCode})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
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
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-white cursor-not-allowed opacity-60"
                          style={{ backgroundColor: "#0168B3" }}
                          title="Out of scope for this prototype"
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
