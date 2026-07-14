"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  Search,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttributeRow {
  retailerName: string
  tgcGs1Name: string
  guidance: string
}

interface ImageRequirementRow {
  requirementName: string
  format: string
  background: string
  minDimensions: string
  maxFileSize: string
  shapeCrop: string
  guidanceNote: string
}

// ── GS1 catalogue (mock) ──────────────────────────────────────────────────────
const gs1Catalogue = [
  { name: "Heel Type", code: "GM03HLTY" },
  { name: "Heel Height Range", code: "GM03HLHT" },
  { name: "Toe Shape", code: "GM03TOES" },
  { name: "Outsole Type", code: "GM03OUTS" },
  { name: "Closure", code: "GM03CLOS" },
  { name: "Lining Material", code: "GM03LIMT" },
  { name: "Fabric or Material", code: "GM03FBMC" },
  { name: "Fit", code: "GM03FITT" },
  { name: "Fur Treatment", code: "GM03FTMT" },
  { name: "Gender", code: "GENDER" },
  { name: "Consumer Life Stage", code: "CONLIFESTAGE" },
]

// ── Seeded data ───────────────────────────────────────────────────────────────
const initialCoreRows: AttributeRow[] = [
  { retailerName: "GTIN code", tgcGs1Name: "GTIN code", guidance: "" },
  { retailerName: "GTIN Description", tgcGs1Name: "GTIN Description", guidance: "Max 35 characters. Plain language product name." },
  { retailerName: "NRF Color Code", tgcGs1Name: "NRF Color Code", guidance: "Must match NRF standard code table. See NRF guide." },
  { retailerName: "NRF Size Code", tgcGs1Name: "NRF Size Code", guidance: "Primary and secondary codes both required." },
  { retailerName: "Color Description", tgcGs1Name: "Color Description", guidance: "Max 10 characters. All caps." },
  { retailerName: "Size Description", tgcGs1Name: "Size Description", guidance: "" },
]

const initialExtendedRows: AttributeRow[] = [
  { retailerName: "Heel Type", tgcGs1Name: "Heel Type (GM03HLTY)", guidance: "" },
  { retailerName: "Toe Shape", tgcGs1Name: "Toe Shape (GM03TOES)", guidance: "" },
  { retailerName: "Outsole Type", tgcGs1Name: "Outsole Type (GM03OUTS)", guidance: "" },
  { retailerName: "Lining Material", tgcGs1Name: "Lining Material (GM03LIMT)", guidance: "" },
  { retailerName: "Closure", tgcGs1Name: "Closure (GM03CLOS)", guidance: "" },
]

const initialImageRows: ImageRequirementRow[] = [
  {
    requirementName: "Hero Shot",
    format: "JPEG",
    background: "Pure white (#FFFFFF)",
    minDimensions: "2000 × 2000 px",
    maxFileSize: "10 MB",
    shapeCrop: "Square, product centered",
    guidanceNote: "No mannequin, no props.",
  },
]

// ── Attribute table ───────────────────────────────────────────────────────────
function AttributeTable({
  rows,
  onEditGuidance,
}: {
  rows: AttributeRow[]
  onEditGuidance?: (idx: number, value: string) => void
}) {
  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
            <th className="text-left px-4 py-2.5 font-medium text-[#6B7280] w-[28%]">
              Retailer Attribute Name
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[#6B7280] w-[32%]">
              TGC Attribute Name (GS1)
            </th>
            <th className="text-left px-4 py-2.5 font-medium text-[#6B7280]">
              Supplier Guidance Note (optional)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              style={{ borderBottom: idx < rows.length - 1 ? "1px solid #F3F4F6" : undefined }}
              className="hover:bg-[#F4F6F8]/40 transition-colors"
            >
              <td className="px-4 py-2.5 font-medium text-[#111827]">{row.retailerName}</td>
              <td
                className="px-4 py-2.5 text-xs"
                style={{ color: "#6B7280", backgroundColor: "#F9FAFB" }}
              >
                {row.tgcGs1Name}
              </td>
              <td className="px-4 py-2.5 text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                {row.guidance ? row.guidance : <span style={{ color: "#D1D5DB" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-[10px] leading-relaxed italic" style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}>
        The GS1 code ties this requirement to the supplier&apos;s submitted data, regardless of the label used here.
      </p>
    </>
  )
}

