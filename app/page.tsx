"use client"

import { useState } from "react"
import { TopNav } from "@/components/portal/top-nav"
import { Sidebar } from "@/components/portal/sidebar"
import { Screen1AttributeProfiles } from "@/components/portal/screen1-attribute-profiles"
import { Screen2ProfileDetail } from "@/components/portal/screen2-profile-detail"
import { Screen3VendorExceptions } from "@/components/portal/screen3-vendor-exceptions"

type Screen =
  | "dashboard"
  | "attribute-profiles"
  | "vendor-exceptions"
  | "reports"
  | "profile-detail"

function DashboardPlaceholder() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
      <p className="text-sm text-[#6B7280]">Dashboard content is out of scope for this prototype.</p>
    </div>
  )
}

function ReportsPlaceholder() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-[#111827]">Reports</h1>
      <p className="text-sm text-[#6B7280]">Reports content is out of scope for this prototype.</p>
    </div>
  )
}

export default function RetailerPortal() {
  const [screen, setScreen] = useState<Screen>("attribute-profiles")

  // Map top nav / sidebar IDs to screen state
  const handleNavigate = (id: string) => {
    if (
      id === "dashboard" ||
      id === "attribute-profiles" ||
      id === "vendor-exceptions" ||
      id === "reports"
    ) {
      setScreen(id as Screen)
    }
  }

  // Which sidebar/topnav item is "active" — profile-detail is a child of attribute-profiles
  const activeScreen =
    screen === "profile-detail" ? "attribute-profiles" : screen

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: "#F4F6F8" }}>
      {/* Top navigation bar */}
      <TopNav activeScreen={activeScreen} onNavigate={handleNavigate} />

      {/* Body: sidebar + main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeScreen={activeScreen} onNavigate={handleNavigate} />

        {/* Scrollable main area */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F6F8" }}>
          {screen === "dashboard" && <DashboardPlaceholder />}

          {screen === "attribute-profiles" && (
            <Screen1AttributeProfiles onNavigateToProfile={() => setScreen("profile-detail")} />
          )}

          {screen === "profile-detail" && (
            <Screen2ProfileDetail onBack={() => setScreen("attribute-profiles")} />
          )}

          {screen === "vendor-exceptions" && <Screen3VendorExceptions />}

          {screen === "reports" && <ReportsPlaceholder />}
        </main>
      </div>
    </div>
  )
}
