"use client"

import { ChevronDown, User } from "lucide-react"

interface TopNavProps {
  activeScreen: string
  onNavigate: (screen: string) => void
}

const navLinks = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attribute-profiles", label: "Attribute Profiles" },
  { id: "vendor-exceptions", label: "Vendor Exceptions" },
]

export function TopNav({ activeScreen, onNavigate }: TopNavProps) {
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

      {/* Nav links */}
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

      {/* Retailer identity */}
      <button className="flex items-center gap-2 text-white/90 hover:text-white transition-colors cursor-pointer">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#005A9C" }}
        >
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium">Dillard&apos;s</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
    </header>
  )
}
