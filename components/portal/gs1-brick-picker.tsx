"use client"

import { useState } from "react"
import { Check, Search } from "lucide-react"
import { getSegments, searchBricks, type Gs1Brick } from "@/lib/gs1-standard-library"

// ── Shared GS1 brick picker ───────────────────────────────────────────────────
// The searchable, segment-filterable brick list used both in the Create
// Requirement wizard (Screen 1) and the "Add GS1 Category" flow on a profile
// (Screen 2). Two modes:
//  - Single-select (default): `selected`/`onSelect` — used by Screen 2's
//    "Add GS1 Category" dialog, one brick at a time.
//  - Multi-select (`multiSelect`): `selectedCodes`/`onToggle` — used by Screen
//    1's create wizard, letting a new requirement map to several bricks at
//    creation.
// Already-mapped bricks can be excluded so they read as "Added" and can't be
// picked twice, in either mode.

interface Gs1BrickPickerProps {
  selected?: Gs1Brick | null
  onSelect?: (brick: Gs1Brick) => void
  multiSelect?: boolean
  selectedCodes?: string[]
  onToggle?: (brick: Gs1Brick) => void
  /** Brick codes already mapped — shown as disabled "Added" rows. */
  excludeCodes?: string[]
  maxHeight?: number
}

export function Gs1BrickPicker({
  selected = null,
  onSelect,
  multiSelect = false,
  selectedCodes = [],
  onToggle,
  excludeCodes = [],
  maxHeight = 240,
}: Gs1BrickPickerProps) {
  const [query, setQuery] = useState("")
  const [selectedSegment, setSelectedSegment] = useState<string>("All")

  const segments = ["All", ...getSegments()]
  const filteredBricks = searchBricks(query).filter(
    (b) => selectedSegment === "All" || b.segment === selectedSegment
  )
  const excluded = new Set(excludeCodes)

  function handleClick(brick: Gs1Brick) {
    if (multiSelect) onToggle?.(brick)
    else onSelect?.(brick)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search + segment filter */}
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
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Brick list */}
      <div
        className="rounded-md border overflow-y-auto"
        style={{ borderColor: "#E0E4E8", maxHeight }}
      >
        {filteredBricks.length === 0 ? (
          <p className="px-4 py-3 text-sm" style={{ color: "#9CA3AF" }}>
            No categories match your search.
          </p>
        ) : (
          filteredBricks.map((brick) => {
            const isSelected = multiSelect
              ? selectedCodes.includes(brick.brickCode)
              : selected?.brickCode === brick.brickCode
            const isExcluded = excluded.has(brick.brickCode)
            return (
              <button
                key={brick.brickCode}
                onClick={() => !isExcluded && handleClick(brick)}
                disabled={isExcluded}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                style={{
                  borderBottom: "1px solid #F3F4F6",
                  backgroundColor: isSelected ? "#EFF6FF" : undefined,
                  opacity: isExcluded ? 0.5 : 1,
                }}
              >
                {/* Checkmark column */}
                <div
                  className={multiSelect ? "w-4 h-4 rounded shrink-0 flex items-center justify-center" : "w-4 h-4 rounded-full shrink-0 flex items-center justify-center"}
                  style={{ backgroundColor: isSelected ? "#0168B3" : "#E0E4E8" }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[#111827] truncate">{brick.brickName}</span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: "#9CA3AF" }}>
                      {brick.brickCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                      {brick.extendedAttributes.length} standard attributes
                    </span>
                  </div>
                </div>
                {isExcluded && (
                  <span className="text-[10px] font-medium shrink-0" style={{ color: "#15803D" }}>
                    Added
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
