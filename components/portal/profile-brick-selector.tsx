"use client"

import { useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import type { ProfileBrick } from "@/lib/retailer-requirements"

// ── Profile brick selector ────────────────────────────────────────────────────
// A searchable dropdown scoped to ONE profile's own mapped bricks — not the
// whole GS1 library (that's Gs1BrickPicker, used only to ADD a new brick).
// Attributes are always brick-scoped, so switching the selection here changes
// which brick's Core/Extended/Image rows the detail screen shows and edits.
// Renders nothing for single-brick profiles — no dropdown chrome needed.

interface ProfileBrickSelectorProps {
  bricks: ProfileBrick[]
  selectedCode: string
  onSelect: (code: string) => void
}

export function ProfileBrickSelector({ bricks, selectedCode, onSelect }: ProfileBrickSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  if (bricks.length <= 1) return null

  const selected = bricks.find((b) => b.code === selectedCode)
  const filtered = bricks.filter(
    (b) => b.name.toLowerCase().includes(query.toLowerCase()) || b.code.includes(query)
  )

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border hover:bg-[#F4F6F8] transition-colors"
        style={{ borderColor: "#BFDBFE", color: "#0168B3", backgroundColor: "#EFF6FF" }}
      >
        {selected ? selected.name : "Select a GS1 category"}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-50 w-72 rounded-md border bg-white shadow-lg overflow-hidden"
            style={{ borderColor: "#E0E4E8" }}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#E0E4E8" }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this requirement's categories…"
                className="flex-1 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm" style={{ color: "#9CA3AF" }}>No match.</p>
              ) : (
                filtered.map((b) => {
                  const isSelected = b.code === selectedCode
                  return (
                    <button
                      key={b.code}
                      onClick={() => {
                        onSelect(b.code)
                        setOpen(false)
                        setQuery("")
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F4F6F8] transition-colors"
                      style={{ backgroundColor: isSelected ? "#EFF6FF" : undefined }}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: isSelected ? "#0168B3" : "#E0E4E8" }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-[#111827] truncate">{b.name}</span>
                        <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>{b.code}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
