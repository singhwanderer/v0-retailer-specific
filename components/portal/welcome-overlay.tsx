"use client"

import { Store } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── Welcome / orientation overlay ─────────────────────────────────────────────
// A plain FYI shown on first load so the prototype can travel without a
// presenter: it names the two personas and what each side does. No guided tour.
// The dismissal is persisted in localStorage; the top nav's "About this
// prototype" link reopens it. State (open / hasSeen) lives in app/page.tsx.

interface WelcomeOverlayProps {
  open: boolean
  onClose: () => void
}

export function WelcomeOverlay({ open, onClose }: WelcomeOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#111827]">
            Trading Grid Catalogue — retailer-specific requirements
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
            A clickable prototype of how a retailer defines product requirements and how a
            supplier meets them across the catalogue network. All data here is mock data for
            illustration.
          </p>

          {/* Two personas */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-lg p-3 flex flex-col gap-1.5"
              style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <div className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" style={{ color: "#0168B3" }} />
                <span className="text-xs font-semibold" style={{ color: "#0168B3" }}>
                  Retailer (Dillard&apos;s)
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
                Define the attributes and images suppliers must provide per product category,
                mapped to a GS1 category.
              </p>
            </div>
            <div
              className="rounded-lg p-3 flex flex-col gap-1.5"
              style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <div className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" style={{ color: "#15803D" }} />
                <span className="text-xs font-semibold" style={{ color: "#15803D" }}>
                  Supplier (J.Ren&eacute;e)
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
                See one product assessed against the GS1 baseline and every retailer at once —
                fill a gap once, satisfy everyone who requires it.
              </p>
            </div>
          </div>

          <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
            Use the Retailer / Supplier toggle in the top bar to switch personas. Some controls
            are intentionally out of scope and are labelled as such; the AI Attributes Enrichment
            step is shown as a hand-off only.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0168B3" }}
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
