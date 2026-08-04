"use client"

import { ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { SupplierProduct } from "@/lib/supplier-catalogue"

// ── Hand-off signpost modal ───────────────────────────────────────────────────
// NOTE: this is an audience annotation, not a working feature. The prototype
// does NOT run AI or change any data here — it marks the point where the flow
// merges with the live product's existing "AI Attributes Enrichment" screen.
//
// Shared by the Catalogue screen and the Products Needing Enrichment screen so
// the "out of scope" wording is stated in exactly one place; a second copy that
// drifted would read as two different promises about the same hand-off.
export function EnrichHandoffModal({
  open,
  products,
  onClose,
  onConfirm,
}: {
  open: boolean
  products: SupplierProduct[]
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Send to AI Attributes Enrichment
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          {/* Audience-facing hand-off note */}
          <div
            className="flex items-start gap-2.5 rounded-md px-3 py-2.5"
            style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
          >
            <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#1E40AF" }}>
              This is where the catalogue flow merges with the existing{" "}
              <span className="font-semibold">AI Attributes Enrichment</span> flow — a separate
              part of the product that suggests categories and fills GS1 baseline attribute values
              for review. It is shown here as a hand-off only; the enrichment screen itself is out
              of scope for this prototype.
            </p>
          </div>
          <p className="text-sm font-light" style={{ color: "#6B7280" }}>
            {products.length} selected product{products.length !== 1 ? "s" : ""} would be handed off:
          </p>
          <div
            className="rounded-md border overflow-y-auto"
            style={{ borderColor: "#E0E4E8", maxHeight: 150 }}
          >
            {products.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 text-xs"
                style={{
                  borderBottom: idx < products.length - 1 ? "1px solid #F3F4F6" : undefined,
                }}
              >
                <span className="font-medium text-[#111827] tabular-nums">{p.id}</span>
                <span className="font-light" style={{ color: "#6B7280" }}>
                  {p.description}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
            Bulk file upload is the other entry point into the same enrichment flow (not shown in
            this prototype).
          </p>
        </div>
        <DialogFooter>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            style={{ backgroundColor: "#0168B3" }}
          >
            Continue to Enrichment
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
