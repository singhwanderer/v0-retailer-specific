"use client"

// ── Shared Image Requirements ──────────────────────────────────────────────
// A single place to define image specs that apply to every category, instead
// of re-entering the same "Hero Shot" style spec once per GS1 category. A
// category can still customize or drop a shared requirement for itself —
// that happens on Screen 2 (its Image Requirements group shows shared rows
// alongside any category-only ones, tagged "Shared").

import { useState } from "react"
import { CheckCircle, Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AddImageRequirementDialog,
  EditImageRequirementDialog,
  ImageRequirementsTable,
} from "@/components/portal/screen2-profile-detail"
import { getStore, type ImageRequirement } from "@/lib/mcp/store"
import { setGlobalImageRequirement, removeGlobalImageRequirement } from "@/lib/mcp/tools"
import { PORTAL_CTX } from "@/lib/mcp/context"

function ConfirmDeleteGlobalImageModal({
  requirementName,
  onClose,
  onConfirm,
}: {
  requirementName: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={requirementName !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">Remove Shared Image Requirement</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed py-2" style={{ color: "#6B7280" }}>
          &quot;{requirementName}&quot; will no longer be required in any category — including categories that
          customized it for themselves. Custom, category-only image requirements are not affected.
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
            onClick={onConfirm}
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

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
      style={{ backgroundColor: "#0168B3" }}
    >
      <CheckCircle className="w-4 h-4 shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ScreenImageRequirements() {
  const [rows, setRows] = useState<ImageRequirement[]>(() => getStore(PORTAL_CTX.tenantId).globalImageRequirements)
  const [addOpen, setAddOpen] = useState(false)
  const [editState, setEditState] = useState<{ open: boolean; requirementName: string | null }>({
    open: false,
    requirementName: null,
  })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function refresh() {
    setRows([...getStore(PORTAL_CTX.tenantId).globalImageRequirements])
  }

  function handleAdd(row: ImageRequirement) {
    setGlobalImageRequirement(PORTAL_CTX, row)
    refresh()
    setAddOpen(false)
    showToast(`"${row.requirementName}" added — now required for every category.`)
  }

  function handleSave(updated: ImageRequirement) {
    setGlobalImageRequirement(PORTAL_CTX, updated)
    refresh()
    showToast(`"${updated.requirementName}" updated for every category that hasn't customized it.`)
  }

  function handleDelete() {
    if (!deleteTarget) return
    const result = removeGlobalImageRequirement(PORTAL_CTX, deleteTarget)
    refresh()
    setDeleteTarget(null)
    showToast("error" in result ? result.error : `"${deleteTarget}" removed from every category.`)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] text-balance">Image Requirements</h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Defined once here and applied to every category. Open a category on the Attributes &amp; Images screen
            to customize or exclude a shared requirement just for that category.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#0168B3" }}
        >
          <Plus className="w-4 h-4" />
          Add Image Requirement
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white" style={{ borderColor: "#E0E4E8" }}>
        {rows.length > 0 ? (
          <ImageRequirementsTable
            rows={rows}
            onEditRow={(row) => setEditState({ open: true, requirementName: row.requirementName })}
            onDeleteRow={(row) => setDeleteTarget(row.requirementName)}
          />
        ) : (
          <div className="px-4 py-10 text-center text-sm" style={{ color: "#9CA3AF" }}>
            No shared image requirements yet. Add one to apply it across every category.
          </div>
        )}
      </div>

      <AddImageRequirementDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
      <EditImageRequirementDialog
        key={editState.open ? `edit-global-image-${editState.requirementName}` : "edit-global-image-closed"}
        open={editState.open}
        row={rows.find((r) => r.requirementName === editState.requirementName) ?? null}
        onClose={() => setEditState({ open: false, requirementName: null })}
        onSave={handleSave}
      />

      <ConfirmDeleteGlobalImageModal
        requirementName={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
