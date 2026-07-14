"use client"

import { ChevronDown, User } from "lucide-react"

type Perspective = "retailer" | "supplier"

interface TopNavProps {
  activeScreen: string
  onNavigate: (screen: string) => void
  perspective: Perspective
  onPerspectiveChange: (p: Perspective) => void
}

const navLinks = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attribute-profiles", label: "Attributes & Images" },
]

export function TopNav({
  activeScreen,
  onNavigate,
  perspective,
  onPerspectiveChange,
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

      {/* Right side: toggle + identity */}
      <div className="flex items-center gap-4">
        {/* Perspective toggle */}
        <div
          className="flex items-center p-[3px] rounded-lg"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          {(["retailer", "supplier"] as Perspective[]).map((p) => {
            const isActive = perspective === p
            return (
              <button
                key={p}
                onClick={() => onPerspectiveChange(p)}
                className="px-3.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize"
                style={
                  isActive
                    ? { backgroundColor: "#FFFFFF", color: "#0168B3" }
                    : { color: "rgba(255,255,255,0.85)" }
                }
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Identity pill */}
        <button className="flex items-center gap-2 text-white/90 hover:text-white transition-colors cursor-pointer">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#005A9C" }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium">
            {perspective === "retailer" ? "Dillard\u2019s" : "J.Ren\u00e9e"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    </header>
  )
}
