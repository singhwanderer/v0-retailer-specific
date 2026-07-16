"use client"

import React from "react"
import { Image, LayoutDashboard, Package, Tag, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Perspective = "retailer" | "supplier"

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** When false, the item is visible but disabled (not yet wired up). Defaults to true. */
  wired?: boolean
}

interface SidebarProps {
  activeScreen: string
  onNavigate: (screen: string) => void
  perspective: Perspective
}

const retailerNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "attribute-profiles", label: "Attributes & Images", icon: Tag },
]

const supplierNavItems: NavItem[] = [
  { id: "supplier-products", label: "Catalogue", icon: Package, wired: true },
  { id: "supplier-image-upload", label: "Image Upload", icon: Image, wired: false },
  { id: "supplier-trading-partners", label: "Trading Partners", icon: Users, wired: false },
]

export function Sidebar({ activeScreen, onNavigate, perspective }: SidebarProps) {
  const items = perspective === "supplier" ? supplierNavItems : retailerNavItems

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E0E4E8",
      }}
    >
      <nav className="flex flex-col gap-0.5 p-3 pt-4">
        {items.map(({ id, label, icon: Icon, wired }) => {
          const isActive = activeScreen === id
          return (
            <button
              key={id}
              onClick={() => wired !== false && onNavigate(id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left w-full",
                wired !== false ? "cursor-pointer" : "cursor-default opacity-60",
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
