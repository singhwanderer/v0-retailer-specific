"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
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
import type { AttributeProfile, ProfileBrick } from "@/lib/retailer-requirements"
import { getBrickByCode, type Gs1Brick } from "@/lib/gs1-standard-library"
import { Gs1BrickPicker } from "@/components/portal/gs1-brick-picker"
import { ProfileBrickSelector } from "@/components/portal/profile-brick-selector"
import { ConfirmMixedCategoryModal, isDifferentSegment } from "@/components/portal/confirm-mixed-category-modal"
import {
  BASELINE_CORE_ATTRIBUTES,
  type AttributeRequirement,
  type ImageRequirement,
} from "@/lib/mcp/store"
import { assembleBrickAttributes, describeProfileAttributes, type BrickAttributeSet } from "@/lib/mcp/attribute-assembly"
import { addAttributeRequirement, setImageRequirement, updateAttributeRequirement } from "@/lib/mcp/tools"

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Retailer-facing display of a standard attribute's TGC/GS1 name — strips the
// trailing "(CODE)" that `gs1Name` carries as its store lookup key. Showing a
// raw GS1 code here would wrongly suggest the retailer is prescribing a
// specific value; only suppliers fill in values, on their own screens.
function gs1DisplayName(gs1Name: string): string {
  return gs1Name.replace(/\s*\([^()]*\)\s*$/, "")
}

type ProfileStatus = "Active" | "Draft"

