"use client"

import { useState } from "react"
import { Bot, Send, ShieldAlert, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createAttributeProfile,
  addAttributeRequirement,
  setImageRequirement,
  updateAttributeRequirement,
  removeAttributeRequirement,
  removeImageRequirement,
} from "@/lib/mcp/tools"
import { PORTAL_CTX } from "@/lib/mcp/context"
import type { TenantRole } from "@/lib/mcp/tenants"
import type { AttributeProfile } from "@/lib/retailer-requirements"
import type { ProposedAction } from "@/lib/copilot/tools"
import type { CopilotSource } from "@/lib/copilot/agent"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  sources?: CopilotSource[]
}

interface PendingProposal {
  id: string
  proposal: ProposedAction
  status: "pending" | "applied" | "cancelled" | "error"
  resultNote?: string
}

interface ComplianceAgentPanelProps {
  profiles: AttributeProfile[]
  onCreateProfile: (profile: AttributeProfile) => void
  /** Open the external MCP connector signpost screen */
  onOpenAiAccess: () => void
  /** The portal persona's role, so this agent's calls can be attributed in the
   *  access log the same way the external connector's are. */
  role: TenantRole
}

const STARTER_PROMPTS = [
  "What does my Footwear profile require?",
  "Which supplier has the most open compliance gaps?",
  "Run a GS1 Core scorecard across my vendor base",
]

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function ComplianceAgentPanel({
  profiles,
  onCreateProfile,
  onOpenAiAccess,
  role,
}: ComplianceAgentPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [proposals, setProposals] = useState<PendingProposal[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, context: { profiles, role } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
        return
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text || "(no response)", sources: data.sources ?? [] },
      ])
      if (Array.isArray(data.proposals) && data.proposals.length > 0) {
        setProposals((prev) => [
          ...prev,
          ...data.proposals.map((proposal: ProposedAction, i: number) => ({
            id: `${Date.now()}-${i}`,
            proposal,
            status: "pending" as const,
          })),
        ])
      }
    } catch {
      setError("Couldn't reach the TGC Compliance Agent. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function applyProposal(id: string) {
    const entry = proposals.find((p) => p.id === id)
    if (!entry || entry.status !== "pending") return
    const { proposal } = entry

    try {
      if (proposal.tool === "create_attribute_profile") {
        const { name, brickCodes, category } = proposal.args as { name: string; brickCodes: string[]; category?: string }
        const result = createAttributeProfile(PORTAL_CTX, name, brickCodes, category)
        if ("error" in result) {
          setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: result.error } : p)))
          return
        }
        const profile: AttributeProfile = {
          ...result.created,
          status: "Draft",
          actions: ["Edit", "Activate"],
          lastUpdated: today(),
        }
        onCreateProfile(profile)
        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "applied", resultNote: `Created as Draft. Open Attributes & Images to review and activate it.` } : p))
        )
      } else if (proposal.tool === "add_attribute_requirement") {
        const { brickCode, attributeName, target, guidance } = proposal.args as {
          brickCode: string
          attributeName: string
          target: "core" | "extended"
          guidance?: string
        }
        const result = addAttributeRequirement(PORTAL_CTX, brickCode, attributeName, target, guidance)
        if ("error" in result) {
          setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: result.error } : p)))
          return
        }
        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "applied", resultNote: "Added. Open the profile in Attributes & Images to see it." } : p))
        )
      } else if (proposal.tool === "set_image_requirement") {
        const { brickCode, ...requirement } = proposal.args as {
          brickCode: string
          requirementName: string
          format: string
          background: string
          minDimensions: string
          maxFileSize: string
          shapeCrop: string
          guidanceNote?: string
        }
        const result = setImageRequirement(PORTAL_CTX, brickCode, requirement)
        if ("error" in result) {
          const message = String(result.error)
          setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: message } : p)))
          return
        }
        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "applied", resultNote: "Added. Open the profile in Attributes & Images to see it." } : p))
        )
      } else if (proposal.tool === "update_attribute_requirement") {
        const { brickCode, gs1Name, name, guidance } = proposal.args as {
          brickCode: string
          gs1Name: string
          name?: string
          guidance?: string
        }
        const result = updateAttributeRequirement(PORTAL_CTX, brickCode, gs1Name, { name, guidance })
        if ("error" in result) {
          const message = String(result.error)
          setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: message } : p)))
          return
        }
        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "applied", resultNote: "Updated. Open the profile in Attributes & Images to see it." } : p))
        )
      } else if (proposal.tool === "remove_attribute_requirement") {
        const { brickCode, gs1Name } = proposal.args as { brickCode: string; gs1Name: string }
        const result = removeAttributeRequirement(PORTAL_CTX, brickCode, gs1Name)
        if ("error" in result) {
          const message = String(result.error)
          setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: message } : p)))
          return
        }
        setProposals((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: "applied", resultNote: "Removed. Suppliers are no longer asked for it in this category." }
              : p
          )
        )
      } else if (proposal.tool === "remove_image_requirement") {
        const { brickCode, requirementName } = proposal.args as { brickCode: string; requirementName: string }
        const result = removeImageRequirement(PORTAL_CTX, brickCode, requirementName)
        if ("error" in result) {
          const message = String(result.error)
          setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: message } : p)))
          return
        }
        setProposals((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: "applied", resultNote: "Removed. Images already supplied are untouched." }
              : p
          )
        )
      }
    } catch {
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", resultNote: "Could not apply this change." } : p)))
    }
  }

  function cancelProposal(id: string) {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)))
  }

  return (
    <>
      {!sheetOpen && (
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-white text-sm font-medium cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: "#0168B3" }}
        >
          <Bot className="w-4 h-4" />
          TGC Compliance Agent
        </button>
      )}

      {/* Docked panel — a plain slide-in aside, not a blocking modal, so the
          rest of the app (including the AI toggle in the top nav) stays
          interactive while it's open. */}
      <aside
        className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-md bg-white border-l flex flex-col shadow-2xl transition-transform duration-300"
        style={{ transform: sheetOpen ? "translateX(0)" : "translateX(100%)" }}
        aria-hidden={!sheetOpen}
      >
        <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#0168B3" }}
            >
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-[#111827]">TGC Compliance Agent</span>
              <span className="text-xs text-[#6B7280]">Retailer Requirements &amp; Compliance</span>
              <button
                onClick={onOpenAiAccess}
                className="mt-1 text-xs font-medium text-left hover:underline w-fit"
                style={{ color: "#0168B3" }}
              >
                Prefer Claude.ai or ChatGPT? Connect via MCP →
              </button>
            </div>
          </div>
          <button
            onClick={() => setSheetOpen(false)}
            className="rounded-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-start gap-2">
                <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm max-w-[85%]" style={{ backgroundColor: "#F3F4F6", color: "#111827" }}>
                  Ask me about your requirements, suppliers, or compliance — or ask me to set up a new one. I can create new
                  profiles and requirements, but I can&rsquo;t edit anything that already exists.
                </div>
              </div>

              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "rounded-tr-sm text-white" : "rounded-tl-sm"}`}
                    style={m.role === "user" ? { backgroundColor: "#0168B3" } : { backgroundColor: "#F3F4F6", color: "#111827" }}
                  >
                    {m.content}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <p className="mt-1 max-w-[85%] text-xs" style={{ color: "#6B7280" }}>
                      See also: {m.sources.map((s) => s.label).join(" · ")}
                    </p>
                  )}
                </div>
              ))}

              {proposals.map((entry) => (
                <div
                  key={entry.id}
                  className="self-start max-w-[92%] rounded-lg border px-3.5 py-3 text-sm"
                  style={
                    entry.proposal.destructive
                      ? { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }
                      : { borderColor: "#E5E7EB", backgroundColor: "#FFFBEB" }
                  }
                >
                  <div className="flex items-start gap-2">
                    {entry.proposal.destructive ? (
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#B91C1C" }} />
                    ) : (
                      <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#B45309" }} />
                    )}
                    <p className="text-[#111827]">{entry.proposal.summary}</p>
                  </div>
                  {entry.proposal.consequence && (
                    <p
                      className="mt-1.5 ml-6 text-xs font-light leading-relaxed"
                      style={{ color: entry.proposal.destructive ? "#991B1B" : "#92400E" }}
                    >
                      {entry.proposal.consequence}
                    </p>
                  )}
                  {entry.status === "pending" && (
                    <div className="mt-2.5 flex gap-2">
                      <Button size="sm" onClick={() => applyProposal(entry.id)} className="h-7 px-3 text-xs">
                        {entry.proposal.destructive ? "Remove it" : "Apply"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => cancelProposal(entry.id)} className="h-7 px-3 text-xs">
                        Cancel
                      </Button>
                    </div>
                  )}
                  {entry.status === "applied" && (
                    <p className="mt-2 text-xs font-medium" style={{ color: "#15803D" }}>
                      ✓ Applied. {entry.resultNote}
                    </p>
                  )}
                  {entry.status === "cancelled" && (
                    <p className="mt-2 text-xs" style={{ color: "#6B7280" }}>
                      Cancelled — no changes made.
                    </p>
                  )}
                  {entry.status === "error" && (
                    <p className="mt-2 text-xs font-medium" style={{ color: "#B91C1C" }}>
                      {entry.resultNote}
                    </p>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                    Thinking…
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>
                  {error}
                </div>
              )}
            </div>
        </div>

        {messages.length === 0 && (
            <div className="flex flex-col gap-2 px-4 pb-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left rounded-full border px-3.5 py-2 text-xs font-medium transition-colors hover:bg-[#F3F4F6] cursor-pointer"
                  style={{ borderColor: "#D1D5DB", color: "#374151" }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="border-t p-3 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder="Ask me something…"
              disabled={loading}
              className="flex-1"
            />
            <Button size="icon" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
      </aside>
    </>
  )
}
