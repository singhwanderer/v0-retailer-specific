"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  X,
  CheckCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { AttributeRow, ImageRequirementRow, ProfileData } from "@/lib/profile-data"
import {
  initialCoreRows,
  initialExtendedRows,
  initialImageRows,
} from "@/lib/profile-data"

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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
      style={{ backgroundColor: "#0168B3" }}
    >
      <CheckCircle className="w-4 h-4 shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Confirm Deactivate Modal ──────────────────────────────────────────────────
function ConfirmDeactivateModal({
  open,
  onClose,
  onConfirm,
  categoryName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  categoryName: string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Deactivate Category Requirements
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed py-2" style={{ color: "#6B7280" }}>
          Suppliers will no longer see the requirements for &ldquo;{categoryName}&rdquo; until
          it is reactivated. No attribute data will be deleted.
        </p>
        <DialogFooter>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#DC2626" }}
          >
            Deactivate
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Rename Category Modal ─────────────────────────────────────────────────────
function RenameCategoryModal({
  open,
  onClose,
  onSave,
  currentName,
}: {
  open: boolean
  onClose: () => void
  onSave: (name: string) => void
  currentName: string
}) {
  const [value, setValue] = useState(currentName)
  function handleSave() {
    if (!value.trim()) return
    onSave(value.trim())
    onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setValue(currentName); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Rename Category Requirements
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave() }}
            className="w-full px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827]"
            style={{ borderColor: "#E0E4E8" }}
          />
        </div>
        <DialogFooter>
          <button
            onClick={() => { setValue(currentName); onClose() }}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Attribute Dialog ─────────────────────────────────────────────────────
function EditAttributeDialog({
  open,
  row,
  onClose,
  onSave,
}: {
  open: boolean
  row: AttributeRow | null
  onClose: () => void
  onSave: (updated: AttributeRow) => void
}) {
  const [retailerName, setRetailerName] = useState(row?.retailerName ?? "")
  const [guidance, setGuidance] = useState(row?.guidance ?? "")

  // Sync form when row changes (different row opened)
  if (row && retailerName === "" && row.retailerName !== "") {
    setRetailerName(row.retailerName)
    setGuidance(row.guidance)
  }

  function handleOpen() {
    setRetailerName(row?.retailerName ?? "")
    setGuidance(row?.guidance ?? "")
  }

  function handleSave() {
    if (!row || !retailerName.trim()) return
    onSave({ ...row, retailerName: retailerName.trim(), guidance: guidance.trim() })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) handleOpen()
        else onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Edit Attribute
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {/* TGC GS1 — read-only */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6B7280]">TGC Attribute Name (GS1)</label>
            <div
              className="px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: "#F4F6F8", color: "#6B7280", border: "1px solid #E0E4E8" }}
            >
              {row?.tgcGs1Name}
            </div>
          </div>
          {/* Retailer label — editable */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#111827]">
              Retailer Attribute Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              autoFocus
              value={retailerName}
              onChange={(e) => setRetailerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave() }}
              className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827]"
              style={{ borderColor: "#E0E4E8" }}
            />
          </div>
          {/* Guidance — editable */}
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
        </div>
        <DialogFooter>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!retailerName.trim()}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Source pill ───────────────────────────────────────────────────────────────
function SourcePill({ source }: { source: "standard" | "custom" }) {
  if (source === "standard") {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
        style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
      >
        Standard
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
      style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
    >
      Custom
    </span>
  )
}

// ── Attribute table ───────────────────────────────────────────────────────────
function AttributeTable({
  rows,
  onEditRow,
  showSourceTags = false,
}: {
  rows: AttributeRow[]
  onEditRow: (idx: number) => void
  showSourceTags?: boolean
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
            <th className="px-4 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              style={{ borderBottom: idx < rows.length - 1 ? "1px solid #F3F4F6" : undefined }}
              className="group hover:bg-[#F4F6F8]/40 transition-colors"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#111827]">{row.retailerName}</span>
                  {showSourceTags && <SourcePill source={row.source} />}
                </div>
              </td>
              <td
                className="px-4 py-2.5 text-xs"
                style={{ color: "#6B7280", backgroundColor: "#F9FAFB" }}
              >
                {row.tgcGs1Name}
              </td>
              <td className="px-4 py-2.5 text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                {row.guidance ? row.guidance : <span style={{ color: "#D1D5DB" }}>—</span>}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  onClick={() => onEditRow(idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-[#0168B3]"
                  title="Edit row"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
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

// ── Edit Image Requirement Dialog ─────────────────────────────────────────────
function EditImageRequirementDialog({
  open,
  row,
  onClose,
  onSave,
}: {
  open: boolean
  row: ImageRequirementRow | null
  onClose: () => void
  onSave: (updated: ImageRequirementRow) => void
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
  const [form, setForm] = useState<ImageRequirementRow>(row ?? empty)

  function handleOpen() {
    setForm(row ?? empty)
  }

  function set(key: keyof ImageRequirementRow, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    if (!form.requirementName.trim()) return
    onSave(form)
    onClose()
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) handleOpen()
        else onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Edit Image Requirement
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
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.requirementName.trim()}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Image requirements table ──────────────────────────────────────────────────
function ImageRequirementsTable({
  rows,
  onEditRow,
}: {
  rows: ImageRequirementRow[]
  onEditRow: (idx: number) => void
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 800 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8" }}>
              {["Requirement Name", "Format", "Background", "Min Dimensions", "Max File Size", "Shape/Crop", "Guidance Note (optional)", ""].map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 font-medium text-[#6B7280] whitespace-nowrap">
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
                className="group hover:bg-[#F4F6F8]/40 transition-colors"
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
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => onEditRow(idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-[#0168B3]"
                    title="Edit row"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
      source: "custom",
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
              Add to category
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

// ── Right column — Category summary card ─────────────────────────────────────
function CategorySummaryCard({
  coreCount,
  extendedCount,
  imageCount,
  brickMapping,
}: {
  coreCount: number
  extendedCount: number
  imageCount: number
  brickMapping?: { code: string; name: string } | null
}) {
  return (
    <div
      className="rounded-lg border bg-white overflow-hidden"
      style={{ borderColor: "#E0E4E8", borderTopColor: "#0168B3", borderTopWidth: "4px" }}
    >
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#111827]">Category Summary</h2>

        {/* GS1 Brick Mapping */}
        <div
          className="rounded-md p-3 flex flex-col gap-1"
          style={{ backgroundColor: brickMapping ? "#EFF6FF" : "#F4F6F8" }}
        >
          <span className="text-[10px] font-medium leading-tight" style={{ color: brickMapping ? "#0168B3" : "#9CA3AF" }}>
            GS1 Brick Mapping
          </span>
          {brickMapping ? (
            <>
              <span className="text-sm font-semibold text-[#111827]">{brickMapping.name}</span>
              <span className="text-[10px] font-mono" style={{ color: "#6B7280" }}>{brickMapping.code}</span>
            </>
          ) : (
            <span className="text-xs italic" style={{ color: "#9CA3AF" }}>No standard mapping</span>
          )}
        </div>

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
  brickMapping?: { code: string; name: string } | null
  /** The retailer's internal category name typed in Step 1 of the Create flow */
  initialCategoryName?: string
  /** Standard extended attributes seeded from the GS1 brick, if one was selected */
  initialBrickExtendedRows?: AttributeRow[]
  /**
   * Controlled profile data lifted into page state. When provided, this screen
   * edits the shared profile so the counts on Screen 1 (the list) update live
   * and always match what is shown here. When omitted, the screen falls back to
   * its own internal state (standalone use).
   */
  profile?: ProfileData
  onProfileChange?: (next: ProfileData) => void
}

export function Screen2ProfileDetail({
  onBack,
  brickMapping,
  initialCategoryName,
  initialBrickExtendedRows,
  profile: controlledProfile,
  onProfileChange,
}: Screen2Props) {
  // Fallback internal state for standalone use (when not controlled by page).
  const [internalProfile, setInternalProfile] = useState<ProfileData>(() => ({
    coreRows: initialCoreRows,
    extendedRows: initialBrickExtendedRows ?? initialExtendedRows,
    imageRows: initialImageRows,
  }))

  const profile = controlledProfile ?? internalProfile
  const coreRows = profile.coreRows
  const extendedRows = profile.extendedRows
  const imageRows = profile.imageRows

  // Commit a new profile to whichever source owns the data.
  function commit(next: ProfileData) {
    if (onProfileChange) onProfileChange(next)
    else setInternalProfile(next)
  }
  function setCoreRows(updater: (rows: AttributeRow[]) => AttributeRow[]) {
    commit({ ...profile, coreRows: updater(profile.coreRows) })
  }
  function setExtendedRows(updater: (rows: AttributeRow[]) => AttributeRow[]) {
    commit({ ...profile, extendedRows: updater(profile.extendedRows) })
  }
  function setImageRows(updater: (rows: ImageRequirementRow[]) => ImageRequirementRow[]) {
    commit({ ...profile, imageRows: updater(profile.imageRows) })
  }

  const [addAttrTarget, setAddAttrTarget] = useState<AddAttrTarget>(null)
  const [addImageOpen, setAddImageOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [categoryName, setCategoryName] = useState(initialCategoryName ?? "Footwear")
  const [toast, setToast] = useState<string | null>(null)

  // Edit attribute row state
  const [editAttrState, setEditAttrState] = useState<{
    open: boolean
    target: "core" | "extended" | null
    idx: number
  }>({ open: false, target: null, idx: -1 })

  // Edit image row state
  const [editImageState, setEditImageState] = useState<{ open: boolean; idx: number }>({
    open: false,
    idx: -1,
  })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleAddAttr(row: AttributeRow) {
    if (addAttrTarget === "core") setCoreRows((r) => [...r, row])
    if (addAttrTarget === "extended") setExtendedRows((r) => [...r, row])
    setAddAttrTarget(null)
  }

  function handleSaveAttr(updated: AttributeRow) {
    if (editAttrState.target === "core") {
      setCoreRows((rows) => rows.map((r, i) => (i === editAttrState.idx ? updated : r)))
    } else if (editAttrState.target === "extended") {
      setExtendedRows((rows) => rows.map((r, i) => (i === editAttrState.idx ? updated : r)))
    }
    showToast("Attribute updated.")
  }

  function handleSaveImageRow(updated: ImageRequirementRow) {
    setImageRows((rows) => rows.map((r, i) => (i === editImageState.idx ? updated : r)))
    showToast("Image requirement updated.")
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
          Attributes &amp; Images Requirements
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[#111827] font-medium">{categoryName}</span>
      </nav>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left column — 65% */}
        <div className="flex flex-col gap-5" style={{ flex: "0 0 65%" }}>
          {/* Title row */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[#111827]">
                {categoryName}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                Active
              </span>
              <button
                onClick={() => setRenameOpen(true)}
                className="ml-1 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer transition-colors"
                title="Rename category"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Category: Footwear · {coreRows.length + extendedRows.length} attributes required
            </p>
          </div>

          {/* Attribute groups */}
          <div className="flex flex-col gap-3">
            <AttributeGroup
              title="Core Attributes"
              count={coreRows.length}
              defaultExpanded
              onAddClick={() => setAddAttrTarget("core")}
            >
              <AttributeTable
                rows={coreRows}
                onEditRow={(idx) => setEditAttrState({ open: true, target: "core", idx })}
              />
            </AttributeGroup>

            <AttributeGroup
              title="Extended Attributes"
              count={extendedRows.length}
              defaultExpanded
              onAddClick={() => setAddAttrTarget("extended")}
            >
              <AttributeTable
                rows={extendedRows}
                onEditRow={(idx) => setEditAttrState({ open: true, target: "extended", idx })}
                showSourceTags
              />
            </AttributeGroup>

            <AttributeGroup
              title="Image Requirements"
              count={imageRows.length}
              defaultExpanded
              onAddClick={() => setAddImageOpen(true)}
              addLabel="+ Add Image Requirement"
            >
              <ImageRequirementsTable
                rows={imageRows}
                onEditRow={(idx) => setEditImageState({ open: true, idx })}
              />
            </AttributeGroup>
          </div>

          {/* Bottom action bar */}
          <div
            className="flex items-center gap-3 pt-4"
            style={{ borderTop: "1px solid #E0E4E8" }}
          >
            <button
              onClick={() => showToast("Changes saved successfully.")}
              className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0168B3" }}
            >
              Save Changes
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-md text-sm font-medium border hover:bg-[#F4F6F8] transition-colors"
              style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              onClick={() => setDeactivateOpen(true)}
              className="ml-auto text-sm font-medium hover:underline cursor-pointer transition-colors"
              style={{ color: "#DC2626" }}
            >
              Deactivate Category
            </button>
          </div>
        </div>

        {/* Right column — 35% */}
        <div style={{ flex: "0 0 35%" }}>
          <CategorySummaryCard
            coreCount={coreRows.length}
            extendedCount={extendedRows.length}
            imageCount={imageRows.length}
            brickMapping={brickMapping}
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
      <EditAttributeDialog
        open={editAttrState.open}
        row={
          editAttrState.target === "core"
            ? (coreRows[editAttrState.idx] ?? null)
            : editAttrState.target === "extended"
            ? (extendedRows[editAttrState.idx] ?? null)
            : null
        }
        onClose={() => setEditAttrState({ open: false, target: null, idx: -1 })}
        onSave={handleSaveAttr}
      />
      <EditImageRequirementDialog
        open={editImageState.open}
        row={imageRows[editImageState.idx] ?? null}
        onClose={() => setEditImageState({ open: false, idx: -1 })}
        onSave={handleSaveImageRow}
      />
      <ConfirmDeactivateModal
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={() => { onBack() }}
        categoryName={categoryName}
      />
      <RenameCategoryModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onSave={(name) => { setCategoryName(name); showToast(`Renamed to "${name}".`) }}
        currentName={categoryName}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
