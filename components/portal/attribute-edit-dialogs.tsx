"use client"

// Attribute-editing UI shared by the two places a retailer shapes a
// requirement's attribute list: the Create Requirement wizard (Screen 1,
// before the profile exists) and the profile detail view (Screen 2, after it
// does). Both need the same add dialog, the same removal confirmation, and the
// same Standard/Custom pill, so they live here rather than being reimplemented
// with drifting copy.

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// ── Source pill ───────────────────────────────────────────────────────────────
export function SourcePill({ source }: { source: "standard" | "custom" }) {
  if (source === "standard") {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
        style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
      >
        Standard
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
      style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
    >
      Custom
    </span>
  )
}

// ── Confirm Delete Attribute Modal ────────────────────────────────────────────
export function ConfirmDeleteAttributeModal({
  open,
  onClose,
  onConfirm,
  attributeName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  attributeName: string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Remove Attribute Requirement
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed py-2" style={{ color: "#6B7280" }}>
          Suppliers will no longer be required to provide &quot;{attributeName}&quot; for this
          category. Any values already submitted for it are kept, not deleted.
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
            style={{ backgroundColor: "#DC2626" }}
          >
            Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Attribute Dialog ──────────────────────────────────────────────────────
// A genuinely custom attribute — free-text name + optional guidance, mirroring
// add_attribute_requirement's own parameters. Standard/GS1 attributes are
// already present automatically (assembled from the brick), so this is for
// requirements beyond the GS1 standard, not a picker over it.
export type AddAttrTarget = "core" | "extended" | null

export function AddAttributeDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (input: { name: string; guidance: string }) => void
}) {
  const [name, setName] = useState("")
  const [guidance, setGuidance] = useState("")

  function handleClose() {
    setName("")
    setGuidance("")
    onClose()
  }

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), guidance: guidance.trim() })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Add Attribute
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#111827]">
              Attribute Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAdd() }}
              placeholder="e.g. Care Instructions"
              className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
              style={{ borderColor: "#E0E4E8" }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6B7280]">
              Supplier Guidance Note (optional)
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={2}
              className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 resize-none text-[#111827] placeholder:text-[#9CA3AF]"
              style={{ borderColor: "#E0E4E8" }}
              placeholder="Optional note shown to suppliers"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={handleClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Add to category
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
