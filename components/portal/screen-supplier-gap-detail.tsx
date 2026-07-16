"use client"

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
    retailerLabel: "Boot Heel Type",
    tgcName: "Heel Type",
    tgcCode: "GM03HLTY",
    guidance: "Use the NRF heel-type value list. For flat styles enter \u201cFlat\u201d, not blank.",
  },
  {
    retailerLabel: "Outsole Type",
    tgcName: "Outsole Type",
    tgcCode: "GM03OUTS",
    guidance: "State the primary outsole material (e.g. Rubber, Leather, EVA).",
  },
  {
    retailerLabel: "Closure",
    tgcName: "Closure",
    tgcCode: "GM03CLOS",
    guidance: "Single closure type only. If multiple, list the primary fastening.",
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
