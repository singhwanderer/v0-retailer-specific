"use client"

import { HelpCircle, User } from "lucide-react"

type Perspective = "retailer" | "supplier"

interface TopNavProps {
  activeScreen: string
  onNavigate: (screen: string) => void
  perspective: Perspective
  onPerspectiveChange: (p: Perspective) => void
  /** One-time coach mark nudging the viewer to try the Supplier lens */
  showToggleHint?: boolean
  /** Reopen the welcome / about overlay */
  onShowAbout?: () => void
}

const navLinks = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attribute-profiles", label: "Attributes & Images" },
  { id: "compliance-reports", label: "Compliance Reports" },
]

export function TopNav({
  activeScreen,
  onNavigate,
  perspective,
  onPerspectiveChange,
  showToggleHint = false,
  onShowAbout,
}: TopNavProps) {
  return (
    <header
      className="flex items-center justify-between px-6 h-14 shrink-0"
      style={{ backgroundColor: "#0168B3" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col leading-none">
          <span className="text-white font-semibold text-base tracking-tight">
            OpenText
          </span>
          <span className="text-white/60 text-[10px] font-normal tracking-wide uppercase">
            Trading Grid Catalogue
          </span>
        </div>
      </div>

      {/* Nav links — only shown in retailer view */}
      {perspective === "retailer" && (
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = activeScreen === link.id
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className="relative text-sm font-medium text-white/80 hover:text-white transition-colors pb-0.5 cursor-pointer"
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: "#FFFFFF" }}
                  />
                )}
              </button>
            )
          })}
        </nav>
      )}

      {/* Right side: about + toggle + identity */}
      <div className="flex items-center gap-4">
        {/* About this prototype */}
        {onShowAbout && (
          <button
            onClick={onShowAbout}
            className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            title="About this prototype"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden md:inline">About this prototype</span>
          </button>
        )}

        {/* Perspective toggle \u2014 the single most important control, so it's
            labelled and tinted per persona and gets a one-time coach mark. */}
        <div className="relative flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/60 hidden lg:inline">
              View as
            </span>
            <div
              className="flex items-center p-[3px] rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {(["retailer", "supplier"] as Perspective[]).map((p) => {
                const isActive = perspective === p
                const activeColor = p === "retailer" ? "#0168B3" : "#15803D"
                return (
                  <button
                    key={p}
                    onClick={() => onPerspectiveChange(p)}
                    className="px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    style={
                      isActive
                        ? { backgroundColor: "#FFFFFF", color: activeColor }
                        : { color: "rgba(255,255,255,0.85)" }
                    }
                  >
                    {p === "retailer" ? "Retailer" : "Supplier"}
                  </button>
                )
              })}
            </div>
          </div>

          {/* One-time coach mark */}
          {showToggleHint && (
            <div className="absolute top-full mt-2 right-0 z-50">
              <div
                className="relative rounded-lg px-3 py-2 shadow-lg text-xs font-medium leading-snug w-56"
                style={{ backgroundColor: "#111827", color: "#FFFFFF" }}
              >
                <span
                  className="absolute -top-1.5 right-16 w-3 h-3 rotate-45"
                  style={{ backgroundColor: "#111827" }}
                />
                Flip to <span className="font-semibold">Supplier</span> to see the other half of the
                story \u2014 one product, every retailer at once.
              </div>
            </div>
          )}
        </div>

        {/* Identity pill */}
        <div className="flex items-center gap-2 text-white/90">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#005A9C" }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium">
            {perspective === "retailer" ? "Dillard\u2019s" : "J.Ren\u00e9e"}
          </span>
        </div>
      </div>
    </header>
  )
}
