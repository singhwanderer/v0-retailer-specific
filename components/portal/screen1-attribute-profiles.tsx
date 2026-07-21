"use client"

import { useState } from "react"
import { Info, Upload, Plus, X, CheckCircle, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Gs1Brick } from "@/lib/gs1-standard-library"
import { getProfileBricks, type AttributeProfile } from "@/lib/retailer-requirements"
import { Gs1BrickPicker } from "@/components/portal/gs1-brick-picker"
import { ConfirmMixedCategoryModal, isDifferentSegment } from "@/components/portal/confirm-mixed-category-modal"
import { createAttributeProfile } from "@/lib/mcp/tools"

interface Screen1Props {
  /** Shared profile list — the one source of truth (also read/written by Screen 2) */
  profiles: AttributeProfile[]
  onCreateProfile: (profile: AttributeProfile) => void
  onUpdateProfile: (name: string, updates: Partial<AttributeProfile>) => void
  onNavigateToProfile: (
    brickCode?: string,
    brickName?: string,
    categoryName?: string,
    status?: StatusType
  ) => void
}

type StatusType = "Active" | "Draft"

// The 8 core attributes every profile starts with, regardless of category
// (mirrors the MCP demo store's BASELINE_CORE_ATTRIBUTES: Product ID/Description,
// GTIN code/description, NRF size/color code, Size/Color Description). Used to
// estimate a new profile's attribute count.
const BASELINE_CORE_COUNT = 8

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

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
    { n: 2, label: "GS1 Category" },
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
  /** Free-text product-type label — always drives the list's Category column,
   *  independent of which/how-many GS1 bricks get mapped below. */
  productType: string
  bricks: { code: string; name: string }[]
  initialStatus: StatusType
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
  const [productType, setProductType] = useState("")
  const [initialStatus, setInitialStatus] = useState<"Draft" | "Active">("Draft")

  // Step 2 state — multi-select, so a requirement can map to several bricks
  // at creation. Cross-category (mixed-segment) adds ask for confirmation.
  const [selectedBricks, setSelectedBricks] = useState<Gs1Brick[]>([])
  const [pendingBrick, setPendingBrick] = useState<Gs1Brick | null>(null)
  const [skipped, setSkipped] = useState(false)
  const establishedSegment = selectedBricks[0]?.segment

  function reset() {
    setStep(1)
    setReqName("")
    setProductType("")
    setInitialStatus("Draft")
    setSelectedBricks([])
    setPendingBrick(null)
    setSkipped(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSkip() {
    setSelectedBricks([])
    setSkipped(true)
    setStep(3)
  }

  function handleToggleBrick(brick: Gs1Brick) {
    setSkipped(false)
    const already = selectedBricks.some((b) => b.brickCode === brick.brickCode)
    if (already) {
      setSelectedBricks((prev) => prev.filter((b) => b.brickCode !== brick.brickCode))
      return
    }
    if (isDifferentSegment(brick.segment, establishedSegment)) {
      setPendingBrick(brick)
    } else {
      setSelectedBricks((prev) => [...prev, brick])
    }
  }

  function goToStep3() {
    if (selectedBricks.length === 0 && !skipped) return
    setStep(3)
  }

  function handleCreate() {
    onCreated({
      name: reqName.trim(),
      productType: productType.trim() || reqName.trim(),
      bricks: selectedBricks.map((b) => ({ code: b.brickCode, name: b.brickName })),
      initialStatus,
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
                placeholder="e.g. Women's Day Dresses"
                className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
                style={{ borderColor: "#E0E4E8" }}
              />
              <p className="text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                This is how the requirement will appear in your retailer portal. Suppliers see this name.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#111827]">
                Category / Product Type <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && reqName.trim() && productType.trim()) setStep(2)
                }}
                placeholder="e.g. Women's Apparel"
                className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-2 focus:ring-[#0168B3]/20 text-[#111827] placeholder:text-[#9CA3AF]"
                style={{ borderColor: "#E0E4E8" }}
              />
              <p className="text-[11px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                The free-text grouping shown in the requirements list — independent of which GS1
                categories you map below, even if they span more than one.
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

        {/* ── Step 2: GS1 Category Mapping ── */}
        {step === 2 && (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              Map <span className="font-medium text-[#111827]">{reqName}</span> to one or more GS1
              standard categories. Each keeps its own standard extended attributes — nothing is
              merged across categories.
            </p>

            <Gs1BrickPicker
              multiSelect
              selectedCodes={selectedBricks.map((b) => b.brickCode)}
              onToggle={handleToggleBrick}
            />

            {/* Skip option */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {selectedBricks.length > 0
                  ? <>Selected: <span className="font-medium text-[#0168B3]">{selectedBricks.map((b) => b.brickName).join(", ")}</span></>
                  : "No category selected"}
              </p>
              <button
                onClick={handleSkip}
                className="text-xs hover:underline"
                style={{ color: "#6B7280" }}
              >
                Skip — add attributes manually
              </button>
            </div>

            <ConfirmMixedCategoryModal
              candidate={pendingBrick}
              currentSegment={establishedSegment}
              onClose={() => setPendingBrick(null)}
              onConfirm={() => pendingBrick && setSelectedBricks((prev) => [...prev, pendingBrick])}
            />
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4 py-1">
            {selectedBricks.length > 0 ? (
              <>
                {/* One card per selected brick — attributes are brick-scoped, not merged */}
                {selectedBricks.map((brick) => (
                  <div key={brick.brickCode} className="flex flex-col gap-2">
                    <div
                      className="flex items-start gap-3 p-3 rounded-md"
                      style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[#0168B3]">GS1 Category Mapping</p>
                        <p className="text-sm font-semibold text-[#111827] mt-0.5">
                          {brick.brickName}
                        </p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: "#6B7280" }}>
                          {brick.brickCode} · {brick.segment}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#111827] mb-2">
                        {brick.extendedAttributes.length} standard extended attributes will be pre-loaded:
                      </p>
                      <div
                        className="rounded-md border overflow-hidden"
                        style={{ borderColor: "#E0E4E8" }}
                      >
                        {brick.extendedAttributes.map((attr, i) => (
                          <div
                            key={attr.code}
                            className="flex items-center justify-between px-3 py-2 text-xs"
                            style={{
                              borderBottom: i < brick.extendedAttributes.length - 1 ? "1px solid #F3F4F6" : undefined,
                              backgroundColor: i % 2 === 0 ? "#fff" : "#F9FAFB",
                            }}
                          >
                            <span className="font-medium text-[#111827]">{attr.name}</span>
                            <span className="font-mono" style={{ color: "#9CA3AF" }}>{attr.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

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
                    You skipped the GS1 category mapping. You can add attributes manually after the requirement is created.
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
              disabled={!reqName.trim() || !productType.trim()}
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#0168B3" }}
            >
              Next
            </button>
          )}

          {step === 2 && (
            <button
              onClick={goToStep3}
              disabled={selectedBricks.length === 0 && !skipped}
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
export function Screen1AttributeProfiles({
  profiles: categories,
  onCreateProfile,
  onUpdateProfile,
  onNavigateToProfile,
}: Screen1Props) {
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

  function handleAction(
    action: string,
    name: string,
    brickCode?: string,
    brickName?: string,
    status?: StatusType
  ) {
    if (action === "Edit") {
      onNavigateToProfile(brickCode, brickName, name, status)
      return
    }
    if (action === "Deactivate" || action === "Activate") {
      setConfirmState({ open: true, action, name })
    }
  }

  function handleConfirm() {
    const { action, name } = confirmState
    if (!action) return
    const newStatus: StatusType = action === "Activate" ? "Active" : "Draft"
    const newActions = action === "Activate" ? ["Edit", "Deactivate"] : ["Edit", "Activate"]
    onUpdateProfile(name, { status: newStatus, actions: newActions, lastUpdated: today() })
    if (action === "Deactivate") showToast(`"${name}" has been deactivated.`)
    if (action === "Activate") showToast(`"${name}" is now active.`)
  }

  function handleCreated(result: CreateRequirementResult) {
    const brickCodes = result.bricks.map((b) => b.code)

    if (brickCodes.length > 0) {
      // Route through the shared store write path — the same function the
      // MCP connector calls — so authoring here and via the connector are one
      // code path.
      const created = createAttributeProfile(result.name, brickCodes, result.productType)
      if ("error" in created) {
        showToast(created.error ?? "Could not create the requirement.")
        return
      }
      const profile: AttributeProfile = {
        ...created.created,
        status: result.initialStatus,
        actions: result.initialStatus === "Active" ? ["Edit", "Deactivate"] : ["Edit", "Activate"],
      }
      onCreateProfile(profile)
      showToast(`"${result.name}" created as ${result.initialStatus}, mapped to ${result.bricks.length} GS1 categor${result.bricks.length !== 1 ? "ies" : "y"}.`)
      onNavigateToProfile(profile.brickCode, profile.brickName, result.name, result.initialStatus)
      return
    }

    // Skip path — no GS1 brick mapped; a plain baseline-only profile.
    const newProfile: AttributeProfile = {
      name: result.name,
      category: result.productType,
      attributes: `${BASELINE_CORE_COUNT} attributes`,
      status: result.initialStatus,
      lastUpdated: today(),
      actions: result.initialStatus === "Active" ? ["Edit", "Deactivate"] : ["Edit", "Activate"],
      isLink: true,
      brickCode: "",
      brickName: "",
      bricks: [],
    }
    onCreateProfile(newProfile)
    showToast(`"${result.name}" created as ${result.initialStatus}.`)
    onNavigateToProfile(undefined, undefined, result.name, result.initialStatus)
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
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[20%]">GS1 Category</th>
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
                    onClick={() => onNavigateToProfile(cat.brickCode, cat.brickName, cat.name, cat.status)}
                    className="font-medium hover:underline text-left cursor-pointer"
                    style={{ color: "#0168B3" }}
                  >
                    {cat.name}
                  </button>
                </td>
                <td className="px-4 py-3.5 text-[#111827]">{cat.category}</td>
                <td className="px-4 py-3.5">
                  {(() => {
                    const bricks = getProfileBricks(cat)
                    const primary = bricks[0]
                    return (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#111827] text-xs font-medium">
                            {primary ? primary.name : cat.brickName || "—"}
                          </span>
                          {bricks.length > 1 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                              style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
                              title={bricks.map((b) => b.name).join(", ")}
                            >
                              +{bricks.length - 1} more
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>
                          {primary ? primary.code : cat.brickCode}
                        </span>
                      </div>
                    )
                  })()}
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
                          onClick={() => handleAction(action, cat.name, cat.brickCode, cat.brickName, cat.status)}
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
