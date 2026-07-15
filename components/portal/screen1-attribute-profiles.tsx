"use client"

import { useState } from "react"
import { Info, Upload, Plus, X, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface Screen1Props {
  onNavigateToProfile: () => void
}

const categories = [
  {
    name: "Footwear",
    category: "Footwear",
    attributes: "34 attributes · 1 image requirement",
    status: "Active" as const,
    lastUpdated: "Mar 8, 2026",
    actions: ["Edit", "Deactivate"] as const,
    isLink: true,
  },
  {
    name: "Apparel",
    category: "Women's Apparel",
    attributes: "51 attributes",
    status: "Active" as const,
    lastUpdated: "Feb 14, 2026",
    actions: ["Edit", "Deactivate"] as const,
    isLink: true,
  },
  {
    name: "Jewellery",
    category: "Jewellery",
    attributes: "22 attributes",
    status: "Draft" as const,
    lastUpdated: "Mar 11, 2026",
    actions: ["Edit", "Activate"] as const,
    isLink: true,
  },
]

type StatusType = "Active" | "Draft"

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string }> = {
  Active: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  Draft: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
}

function StatusPill({ status }: { status: StatusType }) {
  const cfg = statusConfig[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {status}
    </span>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
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

// ── Import CSV Modal ───────────────────────────────────────────────────────────
function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dragging, setDragging] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Import Categories from CSV
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false) }}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-10 text-center transition-colors cursor-pointer"
            style={{ borderColor: dragging ? "#0168B3" : "#E0E4E8", backgroundColor: dragging ? "#EFF6FF" : "#F9FAFB" }}
          >
            <Upload className="w-6 h-6" style={{ color: "#9CA3AF" }} />
            <p className="text-sm font-medium text-[#111827]">Drop a CSV file here</p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>or click to browse</p>
          </div>
          <div
            className="rounded-md p-3 text-xs leading-relaxed"
            style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
          >
            <p className="font-medium text-[#111827] mb-1">Required CSV columns</p>
            <p>Category Name · Attribute Name · TGC GS1 Code · Guidance Note (optional)</p>
          </div>
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
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0168B3" }}
          >
            Upload File
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Create Category Modal ──────────────────────────────────────────────────────
const CATEGORY_OPTIONS = ["Footwear", "Apparel", "Jewellery", "Accessories", "Sportswear", "Homewear"]

function CreateCategoryModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const [catName, setCatName] = useState("")
  const [selectedCat, setSelectedCat] = useState("")
  const [initialStatus, setInitialStatus] = useState<"Draft" | "Active">("Draft")

  function handleCreate() {
    if (!catName.trim() || !selectedCat) return
    onCreated(catName.trim())
    setCatName("")
    setSelectedCat("")
    setInitialStatus("Draft")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Create New Category Requirements
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#111827]">
              Category <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 bg-white text-[#111827]"
              style={{ borderColor: "#E0E4E8" }}
            >
              <option value="">Select a category…</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#111827]">
              Requirements Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Footwear — Core Compliance"
              className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
              style={{ borderColor: "#E0E4E8" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#111827]">Initial Status</label>
            <div className="flex items-center gap-4">
              {(["Draft", "Active"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
                  <input
                    type="radio"
                    name="initial-status"
                    value={s}
                    checked={initialStatus === s}
                    onChange={() => setInitialStatus(s)}
                    className="accent-[#0168B3]"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
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
            onClick={handleCreate}
            disabled={!catName.trim() || !selectedCat}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Confirm Action Modal ───────────────────────────────────────────────────────
function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  action,
  categoryName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  action: "Deactivate" | "Activate" | null
  categoryName: string
}) {
  if (!action) return null

  const config = {
    Deactivate: {
      title: "Deactivate Category Requirements",
      body: `Suppliers will no longer see the requirements for "${categoryName}" until it is reactivated. No data will be deleted.`,
      confirm: "Deactivate",
      danger: true,
    },
    Activate: {
      title: "Activate Category Requirements",
      body: `"${categoryName}" will become visible to all suppliers trading under your retailer account.`,
      confirm: "Activate",
      danger: false,
    },
  }

  const { title, body, confirm, danger } = config[action]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed py-2" style={{ color: "#6B7280" }}>{body}</p>
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
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: danger ? "#DC2626" : "#0168B3" }}
          >
            {confirm}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function Screen1AttributeProfiles({ onNavigateToProfile }: Screen1Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    action: "Deactivate" | "Activate" | null
    name: string
  }>({ open: false, action: null, name: "" })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleAction(action: string, name: string) {
    if (action === "Edit") {
      onNavigateToProfile()
      return
    }
    if (action === "Deactivate" || action === "Activate") {
      setConfirmState({ open: true, action, name })
    }
  }

  function handleConfirm() {
    const { action, name } = confirmState
    if (action === "Deactivate") showToast(`"${name}" has been deactivated.`)
    if (action === "Activate") showToast(`"${name}" is now active.`)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] text-balance">
          Attributes &amp; Images Requirements
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
          Define which attributes and image specifications your suppliers must meet by product category.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium border transition-colors hover:bg-[#F4F6F8]"
          style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
        >
          <Upload className="w-3.5 h-3.5" />
          Import from CSV
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#0168B3" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Category
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: "#E0E4E8" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F4F6F8" }}>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[26%]">Category</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[16%]">Product Type</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[20%]">Requirements</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[10%]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[14%]">Last Updated</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr
                key={cat.name}
                style={{ borderBottom: idx < categories.length - 1 ? "1px solid #E0E4E8" : undefined }}
                className="hover:bg-[#F4F6F8]/50 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <button
                    onClick={onNavigateToProfile}
                    className="font-medium hover:underline text-left cursor-pointer"
                    style={{ color: "#0168B3" }}
                  >
                    {cat.name}
                  </button>
                </td>
                <td className="px-4 py-3.5 text-[#111827]">{cat.category}</td>
                <td className="px-4 py-3.5 text-[#111827]">{cat.attributes}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={cat.status} />
                </td>
                <td className="px-4 py-3.5 text-[#6B7280]">{cat.lastUpdated}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {cat.actions.map((action, i) => (
                      <span key={action} className="flex items-center gap-3">
                        <button
                          onClick={() => handleAction(action, cat.name)}
                          className="transition-colors cursor-pointer"
                          style={{ color: action === "Deactivate" ? "#DC2626" : "#6B7280" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = action === "Deactivate" ? "#991B1B" : "#111827")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = action === "Deactivate" ? "#DC2626" : "#6B7280")}
                        >
                          {action}
                        </button>
                        {i < cat.actions.length - 1 && (
                          <span style={{ color: "#E0E4E8" }}>·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info callout */}
      <div
        className="flex items-start gap-3 p-4 rounded-md text-sm leading-relaxed"
        style={{ backgroundColor: "#EFF6FF", borderLeft: "4px solid #0168B3", color: "#374151" }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
        <p>
          <span className="font-medium text-[#111827]">Active categories</span> are live and
          visible to all suppliers trading under your retailer account.{" "}
          <span className="font-medium text-[#111827]">Draft categories</span> are not visible
          to suppliers until activated.
        </p>
      </div>

      {/* Modals */}
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
      <CreateCategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(name) => showToast(`Category "${name}" created as Draft.`)}
      />
      <ConfirmActionModal
        open={confirmState.open}
        onClose={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={handleConfirm}
        action={confirmState.action}
        categoryName={confirmState.name}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
