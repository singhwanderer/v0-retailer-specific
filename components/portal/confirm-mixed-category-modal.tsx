"use client"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Gs1Brick } from "@/lib/gs1-standard-library"

// ── Cross-category confirmation ───────────────────────────────────────────────
// A requirement is ideally one category (GS1 segment). Adding a brick from a
// different segment is allowed, but flagged so it's a deliberate choice.
// Shared between the create wizard (Screen 1) and the detail screen's "Add
// GS1 Category" flow (Screen 2), so both use one gate instead of two copies.

/** Whether a candidate brick's segment differs from the requirement's established one. */
export function isDifferentSegment(candidateSegment: string, establishedSegment: string | undefined): boolean {
  return establishedSegment !== undefined && candidateSegment !== establishedSegment
}

export function ConfirmMixedCategoryModal({
  candidate,
  currentSegment,
  onClose,
  onConfirm,
}: {
  candidate: Gs1Brick | null
  currentSegment: string | undefined
  onClose: () => void
  onConfirm: () => void
}) {
  if (!candidate) return null
  return (
    <Dialog open={candidate !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Different category
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed py-2" style={{ color: "#6B7280" }}>
          <span className="font-medium text-[#111827]">{candidate.brickName}</span> belongs to the{" "}
          <span className="font-medium text-[#111827]">{candidate.segment}</span> category, but this
          requirement is currently <span className="font-medium text-[#111827]">{currentSegment}</span>.
          Requirements usually cover a single category. Add it anyway?
        </p>
        <DialogFooter>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#D97706" }}
          >
            Add anyway
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
