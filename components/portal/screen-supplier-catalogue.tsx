"use client"

import { useState } from "react"
import { ArrowRight, Check, CheckCircle, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getBrickByCode,
  getSegments,
  searchBricks,
  type Gs1Brick,
} from "@/lib/gs1-standard-library"
import type { SupplierProduct } from "@/lib/supplier-catalogue"

// ── Supplier Catalogue ────────────────────────────────────────────────────────
// The supplier's own product list, independent of any compliance target.
// Categorisation lives here because it is the prerequisite for every
// compliance row — a product belongs to the supplier, not to any partner.
// Two paths: assign a category manually (the in-prototype action), or hand the
// selection off to the existing AI Attributes Enrichment flow (a separate
// screen in the live product — represented here only as a hand-off signpost).

interface SupplierCatalogueProps {
  products: SupplierProduct[]
  /** Product IDs to pre-select on open (e.g. arriving from an "assign" CTA) */
  initialSelectedIds?: string[]
  /** Manual categorisation — mutates the shared store */
  onAssignCategory: (ids: Set<string>, brickCode: string) => void
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

// ── Manual brick picker (same pattern as the retailer create-requirement wizard) ──
function AssignCategoryModal({
  open,
  count,
  onClose,
  onAssign,
}: {
  open: boolean
  count: number
  onClose: () => void
  onAssign: (brick: Gs1Brick) => void
}) {
  const [query, setQuery] = useState("")
  const [selectedSegment, setSelectedSegment] = useState("All")
  const [selectedBrick, setSelectedBrick] = useState<Gs1Brick | null>(null)

  const segments = ["All", ...getSegments()]
  const filteredBricks = searchBricks(query).filter(
    (b) => selectedSegment === "All" || b.segment === selectedSegment
  )

  function handleClose() {
    setQuery("")
    setSelectedSegment("All")
    setSelectedBrick(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Assign Category — {count} product{count !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
            Choose the GS1 category (brick) for the selected products. Its standard attributes
            become their GS1 baseline requirements.
          </p>

          <div className="flex gap-2">
            <div
              className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md border"
              style={{ borderColor: "#E0E4E8" }}
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brick name or code…"
                className="flex-1 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-2.5 py-2 rounded-md text-xs border outline-none bg-white text-[#374151]"
              style={{ borderColor: "#E0E4E8" }}
            >
              {segments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div
            className="rounded-md border overflow-y-auto"
            style={{ borderColor: "#E0E4E8", maxHeight: 240 }}
          >
            {filteredBricks.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: "#9CA3AF" }}>
                No bricks match your search.
              </p>
            ) : (
              filteredBricks.map((brick) => {
                const isSelected = selectedBrick?.brickCode === brick.brickCode
                return (
                  <button
                    key={brick.brickCode}
                    onClick={() => setSelectedBrick(brick)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      backgroundColor: isSelected ? "#EFF6FF" : undefined,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: isSelected ? "#0168B3" : "#E0E4E8" }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-[#111827] truncate">
                          {brick.brickName}
                        </span>
                        <span className="text-[10px] font-mono shrink-0" style={{ color: "#9CA3AF" }}>
                          {brick.brickCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
                        >
                          {brick.segment}
                        </span>
                        <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                          {brick.extendedAttributes.length} standard attributes
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
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
            onClick={() => {
              if (selectedBrick) {
                onAssign(selectedBrick)
                handleClose()
              }
            }}
            disabled={!selectedBrick}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Assign to {count} product{count !== 1 ? "s" : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Hand-off signpost modal ───────────────────────────────────────────────────
// NOTE: this is an audience annotation, not a working feature. The prototype
// does NOT run AI or change any data here — it marks the point where the flow
// merges with the live product's existing "AI Attributes Enrichment" screen.
function EnrichHandoffModal({
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

// ── Main screen ───────────────────────────────────────────────────────────────
export function ScreenSupplierCatalogue({
  products,
  initialSelectedIds = [],
  onAssignCategory,
}: SupplierCatalogueProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds))
  const [assignOpen, setAssignOpen] = useState(false)
  const [enrichOpen, setEnrichOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const uncategorised = products.filter((p) => p.state === "uncategorised")
  const selectedProducts = products.filter((p) => selected.has(p.id))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllUncategorised() {
    setSelected(new Set(uncategorised.map((p) => p.id)))
  }

  function handleManualAssign(brick: Gs1Brick) {
    onAssignCategory(new Set(selected), brick.brickCode)
    showToast(
      `${selected.size} product${selected.size !== 1 ? "s" : ""} categorised as ${brick.brickName}. GS1 baseline re-assessed.`
    )
    setSelected(new Set())
  }

  // Hand-off is a signpost only — it does NOT change any product data.
  function handleEnrichHandoff() {
    setEnrichOpen(false)
    showToast(
      `${selected.size} product${selected.size !== 1 ? "s" : ""} handed off to AI Attributes Enrichment (out of scope for this prototype).`
    )
    setSelected(new Set())
  }

  const allVisibleSelected = products.length > 0 && selected.size === products.length

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#111827]">Catalogue</h1>
        <p className="text-sm font-light text-[#6B7280]">
          Your products, independent of any retailer. Assign categories here — it is the
          prerequisite for every compliance assessment.
        </p>
      </div>

      {/* Progress + actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-light text-[#6B7280]">
          <span className="font-medium text-[#111827]">
            {products.length - uncategorised.length} of {products.length}
          </span>{" "}
          products categorised
        </span>
        {uncategorised.length > 0 && (
          <button
            onClick={selectAllUncategorised}
            className="text-xs font-medium hover:underline"
            style={{ color: "#0168B3" }}
          >
            Select all uncategorised ({uncategorised.length})
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setAssignOpen(true)}
            disabled={selected.size === 0}
            className="px-3.5 py-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-40 hover:bg-[#F4F6F8]"
            style={{ borderColor: "#E0E4E8", color: "#374151" }}
          >
            Assign Category
          </button>
          <button
            onClick={() => setEnrichOpen(true)}
            disabled={selected.size === 0}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90 inline-flex items-center gap-1.5"
            style={{ backgroundColor: "#0168B3" }}
          >
            Send to AI Attributes Enrichment
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelected(
                      allVisibleSelected ? new Set() : new Set(products.map((p) => p.id))
                    )
                  }
                  className="accent-[#0168B3] cursor-pointer"
                />
              </th>
              {["Product ID", "Description", "Category"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((row, idx) => {
              const brick = row.brickCode ? getBrickByCode(row.brickCode) : undefined
              const isUncategorised = row.state === "uncategorised"
              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: idx < products.length - 1 ? "1px solid #F3F4F6" : undefined,
                    backgroundColor: isUncategorised ? "#FFF7F7" : undefined,
                  }}
                >
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="accent-[#0168B3] cursor-pointer"
                    />
                  </td>
                  <td
                    className="px-4 py-3 font-medium align-middle tabular-nums"
                    style={{ color: isUncategorised ? "#991B1B" : "#111827" }}
                  >
                    {row.id}
                  </td>
                  <td
                    className="px-4 py-3 font-light align-middle"
                    style={{ color: isUncategorised ? "#B91C1C" : "#6B7280" }}
                  >
                    {row.description}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {isUncategorised ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                          style={{ backgroundColor: "#DC2626" }}
                        />
                        No category
                      </span>
                    ) : (
                      <span className="text-[#6B7280] font-light">
                        {brick?.brickName}{" "}
                        <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>
                          {row.brickCode}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          Select products and assign a category manually, or hand the selection to the AI
          Attributes Enrichment flow, which suggests categories and fills GS1 baseline attribute
          values (a separate part of the product, shown here as a hand-off only). Assigning a
          category updates Compliance immediately.
        </p>
      </div>

      {/* Modals */}
      <AssignCategoryModal
        open={assignOpen}
        count={selected.size}
        onClose={() => setAssignOpen(false)}
        onAssign={handleManualAssign}
      />
      <EnrichHandoffModal
        open={enrichOpen}
        products={selectedProducts}
        onClose={() => setEnrichOpen(false)}
        onConfirm={handleEnrichHandoff}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
