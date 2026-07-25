"use client"

// Supplier-side notification bell.
//
// Answers the question the exception model otherwise leaves open: how does a
// supplier learn that a retailer granted them an exception? Their gap count
// simply drops, with the explanation buried on a product detail screen they
// have to already be looking at. This surfaces each Active exception as a
// notification, unread until the supplier opens it, and deep-links to the
// selection code the exception applies to.

import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import type { VendorException } from "@/lib/mcp/store"

/**
 * Supplier-facing wording for an exception. The retailer's own
 * describeEffectText() speaks in terms of reported gap counts, which is the
 * wrong frame here — the supplier cares about what they no longer owe.
 */
function describeForSupplier(exception: VendorException): string {
  const attrs = exception.attributes.join(", ")
  const one = exception.attributes.length === 1
  switch (exception.exceptionType) {
    case "Attribute Waiver":
      return `${attrs} no longer ${one ? "counts" : "count"} as a gap against you.`
    case "Extended Deadline":
      return `You have extra time to supply ${attrs}.`
    case "Reduced Scope":
      return `${attrs} ${one ? "has" : "have"} been narrowed in scope for you.`
  }
}

const READ_STORAGE_KEY = "tgc_supplier_read_exceptions"

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

interface SupplierNotificationsProps {
  /** Active exceptions granted to the supplier persona. */
  exceptions: VendorException[]
  /** Jump to the selection code an exception applies to. */
  onOpenException: (exception: VendorException) => void
}

export function SupplierNotifications({
  exceptions,
  onOpenException,
}: SupplierNotificationsProps) {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // localStorage is only read after mount, so server and client render alike.
  useEffect(() => setReadIds(loadReadIds()), [])

  // Opening the feed marks everything in it as read.
  useEffect(() => {
    if (!open || exceptions.length === 0) return
    const next = new Set(readIds)
    exceptions.forEach((e) => next.add(e.id))
    if (next.size === readIds.size) return
    setReadIds(next)
    try {
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // Private browsing — the badge just reappears next visit.
    }
  }, [open, exceptions, readIds])

  useEffect(() => {
    if (!open) return
    function onClickAway(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickAway)
    return () => document.removeEventListener("mousedown", onClickAway)
  }, [open])

  const unreadCount = exceptions.filter((e) => !readIds.has(e.id)).length

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center text-white/80 hover:text-white transition-colors cursor-pointer"
        aria-label={
          unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
            style={{ backgroundColor: "#F59E0B", color: "#1F2937" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-3 z-50 w-80 rounded-lg shadow-lg overflow-hidden"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E0E4E8" }}
        >
          <div
            className="px-4 py-2.5 text-xs font-semibold"
            style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E0E4E8", color: "#111827" }}
          >
            Notifications
          </div>

          {exceptions.length === 0 ? (
            <p className="px-4 py-4 text-xs font-light" style={{ color: "#9CA3AF" }}>
              Nothing new. Exceptions your trading partners grant you will appear here.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {exceptions.map((exception, idx) => (
                <li
                  key={exception.id}
                  style={{
                    borderBottom: idx < exceptions.length - 1 ? "1px solid #F3F4F6" : undefined,
                  }}
                >
                  <button
                    onClick={() => {
                      setOpen(false)
                      onOpenException(exception)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[#F4F6F8] transition-colors flex flex-col gap-1"
                  >
                    <span className="text-xs font-semibold" style={{ color: "#111827" }}>
                      {exception.exceptionType} granted &mdash; {exception.profile}
                    </span>
                    <span className="text-[11px] font-light leading-relaxed" style={{ color: "#6B7280" }}>
                      {describeForSupplier(exception)}
                    </span>
                    <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
                      Valid until {exception.validUntil}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
