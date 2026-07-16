"use client"

import { useState } from "react"
import { TopNav } from "@/components/portal/top-nav"
import { Sidebar } from "@/components/portal/sidebar"
import { Screen1AttributeProfiles } from "@/components/portal/screen1-attribute-profiles"
import { Screen2ProfileDetail } from "@/components/portal/screen2-profile-detail"
import { type ProfileData, buildProfileForBrick, countAttributes, countImages } from "@/lib/profile-data"
// NOTE: Screen3VendorExceptions is intentionally NOT rendered — the Vendor
// Exceptions feature is out of scope / not required. The component file is kept
// in the repo but is not wired into navigation.
import { ScreenSupplierTradingPartners } from "@/components/portal/screen-supplier-trading-partners"
import { ScreenSupplierSelectionCodes } from "@/components/portal/screen-supplier-selection-codes"
import { ScreenSupplierProducts } from "@/components/portal/screen-supplier-products"
import { ScreenSupplierGapDetail } from "@/components/portal/screen-supplier-gap-detail"
import { ScreenGs1Standards } from "@/components/portal/screen-gs1-standards"

type Perspective = "retailer" | "supplier"

type RetailerScreen =
  | "dashboard"
  | "attribute-profiles"
  | "vendor-exceptions"
  | "profile-detail"

type SupplierScreen =
  | "trading-partners"
  | "selection-codes"
  | "supplier-products"
  | "supplier-gap-detail"
  // GS1 Standards flow — same screen hierarchy, system-owned read-only partner
  | "gs1-standards"
  | "gs1-selection-codes"
  | "gs1-products"
  | "gs1-gap-detail"

function DashboardPlaceholder() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
      <p className="text-sm text-[#6B7280]">
        Dashboard content is out of scope for this prototype.
      </p>
    </div>
  )
}