// ── Image requirements table ──────────────────────────────────────────────────
function ImageRequirementsTable({ rows }: { rows: ImageRequirementRow[] }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 800 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
              {["Requirement Name", "Format", "Background", "Min Dimensions", "Max File Size", "Shape/Crop", "Guidance Note (optional)"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-medium text-[#6B7280] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                style={{ borderBottom: idx < rows.length - 1 ? "1px solid #F3F4F6" : undefined }}
                className="hover:bg-[#F4F6F8]/40 transition-colors"
              >
                <td className="px-4 py-2.5 font-medium text-[#111827]">{row.requirementName}</td>
                <td className="px-4 py-2.5 text-[#6B7280] text-xs">{row.format}</td>
                <td className="px-4 py-2.5 text-[#6B7280] text-xs">{row.background}</td>
                <td className="px-4 py-2.5 text-[#6B7280] text-xs">{row.minDimensions}</td>
                <td className="px-4 py-2.5 text-[#6B7280] text-xs">{row.maxFileSize}</td>
                <td className="px-4 py-2.5 text-[#6B7280] text-xs">{row.shapeCrop}</td>
                <td className="px-4 py-2.5 text-[#6B7280] text-xs">
                  {row.guidanceNote || <span style={{ color: "#D1D5DB" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] leading-relaxed italic" style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}>
        These specifications are shared with suppliers as guidance. TGC confirms an image was provided against each requirement — it does not verify image content, dimensions, or format.
      </p>
    </>
  )
}

// ── Collapsible group ─────────────────────────────────────────────────────────
interface GroupProps {
  title: string
  count: number
  defaultExpanded?: boolean
  onAddClick?: () => void
  addLabel?: string
  children: React.ReactNode
}

function AttributeGroup({
  title,
  count,
  defaultExpanded = false,
  onAddClick,
  addLabel = "+ Add Attribute",
  children,
}: GroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#E0E4E8" }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[#F4F6F8]/60 transition-colors"
        style={{ backgroundColor: "#F9FAFB" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#6B7280]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6B7280]" />
          )}
          <span className="text-sm font-semibold text-[#111827]">{title}</span>
          <span className="text-xs text-[#6B7280]">— {count} required</span>
        </div>
        {onAddClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddClick()
            }}
            className="text-xs font-medium hover:underline cursor-pointer"
            style={{ color: "#0168B3" }}
          >
            {addLabel}
          </button>
        )}
      </div>
      {expanded && <div className="bg-white">{children}</div>}
    </div>
  )
}

// ── Add Attribute Dialog ──────────────────────────────────────────────────────
type AddAttrTarget = "core" | "extended" | null

function AddAttributeDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (row: AttributeRow) => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<{ name: string; code: string } | null>(null)
  const [retailerLabel, setRetailerLabel] = useState("")
  const [guidance, setGuidance] = useState("")

  const filtered = gs1Catalogue.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleClose() {
    setQuery("")
    setSelected(null)
    setRetailerLabel("")
    setGuidance("")
    onClose()
  }

  function handleAdd() {
    if (!selected || !retailerLabel.trim()) return
    onAdd({
      retailerName: retailerLabel.trim(),
      tgcGs1Name: selected.code !== selected.name
        ? `${selected.name} (${selected.code})`
        : selected.name,
      guidance: guidance.trim(),
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Add Attribute
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          /* Step 1 — search */
          <div className="flex flex-col gap-3 py-2">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md border"
              style={{ borderColor: "#E0E4E8" }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search attribute name (e.g. Heel Type, Closure, Fabric)"
                className="flex-1 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>
            <div
              className="rounded-md border overflow-hidden"
              style={{ borderColor: "#E0E4E8", maxHeight: 280, overflowY: "auto" }}
            >
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#9CA3AF]">No matches found.</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setSelected(item)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#F4F6F8] transition-colors"
                    style={{ borderBottom: "1px solid #F3F4F6" }}
                  >
                    <span className="text-sm font-medium text-[#111827]">{item.name}</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{item.code}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Step 2 — configure */
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6B7280]">TGC Attribute Name</label>
              <div
                className="px-3 py-2 rounded-md text-sm"
                style={{ backgroundColor: "#F4F6F8", color: "#6B7280", border: "1px solid #E0E4E8" }}
              >
                {selected.name}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6B7280]">GS1 Code</label>
              <div
                className="px-3 py-2 rounded-md text-sm font-mono"
                style={{ backgroundColor: "#F4F6F8", color: "#6B7280", border: "1px solid #E0E4E8" }}
              >
                {selected.code}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#111827]">
                Your label for this attribute <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                autoFocus
                value={retailerLabel}
                onChange={(e) => setRetailerLabel(e.target.value)}
                placeholder="e.g. Boot Heel Type"
                className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827]"
                style={{ borderColor: "#E0E4E8" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6B7280]">
                Supplier Guidance Note (optional)
              </label>
              <textarea
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 resize-none text-[#111827] placeholder:text-[#9CA3AF]"
                style={{ borderColor: "#E0E4E8" }}
                placeholder="Optional note shown to suppliers"
              />
            </div>
            <button
              onClick={() => setSelected(null)}
              className="self-start text-xs hover:underline"
              style={{ color: "#6B7280" }}
            >
              ← Back to search
            </button>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={handleClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          {selected && (
            <button
              onClick={handleAdd}
              disabled={!retailerLabel.trim()}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#0168B3" }}
            >
              Add to profile
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Image Requirement Dialog ──────────────────────────────────────────────
function AddImageRequirementDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (row: ImageRequirementRow) => void
}) {
  const empty: ImageRequirementRow = {
    requirementName: "",
    format: "",
    background: "",
    minDimensions: "",
    maxFileSize: "",
    shapeCrop: "",
    guidanceNote: "",
  }
  const [form, setForm] = useState<ImageRequirementRow>(empty)

  function set(key: keyof ImageRequirementRow, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleClose() {
    setForm(empty)
    onClose()
  }

  function handleAdd() {
    if (!form.requirementName.trim()) return
    onAdd(form)
    handleClose()
  }

  const fields: { key: keyof ImageRequirementRow; label: string; placeholder: string }[] = [
    { key: "requirementName", label: "Requirement Name", placeholder: "e.g. Hero Shot" },
    { key: "format", label: "Format", placeholder: "e.g. JPEG" },
    { key: "background", label: "Background", placeholder: "e.g. Pure white (#FFFFFF)" },
    { key: "minDimensions", label: "Minimum Dimensions", placeholder: "e.g. 2000 × 2000 px" },
    { key: "maxFileSize", label: "Maximum File Size", placeholder: "e.g. 10 MB" },
    { key: "shapeCrop", label: "Shape/Crop", placeholder: "e.g. Square, product centered" },
    { key: "guidanceNote", label: "Guidance Note (optional)", placeholder: "e.g. No mannequin, no props." },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Add Image Requirement
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6B7280]">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
                style={{ borderColor: "#E0E4E8" }}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <button
            onClick={handleClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.requirementName.trim()}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Add Image Requirement
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Right column — Profile summary card ──────────────────────────────────────
function ProfileSummaryCard({
  coreCount,
  extendedCount,
  imageCount,
}: {
  coreCount: number
  extendedCount: number
  imageCount: number
}) {
  return (
    <div
      className="rounded-lg border bg-white overflow-hidden"
      style={{ borderColor: "#E0E4E8", borderTopColor: "#0168B3", borderTopWidth: "4px" }}
    >
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#111827]">Profile Summary</h2>

        {/* Stats 1×3 */}
        <div className="flex flex-col gap-3">
          {[
            { label: "Core Attributes Required", value: String(coreCount) },
            { label: "Extended Attributes Required", value: String(extendedCount) },
            { label: "Image Requirements Required", value: String(imageCount) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-md p-3 flex flex-col gap-0.5"
              style={{ backgroundColor: "#F4F6F8" }}
            >
              <span className="text-[10px] text-[#6B7280] leading-tight">{label}</span>
              <span className="text-xl font-semibold text-[#111827]">{value}</span>
            </div>
          ))}
        </div>

        <hr style={{ borderColor: "#E0E4E8" }} />

        {/* Supplier Visibility */}
        <div>
          <p className="text-xs font-medium text-[#111827] mb-1.5">Supplier Visibility</p>
          <div className="flex items-start gap-2 text-xs text-[#374151] leading-relaxed">
            <span
              className="w-2 h-2 rounded-full mt-0.5 shrink-0"
              style={{ backgroundColor: "#16A34A" }}
            />
            Visible to all Dillard&apos;s suppliers in the Footwear category.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Screen 2 ─────────────────────────────────────────────────────────────
interface Screen2Props {
  onBack: () => void
}

export function Screen2ProfileDetail({ onBack }: Screen2Props) {
  const [coreRows, setCoreRows] = useState<AttributeRow[]>(initialCoreRows)
  const [extendedRows, setExtendedRows] = useState<AttributeRow[]>(initialExtendedRows)
  const [imageRows, setImageRows] = useState<ImageRequirementRow[]>(initialImageRows)

  const [addAttrTarget, setAddAttrTarget] = useState<AddAttrTarget>(null)
  const [addImageOpen, setAddImageOpen] = useState(false)

  function handleAddAttr(row: AttributeRow) {
    if (addAttrTarget === "core") setCoreRows((r) => [...r, row])
    if (addAttrTarget === "extended") setExtendedRows((r) => [...r, row])
    setAddAttrTarget(null)
  }

  return (
    <div className="flex flex-col gap-0 p-8 max-w-[1200px]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-5">
        <button
          onClick={onBack}
          className="hover:underline cursor-pointer"
          style={{ color: "#0168B3" }}
        >
          Attribute Profiles
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[#111827] font-medium">Footwear — Core Compliance</span>
      </nav>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left column — 65% */}
        <div className="flex flex-col gap-5" style={{ flex: "0 0 65%" }}>
          {/* Title row */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[#111827]">
                Footwear — Core Compliance
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                Active
              </span>
              <button className="ml-1 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Category: Footwear · {coreRows.length + extendedRows.length} attributes required
            </p>
          </div>

          {/* Info banner */}
          <div
            className="flex items-start gap-3 p-3.5 rounded-md text-sm leading-relaxed"
            style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
            <span style={{ color: "#1E40AF" }}>
              Suppliers uploading GTINs in the Footwear category will see these requirements
              when they view their catalogue.
            </span>
          </div>

          {/* Attribute groups */}
          <div className="flex flex-col gap-3">
            {/* Core Attributes */}
            <AttributeGroup
              title="Core Attributes"
              count={coreRows.length}
              defaultExpanded
              onAddClick={() => setAddAttrTarget("core")}
            >
              <AttributeTable rows={coreRows} />
            </AttributeGroup>

            {/* Extended Attributes */}
            <AttributeGroup
              title="Extended Attributes"
              count={extendedRows.length}
              defaultExpanded
              onAddClick={() => setAddAttrTarget("extended")}
            >
              <AttributeTable rows={extendedRows} />
            </AttributeGroup>

            {/* Image Requirements */}
            <AttributeGroup
              title="Image Requirements"
              count={imageRows.length}
              defaultExpanded
              onAddClick={() => setAddImageOpen(true)}
              addLabel="+ Add Image Requirement"
            >
              <ImageRequirementsTable rows={imageRows} />
            </AttributeGroup>
          </div>

          {/* Bottom action bar */}
          <div
            className="flex items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #E0E4E8" }}
          >
            <button
              className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0168B3" }}
            >
              Save Changes
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium border hover:bg-[#F4F6F8] transition-colors"
              style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              className="ml-auto text-sm font-medium hover:underline cursor-pointer"
              style={{ color: "#DC2626" }}
            >
              Deactivate Profile
            </button>
          </div>
        </div>

        {/* Right column — 35% */}
        <div style={{ flex: "0 0 35%" }}>
          <ProfileSummaryCard
            coreCount={coreRows.length}
            extendedCount={extendedRows.length}
            imageCount={imageRows.length}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AddAttributeDialog
        open={addAttrTarget !== null}
        onClose={() => setAddAttrTarget(null)}
        onAdd={handleAddAttr}
      />
      <AddImageRequirementDialog
        open={addImageOpen}
        onClose={() => setAddImageOpen(false)}
        onAdd={(row) => setImageRows((r) => [...r, row])}
      />
    </div>
  )
}
