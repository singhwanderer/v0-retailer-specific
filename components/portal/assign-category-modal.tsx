"use client"

import { useState } from "react"
import { Check, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { getSegments, searchBricks, type Gs1Brick } from "@/lib/gs1-standard-library"

// ── Manual brick picker (same pattern as the retailer create-requirement wizard) ──
// Shared by the Catalogue screen and the Products Needing Enrichment screen, so
// the categorisation affordance reads identically wherever a supplier meets it.
export function AssignCategoryModal({
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
            Choose the GPC classification for the selected products. Its standard attributes
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
                placeholder="Search category name or code…"
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
                No categories match your search.
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