// The attribute set shown when a requirement has no GS1 brick mapped yet (the
// Screen 1 "skip" path) — baseline core only, nothing to add/edit against
// since there's no brick code to key the store by.
const EMPTY_ATTRS: BrickAttributeSet = {
  brickCode: "",
  brickName: "",
  segment: undefined,
  coreAttributes: BASELINE_CORE_ATTRIBUTES,
  extendedAttributes: [],
  imageRequirements: [],
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

// ── Confirm Status Modal (Deactivate / Activate) ──────────────────────────────
function ConfirmStatusModal({
  open,
  onClose,
  onConfirm,
  action,
  categoryName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  action: "Deactivate" | "Activate" | null
  categoryName: string
}) {
  if (!action) return null

  const config = {
    Deactivate: {
      title: "Deactivate Category Requirements",
      body: `Suppliers will no longer see the requirements for "${categoryName}" until it is reactivated. No attribute data will be deleted.`,
      confirm: "Deactivate",
      danger: true,
    },
    Activate: {
      title: "Activate Category Requirements",
      body: `"${categoryName}" will become visible to all suppliers trading under your retailer account.`,
      confirm: "Activate",
      danger: false,
    },
  }

  const { title, body, confirm, danger } = config[action]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed py-2" style={{ color: "#6B7280" }}>{body}</p>
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
            style={{ backgroundColor: danger ? "#DC2626" : "#0168B3" }}
          >
            {confirm}
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
  row: AttributeRequirement | null
  onClose: () => void
  onSave: (gs1Name: string, updates: { name: string; guidance: string }) => void
}) {
  const [name, setName] = useState(row?.name ?? "")
  const [guidance, setGuidance] = useState(row?.guidance ?? "")

  function handleSave() {
    if (!row || !name.trim()) return
    onSave(row.gs1Name, { name: name.trim(), guidance: guidance.trim() })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
              {row ? gs1DisplayName(row.gs1Name) : ""}
            </div>
          </div>
          {/* Retailer label — editable */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#111827]">
              Retailer Attribute Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            disabled={!name.trim()}
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
  rows: AttributeRequirement[]
  onEditRow: (row: AttributeRequirement) => void
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
              key={row.gs1Name}
              style={{ borderBottom: idx < rows.length - 1 ? "1px solid #F3F4F6" : undefined }}
              className="group hover:bg-[#F4F6F8]/40 transition-colors"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#111827]">{row.name}</span>
                  {showSourceTags && <SourcePill source={row.source} />}
                </div>
              </td>
              <td
                className="px-4 py-2.5 text-xs"
                style={{ color: "#6B7280", backgroundColor: "#F9FAFB" }}
              >
                {gs1DisplayName(row.gs1Name)}
              </td>
              <td className="px-4 py-2.5 text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                {row.guidance ? row.guidance : <span style={{ color: "#D1D5DB" }}>—</span>}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  onClick={() => onEditRow(row)}
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
  row: ImageRequirement | null
  onClose: () => void
  onSave: (updated: ImageRequirement) => void
}) {
  const empty: ImageRequirement = {
    requirementName: "",
    format: "",
    background: "",
    minDimensions: "",
    maxFileSize: "",
    shapeCrop: "",
    guidanceNote: "",
  }
  const [form, setForm] = useState<ImageRequirement>(row ?? empty)

  function handleOpen() {
    setForm(row ?? empty)
  }

  function set(key: keyof ImageRequirement, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    if (!form.requirementName.trim()) return
    onSave(form)
    onClose()
  }

  const fields: { key: keyof ImageRequirement; label: string; placeholder: string }[] = [
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
                value={form[key] ?? ""}
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
  rows: ImageRequirement[]
  onEditRow: (row: ImageRequirement) => void
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
                key={row.requirementName}
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
                    onClick={() => onEditRow(row)}
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
// A genuinely custom attribute — free-text name + optional guidance, mirroring
// add_attribute_requirement's own parameters. Standard/GS1 attributes are
// already present automatically (assembled from the brick), so this is for
// requirements beyond the GS1 standard, not a picker over it.
type AddAttrTarget = "core" | "extended" | null

function AddAttributeDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (input: { name: string; guidance: string }) => void
}) {
  const [name, setName] = useState("")
  const [guidance, setGuidance] = useState("")

  function handleClose() {
    setName("")
    setGuidance("")
    onClose()
  }

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), guidance: guidance.trim() })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Add Attribute
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#111827]">
              Attribute Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAdd() }}
              placeholder="e.g. Care Instructions"
              className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
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
            disabled={!name.trim()}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Add to category
          </button>
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
  onAdd: (row: ImageRequirement) => void
}) {
  const empty: ImageRequirement = {
    requirementName: "",
    format: "",
    background: "",
    minDimensions: "",
    maxFileSize: "",
    shapeCrop: "",
    guidanceNote: "",
  }
  const [form, setForm] = useState<ImageRequirement>(empty)

  function set(key: keyof ImageRequirement, value: string) {
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

  const fields: { key: keyof ImageRequirement; label: string; placeholder: string }[] = [
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
                value={form[key] ?? ""}
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
  bricks,
  selectedBrickCode,
  categoryName,
  onAddCategory,
}: {
  coreCount: number
  extendedCount: number
  imageCount: number
  bricks: ProfileBrick[]
  selectedBrickCode: string
  categoryName: string
  onAddCategory: () => void
}) {
  const hasBricks = bricks.length > 0
  const scopedSuffix = bricks.length > 1 ? " (this category)" : ""
  return (
    <div
      className="rounded-lg border bg-white overflow-hidden"
      style={{ borderColor: "#E0E4E8", borderTopColor: "#0168B3", borderTopWidth: "4px" }}
    >
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#111827]">Category Summary</h2>

        {/* GS1 Brick Mapping(s) */}
        <div
          className="rounded-md p-3 flex flex-col gap-2"
          style={{ backgroundColor: hasBricks ? "#EFF6FF" : "#F4F6F8" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-medium leading-tight"
              style={{ color: hasBricks ? "#0168B3" : "#9CA3AF" }}
            >
              GS1 Category Mapping{bricks.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={onAddCategory}
              className="inline-flex items-center gap-1 text-[10px] font-medium hover:underline"
              style={{ color: "#0168B3" }}
            >
              <Plus className="w-3 h-3" />
              Add GS1 Category
            </button>
          </div>
          {hasBricks ? (
            <div className="flex flex-col gap-1.5">
              {bricks.map((b) => {
                const isActive = b.code === selectedBrickCode
                return (
                  <div
                    key={b.code}
                    className="flex items-baseline justify-between gap-2 rounded px-1.5 py-0.5"
                    style={isActive ? { backgroundColor: "#DBEAFE" } : undefined}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-[#111827] truncate">{b.name}</span>
                      <span className="text-[10px] font-mono" style={{ color: "#6B7280" }}>{b.code}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <span className="text-xs italic" style={{ color: "#9CA3AF" }}>No standard mapping</span>
          )}
        </div>

        {/* Stats 1×3 */}
        <div className="flex flex-col gap-3">
          {[
            { label: `Core Attributes Required${scopedSuffix}`, value: String(coreCount) },
            { label: `Extended Attributes Required${scopedSuffix}`, value: String(extendedCount) },
            { label: `Image Requirements Required${scopedSuffix}`, value: String(imageCount) },
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
            Visible to all Dillard&apos;s suppliers in the {categoryName} category.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add GS1 Category dialog ───────────────────────────────────────────────────
// Reuses the shared brick picker so a requirement can map to more than one GS1
// brick. The selected brick is handed back to the parent, which runs the
// cross-category check before committing.
function AddGs1CategoryDialog({
  open,
  onClose,
  onSelectBrick,
  excludeCodes,
}: {
  open: boolean
  onClose: () => void
  onSelectBrick: (brick: Gs1Brick) => void
  excludeCodes: string[]
}) {
  const [candidate, setCandidate] = useState<Gs1Brick | null>(null)

  function handleClose() {
    setCandidate(null)
    onClose()
  }

  function handleAdd() {
    if (!candidate) return
    onSelectBrick(candidate)
    setCandidate(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Add a GS1 Category
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs leading-relaxed pb-1" style={{ color: "#6B7280" }}>
          Map another GS1 standard category to this requirement. It keeps its own standard
          extended attributes — nothing is merged with the requirement&apos;s other categories.
        </p>
        <Gs1BrickPicker selected={candidate} onSelect={setCandidate} excludeCodes={excludeCodes} />
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
            disabled={!candidate}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0168B3" }}
          >
            Add Category
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Screen 2 ─────────────────────────────────────────────────────────────
interface Screen2Props {
  onBack: () => void
  brickMapping?: { code: string; name: string } | null
  /** All GS1 bricks mapped to this requirement */
  initialBricks?: ProfileBrick[]
  /** The retailer's internal category name typed in Step 1 of the Create flow */
  initialCategoryName?: string
  /** The profile's status when opened — drives the status pill shown here */
  initialStatus?: ProfileStatus
  /** Persist a status/name/actions change back to the shared profile list (Screen 1) */
  onUpdateProfile?: (name: string, updates: Partial<AttributeProfile>) => void
}

export function Screen2ProfileDetail({
  onBack,
  brickMapping,
  initialBricks,
  initialCategoryName,
  initialStatus,
  onUpdateProfile,
}: Screen2Props) {
  // All GS1 bricks mapped to this requirement. Seeded from the profile; a user
  // can add more (with a cross-category confirmation).
  const seedBricks: ProfileBrick[] =
    initialBricks && initialBricks.length > 0
      ? initialBricks
      : brickMapping
      ? [{ code: brickMapping.code, name: brickMapping.name }]
      : []
  const [bricks, setBricks] = useState<ProfileBrick[]>(seedBricks)

  // Which of the profile's own bricks is currently shown/edited.
  const [selectedBrickCode, setSelectedBrickCode] = useState<string>(seedBricks[0]?.code ?? "")
  const [attrs, setAttrs] = useState<BrickAttributeSet>(() =>
    selectedBrickCode ? assembleBrickAttributes(selectedBrickCode) : EMPTY_ATTRS
  )

  function refresh(brickCode: string = selectedBrickCode) {
    setAttrs(brickCode ? assembleBrickAttributes(brickCode) : EMPTY_ATTRS)
  }

  function handleSelectBrick(code: string) {
    setSelectedBrickCode(code)
    refresh(code)
  }

  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  // A candidate brick from a different category, awaiting confirmation.
  const [pendingBrick, setPendingBrick] = useState<Gs1Brick | null>(null)
  // The requirement's established category (segment) = its primary brick's.
  const primarySegment = bricks[0] ? getBrickByCode(bricks[0].code)?.segment : undefined

  const [addAttrTarget, setAddAttrTarget] = useState<AddAttrTarget>(null)
  const [addImageOpen, setAddImageOpen] = useState(false)
  const [confirmStatusAction, setConfirmStatusAction] = useState<"Deactivate" | "Activate" | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const initialName = initialCategoryName ?? brickMapping?.name ?? "New Category"
  const [categoryName, setCategoryName] = useState(initialName)
  // The key used to find this profile in the shared list (Screen 1). Captured
  // once at mount and updated on rename, so status/name changes always land
  // on the right row even after the display name has changed.
  const [profileKey, setProfileKey] = useState(initialName)
  const [status, setStatus] = useState<ProfileStatus>(initialStatus ?? "Active")
  const [toast, setToast] = useState<string | null>(null)

  // Edit attribute row state — keyed by gs1Name (rows are freshly recomputed
  // from the store on every render, so a stable index doesn't make sense).
  const [editAttrState, setEditAttrState] = useState<{
    open: boolean
    target: "core" | "extended" | null
    gs1Name: string | null
  }>({ open: false, target: null, gs1Name: null })

  // Edit image row state — keyed by requirementName (the store's own upsert key).
  const [editImageState, setEditImageState] = useState<{ open: boolean; requirementName: string | null }>({
    open: false,
    requirementName: null,
  })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleAddAttr(input: { name: string; guidance: string }) {
    if (!addAttrTarget || !selectedBrickCode) return
    addAttributeRequirement(selectedBrickCode, input.name, addAttrTarget, input.guidance || undefined)
    refresh()
    setAddAttrTarget(null)
    showToast("Attribute added.")
  }

  function handleSaveAttr(gs1Name: string, updates: { name: string; guidance: string }) {
    if (!selectedBrickCode) return
    updateAttributeRequirement(selectedBrickCode, gs1Name, updates)
    refresh()
    showToast("Attribute updated.")
  }

  function handleAddImage(row: ImageRequirement) {
    if (!selectedBrickCode) return
    setImageRequirement(selectedBrickCode, row)
    refresh()
    setAddImageOpen(false)
    showToast("Image requirement added.")
  }

  function handleSaveImageRow(updated: ImageRequirement) {
    if (!selectedBrickCode) return
    setImageRequirement(selectedBrickCode, updated)
    refresh()
    showToast("Image requirement updated.")
  }

  // A brick chosen in the Add-GS1-Category dialog. If it's a different category
  // (segment) than the requirement's, ask for confirmation first; otherwise add.
  function requestAddBrick(brick: Gs1Brick) {
    if (isDifferentSegment(brick.segment, primarySegment)) {
      setPendingBrick(brick)
    } else {
      commitAddBrick(brick)
    }
  }

  // Adding a brick keeps it fully independent — no merging with the
  // requirement's other bricks. Jump straight to it so its (fresh) attribute
  // set is what's shown.
  function commitAddBrick(brick: Gs1Brick) {
    const newBricks: ProfileBrick[] = [...bricks, { code: brick.brickCode, name: brick.brickName }]
    setBricks(newBricks)
    setSelectedBrickCode(brick.brickCode)
    refresh(brick.brickCode)
    onUpdateProfile?.(profileKey, {
      bricks: newBricks,
      attributes: describeProfileAttributes(newBricks),
      lastUpdated: today(),
    })
    showToast(`Added ${brick.brickName} to this requirement.`)
  }

  const coreRows = attrs.coreAttributes
  const extendedRows = attrs.extendedAttributes
  const imageRows = attrs.imageRequirements

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
                style={
                  status === "Active"
                    ? { backgroundColor: "#DCFCE7", color: "#15803D" }
                    : { backgroundColor: "#FEF3C7", color: "#92400E" }
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: status === "Active" ? "#16A34A" : "#F59E0B" }}
                />
                {status}
              </span>
              <button
                onClick={() => setRenameOpen(true)}
                className="ml-1 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer transition-colors"
                title="Rename category"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {bricks.length > 1 ? (
                <>
                  <ProfileBrickSelector bricks={bricks} selectedCode={selectedBrickCode} onSelect={handleSelectBrick} />
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    {coreRows.length + extendedRows.length} attributes required for this category
                  </span>
                </>
              ) : (
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  {bricks.length > 0 ? `GS1 Category: ${bricks[0].name} · ` : ""}
                  {coreRows.length + extendedRows.length} attributes required
                </p>
              )}
            </div>
          </div>

          {/* Attribute groups */}
          <div className="flex flex-col gap-3">
            <AttributeGroup
              title="Core Attributes"
              count={coreRows.length}
              defaultExpanded
              onAddClick={() =>
                selectedBrickCode ? setAddAttrTarget("core") : showToast("Map a GS1 category first.")
              }
            >
              <AttributeTable
                rows={coreRows}
                onEditRow={(row) => setEditAttrState({ open: true, target: "core", gs1Name: row.gs1Name })}
              />
            </AttributeGroup>

            <AttributeGroup
              title="Extended Attributes"
              count={extendedRows.length}
              defaultExpanded
              onAddClick={() =>
                selectedBrickCode ? setAddAttrTarget("extended") : showToast("Map a GS1 category first.")
              }
            >
              <AttributeTable
                rows={extendedRows}
                onEditRow={(row) => setEditAttrState({ open: true, target: "extended", gs1Name: row.gs1Name })}
                showSourceTags
              />
            </AttributeGroup>

            <AttributeGroup
              title="Image Requirements"
              count={imageRows.length}
              defaultExpanded
              onAddClick={() =>
                selectedBrickCode ? setAddImageOpen(true) : showToast("Map a GS1 category first.")
              }
              addLabel="+ Add Image Requirement"
            >
              <ImageRequirementsTable
                rows={imageRows}
                onEditRow={(row) => setEditImageState({ open: true, requirementName: row.requirementName })}
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
              onClick={() => setConfirmStatusAction(status === "Active" ? "Deactivate" : "Activate")}
              className="ml-auto text-sm font-medium hover:underline cursor-pointer transition-colors"
              style={{ color: status === "Active" ? "#DC2626" : "#0168B3" }}
            >
              {status === "Active" ? "Deactivate Category" : "Activate Category"}
            </button>
          </div>
        </div>

        {/* Right column — 35% */}
        <div style={{ flex: "0 0 35%" }}>
          <CategorySummaryCard
            coreCount={coreRows.length}
            extendedCount={extendedRows.length}
            imageCount={imageRows.length}
            bricks={bricks}
            selectedBrickCode={selectedBrickCode}
            categoryName={categoryName}
            onAddCategory={() => setAddCategoryOpen(true)}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AddGs1CategoryDialog
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        onSelectBrick={requestAddBrick}
        excludeCodes={bricks.map((b) => b.code)}
      />
      <ConfirmMixedCategoryModal
        candidate={pendingBrick}
        currentSegment={primarySegment}
        onClose={() => setPendingBrick(null)}
        onConfirm={() => pendingBrick && commitAddBrick(pendingBrick)}
      />
      <AddAttributeDialog
        open={addAttrTarget !== null}
        onClose={() => setAddAttrTarget(null)}
        onAdd={handleAddAttr}
      />
      <AddImageRequirementDialog
        open={addImageOpen}
        onClose={() => setAddImageOpen(false)}
        onAdd={handleAddImage}
      />
      <EditAttributeDialog
        key={editAttrState.open ? `edit-attr-${editAttrState.target}-${editAttrState.gs1Name}` : "edit-attr-closed"}
        open={editAttrState.open}
        row={
          editAttrState.target === "core"
            ? (coreRows.find((r) => r.gs1Name === editAttrState.gs1Name) ?? null)
            : editAttrState.target === "extended"
            ? (extendedRows.find((r) => r.gs1Name === editAttrState.gs1Name) ?? null)
            : null
        }
        onClose={() => setEditAttrState({ open: false, target: null, gs1Name: null })}
        onSave={handleSaveAttr}
      />
      <EditImageRequirementDialog
        key={editImageState.open ? `edit-image-${editImageState.requirementName}` : "edit-image-closed"}
        open={editImageState.open}
        row={imageRows.find((r) => r.requirementName === editImageState.requirementName) ?? null}
        onClose={() => setEditImageState({ open: false, requirementName: null })}
        onSave={handleSaveImageRow}
      />
      <ConfirmStatusModal
        open={confirmStatusAction !== null}
        onClose={() => setConfirmStatusAction(null)}
        onConfirm={() => {
          const newStatus: ProfileStatus = confirmStatusAction === "Activate" ? "Active" : "Draft"
          const newActions = confirmStatusAction === "Activate" ? ["Edit", "Deactivate"] : ["Edit", "Activate"]
          onUpdateProfile?.(profileKey, { status: newStatus, actions: newActions, lastUpdated: today() })
          setStatus(newStatus)
          if (confirmStatusAction === "Deactivate") {
            showToast(`"${categoryName}" has been deactivated.`)
            onBack()
          } else {
            showToast(`"${categoryName}" is now active.`)
          }
        }}
        action={confirmStatusAction}
        categoryName={categoryName}
      />
      <RenameCategoryModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onSave={(name) => {
          onUpdateProfile?.(profileKey, { name, lastUpdated: today() })
          setProfileKey(name)
          setCategoryName(name)
          showToast(`Renamed to "${name}".`)
        }}
        currentName={categoryName}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
