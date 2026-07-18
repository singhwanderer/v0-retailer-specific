"use client"

import { useState } from "react"
import { Info, Upload, Plus, X, CheckCircle, Search, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { GS1_BRICKS, searchBricks, getSegments, type Gs1Brick } from "@/lib/gs1-standard-library"
import { ATTRIBUTE_PROFILES } from "@/lib/retailer-requirements"

interface Screen1Props {
  onNavigateToProfile: (brickCode?: string, brickName?: string, categoryName?: string) => void
}

const categories = ATTRIBUTE_PROFILES

type StatusType = "Active" | "Draft"

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string }> = {
  Active: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  Draft: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
}

function StatusPill({ status }: { status: StatusType }) {
  const cfg = statusConfig[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {status}
    </span>
  )
}

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

// ── Import CSV Modal ───────────────────────────────────────────────────────────
function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dragging, setDragging] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Import Categories from CSV
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false) }}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-10 text-center transition-colors cursor-pointer"
            style={{ borderColor: dragging ? "#0168B3" : "#E0E4E8", backgroundColor: dragging ? "#EFF6FF" : "#F9FAFB" }}
          >
            <Upload className="w-6 h-6" style={{ color: "#9CA3AF" }} />
            <p className="text-sm font-medium text-[#111827]">Drop a CSV file here</p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>or click to browse</p>
          </div>
          <div
            className="rounded-md p-3 text-xs leading-relaxed"
            style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
          >
            <p className="font-medium text-[#111827] mb-1">Required CSV columns</p>
            <p>Category Name · Attribute Name · TGC GS1 Code · Guidance Note (optional)</p>
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
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0168B3" }}
          >
            Upload File
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Step Indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Name" },
    { n: 2, label: "GS1 Brick" },
    { n: 3, label: "Preview" },
  ] as const

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, i) => {
        const done = current > step.n
        const active = current === step.n
        return (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: done ? "#16A34A" : active ? "#0168B3" : "#E0E4E8",
                  color: done || active ? "#fff" : "#9CA3AF",
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.n}
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{ color: active ? "#0168B3" : done ? "#16A34A" : "#9CA3AF" }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-px w-12 mx-1 mb-4"
                style={{ backgroundColor: current > step.n ? "#16A34A" : "#E0E4E8" }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Create Requirement Modal (3 steps) ─────────────────────────────────────────
interface CreateRequirementResult {
  name: string
  brickCode: string | null
  brickName: string | null
}

function CreateRequirementModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (result: CreateRequirementResult) => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 state
  const [reqName, setReqName] = useState("")
  const [initialStatus, setInitialStatus] = useState<"Draft" | "Active">("Draft")

  // Step 2 state
  const [query, setQuery] = useState("")
  const [selectedSegment, setSelectedSegment] = useState<string>("All")
  const [selectedBrick, setSelectedBrick] = useState<Gs1Brick | null>(null)
  const [skipped, setSkipped] = useState(false)

  const segments = ["All", ...getSegments()]

  const filteredBricks = searchBricks(query).filter(
    (b) => selectedSegment === "All" || b.segment === selectedSegment
  )

  function reset() {
    setStep(1)
    setReqName("")
    setInitialStatus("Draft")
    setQuery("")
    setSelectedSegment("All")
    setSelectedBrick(null)
    setSkipped(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSkip() {
    setSelectedBrick(null)
    setSkipped(true)
    setStep(3)
  }

  function handleSelectBrick(brick: Gs1Brick) {
    setSelectedBrick(brick)
    setSkipped(false)
  }

  function goToStep3() {
    if (!selectedBrick && !skipped) return
    setStep(3)
  }

  function handleCreate() {
    onCreated({
      name: reqName.trim(),
      brickCode: selectedBrick?.brickCode ?? null,
      brickName: selectedBrick?.brickName ?? null,
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Create New Requirement
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#111827]">
                Internal Category Name <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                autoFocus
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && reqName.trim()) setStep(2)
                }}
                placeholder="e.g. Women's Day Dresses"
                className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
                style={{ borderColor: "#E0E4E8" }}
              />
              <p className="text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                This is how the requirement will appear in your retailer portal. Suppliers see this name.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#111827]">Initial Status</label>
              <div className="flex items-center gap-4">
                {(["Draft", "Active"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
                    <input
                      type="radio"
                      name="initial-status"
                      value={s}
                      checked={initialStatus === s}
                      onChange={() => setInitialStatus(s)}
                      className="accent-[#0168B3]"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: GS1 Brick Mapping ── */}
        {step === 2 && (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              Map <span className="font-medium text-[#111827]">{reqName}</span> to a GS1 standard brick. The standard extended attributes for that brick will be pre-loaded into your requirement.
            </p>

            {/* Search + segment filter */}
            <div className="flex gap-2">
              <div
                className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md border"
                style={{ borderColor: "#E0E4E8" }}
              >
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search brick name or code…"
                  className="flex-1 text-sm outline-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
                />
              </div>
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="px-2.5 py-2 rounded-md text-xs border outline-none bg-white text-[#374151]"
                style={{ borderColor: "#E0E4E8" }}
              >
                {segments.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Brick list */}
            <div
              className="rounded-md border overflow-y-auto"
              style={{ borderColor: "#E0E4E8", maxHeight: 240 }}
            >
              {filteredBricks.length === 0 ? (
                <p className="px-4 py-3 text-sm" style={{ color: "#9CA3AF" }}>No bricks match your search.</p>
              ) : (
                filteredBricks.map((brick) => {
                  const isSelected = selectedBrick?.brickCode === brick.brickCode
                  return (
                    <button
                      key={brick.brickCode}
                      onClick={() => handleSelectBrick(brick)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        borderBottom: "1px solid #F3F4F6",
                        backgroundColor: isSelected ? "#EFF6FF" : undefined,
                      }}
                    >
                      {/* Checkmark column */}
                      <div
                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                        style={{
                          backgroundColor: isSelected ? "#0168B3" : "#E0E4E8",
                        }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-[#111827] truncate">{brick.brickName}</span>
                          <span
                            className="text-[10px] font-mono shrink-0"
                            style={{ color: "#9CA3AF" }}
                          >
                            {brick.brickCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
                          >
                            {brick.segment}
                          </span>
                          <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                            {brick.extendedAttributes.length} standard attributes
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Skip option */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {selectedBrick
                  ? <>Selected: <span className="font-medium text-[#0168B3]">{selectedBrick.brickName}</span></>
                  : "No brick selected"}
              </p>
              <button
                onClick={handleSkip}
                className="text-xs hover:underline"
                style={{ color: "#6B7280" }}
              >
                Skip — add attributes manually
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4 py-1">
            {selectedBrick ? (
              <>
                {/* Brick badge */}
                <div
                  className="flex items-start gap-3 p-3 rounded-md"
                  style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#0168B3]">GS1 Brick Mapping</p>
                    <p className="text-sm font-semibold text-[#111827] mt-0.5">
                      {selectedBrick.brickName}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: "#6B7280" }}>
                      {selectedBrick.brickCode} · {selectedBrick.segment}
                    </p>
                  </div>
                </div>

                {/* Attribute preview */}
                <div>
                  <p className="text-xs font-medium text-[#111827] mb-2">
                    {selectedBrick.extendedAttributes.length} standard extended attributes will be pre-loaded:
                  </p>
                  <div
                    className="rounded-md border overflow-hidden"
                    style={{ borderColor: "#E0E4E8" }}
                  >
                    {selectedBrick.extendedAttributes.map((attr, i) => (
                      <div
                        key={attr.code}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{
                          borderBottom: i < selectedBrick.extendedAttributes.length - 1 ? "1px solid #F3F4F6" : undefined,
                          backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB",
                        }}
                      >
                        <span className="font-medium text-[#111827]">{attr.name}</span>
                        <span className="font-mono" style={{ color: "#9CA3AF" }}>{attr.code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Callout */}
                <div
                  className="flex items-start gap-2 p-3 rounded-md text-xs leading-relaxed"
                  style={{ backgroundColor: "#F4F6F8", color: "#6B7280" }}
                >
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
                  <p>
                    These attributes will appear with a{" "}
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
                    >
                      Standard
                    </span>{" "}
                    tag. You can edit, remove, or add new attributes after creation.
                  </p>
                </div>
              </>
            ) : (
              /* Skipped */
              <div className="flex flex-col items-center gap-3 py-6">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F4F6F8" }}
                >
                  <Plus className="w-5 h-5" style={{ color: "#9CA3AF" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#111827]">No standard attributes pre-loaded</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#6B7280" }}>
                    You skipped the GS1 brick mapping. You can add attributes manually after the requirement is created.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="mt-2">
          <button
            onClick={handleClose}
            className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
          >
            Cancel
          </button>

          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="px-3.5 py-2 rounded-md text-sm border hover:bg-[#F4F6F8] transition-colors"
              style={{ borderColor: "#E0E4E8", color: "#374151" }}
            >
              Back
            </button>
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!reqName.trim()}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#0168B3" }}
            >
              Next
            </button>
          )}

          {step === 2 && (
            <button
              onClick={goToStep3}
              disabled={!selectedBrick}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#0168B3" }}
            >
              Next
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCreate}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0168B3" }}
            >
              Create Requirement
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Confirm Action Modal ───────────────────────────────────────────────────────
function ConfirmActionModal({
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
      body: `Suppliers will no longer see the requirements for "${categoryName}" until it is reactivated. No data will be deleted.`,
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
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: danger ? "#DC2626" : "#0168B3" }}
          >
            {confirm}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function Screen1AttributeProfiles({ onNavigateToProfile }: Screen1Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    action: "Deactivate" | "Activate" | null
    name: string
  }>({ open: false, action: null, name: "" })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleAction(action: string, name: string, brickCode?: string, brickName?: string) {
    if (action === "Edit") {
      onNavigateToProfile(brickCode, brickName, name)
      return
    }
    if (action === "Deactivate" || action === "Activate") {
      setConfirmState({ open: true, action, name })
    }
  }

  function handleConfirm() {
    const { action, name } = confirmState
    if (action === "Deactivate") showToast(`"${name}" has been deactivated.`)
    if (action === "Activate") showToast(`"${name}" is now active.`)
  }

  function handleCreated(result: { name: string; brickCode: string | null; brickName: string | null }) {
    const brickLabel = result.brickName ? ` mapped to ${result.brickName}` : ""
    showToast(`"${result.name}" created as Draft${brickLabel}.`)
    // Navigate immediately into the new requirement's profile, passing the retailer's category name
    onNavigateToProfile(result.brickCode ?? undefined, result.brickName ?? undefined, result.name)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] text-balance">
          Attributes &amp; Images Requirements
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
          Define which attributes and image specifications your suppliers must meet by product category.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium border transition-colors hover:bg-[#F4F6F8]"
          style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
        >
          <Upload className="w-3.5 h-3.5" />
          Import from CSV
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#0168B3" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Requirement
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: "#E0E4E8" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F4F6F8" }}>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[22%]">Category</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[18%]">Product Type</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[20%]">GS1 Brick</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[16%]">Requirements</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[10%]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[10%]">Last Updated</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr
                key={cat.name}
                style={{ borderBottom: idx < categories.length - 1 ? "1px solid #E0E4E8" : undefined }}
                className="hover:bg-[#F4F6F8]/50 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onNavigateToProfile(cat.brickCode, cat.brickName, cat.name)}
                    className="font-medium hover:underline text-left cursor-pointer"
                    style={{ color: "#0168B3" }}
                  >
                    {cat.name}
                  </button>
                </td>
                <td className="px-4 py-3.5 text-[#111827]">{cat.category}</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#111827] text-xs font-medium">{cat.brickName}</span>
                    <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>{cat.brickCode}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[#111827]">{cat.attributes}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={cat.status} />
                </td>
                <td className="px-4 py-3.5 text-[#6B7280]">{cat.lastUpdated}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {cat.actions.map((action, i) => (
                      <span key={action} className="flex items-center gap-3">
                        <button
                          onClick={() => handleAction(action, cat.name, cat.brickCode, cat.brickName)}
                          className="transition-colors cursor-pointer"
                          style={{ color: action === "Deactivate" ? "#DC2626" : "#6B7280" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = action === "Deactivate" ? "#991B1B" : "#111827")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = action === "Deactivate" ? "#DC2626" : "#6B7280")}
                        >
                          {action}
                        </button>
                        {i < cat.actions.length - 1 && (
                          <span style={{ color: "#E0E4E8" }}>·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info callout */}
      <div
        className="flex items-start gap-3 p-4 rounded-md text-sm leading-relaxed"
        style={{ backgroundColor: "#EFF6FF", borderLeft: "4px solid #0168B3", color: "#374151" }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
        <p>
          <span className="font-medium text-[#111827]">Active categories</span> are live and
          visible to all suppliers trading under your retailer account.{" "}
          <span className="font-medium text-[#111827]">Draft categories</span> are not visible
          to suppliers until activated.
        </p>
      </div>

      {/* Modals */}
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
      <CreateRequirementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <ConfirmActionModal
        open={confirmState.open}
        onClose={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={handleConfirm}
        action={confirmState.action}
        categoryName={confirmState.name}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
