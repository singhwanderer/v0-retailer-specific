"use client"

import { ArrowRight, MessageSquare, Sparkles, Store, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── Welcome / orientation overlay ─────────────────────────────────────────────
// Shown on first load so the prototype can travel without a presenter: it names
// the two personas, the two-act story, and a suggested path through both. The
// dismissal is persisted in localStorage; the top nav's "About this prototype"
// link reopens it. State (open / hasSeen) lives in app/page.tsx.

interface WelcomeOverlayProps {
  open: boolean
  onClose: () => void
  onStart: () => void
}

const STEPS = [
  "Start on the retailer side — the Attributes & Images requirements table.",
  "Open a requirement to see the attributes and image rules a category demands.",
  "Flip the Retailer / Supplier toggle in the top bar to switch personas.",
  "As the supplier, assign a category to a product and watch compliance recalculate — then drill into a product's gaps.",
]

export function WelcomeOverlay({ open, onClose, onStart }: WelcomeOverlayProps) {
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

          {/* Two-act story */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-lg p-3 flex flex-col gap-1.5"
              style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <div className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" style={{ color: "#0168B3" }} />
                <span className="text-xs font-semibold" style={{ color: "#0168B3" }}>
                  Act 1 — Retailer (Dillard&apos;s)
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
                  Act 2 — Supplier (J.Ren&eacute;e)
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
                See one product assessed against the GS1 baseline and every retailer at once —
                fill a gap once, satisfy everyone who requires it.
              </p>
            </div>
          </div>

          {/* Suggested path */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
              Suggested path
            </span>
            <ol className="flex flex-col gap-1.5">
              {STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "#374151" }}>
                  <span
                    className="mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ backgroundColor: "#0168B3" }}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* MCP callout */}
          <div
            className="flex items-start gap-2.5 rounded-md px-3 py-2.5"
            style={{ backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE" }}
          >
            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#7C3AED" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#4C1D95" }}>
              <span className="font-semibold">Also included (directional):</span> the same
              catalogue data can be queried conversationally through an MCP connector — talk to
              your requirements and compliance from any MCP client. Setup lives in{" "}
              <span className="font-mono">docs/mcp-getting-started.md</span>. This is an
              investment preview and may not ship in V1.
            </p>
          </div>

          <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
            Some controls are intentionally out of scope and are labelled as such; the AI
            Attributes Enrichment step is shown as a hand-off only.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            <X className="w-3.5 h-3.5" />
            Explore on my own
          </button>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0168B3" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start at Act 1
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
