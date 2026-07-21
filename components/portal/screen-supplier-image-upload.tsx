"use client"

import { ArrowRight, ImageUp } from "lucide-react"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import type { MissingImage, SupplierProduct } from "@/lib/supplier-catalogue"

// ── Image Upload (work in progress) ──────────────────────────────────────────
// Reached from a missing image requirement on the gap detail. The upload flow
// itself is not built in this prototype — this screen is the signpost for it,
// the same pattern as the AI Attributes Enrichment hand-off: it shows exactly
// what the flow would receive (product, target, image requirement and spec)
// and states plainly that the working upload is a separate, in-progress part
// of the product.

interface ImageUploadProps {
  productId: string
  products: SupplierProduct[]
  /** Label of the compliance target the requirement belongs to */
  targetLabel: string
  /** The missing image requirement being fulfilled */
  image: MissingImage
  /** Back to the gap detail this came from */
  onBack: () => void
}

export function ScreenSupplierImageUpload({
  productId,
  products,
  targetLabel,
  image,
  onBack,
}: ImageUploadProps) {
  const product = products.find((p) => p.id === productId)
  const brick = product?.brickCode ? getBrickByCode(product.brickCode) : undefined

  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        <button
          onClick={onBack}
          className="font-light hover:underline"
          style={{ color: "#0168B3" }}
        >
          Requirements Status
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <span className="font-light text-[#6B7280]">Upload Image</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">Upload Image</h1>
        <p className="text-sm font-light text-[#6B7280]">
          {product?.description ?? productId} &middot; {brick?.brickName ?? "Uncategorised"}
        </p>
      </div>

      {/* WIP hand-off note */}
      <div
        className="flex items-start gap-2.5 rounded-md px-4 py-3"
        style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
      >
        <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#1E40AF" }}>
          This is where the gap detail hands off to the{" "}
          <span className="font-semibold">image upload flow</span> — a separate part of the
          product that is work in progress. It is shown here as a signpost only; uploading does
          not function in this prototype.
        </p>
      </div>

      {/* Requirement context */}
      <div
        className="rounded-lg px-4 py-3 flex flex-col gap-2"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <span
          className="text-[11px] font-medium tracking-wide uppercase"
          style={{ color: "#6B7280" }}
        >
          Requirement being fulfilled
        </span>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[#111827]">{image.name}</span>
          <span className="font-light text-[#6B7280]">
            {targetLabel} spec: {image.spec}. Guidance only &mdash; not verified by the system.
          </span>
        </div>
      </div>

      {/* Inert dropzone */}
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg px-6 py-12 text-center"
        style={{
          border: "2px dashed #E0E4E8",
          backgroundColor: "#F9FAFB",
        }}
      >
        <ImageUp className="w-8 h-8" style={{ color: "#9CA3AF" }} />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            Drag an image here or browse files
          </span>
          <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
            Work in progress &mdash; upload is not functional in this prototype.
          </span>
        </div>
        <button
          className="px-3.5 py-2 rounded-md text-sm font-medium text-white cursor-not-allowed opacity-60"
          style={{ backgroundColor: "#0168B3" }}
          disabled
          title="Work in progress — out of scope for this prototype"
        >
          Browse Files
        </button>
      </div>

      {/* Back action */}
      <div>
        <button
          onClick={onBack}
          className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
          style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
        >
          Back to Requirements Status
        </button>
      </div>
    </div>
  )
}
