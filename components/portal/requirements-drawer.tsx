"use client"

import { useMemo, useState } from "react"
import { BadgeCheck, ChevronDown, ChevronRight, Download, Info } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  getRequirementMatrix,
  buildCategoryTemplateCsv,
  buildTargetTemplateCsv,
  type RequirementTarget,
  type CategoryRequirement,
  type CsvTemplate,
} from "@/lib/compliance-requirements"
import type { SupplierProduct } from "@/lib/supplier-catalogue"

interface RequirementsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The compliance target whose requirements to show; null when closed */
  target: RequirementTarget | null
  products: SupplierProduct[]
}

// Trigger a client-side CSV download from generated template content.
function downloadCsv(template: CsvTemplate) {
  const blob = new Blob([template.content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = template.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function Dot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
}

// A readiness chip for a category row: % ready, or "not supplied yet".
function ReadinessChip({ category }: { category: CategoryRequirement }) {
  if (category.readiness === null) {
    return (
      <span className="text-[11px] font-light whitespace-nowrap" style={{ color: "#9CA3AF" }}>
        Not supplied yet
      </span>
    )
  }
  const tone =
    category.readiness === 100 ? "#16A34A" : category.readiness >= 50 ? "#0168B3" : "#F59E0B"
  return (
    <div className="flex items-center gap-2 min-w-[7rem]">
      <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
        <div className="h-full rounded-full" style={{ width: `${category.readiness}%`, backgroundColor: tone }} />
      </div>
      <span className="text-[11px] font-medium tabular-nums whitespace-nowrap" style={{ color: tone }}>
        {category.readiness}% ready
      </span>
    </div>
  )
}

// Level 2 — the attribute checklist for one category, GS1 baseline and retailer
// extras visually separated, each with a provided/required state dot.
function CategoryAttributes({
  category,
  targetLabel,
}: {
  category: CategoryRequirement
  targetLabel: string
}) {
  const extras = category.attributes.filter((a) => a.origin === "extra")
  const baseline = category.attributes.filter((a) => a.origin === "gs1")
  // With no product supplied, every attribute reads as required-not-provided;
  // once supplied, readiness of 100 means all provided.
  const allProvided = category.readiness === 100

  const Row = ({ name, code, isExtra }: { name: string; code?: string; isExtra: boolean }) => {
    const provided = allProvided
    return (
      <div className="flex items-center gap-2.5 px-3 py-2" style={{ borderTop: "1px solid #F3F4F6" }}>
        <Dot color={provided ? "#16A34A" : "#F59E0B"} />
        <span className="text-[13px] text-[#111827] flex-1">{name}</span>
        {isExtra && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          >
            {targetLabel} extra
          </span>
        )}
        {code && <span className="text-[10px] font-light tabular-nums" style={{ color: "#9CA3AF" }}>{code}</span>}
      </div>
    )
  }

  return (
    <div className="pb-2">
      {category.readiness === null && (
        <p className="px-3 py-2 text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
          No products supplied in this category yet — every attribute below is required before your
          products will be complete here.
        </p>
      )}
      {extras.length > 0 && (
        <div>
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#92400E" }}>
            {targetLabel} extras
          </p>
          {extras.map((a) => (
            <Row key={a.name} name={a.name} code={a.code} isExtra />
          ))}
        </div>
      )}
      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#0168B3" }}>
        GS1 baseline
      </p>
      {baseline.map((a) => (
        <Row key={a.name} name={a.name} code={a.code} isExtra={false} />
      ))}
    </div>
  )
}

export function RequirementsDrawer({ open, onOpenChange, target, products }: RequirementsDrawerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const matrix = useMemo(
    () => (target ? getRequirementMatrix(products, target) : null),
    [target, products]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 gap-0 flex flex-col"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {matrix && (
          <>
            <SheetHeader className="p-5 gap-2" style={{ borderBottom: "1px solid #E0E4E8" }}>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base font-semibold text-[#111827]">
                  {matrix.targetLabel} requirements
                </SheetTitle>
                {matrix.isGs1 && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
                  >
                    <BadgeCheck className="w-3 h-3" />
                    Baseline
                  </span>
                )}
              </div>
              <SheetDescription className="text-[13px] font-light text-[#6B7280]">
                {matrix.isGs1
                  ? "The GS1 standard attributes required in each category — the baseline every retailer builds on."
                  : matrix.hasOwnRequirements
                    ? `Everything ${matrix.targetLabel} requires, by category: their own extras plus the GS1 baseline.`
                    : `${matrix.targetLabel} hasn't published requirements of their own.`}
              </SheetDescription>

              {/* No-own-requirements note (Point 1 — informational, no CTA) */}
              {!matrix.isGs1 && !matrix.hasOwnRequirements && (
                <div
                  className="flex items-start gap-2 mt-1 px-3 py-2.5 rounded-md"
                  style={{ backgroundColor: "#EFF6FF", border: "1px solid #DBEAFE" }}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
                  <p className="text-[12px] font-light leading-relaxed" style={{ color: "#1E40AF" }}>
                    Your products are still assessed against the GS1 Standard, which every retailer
                    builds on. Meeting the GS1 baseline puts you in good shape for {matrix.targetLabel}.
                  </p>
                </div>
              )}

              <button
                onClick={() => downloadCsv(buildTargetTemplateCsv(matrix))}
                className="inline-flex items-center gap-1.5 mt-2 self-start px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#0168B3", color: "#FFFFFF" }}
              >
                <Download className="w-3.5 h-3.5" />
                Download template (all categories)
              </button>
            </SheetHeader>

            {/* Level 1 — per-category summary, expandable to Level 2 */}
            <div className="flex-1 overflow-y-auto">
              {matrix.categories.map((cat) => {
                const isOpen = expanded === cat.category
                return (
                  <div key={cat.category} style={{ borderBottom: "1px solid #E0E4E8" }}>
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        onClick={() => setExpanded(isOpen ? null : cat.category)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#6B7280" }} />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#6B7280" }} />
                        )}
                        <span className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium text-[#111827] truncate">{cat.category}</span>
                          <span className="text-[11px] font-light" style={{ color: "#9CA3AF" }}>
                            {cat.attributes.length} required
                            {cat.extraCount > 0
                              ? ` (${cat.gs1Count} GS1 + ${cat.extraCount} ${matrix.targetLabel})`
                              : " (GS1 baseline)"}
                          </span>
                        </span>
                      </button>
                      <ReadinessChip category={cat} />
                      <button
                        onClick={() => downloadCsv(buildCategoryTemplateCsv(matrix, cat))}
                        title={`Download ${cat.category} template`}
                        className="p-1.5 rounded-md hover:bg-[#F4F6F8] transition-colors shrink-0"
                      >
                        <Download className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ backgroundColor: "#FAFBFC" }}>
                        <CategoryAttributes category={cat} targetLabel={matrix.targetLabel} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p
              className="px-4 py-3 text-[11px] font-light leading-relaxed"
              style={{ color: "#9CA3AF", borderTop: "1px solid #E0E4E8" }}
            >
              Requirements are category-based, so every category {matrix.isGs1 ? "in the GS1 library" : `${matrix.targetLabel} buys`} is
              listed — including ones you don&apos;t supply yet. Download a template to start filling
              a category before you list products in it.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
