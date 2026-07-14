"use client"

import { useState } from "react"
import { TopNav } from "@/components/portal/top-nav"
import { Sidebar } from "@/components/portal/sidebar"
import { Screen1AttributeProfiles } from "@/components/portal/screen1-attribute-profiles"
import { Screen2ProfileDetail } from "@/components/portal/screen2-profile-detail"
import { Screen3VendorExceptions } from "@/components/portal/screen3-vendor-exceptions"
import { ScreenSupplierProducts } from "@/components/portal/screen-supplier-products"
import { ScreenSupplierGapDetail } from "@/components/portal/screen-supplier-gap-detail"

type Perspective = "retailer" | "supplier"

type RetailerScreen =
  | "dashboard"
  | "attribute-profiles"
  | "vendor-exceptions"
  | "profile-detail"

type SupplierScreen =
  | "supplier-products"
  | "supplier-gap-detail"

function DashboardPlaceholder() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
      <p className="text-sm text-[#6B7280]">Dashboard content is out of scope for this prototype.</p>
    </div>
  )
}

export default function RetailerPortal() {
  const [perspective, setPerspective] = useState<Perspective>("retailer")

  // Retailer screen state
  const [retailerScreen, setRetailerScreen] = useState<RetailerScreen>("attribute-profiles")

  // Supplier screen state
  const [supplierScreen, setSupplierScreen] = useState<SupplierScreen>("supplier-products")
  const [gapProduct, setGapProduct] = useState<{ productName: string; retailer: string } | null>(null)

  // ── Perspective switch ──────────────────────────────────────────────────────
  function handlePerspectiveChange(p: Perspective) {
    setPerspective(p)
  }

  // ── Retailer navigation ─────────────────────────────────────────────────────
  const handleRetailerNavigate = (id: string) => {
    if (
      id === "dashboard" ||
      id === "attribute-profiles" ||
      id === "vendor-exceptions"
    ) {
      setRetailerScreen(id as RetailerScreen)
    }
  }

  // ── Supplier navigation ─────────────────────────────────────────────────────
  const handleSupplierNavigate = (id: string) => {
    if (id === "supplier-products") {
      setSupplierScreen("supplier-products")
    }
  }

  function handleNavigateToGapDetail(productName: string, retailer: string) {
    setGapProduct({ productName, retailer })
    setSupplierScreen("supplier-gap-detail")
  }

  function handleBackToCatalogue() {
    setSupplierScreen("supplier-products")
    setGapProduct(null)
  }

  // ── Active sidebar item ─────────────────────────────────────────────────────
  const retailerActiveScreen =
    retailerScreen === "profile-detail" ? "attribute-profiles" : retailerScreen

  const supplierActiveScreen =
    supplierScreen === "supplier-gap-detail" ? "supplier-products" : supplierScreen

  const activeScreen =
    perspective === "retailer" ? retailerActiveScreen : supplierActiveScreen

  // ── Navigation handler passed to TopNav / Sidebar ──────────────────────────
  const handleNavigate =
    perspective === "retailer" ? handleRetailerNavigate : handleSupplierNavigate

  return (
    <div className="flex flex-col h-screen overflow-hidden relative" style={{ backgroundColor: "#F4F6F8" }}>
      {/* Watermark overlay */}
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center z-10"
        style={{ opacity: 0.2 }}
      >
        <div className="text-center">
          <p
            className="text-4xl font-bold tracking-widest"
            style={{ color: "#9CA3AF" }}
          >
            MOCK DATA FOR ILLUSTRATION ONLY
          </p>
          <p
            className="text-xl mt-3"
            style={{ color: "#D1D5DB" }}
          >
            This is a prototype
          </p>
        </div>
      </div>

      {/* Top navigation bar */}
      <TopNav
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        perspective={perspective}
        onPerspectiveChange={handlePerspectiveChange}
      />

      {/* Body: sidebar + main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          perspective={perspective}
        />

        {/* Scrollable main area */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F6F8" }}>

          {/* ── Retailer screens ── */}
          {perspective === "retailer" && (
            <>
              {retailerScreen === "dashboard" && <DashboardPlaceholder />}

              {retailerScreen === "attribute-profiles" && (
                <Screen1AttributeProfiles onNavigateToProfile={() => setRetailerScreen("profile-detail")} />
              )}

              {retailerScreen === "profile-detail" && (
                <Screen2ProfileDetail onBack={() => setRetailerScreen("attribute-profiles")} />
              )}

              {retailerScreen === "vendor-exceptions" && <Screen3VendorExceptions />}
            </>
          )}

          {/* ── Supplier screens ── */}
          {perspective === "supplier" && (
            <>
              {supplierScreen === "supplier-products" && (
                <ScreenSupplierProducts onNavigateToGapDetail={handleNavigateToGapDetail} />
              )}

              {supplierScreen === "supplier-gap-detail" && gapProduct && (
                <ScreenSupplierGapDetail
                  productName={gapProduct.productName}
                  retailer={gapProduct.retailer}
                  onBack={handleBackToCatalogue}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
