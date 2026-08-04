"use client"

import { getAllowedValues } from "@/lib/gs1-attribute-values"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Attribute value editor ────────────────────────────────────────────────────
// The one control a supplier uses to answer a missing attribute: a picker when
// the GS1 library publishes an allowed-value list for that attribute, a free
// text box when it doesn't.
//
// It never writes anything itself — it raises the chosen value so the caller can
// route it through ConfirmFillAttributeModal first. Filling an attribute applies
// to the whole product (and therefore every target), which is significant enough
// that the confirm step is part of the flow rather than an afterthought.
export function AttributeFillControl({
  attributeName,
  onPick,
  className = "ml-auto h-8 w-52 text-xs",
}: {
  attributeName: string
  onPick: (value: string) => void
  /** Sizing for the control — the gap detail right-aligns it, the gaps screen doesn't. */
  className?: string
}) {
  const allowedValues = getAllowedValues(attributeName)

  if (allowedValues && allowedValues.length > 0) {
    return (
      <Select value="" onValueChange={onPick}>
        <SelectTrigger className={className} aria-label={`Select a value for ${attributeName}`}>
          <SelectValue placeholder="Select a value…" />
        </SelectTrigger>
        <SelectContent>
          {allowedValues.map((v) => (
            <SelectItem key={v.value} value={v.value} className="text-xs">
              {v.value}
              {v.code && (
                <span className="ml-1.5 font-mono text-[10px] text-[#9CA3AF]">{v.code}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <input
      type="text"
      placeholder="Enter a value…"
      aria-label={`Enter a value for ${attributeName}`}
      className={`${className} rounded-md border px-2.5 outline-none focus:ring-2`}
      style={{ borderColor: "#E0E4E8" }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          const value = e.currentTarget.value.trim()
          if (value) onPick(value)
        }
      }}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim()
        if (value) onPick(value)
      }}
    />
  )
}
