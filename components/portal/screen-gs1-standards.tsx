"use client"

// ── GS1 Standards screen ──────────────────────────────────────────────────────
// This screen surfaces the GS1 industry standard as a read-only "trading
// partner" so suppliers can see exactly which attributes GS1 requires for
// every brick (product category) they sell. The structure mirrors the Trading
// Partners → Selection Codes → Products → Gap Detail hierarchy but:
//   • No retailer owns or edits these requirements — they are system-owned.
//   • Gap is measured purely against GS1 standard extended attributes.
//   • There is no CSV download here; this is a reference view only.
//   • Suppliers reach this via the "GS1 Standards" sidebar item.

import { useState } from "react"
import { Award, Lock } from "lucide-react"
import { GS1_BRICKS, getSegments, getBrickByCode } from "@/lib/gs1-standard-library"

// ── Types ─────────────────────────────────────────────────────────────────────

type ScreenGs1Mode = "segments" | "bricks" | "products" | "gap"

interface ScreenGs1StandardsProps {
  mode: ScreenGs1Mode
  // segments mode
  onSelectSegment?: (segmentId: string, segmentName: string) => void
  // bricks mode
  segment?: string
  onSelectBrick?: (brickCode: string, brickName: string) => void
  // products mode
  brickCode?: string
  brickName?: string
  onViewGap?: (productName: string) => void
  // gap mode
  productName?: string
  // navigation
  onBack: () => void
  onBackToBricks?: () => void
  onBackToSegments?: () => void
}

// ── Shared header badge ───────────────────────────────────────────────────────
function Gs1Badge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
    >
      <Award className="w-3 h-3 shrink-0" />
      GS1 Industry Standard · Read-only
    </span>
  )
}

