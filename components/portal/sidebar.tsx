"use client"

import { LayoutDashboard, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeScreen: string
  onNavigate: (screen: string) => void
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "attribute-profiles", label: "Attributes & Images", icon: Tag },
]

export function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E0E4E8",
      }}
    >
      <nav className="flex flex-col gap-0.5 p-3 pt-4">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeScreen === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left w-full cursor-pointer",
                isActive
                  ? "text-white"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F6F8]"
              )}
              style={
                isActive
                  ? { backgroundColor: "#0168B3", color: "#FFFFFF" }
                  : undefined
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
