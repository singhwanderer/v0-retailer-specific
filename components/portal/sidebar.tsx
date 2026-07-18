"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, LayoutDashboard, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

type Perspective = "retailer" | "supplier"

interface SidebarProps {
  activeScreen: string
  onNavigate: (screen: string) => void
  perspective: Perspective
}

// ── Retailer nav (unchanged) ──────────────────────────────────────────────────
const retailerNavItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, wired: true },
  { id: "attribute-profiles", label: "Attributes & Images", icon: Tag, wired: true },
]

// ── Supplier nav — mirrors the real Trading Grid Catalogue left nav ────────────
// Section headers + leaf items reproduce the live product so the prototype reads
// as the real thing. Only the two new items are wired; everything else is shown
// present-but-inactive, exactly as it exists today.
type NavLeaf = { id: string; label: string; wired?: boolean; badge?: string; isNew?: boolean }
type NavSection = { key: string; label: string; defaultExpanded: boolean; items: NavLeaf[] }

const supplierSections: NavSection[] = [
  {
    key: "catalogue",
    label: "Catalogue",
    defaultExpanded: true,
    items: [
      { id: "selection-code-list", label: "Selection Code List" },
      { id: "advanced-search", label: "Advanced Search" },
      { id: "download-basket", label: "Download Basket" },
      { id: "supplier-catalogue", label: "Products", wired: true, isNew: true },
    ],
  },
  {
    key: "data-management",
    label: "Data Management",
    defaultExpanded: true,
    items: [
      { id: "error-processing", label: "Error Processing", badge: "0" },
      { id: "edi-console", label: "EDI Management Console" },
      { id: "text-file-upload", label: "Text File Upload" },
      { id: "text-file-download", label: "Text File Download" },
      { id: "compliance-checks", label: "Compliance Checks" },
      { id: "compliance-reports", label: "Compliance Reports" },
      { id: "supplier-compliance", label: "Compliance Status", wired: true, isNew: true },
    ],
  },
  {
    key: "color-size",
    label: "Color/Size Codes",
    defaultExpanded: false,
    items: [
      { id: "color-codes", label: "Color Codes" },
      { id: "size-codes", label: "Size Codes" },
    ],
  },
  {
    key: "account",
    label: "Account",
    defaultExpanded: false,
    items: [
      { id: "profile", label: "Profile" },
      { id: "users", label: "Users" },
    ],
  },
  {
    key: "product-docs",
    label: "Product Documentation",
    defaultExpanded: false,
    items: [{ id: "guides", label: "Guides & Templates" }],
  },
  {
    key: "administration",
    label: "Administration",
    defaultExpanded: false,
    items: [{ id: "settings", label: "Settings" }],
  },
]

// ── Retailer sidebar (simple flat list) ───────────────────────────────────────
function RetailerNav({ activeScreen, onNavigate }: Omit<SidebarProps, "perspective">) {
  return (
    <nav className="flex flex-col gap-0.5 p-3 pt-4">
      {retailerNavItems.map(({ id, label, icon: Icon, wired }) => {
        const isActive = activeScreen === id
        return (
          <button
            key={id}
            onClick={() => wired !== false && onNavigate(id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left w-full",
              wired !== false ? "cursor-pointer" : "cursor-default opacity-60",
              isActive ? "text-white" : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F6F8]"
            )}
            style={isActive ? { backgroundColor: "#0168B3", color: "#FFFFFF" } : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// ── Supplier sidebar (sectioned accordion, TGC-style) ─────────────────────────
function SupplierNav({ activeScreen, onNavigate }: Omit<SidebarProps, "perspective">) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(supplierSections.map((s) => [s.key, s.defaultExpanded]))
  )

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <nav className="flex flex-col py-1 text-sm">
      {supplierSections.map((section) => {
        const isOpen = expanded[section.key]
        return (
          <div key={section.key}>
            {/* Section header */}
            <button
              onClick={() => toggle(section.key)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left font-semibold transition-colors"
              style={{
                color: "#1F2937",
                backgroundColor: "#EDEFF2",
                borderBottom: "1px solid #E0E4E8",
              }}
            >
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#6B7280" }} />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#6B7280" }} />
              )}
              {section.label}
            </button>

            {/* Leaf items */}
            {isOpen && (
              <div className="flex flex-col py-1" style={{ backgroundColor: "#FFFFFF" }}>
                {section.items.map((leaf) => {
                  const isActive = activeScreen === leaf.id
                  const isWired = leaf.wired === true
                  return (
                    <button
                      key={leaf.id}
                      onClick={() => isWired && onNavigate(leaf.id)}
                      className={cn(
                        "group flex items-center gap-2 pl-8 pr-3 py-1.5 text-left w-full transition-colors",
                        isWired ? "cursor-pointer" : "cursor-default"
                      )}
                      style={
                        isActive
                          ? { backgroundColor: "#0168B3" }
                          : undefined
                      }
                    >
                      {/* ▸ marker */}
                      <span
                        className="text-[10px] shrink-0"
                        style={{ color: isActive ? "#FFFFFF" : "#9CA3AF" }}
                      >
                        ▸
                      </span>
                      <span
                        className={cn(
                          "truncate",
                          !isActive && isWired && "group-hover:underline"
                        )}
                        style={{
                          color: isActive
                            ? "#FFFFFF"
                            : isWired
                            ? "#0168B3"
                            : "#9CA3AF",
                          fontWeight: isWired ? 500 : 400,
                        }}
                      >
                        {leaf.label}
                      </span>
                      {leaf.badge !== undefined && (
                        <span
                          className="text-[11px] shrink-0"
                          style={{ color: isActive ? "#FFFFFF" : "#9CA3AF" }}
                        >
                          [{leaf.badge}]
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function Sidebar({ activeScreen, onNavigate, perspective }: SidebarProps) {
  return (
    <aside
      className="w-60 shrink-0 flex flex-col border-r overflow-y-auto"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E4E8" }}
    >
      {perspective === "supplier" ? (
        <SupplierNav activeScreen={activeScreen} onNavigate={onNavigate} />
      ) : (
        <RetailerNav activeScreen={activeScreen} onNavigate={onNavigate} />
      )}
    </aside>
  )
}