// ── Lock chip shown on every attribute row ────────────────────────────────────
function ReadOnlyChip() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
    >
      <Lock className="w-2.5 h-2.5 shrink-0" />
      Standard
    </span>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({
  parts,
}: {
  parts: { label: string; onClick?: () => void }[]
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span style={{ color: "#9CA3AF" }}>›</span>}
          {p.onClick ? (
            <button
              onClick={p.onClick}
              className="font-light hover:underline"
              style={{ color: "#0168B3" }}
            >
              {p.label}
            </button>
          ) : (
            <span className="font-light text-[#6B7280]">{p.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

// ── Mock products for GS1 gap view ────────────────────────────────────────────
// A small set of representative products the supplier "owns" in this brick.
const GS1_MOCK_PRODUCTS: Record<string, { id: string; description: string; missingCount: number }[]> = {
  default: [
    { id: "B11442", description: "Linen Shift Dress", missingCount: 3 },
    { id: "B11444", description: "Velvet Evening Dress", missingCount: 1 },
    { id: "B11445", description: "Jersey Wrap Dress", missingCount: 0 },
    { id: "B11450", description: "Tiered Maxi Dress", missingCount: 2 },
    { id: "B11452", description: "Crepe Sheath Dress", missingCount: 0 },
  ],
}

function getProductsForBrick(brickCode: string) {
  return GS1_MOCK_PRODUCTS[brickCode] ?? GS1_MOCK_PRODUCTS.default
}

// ── Mode: Segments (L1) ───────────────────────────────────────────────────────
function SegmentsView({
  onSelectSegment,
}: {
  onSelectSegment: (id: string, name: string) => void
}) {
  const segments = getSegments()

  // Count bricks per segment
  const countsBySegment = Object.fromEntries(
    segments.map((s) => [s, GS1_BRICKS.filter((b) => b.segment === s).length]),
  )

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[#111827]">GS1 Standards</h1>
          <Gs1Badge />
        </div>
        <p className="text-sm font-light text-[#6B7280] max-w-xl leading-relaxed">
          Industry-standard attribute requirements defined by GS1 for each product
          category. These apply to all products regardless of which retailers you
          supply. Satisfying GS1 standards provides a compliance baseline across all
          trading partners.
        </p>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["Segment", "Bricks (Categories)", "Standard", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, idx) => (
              <tr
                key={seg}
                style={{ borderBottom: idx < segments.length - 1 ? "1px solid #F3F4F6" : undefined }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-[#111827] align-middle">{seg}</td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {countsBySegment[seg]}
                </td>
                <td className="px-4 py-3 align-middle">
                  <ReadOnlyChip />
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <button
                    onClick={() => onSelectSegment(seg, seg)}
                    className="text-xs font-medium hover:underline"
                    style={{ color: "#0168B3" }}
                  >
                    View categories
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          className="px-4 py-2.5 text-[11px] font-light leading-relaxed"
          style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}
        >
          Source: GS1 Global Product Classification (GPC) standard. These requirements cannot
          be modified — they are maintained by GS1 and apply universally.
        </p>
      </div>
    </div>
  )
}

// ── Mode: Bricks in segment (L2) ─────────────────────────────────────────────
function BricksView({
  segment,
  onSelectBrick,
  onBack,
}: {
  segment: string
  onSelectBrick: (code: string, name: string) => void
  onBack: () => void
}) {
  const bricks = GS1_BRICKS.filter((b) => b.segment === segment)

  return (
    <div className="p-8 flex flex-col gap-6">
      <Breadcrumb
        parts={[
          { label: "GS1 Standards", onClick: onBack },
          { label: segment },
        ]}
      />

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-[#111827]">{segment}</h1>
        <Gs1Badge />
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["GS1 Category (Brick)", "Brick Code", "Standard Attributes", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bricks.map((b, idx) => (
              <tr
                key={b.brickCode}
                style={{ borderBottom: idx < bricks.length - 1 ? "1px solid #F3F4F6" : undefined }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-[#111827] align-middle">{b.brickName}</td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle font-mono text-xs">
                  {b.brickCode}
                </td>
                <td className="px-4 py-3 font-light text-[#6B7280] align-middle tabular-nums">
                  {b.extendedAttributes.length} attributes
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <button
                    onClick={() => onSelectBrick(b.brickCode, b.brickName)}
                    className="text-xs font-medium hover:underline"
                    style={{ color: "#0168B3" }}
                  >
                    View products
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Mode: Products for a brick (L3) ──────────────────────────────────────────
function ProductsView({
  brickCode,
  brickName,
  onViewGap,
  onBack,
  onBackToSegments,
}: {
  brickCode: string
  brickName: string
  onViewGap: (productName: string) => void
  onBack: () => void
  onBackToSegments: () => void
}) {
  const brick = getBrickByCode(brickCode)
  const products = getProductsForBrick(brickCode)
  const totalAttrs = brick?.extendedAttributes.length ?? 0

  return (
    <div className="p-8 flex flex-col gap-6">
      <Breadcrumb
        parts={[
          { label: "GS1 Standards", onClick: onBackToSegments },
          { label: brick?.segment ?? "Segment", onClick: onBack },
          { label: brickName },
        ]}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#111827]">{brickName}</h1>
        <Gs1Badge />
        <span className="text-sm font-light text-[#6B7280]">
          {totalAttrs} standard attributes required
        </span>
      </div>

      {/* Attribute summary card */}
      {brick && (
        <div
          className="rounded-lg p-4 flex flex-col gap-2"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
            GS1 Standard Attributes for this category
          </p>
          <div className="flex flex-wrap gap-1.5">
            {brick.extendedAttributes.map((a) => (
              <span
                key={a.code}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
              >
                {a.name}
                <span className="font-mono text-[10px] opacity-60">{a.code}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
              {["Product ID", "Description", "GS1 Compliance"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const isComplete = p.missingCount === 0
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: idx < products.length - 1 ? "1px solid #F3F4F6" : undefined }}
                  className="hover:bg-[#F4F6F8]/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[#111827] align-middle tabular-nums">{p.id}</td>
                  <td className="px-4 py-3 font-light text-[#6B7280] align-middle">{p.description}</td>
                  <td className="px-4 py-3 align-middle">
                    {isComplete ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#16A34A" }} />
                        GS1 complete
                      </span>
                    ) : (
                      <button
                        onClick={() => onViewGap(p.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#6366F1" }} />
                        {p.missingCount} GS1 gap{p.missingCount !== 1 ? "s" : ""}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Mode: GS1 Gap Detail (L4) ─────────────────────────────────────────────────
function GapView({
  brickCode,
  brickName,
  productName,
  onBack,
  onBackToBricks,
  onBackToSegments,
}: {
  brickCode: string
  brickName: string
  productName: string
  onBack: () => void
  onBackToBricks: () => void
  onBackToSegments: () => void
}) {
  const brick = getBrickByCode(brickCode)
  // For the prototype, show the first N attrs as "missing" for non-complete products
  const allAttrs = brick?.extendedAttributes ?? []
  // Simulate 2 provided, rest missing
  const providedAttrs = allAttrs.slice(0, 2)
  const missingAttrs = allAttrs.slice(2)

  return (
    <div className="p-8 flex flex-col gap-6">
      <Breadcrumb
        parts={[
          { label: "GS1 Standards", onClick: onBackToSegments },
          { label: brick?.segment ?? "Segment", onClick: onBackToBricks },
          { label: brickName, onClick: onBack },
          { label: productName },
        ]}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#111827]">{productName}</h1>
        <Gs1Badge />
      </div>

      {/* Missing attributes */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <p className="text-sm font-semibold text-[#111827]">Missing GS1 Standard Attributes</p>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
          >
            {missingAttrs.length} missing
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: "#FAFAFA" }}>
              {["", "Attribute", "GS1 Code", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#6B7280]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {missingAttrs.map((a) => (
              <tr key={a.code} style={{ borderBottom: "1px solid #F9FAFB" }}>
                <td className="px-4 py-3 w-6 align-top pt-3.5">
                  <span className="w-2 h-2 rounded-full inline-block mt-0.5" style={{ backgroundColor: "#6366F1" }} />
                </td>
                <td className="px-4 py-3 font-medium text-[#111827] align-top">{a.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#9CA3AF] align-top">{a.code}</td>
                <td className="px-4 py-3 align-top">
                  <span
                    className="text-xs font-light"
                    style={{ color: "#4338CA" }}
                  >
                    Not provided
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provided attributes */}
      {providedAttrs.length > 0 && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p className="text-sm font-semibold text-[#111827]">Provided Attributes</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {providedAttrs.map((a) => (
                <tr key={a.code} style={{ borderBottom: "1px solid #F9FAFB" }}>
                  <td className="px-4 py-3 w-6 align-top pt-3.5">
                    <span className="w-2 h-2 rounded-full inline-block mt-0.5" style={{ backgroundColor: "#16A34A" }} />
                  </td>
                  <td className="px-4 py-3 font-medium text-[#111827]">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#9CA3AF]">{a.code}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-light" style={{ color: "#15803D" }}>Provided</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p
        className="text-xs font-light leading-relaxed"
        style={{ color: "#9CA3AF" }}
      >
        GS1 standard gaps are the same regardless of retailer. Filling these once satisfies all
        trading partners who require them.
      </p>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export function ScreenGs1Standards(props: ScreenGs1StandardsProps) {
  const [internalSegment, setInternalSegment] = useState("")
  const [internalBrickCode, setInternalBrickCode] = useState("")
  const [internalBrickName, setInternalBrickName] = useState("")
  const [internalProductName, setInternalProductName] = useState("")

  if (props.mode === "segments") {
    return (
      <SegmentsView
        onSelectSegment={(id, name) => {
          setInternalSegment(name)
          props.onSelectSegment?.(id, name)
        }}
      />
    )
  }

  if (props.mode === "bricks") {
    return (
      <BricksView
        segment={props.segment ?? internalSegment}
        onSelectBrick={(code, name) => {
          setInternalBrickCode(code)
          setInternalBrickName(name)
          props.onSelectBrick?.(code, name)
        }}
        onBack={props.onBack}
      />
    )
  }

  if (props.mode === "products") {
    return (
      <ProductsView
        brickCode={props.brickCode ?? internalBrickCode}
        brickName={props.brickName ?? internalBrickName}
        onViewGap={(productName) => {
          setInternalProductName(productName)
          props.onViewGap?.(productName)
        }}
        onBack={props.onBack}
        onBackToSegments={props.onBackToSegments ?? props.onBack}
      />
    )
  }

  if (props.mode === "gap") {
    return (
      <GapView
        brickCode={props.brickCode ?? internalBrickCode}
        brickName={props.brickName ?? internalBrickName}
        productName={props.productName ?? internalProductName}
        onBack={props.onBack}
        onBackToBricks={props.onBackToBricks ?? props.onBack}
        onBackToSegments={props.onBackToSegments ?? props.onBack}
      />
    )
  }

  return null
}
