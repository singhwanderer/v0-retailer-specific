"use client"

import { useEffect, useState } from "react"
import { TopNav } from "@/components/portal/top-nav"
import { WelcomeOverlay } from "@/components/portal/welcome-overlay"
import { Sidebar } from "@/components/portal/sidebar"
import { Screen1AttributeProfiles } from "@/components/portal/screen1-attribute-profiles"
import { Screen2ProfileDetail } from "@/components/portal/screen2-profile-detail"
import { Screen3VendorExceptions } from "@/components/portal/screen3-vendor-exceptions"
import { ScreenSupplierCompliance } from "@/components/portal/screen-supplier-compliance"
import { ScreenSupplierCatalogue } from "@/components/portal/screen-supplier-catalogue"
import { ScreenSupplierSelectionCodes } from "@/components/portal/screen-supplier-selection-codes"
import { ScreenSupplierProducts } from "@/components/portal/screen-supplier-products"
import { ScreenSupplierGapDetail } from "@/components/portal/screen-supplier-gap-detail"
import {
  SUPPLIER_PRODUCTS_SEED,
  assignCategory,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"
import {
  ATTRIBUTE_PROFILES,
  getProfileBricks,
  type AttributeProfile,
  type ProfileBrick,
} from "@/lib/retailer-requirements"

type Perspective = "retailer" | "supplier"

type RetailerScreen =
  | "dashboard"
  | "attribute-profiles"
  | "vendor-exceptions"
  | "profile-detail"

type SupplierScreen =
  | "compliance"
  | "gs1-products"
  | "catalogue"
  | "selection-codes"
  | "supplier-products"
  | "supplier-gap-detail"

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

const WELCOME_DISMISSED_KEY = "tgc-proto-welcome-dismissed"
const TOGGLE_HINT_DISMISSED_KEY = "tgc-proto-toggle-hint-dismissed"

export default function RetailerPortal() {
  const [perspective, setPerspective] = useState<Perspective>("retailer")

  // ── Orientation: welcome overlay + one-time persona-toggle hint ─────────────
  // Both persist their dismissal in localStorage so the prototype orients a
  // cold viewer once, then gets out of the way on return visits.
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [showToggleHint, setShowToggleHint] = useState(false)

  useEffect(() => {
    const welcomeDismissed = localStorage.getItem(WELCOME_DISMISSED_KEY) === "1"
    const hintDismissed = localStorage.getItem(TOGGLE_HINT_DISMISSED_KEY) === "1"
    if (!welcomeDismissed) setWelcomeOpen(true)
    else if (!hintDismissed) setShowToggleHint(true)
  }, [])

  function dismissWelcome() {
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1")
    setWelcomeOpen(false)
    // Surface the toggle hint next, unless it's already been dismissed.
    if (localStorage.getItem(TOGGLE_HINT_DISMISSED_KEY) !== "1") setShowToggleHint(true)
  }

  function dismissToggleHint() {
    localStorage.setItem(TOGGLE_HINT_DISMISSED_KEY, "1")
    setShowToggleHint(false)
  }

  // ── Retailer state ──────────────────────────────────────────────────────────
  const [retailerScreen, setRetailerScreen] = useState<RetailerScreen>("attribute-profiles")

  // Shared attribute-profile list — one source of truth for both Screen 1 (the
  // list) and Screen 2 (the detail view), so create/activate/deactivate/rename
  // from either screen show up everywhere.
  const [profiles, setProfiles] = useState<AttributeProfile[]>(ATTRIBUTE_PROFILES)

  function handleCreateProfile(profile: AttributeProfile) {
    setProfiles((prev) => [...prev, profile])
  }

  function handleUpdateProfile(name: string, updates: Partial<AttributeProfile>) {
    setProfiles((prev) => prev.map((p) => (p.name === name ? { ...p, ...updates } : p)))
  }

  // Context passed from Screen 1 into Screen 2
  const [activeBrick, setActiveBrick] = useState<{ code: string; name: string } | null>(null)
  const [activeCategoryName, setActiveCategoryName] = useState<string | undefined>(undefined)
  const [activeStatus, setActiveStatus] = useState<"Active" | "Draft" | undefined>(undefined)

  // ── Supplier state ──────────────────────────────────────────────────────────
  const [supplierScreen, setSupplierScreen] = useState<SupplierScreen>("compliance")

  // Shared supplier catalogue — one source of truth across every supplier screen
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>(SUPPLIER_PRODUCTS_SEED)

  // Products to pre-select when the Catalogue is opened from a "assign categories" CTA
  const [cataloguePreselect, setCataloguePreselect] = useState<string[]>([])

  // L2 context
  const [activePartner, setActivePartner] = useState<{ id: string; name: string } | null>(null)

  // L3 context
  const [activeCode, setActiveCode] = useState<{ id: string; label: string; brickCode: string } | null>(null)

  // L4 context
  const [gapProduct, setGapProduct] = useState<{ productName: string; retailer: string } | null>(null)

  // Manual categorisation — mutates the shared store so every screen reflects it
  function handleAssignCategory(ids: Set<string>, brickCode: string) {
    setSupplierProducts((prev) => assignCategory(prev, ids, brickCode))
  }

  // Open the Catalogue with the uncategorised products pre-selected
  function goToCatalogueWithUncategorised() {
    setCataloguePreselect(
      supplierProducts.filter((p) => p.state === "uncategorised").map((p) => p.id)
    )
    setSupplierScreen("catalogue")
  }

  // ── Perspective switch ──────────────────────────────────────────────────────
  function handlePerspectiveChange(p: Perspective) {
    setPerspective(p)
    if (showToggleHint) dismissToggleHint()
  }

  // ── Retailer navigation ─────────────────────────────────────────────────────
  function handleRetailerNavigate(id: string) {
    if (
      id === "dashboard" ||
      id === "attribute-profiles" ||
      id === "vendor-exceptions"
    ) {
      setRetailerScreen(id as RetailerScreen)
    }
  }

  // ── Supplier navigation (sidebar clicks) ────────────────────────────────────
  function handleSupplierNavigate(id: string) {
    if (id === "supplier-compliance") {
      setSupplierScreen("compliance")
      setActivePartner(null)
      setActiveCode(null)
      setGapProduct(null)
    }
    if (id === "supplier-catalogue") {
      setSupplierScreen("catalogue")
      setCataloguePreselect([]) // direct nav — no pre-selection
      setActivePartner(null)
      setActiveCode(null)
      setGapProduct(null)
    }
  }

  // ── Compliance list → GS1 row zero ──────────────────────────────────────────
  function handleSelectGs1() {
    setSupplierScreen("gs1-products")
  }

  // ── L1 → L2 ────────────────────────────────────────────────────────────────
  function handleSelectPartner(partnerId: string, partnerName: string) {
    setActivePartner({ id: partnerId, name: partnerName })
    setSupplierScreen("selection-codes")
  }

  // ── L2 → L3 ────────────────────────────────────────────────────────────────
  function handleSelectCode(codeId: string, codeLabel: string, brickCode: string) {
    setActiveCode({ id: codeId, label: codeLabel, brickCode })
    setSupplierScreen("supplier-products")
  }

  // ── Product leaf / gap detail → back to Compliance list ────────────────────
  function handleBackToCompliance() {
    setSupplierScreen("compliance")
    setActivePartner(null)
    setActiveCode(null)
    setGapProduct(null)
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

  // ── L4 back to L1 (merged Compliance list) ─────────────────────────────────
  function handleBackToPartnerList() {
    setSupplierScreen("compliance")
    setActivePartner(null)
    setActiveCode(null)
    setGapProduct(null)
  }

  // The active profile's full brick set — from the shared list when we can match
  // it by name, otherwise the single brick we navigated in with. Screen 2 reads
  // each brick's attributes itself (they're brick-scoped, not merged here).
  const activeProfile = profiles.find((p) => p.name === activeCategoryName)
  const activeBricks: ProfileBrick[] = activeProfile
    ? getProfileBricks(activeProfile)
    : activeBrick
    ? [{ code: activeBrick.code, name: activeBrick.name }]
    : []

  // ── Active sidebar item ─────────────────────────────────────────────────────
  const retailerActiveScreen =
    retailerScreen === "profile-detail" ? "attribute-profiles" : retailerScreen

  // Map supplier screens to their sidebar item for the highlight
  const supplierActiveScreen =
    supplierScreen === "catalogue" ? "supplier-catalogue" : "supplier-compliance"

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

      {/* Welcome / orientation overlay */}
      <WelcomeOverlay open={welcomeOpen} onClose={dismissWelcome} />

      {/* Top nav */}
      <TopNav
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        perspective={perspective}
        onPerspectiveChange={handlePerspectiveChange}
        showToggleHint={showToggleHint}
        onShowAbout={() => setWelcomeOpen(true)}
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
                  profiles={profiles}
                  onCreateProfile={handleCreateProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onNavigateToProfile={(brickCode, brickName, categoryName, status) => {
                    setActiveBrick(brickCode && brickName ? { code: brickCode, name: brickName } : null)
                    setActiveCategoryName(categoryName)
                    setActiveStatus(status)
                    setRetailerScreen("profile-detail")
                  }}
                />
              )}
              {retailerScreen === "profile-detail" && (
                <Screen2ProfileDetail
                  onBack={() => {
                    setRetailerScreen("attribute-profiles")
                    setActiveBrick(null)
                    setActiveCategoryName(undefined)
                    setActiveStatus(undefined)
                  }}
                  brickMapping={activeBrick ? { code: activeBrick.code, name: activeBrick.name } : null}
                  initialBricks={activeBricks}
                  initialCategoryName={activeCategoryName}
                  initialStatus={activeStatus}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}
              
              {retailerScreen === "vendor-exceptions" && <Screen3VendorExceptions />}
            </>
          )}

          {/* ── Supplier screens ── */}
          {perspective === "supplier" && (
            <>
              {/* L1 — Merged Compliance list (GS1 row zero + retailers) */}
              {supplierScreen === "compliance" && (
                <ScreenSupplierCompliance
                  products={supplierProducts}
                  onSelectGs1={handleSelectGs1}
                  onSelectPartner={handleSelectPartner}
                />
              )}

              {/* GS1 row-zero drill-down — the shared product leaf in GS1 mode */}
              {supplierScreen === "gs1-products" && (
                <ScreenSupplierProducts
                  target={{ kind: "gs1" }}
                  products={supplierProducts}
                  onBack={handleBackToPartnerList}
                  onNavigateToGapDetail={handleNavigateToGapDetail}
                  onGoToCatalogue={goToCatalogueWithUncategorised}
                />
              )}

              {/* Catalogue — categorisation home + enrichment hand-off */}
              {supplierScreen === "catalogue" && (
                <ScreenSupplierCatalogue
                  products={supplierProducts}
                  initialSelectedIds={cataloguePreselect}
                  onAssignCategory={handleAssignCategory}
                />
              )}

              {/* L2 — Selection Code List */}
              {supplierScreen === "selection-codes" && activePartner && (
                <ScreenSupplierSelectionCodes
                  partnerName={activePartner.name}
                  products={supplierProducts}
                  onBack={handleBackToPartnerList}
                  onSelectCode={handleSelectCode}
                />
              )}

              {/* L3 — Product List (shared leaf in retailer mode) */}
              {supplierScreen === "supplier-products" && activePartner && activeCode && (
                <ScreenSupplierProducts
                  target={{
                    kind: "retailer",
                    partnerName: activePartner.name,
                    selectionCode: activeCode.label,
                    brickCode: activeCode.brickCode,
                  }}
                  products={supplierProducts}
                  onBack={handleBackToCompliance}
                  onBackToPartner={handleBackToPartner}
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
                    products={supplierProducts}
                    onBackToProducts={handleBackToProducts}
                    onBackToPartner={handleBackToPartner}
                    onBackToPartnerList={handleBackToPartnerList}
                  />
                )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
