"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const GPC_BROWSER_URL = "https://gpc-browser.gs1.org/"

export function GpcInfoTooltip({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={className}
          style={{ color: "#9CA3AF" }}
          aria-label="What is GPC Classification?"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">
        <p>
          GPC (Global Product Classification) is GS1&apos;s global standard for
          categorizing products by segment and brick.{" "}
          <a
            href={GPC_BROWSER_URL}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Browse GPC codes →
          </a>
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
