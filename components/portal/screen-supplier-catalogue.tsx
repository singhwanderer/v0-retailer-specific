"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle, X } from "lucide-react"
import { AssignCategoryModal } from "@/components/portal/assign-category-modal"
import { EnrichHandoffModal } from "@/components/portal/enrich-handoff-modal"
import { getBrickByCode, type Gs1Brick } from "@/lib/gs1-standard-library"
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
  /** Back to the Selection Code List — this screen has no nav entry of its own */
  onBack: () => void
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

// ── Main screen ───────────────────────────────────────────────────────────────
export function ScreenSupplierCatalogue({
  products,
  initialSelectedIds = [],
  onAssignCategory,
  onBack,
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
    const n = selected.size
    onAssignCategory(new Set(selected), brick.brickCode)
    showToast(
      `${n} product${n !== 1 ? "s" : ""} categorised as ${brick.brickName} — compliance recalculated against GS1 and all retailers. Open Compliance Status to see it.`
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button onClick={onBack} className="font-light hover:underline" style={{ color: "#0168B3" }}>
          Selection Code List
        </button>
        <span style={{ color: "#9CA3AF" }}>›</span>
        <span className="font-light text-[#6B7280]">Catalogue</span>
      </nav>

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
