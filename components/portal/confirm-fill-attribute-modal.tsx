"use client"

import { AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface ConfirmFillAttributeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Attribute being filled */
  attributeName: string
  /** Value the supplier chose */
  value: string
  /** Product the value applies to */
  productLabel: string
  /** Confirm the fill (writes to shared catalogue state) */
  onConfirm: () => void
  /** Jump to the (out-of-scope) GTIN list for this product */
  onViewGtins: () => void
}

export function ConfirmFillAttributeModal({
  open,
  onOpenChange,
  attributeName,
  value,
  productLabel,
  onConfirm,
  onViewGtins,
}: ConfirmFillAttributeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: "#FFFFFF" }}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#111827]">
            Confirm attribute value
          </DialogTitle>
          <DialogDescription className="text-[13px] font-light text-[#6B7280]">
            You&apos;re setting{" "}
            <span className="font-medium text-[#111827]">{attributeName}</span> to{" "}
            <span className="font-medium text-[#111827]">{value}</span>.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-md"
          style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#92400E" }} />
          <p className="text-[12px] font-light leading-relaxed" style={{ color: "#92400E" }}>
            This value will apply to all of your GTINs within{" "}
            <span className="font-medium">{productLabel}</span>.{" "}
            <button
              onClick={onViewGtins}
              className="font-medium underline hover:opacity-80"
              style={{ color: "#0168B3" }}
            >
              If you want to see the GTINs first, click here.
            </button>
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-3.5 py-2 rounded-md text-sm font-medium border hover:bg-[#F4F6F8] transition-colors"
            style={{ borderColor: "#E0E4E8", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0168B3" }}
          >
            Apply to product
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
