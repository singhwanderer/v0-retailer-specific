"use client"

import { useState } from "react"
import { TopNav } from "@/components/portal/top-nav"
import { Sidebar } from "@/components/portal/sidebar"
import { Screen1AttributeProfiles } from "@/components/portal/screen1-attribute-profiles"
import { Screen2ProfileDetail } from "@/components/portal/screen2-profile-detail"
import { getBrickByCode } from "@/lib/gs1-standard-library"
import { Screen3VendorExceptions } from "@/components/portal/screen3-vendor-exceptions"
import { ScreenSupplierCompliance } from "@/components/portal/screen-supplier-compliance"
import { ScreenSupplierGs1Products } from "@/components/portal/screen-supplier-gs1-products"
import { ScreenSupplierCatalogue } from "@/components/portal/screen-supplier-catalogue"
import { ScreenSupplierSelectionCodes } from "@/components/portal/screen-supplier-selection-codes"
import { ScreenSupplierProducts } from "@/components/portal/screen-supplier-products"
import { ScreenSupplierGapDetail } from "@/components/portal/screen-supplier-gap-detail"

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

  // ── Supplier state ──────────────────────────────────────────────────────────
  const [supplierScreen, setSupplierScreen] = useState<SupplierScreen>("compliance")

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

  // ── L4 back to L1 (merged Compliance list) ─────────────────────────────────
  function handleBackToPartnerList() {
    setSupplierScreen("compliance")
    setActivePartner(null)
    setActiveCode(null)
    setGapProduct(null)
  }

  // Pre-compute extended rows for Screen 2 from the selected brick's standard attributes
  const activeBrickExtendedRows = activeBrick
    ? getBrickByCode(activeBrick.code)?.extendedAttributes.map((attr) => ({
        retailerName: attr.name,
        tgcGs1Name: `${attr.name} (${attr.code})`,
        guidance: "",
        source: "standard" as const,
      }))
    : undefined

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
                  onNavigateToProfile={(brickCode, brickName, categoryName) => {
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
                  initialBrickExtendedRows={activeBrickExtendedRows}
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
                  onSelectGs1={handleSelectGs1}
                  onSelectPartner={handleSelectPartner}
                />
              )}

              {/* GS1 row-zero drill-down — products vs baseline, by category */}
              {supplierScreen === "gs1-products" && (
                <ScreenSupplierGs1Products
                  onBack={handleBackToPartnerList}
                  onGoToCatalogue={() => setSupplierScreen("catalogue")}
                />
              )}

              {/* Catalogue — categorisation home + AI enrichment hand-off */}
              {supplierScreen === "catalogue" && <ScreenSupplierCatalogue />}

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
            </>
          )}
        </main>
      </div>
    </div>
  )
}
