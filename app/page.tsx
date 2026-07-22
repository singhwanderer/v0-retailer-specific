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
import { ScreenSupplierAllSelectionCodes } from "@/components/portal/screen-supplier-all-selection-codes"
import { ScreenSupplierProducts } from "@/components/portal/screen-supplier-products"
import { ScreenSupplierGapDetail, type GapDetailCrumb } from "@/components/portal/screen-supplier-gap-detail"
import { ScreenSupplierImageUpload } from "@/components/portal/screen-supplier-image-upload"
import { ScreenComplianceReports } from "@/components/portal/screen-compliance-reports"
import { ComplianceAgentPanel } from "@/components/portal/compliance-agent-panel"
import type { ReportRequestPayload } from "@/components/portal/report-request-modal"
import {
  SUPPLIER_PRODUCTS_SEED,
  assignCategory,
  fillAttribute,
  type GapTarget,
  type MissingImage,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"
import {
  ATTRIBUTE_PROFILES,
  RETAILER_SUPPLIERS,
  getProfileBricks,
  type AttributeProfile,
  type ProfileBrick,
} from "@/lib/retailer-requirements"
import {
  buildReportFileName,
  runRetailerReport,
  runSupplierReport,
  type ReportRequest,
} from "@/lib/compliance-report"

type Perspective = "retailer" | "supplier"

type RetailerScreen =
  | "dashboard"
  | "attribute-profiles"
  | "vendor-exceptions"
  | "profile-detail"
  | "compliance-reports"

type SupplierScreen =
  | "compliance"
  | "gs1-products"
  | "catalogue"
  | "all-selection-codes"
  | "account-code-products"
  | "selection-codes"
  | "supplier-products"
  | "supplier-gap-detail"
  | "image-upload"
  | "compliance-reports"

// Which flow the gap detail was entered from — drives its breadcrumb trail and
// which sidebar section stays highlighted.
type GapOrigin = "partner-flow" | "gs1-view" | "code-list"

type GapContext = {
  productId: string
  target: GapTarget
  origin: GapOrigin
}

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
const AI_ENABLED_KEY = "tgc-proto-ai-enabled"

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

  // ── TGC Compliance Agent on/off ──────────────────────────────────────────────
  // Off by default; persisted so it doesn't reset on reload mid-demo. The
  // panel only mounts (not just visually hides) when this is true.
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    setAiEnabled(localStorage.getItem(AI_ENABLED_KEY) === "1")
  }, [])

  function handleAiToggleChange(enabled: boolean) {
    setAiEnabled(enabled)
    localStorage.setItem(AI_ENABLED_KEY, enabled ? "1" : "0")
  }

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

  // L4 context — product + target + origin flow, so gap detail works from the
  // partner drill-down, the GS1 view, and the account-wide code drill-down alike
  const [gapContext, setGapContext] = useState<GapContext | null>(null)

  // Image-upload WIP screen context (reached only from gap detail)
  const [uploadImage, setUploadImage] = useState<MissingImage | null>(null)

  // Account-wide Selection Code List drill-down context
  const [activeAccountCode, setActiveAccountCode] = useState<{ brickCode: string; label: string } | null>(null)

  // Manual categorisation — mutates the shared store so every screen reflects it
  function handleAssignCategory(ids: Set<string>, brickCode: string) {
    setSupplierProducts((prev) => assignCategory(prev, ids, brickCode))
  }

  // Open the Catalogue with the uncategorised products pre-selected. Reached
  // either from the GS1 row's banner (Compliance) or the "Uncategorised" row
  // zero on the account-wide Selection Code List — either way, Catalogue's own
  // back-breadcrumb always returns to the Selection Code List (it no longer
  // has its own nav entry).
  function goToCatalogueWithUncategorised() {
    setCataloguePreselect(
      supplierProducts.filter((p) => p.state === "uncategorised").map((p) => p.id)
    )
    setSupplierScreen("catalogue")
  }

  // ── Compliance Reports ──────────────────────────────────────────────────────
  // One queue per persona so the two sides' report histories stay independent.
  // Results are computed eagerly from the LIVE catalogue/profile state (so
  // categorising a product or creating a profile changes the next run), then
  // revealed when the simulated run flips to Complete. The setTimeout has no
  // cleanup on purpose: this component never unmounts, and the queues live
  // here so a perspective switch mid-run is harmless.
  const [supplierReports, setSupplierReports] = useState<ReportRequest[]>([])
  const [retailerReports, setRetailerReports] = useState<ReportRequest[]>([])

  function handleRunReport(side: "supplier" | "retailer", payload: ReportRequestPayload): string {
    const setReports = side === "supplier" ? setSupplierReports : setRetailerReports
    const queue = side === "supplier" ? supplierReports : retailerReports
    const requestedBy = side === "supplier" ? "J.Renée" : "Dillard's"
    const id = `RPT-${String(queue.length + 1).padStart(3, "0")}`

    const result =
      side === "supplier"
        ? runSupplierReport(supplierProducts, payload.filter, payload.options)
        : runRetailerReport(
            RETAILER_SUPPLIERS,
            profiles,
            payload.filter,
            payload.profileName ?? "all-active",
            payload.vendorScope ?? "all",
            payload.options
          )

    const report: ReportRequest = {
      id,
      side,
      filter: payload.filter,
      filterLabel: payload.filterLabel,
      profileName: payload.profileName,
      vendorScope: payload.vendorScope,
      options: payload.options,
      requestedBy,
      requestedAt: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Running",
      fileName: buildReportFileName(requestedBy, payload.filterLabel),
      result,
    }
    setReports((prev) => [report, ...prev])

    // Brief simulated run — deterministic per id, ~1.4–2.2s for demo feel.
    const delay = 1400 + (id.charCodeAt(id.length - 1) % 3) * 400
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "Complete" as const, durationMs: delay } : r))
      )
    }, delay)

    return id
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
      id === "vendor-exceptions" ||
      id === "compliance-reports"
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
      setGapContext(null)
    }
    if (id === "selection-code-list") {
      handleSelectSelectionCodeList()
    }
    if (id === "compliance-reports") {
      setSupplierScreen("compliance-reports")
      setActivePartner(null)
      setActiveCode(null)
      setGapContext(null)
    }
  }

  // ── Compliance list → GS1 row zero ──────────────────────────────────────────
  function handleSelectGs1() {
    setSupplierScreen("gs1-products")
  }

  // ── Sidebar "Selection Code List" → the account-wide L1 nav root ───────────
  function handleSelectSelectionCodeList() {
    setSupplierScreen("all-selection-codes")
    setActivePartner(null)
    setActiveCode(null)
    setGapContext(null)
    setActiveAccountCode(null)
  }

  // ── Account-wide Selection Code List → its Product List drill-down ─────────
  function handleSelectAccountCode(brickCode: string, label: string) {
    setActiveAccountCode({ brickCode, label })
    setSupplierScreen("account-code-products")
  }

  // ── Back to the account-wide Selection Code List ────────────────────────────
  function handleBackToSelectionCodeList() {
    setSupplierScreen("all-selection-codes")
    setActiveAccountCode(null)
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
    setGapContext(null)
  }

  // ── Any product leaf → L4 gap detail ───────────────────────────────────────
  // The origin is whichever leaf the click came from; it decides the breadcrumb
  // trail and where "back" leads.
  function handleNavigateToGapDetail(productId: string, target: GapTarget) {
    const origin: GapOrigin =
      supplierScreen === "gs1-products"
        ? "gs1-view"
        : supplierScreen === "account-code-products"
          ? "code-list"
          : "partner-flow"
    setGapContext({ productId, target, origin })
    setSupplierScreen("supplier-gap-detail")
  }

  // ── L4 back to the leaf it came from ───────────────────────────────────────
  function handleBackToProducts() {
    const origin = gapContext?.origin ?? "partner-flow"
    setSupplierScreen(
      origin === "gs1-view"
        ? "gs1-products"
        : origin === "code-list"
          ? "account-code-products"
          : "supplier-products"
    )
    setGapContext(null)
  }

  // ── L4 back to L2 (or L3 breadcrumb "partner" click) ───────────────────────
  function handleBackToPartner() {
    setSupplierScreen("selection-codes")
    setGapContext(null)
    setActiveCode(null)
  }

  // ── L4 back to L1 (merged Compliance list) ─────────────────────────────────
  function handleBackToPartnerList() {
    setSupplierScreen("compliance")
    setActivePartner(null)
    setActiveCode(null)
    setGapContext(null)
  }

  // ── Gap detail breadcrumb trail, by origin ─────────────────────────────────
  function buildGapBreadcrumbs(): GapDetailCrumb[] {
    switch (gapContext?.origin) {
      case "gs1-view":
        return [
          { label: "Compliance", onClick: handleBackToPartnerList },
          { label: "GS1 Standard", onClick: handleBackToProducts },
        ]
      case "code-list":
        return [
          { label: "Selection Code List", onClick: handleSelectSelectionCodeList },
          {
            label: activeAccountCode?.label ?? "Selection Code",
            onClick: handleBackToProducts,
          },
        ]
      default:
        return [
          { label: "Compliance", onClick: handleBackToPartnerList },
          { label: activePartner?.name ?? "Retailer", onClick: handleBackToPartner },
          { label: `Code ${activeCode?.label ?? ""}`, onClick: handleBackToProducts },
        ]
    }
  }

  // ── Gap detail → image-upload WIP screen, and back ─────────────────────────
  function handleOpenImageUpload(image: MissingImage) {
    setUploadImage(image)
    setSupplierScreen("image-upload")
  }

  function handleBackFromImageUpload() {
    setUploadImage(null)
    setSupplierScreen("supplier-gap-detail")
  }

  // ── Fill a missing attribute from the gap detail ───────────────────────────
  // Persists the supplier-supplied value into the shared catalogue. Because a
  // filled attribute is a product-level fact, gap counts drop for every target
  // at once — the gap detail, the compliance list, and the requirements drawer
  // all reflect it live.
  function handleFillAttribute(productId: string, attributeCode: string, value: string) {
    setSupplierProducts((prev) => fillAttribute(prev, productId, attributeCode, value))
  }

  // The GTIN list is an existing, out-of-scope screen. Route to the catalogue
  // view as the nearest in-app destination (it always renders on its own).
  function handleViewGtins(_productId: string) {
    setSupplierScreen("catalogue")
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

  // Map supplier screens to their sidebar item for the highlight. Catalogue has
  // no nav entry of its own — it now always presents as reached via Selection
  // Code List (its breadcrumb says so too), regardless of which banner sent it
  // there, so it highlights the same section as the account-wide screens. Gap
  // detail (and the image-upload screen behind it) highlights whichever flow
  // it was entered from.
  const gapFlowIsCodeList =
    (supplierScreen === "supplier-gap-detail" || supplierScreen === "image-upload") &&
    gapContext?.origin === "code-list"
  const supplierActiveScreen =
    supplierScreen === "compliance-reports"
      ? "compliance-reports"
      : supplierScreen === "catalogue" ||
          supplierScreen === "all-selection-codes" ||
          supplierScreen === "account-code-products" ||
          gapFlowIsCodeList
        ? "selection-code-list"
        : "supplier-compliance"

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
        aiEnabled={aiEnabled}
        onAiToggleChange={handleAiToggleChange}
      />

      {perspective === "retailer" && aiEnabled && (
        <ComplianceAgentPanel profiles={profiles} onCreateProfile={handleCreateProfile} />
      )}

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

              {/* Defensive compliance scanning — the retailer's own filters
                  (or a System filter) across its vendor base */}
              {retailerScreen === "compliance-reports" && (
                <ScreenComplianceReports
                  side="retailer"
                  accent="#0168B3"
                  requestedBy="Dillard's"
                  reports={retailerReports}
                  profiles={profiles}
                  onRequestReport={(p) => handleRunReport("retailer", p)}
                />
              )}
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
                  onBack={handleBackToSelectionCodeList}
                />
              )}

              {/* Account-wide Selection Code List — the real nav entry point */}
              {supplierScreen === "all-selection-codes" && (
                <ScreenSupplierAllSelectionCodes
                  products={supplierProducts}
                  onSelectUncategorised={goToCatalogueWithUncategorised}
                  onSelectCode={handleSelectAccountCode}
                />
              )}

              {/* Account-wide code drill-down (shared product leaf, kind:"code") */}
              {supplierScreen === "account-code-products" && activeAccountCode && (
                <ScreenSupplierProducts
                  target={{
                    kind: "code",
                    brickCode: activeAccountCode.brickCode,
                    label: activeAccountCode.label,
                  }}
                  products={supplierProducts}
                  onBack={handleBackToSelectionCodeList}
                  onNavigateToGapDetail={handleNavigateToGapDetail}
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

              {/* Proactive compliance scanning — any retailer's account filter
                  (or a System filter) against the supplier's own catalogue */}
              {supplierScreen === "compliance-reports" && (
                <ScreenComplianceReports
                  side="supplier"
                  accent="#15803D"
                  requestedBy="J.Renée"
                  reports={supplierReports}
                  onRequestReport={(p) => handleRunReport("supplier", p)}
                />
              )}

              {/* L4 — Gap Detail (reached from the partner flow, the GS1 view,
                  or the account-wide code drill-down) */}
              {supplierScreen === "supplier-gap-detail" && gapContext && (
                <ScreenSupplierGapDetail
                  productId={gapContext.productId}
                  target={gapContext.target}
                  products={supplierProducts}
                  breadcrumbs={buildGapBreadcrumbs()}
                  onUploadImage={handleOpenImageUpload}
                  onFillAttribute={handleFillAttribute}
                  onViewGtins={handleViewGtins}
                />
              )}

              {/* Image upload — WIP signpost reached from a missing image
                  requirement on the gap detail */}
              {supplierScreen === "image-upload" && gapContext && uploadImage && (
                <ScreenSupplierImageUpload
                  productId={gapContext.productId}
                  products={supplierProducts}
                  targetLabel={
                    gapContext.target.kind === "gs1" ? "GS1 Standard" : gapContext.target.name
                  }
                  image={uploadImage}
                  onBack={handleBackFromImageUpload}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