export default function RetailerPortal() {
  const [perspective, setPerspective] = useState<Perspective>("retailer")

  // ── Retailer state ──────────────────────────────────────────────────────────
  const [retailerScreen, setRetailerScreen] = useState<RetailerScreen>("attribute-profiles")

  // Context passed from Screen 1 into Screen 2
  const [activeBrick, setActiveBrick] = useState<{
    code: string
    name: string
    categoryName: string
  } | null>(null)

  // ── Lifted profile data ──────────────────────────────────────────────────
  // The profile rows (core / extended / image) for each category live HERE,
  // keyed by GS1 brick code, so that:
  //   1. Screen 1's per-category counts are derived from the same data the
  //      Screen 2 editor shows — they always match.
  //   2. Adding or removing attributes/image requirements inside Screen 2
  //      persists and the list counts move up and down accordingly.
  // Seeded from the GS1 standard library so each category genuinely differs
  // (Footwear 6 core + 11 extended, Apparel 6 + 8, Jewellery 6 + 6).
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>(() => ({
    "10005811": buildProfileForBrick("10005811"), // Footwear
    "10001352": buildProfileForBrick("10001352"), // Apparel — Shirts/Blouses/Polo Shirts/T-Shirts
    "10006017": buildProfileForBrick("10006017"), // Jewellery — Necklaces/Chains/Pendants
  }))

  // Key used when a profile has no GS1 brick mapping (e.g. created via wizard).
  const NO_BRICK_KEY = "__no_brick__"

  // Per-category counts for Screen 1, derived live from the profiles above.
  const profileCounts: Record<string, { attributes: number; images: number }> =
    Object.fromEntries(
      Object.entries(profiles).map(([code, p]) => [
        code,
        { attributes: countAttributes(p), images: countImages(p) },
      ]),
    )

  const activeProfileKey = activeBrick?.code ?? NO_BRICK_KEY

  // ── Supplier state ──────────────────────────────────────────────────────────
  const [supplierScreen, setSupplierScreen] = useState<SupplierScreen>("trading-partners")

  // L2 context
  const [activePartner, setActivePartner] = useState<{ id: string; name: string } | null>(null)

  // L3 context
  const [activeCode, setActiveCode] = useState<{ id: string; label: string } | null>(null)

  // L4 context
  const [gapProduct, setGapProduct] = useState<{ productName: string; retailer: string } | null>(null)

  // ── Perspective switch ──────────────────────────────────────────────────────
  function handlePerspectiveChange(p: Perspective) {
    setPerspective(p)
  }

  // ── Retailer navigation ─────────────────────────────────────────────────────
  // NOTE: "vendor-exceptions" is intentionally excluded — the Vendor Exceptions
  // feature is out of scope / not required, so it is not reachable.
  function handleRetailerNavigate(id: string) {
    if (id === "dashboard" || id === "attribute-profiles") {
      setRetailerScreen(id as RetailerScreen)
    }
  }

  // ── Supplier navigation (sidebar clicks) ────────────────────────────────────
  function handleSupplierNavigate(id: string) {
    if (id === "supplier-compliance") {
      // "Compliance" is the renamed Catalogue — routes to Trading Partners L1
      setSupplierScreen("trading-partners")
      setActivePartner(null)
      setActiveCode(null)
      setGapProduct(null)
    } else if (id === "supplier-gs1-standards") {
      // GS1 Standards — dedicated flow seeded from GS1_BRICKS, no retailer partner
      setSupplierScreen("gs1-standards")
      setActivePartner(null)
      setActiveCode(null)
      setGapProduct(null)
    } else if (id === "supplier-trading-partners") {
      setSupplierScreen("trading-partners")
      setActivePartner(null)
      setActiveCode(null)
      setGapProduct(null)
    }
  }

  // ── L1 → L2 ────────────────────────────────────────────────────────────────
  function handleSelectPartner(partnerId: string, partnerName: string) {
    setActivePartner({ id: partnerId, name: partnerName })
    setSupplierScreen("selection-codes")
  }

  // ── L2 → L3 ────────────────────────────────────────────────────────────────
  function handleSelectCode(codeId: string, codeLabel: string) {
    setActiveCode({ id: codeId, label: codeLabel })
    setSupplierScreen("supplier-products")
  }

  // ── L3 → L4 ────────────────────────────────────────────────────────────────
  function handleNavigateToGapDetail(productName: string, retailer: string) {
    setGapProduct({ productName, retailer })
    setSupplierScreen("supplier-gap-detail")
  }

  // ── L4 back to L3 ──────────────────────────────────────────────────────────
  function handleBackToProducts() {
    setSupplierScreen("supplier-products")
    setGapProduct(null)
  }

  // ── L4 back to L2 (or L3 breadcrumb "partner" click) ───────────────────────
  function handleBackToPartner() {
    setSupplierScreen("selection-codes")
    setGapProduct(null)
    setActiveCode(null)
  }

  // ── L4 back to L1 ──────────────────────────────────────────────────────────
  function handleBackToPartnerList() {
    setSupplierScreen("trading-partners")
    setActivePartner(null)
    setActiveCode(null)
    setGapProduct(null)
  }

  // ── GS1 Standards navigation ────────────────────────────────────────────────
  // The GS1 flow is L1 (brick segments) → L2 (bricks) → L3 (products) → L4 (gap)
  // using a synthetic "GS1" partner. State reuses activeCode + gapProduct.
  const GS1_PARTNER = { id: "gs1", name: "GS1 Standards" }

  function handleGs1SelectSegment(segmentId: string, segmentName: string) {
    setActiveCode({ id: segmentId, label: segmentName })
    setSupplierScreen("gs1-selection-codes")
  }

  function handleGs1SelectBrick(brickCode: string, brickName: string) {
    setActiveCode({ id: brickCode, label: brickName })
    setSupplierScreen("gs1-products")
  }

  function handleGs1NavigateToGap(productName: string) {
    setGapProduct({ productName, retailer: "GS1 Standards" })
    setSupplierScreen("gs1-gap-detail")
  }

  function handleGs1BackToProducts() {
    setSupplierScreen("gs1-products")
    setGapProduct(null)
  }

  function handleGs1BackToBricks() {
    setSupplierScreen("gs1-selection-codes")
    setGapProduct(null)
    setActiveCode(null)
  }

  function handleGs1BackToSegments() {
    setSupplierScreen("gs1-standards")
    setActivePartner(null)
    setActiveCode(null)
    setGapProduct(null)
  }

  // ── Active sidebar item ─────────────────────────────────────────────────────
  const retailerActiveScreen =
    retailerScreen === "profile-detail" ? "attribute-profiles" : retailerScreen

  // Map supplier screens to the correct sidebar nav item id
  const supplierActiveScreen: string = (() => {
    if (
      supplierScreen === "gs1-standards" ||
      supplierScreen === "gs1-selection-codes" ||
      supplierScreen === "gs1-products" ||
      supplierScreen === "gs1-gap-detail"
    ) return "supplier-gs1-standards"
    return "supplier-compliance"
  })()

  const activeScreen =
    perspective === "retailer" ? retailerActiveScreen : supplierActiveScreen

  const handleNavigate =
    perspective === "retailer" ? handleRetailerNavigate : handleSupplierNavigate

  return (
    <div
      className="flex flex-col h-screen overflow-hidden relative"
      style={{ backgroundColor: "#F4F6F8" }}
    >
      {/* Watermark */}
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
          <p className="text-xl mt-3" style={{ color: "#D1D5DB" }}>
            This is a prototype
          </p>
        </div>
      </div>

      {/* Top nav */}
      <TopNav
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        perspective={perspective}
        onPerspectiveChange={handlePerspectiveChange}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          perspective={perspective}
        />

        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F6F8" }}>

          {/* ── Retailer screens ── */}
          {perspective === "retailer" && (
            <>
              {retailerScreen === "dashboard" && <DashboardPlaceholder />}
              {retailerScreen === "attribute-profiles" && (
                <Screen1AttributeProfiles
                  profileCounts={profileCounts}
                  onNavigateToProfile={(brickCode, brickName, categoryName) => {
                    const key = brickCode ?? NO_BRICK_KEY
                    // Lazily seed a profile if this brick has not been opened yet.
                    setProfiles((prev) =>
                      prev[key] ? prev : { ...prev, [key]: buildProfileForBrick(brickCode) },
                    )
                    setActiveBrick(
                      brickCode && brickName
                        ? { code: brickCode, name: brickName, categoryName: categoryName ?? brickName }
                        : null
                    )
                    setRetailerScreen("profile-detail")
                  }}
                />
              )}
              {retailerScreen === "profile-detail" && (
                <Screen2ProfileDetail
                  onBack={() => {
                    setRetailerScreen("attribute-profiles")
                    setActiveBrick(null)
                  }}
                  brickMapping={activeBrick ? { code: activeBrick.code, name: activeBrick.name } : null}
                  initialCategoryName={activeBrick?.categoryName}
                  profile={profiles[activeProfileKey] ?? buildProfileForBrick(activeBrick?.code)}
                  onProfileChange={(next) =>
                    setProfiles((prev) => ({ ...prev, [activeProfileKey]: next }))
                  }
                />
              )}
            </>
          )}

          {/* ── Supplier screens ── */}
          {perspective === "supplier" && (
            <>
              {/* L1 — Trading Partner List */}
              {supplierScreen === "trading-partners" && (
                <ScreenSupplierTradingPartners
                  onSelectPartner={handleSelectPartner}
                />
              )}

              {/* L2 — Selection Code List */}
              {supplierScreen === "selection-codes" && activePartner && (
                <ScreenSupplierSelectionCodes
                  partnerName={activePartner.name}
                  onBack={handleBackToPartnerList}
                  onSelectCode={handleSelectCode}
                />
              )}

              {/* L3 — Product List */}
              {supplierScreen === "supplier-products" && activePartner && activeCode && (
                <ScreenSupplierProducts
                  partnerName={activePartner.name}
                  selectionCode={activeCode.label}
                  onBack={handleBackToPartner}
                  onNavigateToGapDetail={handleNavigateToGapDetail}
                />
              )}

              {/* L4 — Gap Detail */}
              {supplierScreen === "supplier-gap-detail" &&
                gapProduct &&
                activePartner &&
                activeCode && (
                  <ScreenSupplierGapDetail
                    productName={gapProduct.productName}
                    retailer={gapProduct.retailer}
                    selectionCode={activeCode.label}
                    onBackToProducts={handleBackToProducts}
                    onBackToPartner={handleBackToPartner}
                    onBackToPartnerList={handleBackToPartnerList}
                  />
                )}

              {/* ── GS1 Standards flow ── */}
              {supplierScreen === "gs1-standards" && (
                <ScreenGs1Standards
                  mode="segments"
                  onSelectSegment={handleGs1SelectSegment}
                  onBack={handleGs1BackToSegments}
                />
              )}
              {supplierScreen === "gs1-selection-codes" && activeCode && (
                <ScreenGs1Standards
                  mode="bricks"
                  segment={activeCode.label}
                  onSelectBrick={handleGs1SelectBrick}
                  onBack={handleGs1BackToSegments}
                />
              )}
              {supplierScreen === "gs1-products" && activeCode && (
                <ScreenGs1Standards
                  mode="products"
                  brickCode={activeCode.id}
                  brickName={activeCode.label}
                  onViewGap={handleGs1NavigateToGap}
                  onBack={handleGs1BackToBricks}
                  onBackToSegments={handleGs1BackToSegments}
                />
              )}
              {supplierScreen === "gs1-gap-detail" && gapProduct && activeCode && (
                <ScreenGs1Standards
                  mode="gap"
                  brickCode={activeCode.id}
                  brickName={activeCode.label}
                  productName={gapProduct.productName}
                  onBack={handleGs1BackToProducts}
                  onBackToBricks={handleGs1BackToBricks}
                  onBackToSegments={handleGs1BackToSegments}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
