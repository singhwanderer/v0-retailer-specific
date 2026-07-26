"use client"

// ── AI Assistant Access — the connector's front door and its access log ──────
// This account can be operated by an AI assistant (Claude, ChatGPT, etc.) over
// MCP — that connector already exists (app/api/[transport]/route.ts). Reached
// via a link in the internal Compliance Agent chat panel, so it renders as a
// modal (covering the panel too) rather than a separate nav-level screen.
//
// Three tabs, matching the three things a customer actually asks about an AI
// connector: how do I connect it, what is it allowed to do, and what has it
// been doing. The Access Log tab is the visible half of §4A row 10 — it is
// populated by real MCP calls, so making a request in Claude puts a line on
// this screen.

import { useCallback, useEffect, useState } from "react"
import { Bot, Check, Copy, RefreshCw, ShieldAlert, Trash2, X, Zap } from "lucide-react"

const MCP_ENDPOINT = "https://v0-retailer-specific.vercel.app/api/mcp"

type ToolRow = { name: string; kind: "Read" | "Write"; scope: string; description: string }

// Mirrors lib/mcp/manifest.ts — each tool's required scope is part of what the
// connector publishes about itself, not an implementation detail.
const TOOLS: ToolRow[] = [
  { name: "get_capabilities", kind: "Read", scope: "tgc.read", description: "Discover what this connector can do and a live snapshot of your data." },
  { name: "search_gs1_bricks", kind: "Read", scope: "tgc.read", description: "Search the GS1 category library by name, segment, or code." },
  { name: "list_attribute_profiles", kind: "Read", scope: "tgc.read", description: "List your attribute profiles, status, and mapped GS1 category." },
  { name: "get_profile_detail", kind: "Read", scope: "tgc.read", description: "Get the full requirement set (attributes + image specs) for a category." },
  { name: "list_my_suppliers", kind: "Read", scope: "tgc.read", description: "List your suppliers ranked by open compliance gaps." },
  { name: "get_supplier_compliance", kind: "Read", scope: "tgc.read", description: "Get compliance detail for one named supplier." },
  { name: "list_system_filters", kind: "Read", scope: "tgc.read", description: "List global System filters (e.g. GS1 Core, GS1 Extended)." },
  { name: "run_compliance_report", kind: "Read", scope: "tgc.read", description: "Run a defensive compliance report across your vendor base." },
  { name: "list_vendor_exceptions", kind: "Read", scope: "tgc.read", description: "List vendor exceptions on file (waivers, extended deadlines, reduced scope)." },
  { name: "create_attribute_profile", kind: "Write", scope: "tgc.requirements.write", description: "Create a new attribute profile for a product category." },
  { name: "add_attribute_requirement", kind: "Write", scope: "tgc.requirements.write", description: "Add a custom attribute requirement to a profile." },
  { name: "set_image_requirement", kind: "Write", scope: "tgc.requirements.write", description: "Add or update an image requirement on a profile." },
  { name: "set_vendor_exception", kind: "Write", scope: "tgc.exceptions.write", description: "Grant or update a vendor exception for one category." },
]

interface AuditEntry {
  id: string
  timestamp: string
  tenantId: string
  tenantClass: string
  subjectType: "user" | "workload"
  subjectId: string | null
  agentId: string
  tool: string
  requiredScope: string
  outcome: "allowed" | "denied" | "error"
  reason?: string
  latencyMs: number
}

type Tab = "connect" | "log" | "security"

function ToolKindPill({ kind }: { kind: "Read" | "Write" }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={
        kind === "Write"
          ? { backgroundColor: "#FEF3C7", color: "#92400E" }
          : { backgroundColor: "#EFF6FF", color: "#0168B3" }
      }
    >
      {kind}
    </span>
  )
}

function OutcomePill({ outcome }: { outcome: AuditEntry["outcome"] }) {
  const style =
    outcome === "allowed"
      ? { backgroundColor: "#DCFCE7", color: "#166534" }
      : outcome === "denied"
        ? { backgroundColor: "#FEE2E2", color: "#991B1B" }
        : { backgroundColor: "#FEF3C7", color: "#92400E" }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0" style={style}>
      {outcome}
    </span>
  )
}

function CopyEndpointButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(MCP_ENDPOINT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked (e.g. no HTTPS context) — the URL is
      // still selectable as plain text, so this is a silent no-op.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity shrink-0"
      style={{ backgroundColor: "#0168B3" }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy URL"}
    </button>
  )
}

function ConnectStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 mt-0.5"
        style={{ backgroundColor: "#EFF6FF", color: "#0168B3" }}
      >
        {n}
      </span>
      <span className="text-sm font-light" style={{ color: "#374151" }}>
        {children}
      </span>
    </li>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col gap-3 p-4"
      style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
    >
      {children}
    </div>
  )
}

// ── Tab: Connect ─────────────────────────────────────────────────────────────

function ConnectTab() {
  return (
    <>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[#111827]">How to connect</h3>
        <SectionCard>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-nowrap"
              style={{ backgroundColor: "#F9FAFB", border: "1px solid #E0E4E8", color: "#374151" }}
            >
              {MCP_ENDPOINT}
            </code>
            <CopyEndpointButton />
          </div>
          <ol className="flex flex-col gap-2">
            <ConnectStep n={1}>
              In Claude.ai, Claude Desktop, or ChatGPT (Developer mode), open{" "}
              <span className="font-medium text-[#111827]">Settings → Connectors</span> and add a custom connector.
            </ConnectStep>
            <ConnectStep n={2}>
              Paste the URL above. Your AI client discovers the sign-in automatically — there is no API key to
              create and nothing to configure.
            </ConnectStep>
            <ConnectStep n={3}>
              <span className="font-medium text-[#111827]">Sign in with your work account</span> and choose how much
              access to grant. Read-only is the default; write access is granted separately.
            </ConnectStep>
            <ConnectStep n={4}>
              Start a new chat, enable the connector, and ask a question — e.g. &ldquo;which of my suppliers has the
              most open gaps?&rdquo;
            </ConnectStep>
          </ol>
          <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
            Your organisation is determined by who you sign in as. It is not something you or the AI client can
            choose — which is why there is no account picker anywhere in the flow.
          </p>
        </SectionCard>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[#111827]">What it can do</h3>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}>
          <table className="w-full text-sm">
            <tbody>
              {TOOLS.map((tool, idx) => (
                <tr key={tool.name} style={{ borderBottom: idx < TOOLS.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                  <td className="px-4 py-2.5 w-20 align-top">
                    <ToolKindPill kind={tool.kind} />
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <code className="text-xs font-mono text-[#111827]">{tool.name}</code>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: "#9CA3AF" }}>
                      {tool.scope}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 align-top text-xs font-light" style={{ color: "#6B7280" }}>
                    {tool.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
          A connection only ever sees the tools its granted scopes cover — a read-only connection is not shown the
          four write tools at all, and would be refused if it called one anyway.
        </p>
      </section>
    </>
  )
}

// ── Tab: Access log ──────────────────────────────────────────────────────────

function AccessLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp-audit?limit=100", { cache: "no-store" })
      const data = (await res.json()) as { entries: AuditEntry[] }
      setEntries(data.entries ?? [])
    } catch {
      // The log is a demo convenience — a failed poll shouldn't break the modal.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [load])

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111827]">Access log</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
            style={{ border: "1px solid #E0E4E8", color: "#374151" }}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            onClick={async () => {
              await fetch("/api/mcp-audit", { method: "DELETE" })
              load()
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
            style={{ border: "1px solid #E0E4E8", color: "#374151" }}
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
        Every tool call an AI assistant makes against this account, and every call that was refused. Records which
        organisation, which agent, which person (or which service identity), the scope the tool required, and the
        outcome. Updates live — make a request in Claude and it appears here.
      </p>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}>
        {loading ? (
          <p className="px-4 py-6 text-xs font-light text-center" style={{ color: "#9CA3AF" }}>
            Loading…
          </p>
        ) : entries.length === 0 ? (
          <p className="px-4 py-6 text-xs font-light text-center" style={{ color: "#9CA3AF" }}>
            No connector activity recorded yet. Connect an AI client and ask it something, or run one of the checks
            on the Security tab.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E0E4E8" }}>
                  {["Time", "Organisation", "Acting as", "Agent", "Tool", "Scope", "Outcome"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "#374151" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id} style={{ borderBottom: idx < entries.length - 1 ? "1px solid #F3F4F6" : undefined }}>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]" style={{ color: "#6B7280" }}>
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-[#111827]">{e.tenantId}</span>
                      <span style={{ color: "#9CA3AF" }}> · {e.tenantClass}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.subjectType === "workload" ? (
                        <span className="inline-flex items-center gap-1" style={{ color: "#92400E" }}>
                          <Zap className="w-3 h-3" /> service identity
                        </span>
                      ) : (
                        <span style={{ color: "#374151" }}>{e.subjectId ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]" style={{ color: "#6B7280" }}>
                      {e.agentId}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-[#111827]">{e.tool}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]" style={{ color: "#6B7280" }}>
                      {e.requiredScope}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <OutcomePill outcome={e.outcome} />
                      {e.reason && (
                        <div className="text-[10px] font-light mt-0.5 max-w-[260px]" style={{ color: "#9CA3AF" }}>
                          {e.reason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [output, setOutput] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(label: string, path: string) {
    setBusy(label)
    setOutput(null)
    try {
      const res = await fetch(path, { method: "POST" })
      setOutput(JSON.stringify(await res.json(), null, 2))
    } catch (err) {
      setOutput(String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[#111827]">Proactive agent (no human in the session)</h3>
        <SectionCard>
          <p className="text-xs font-light leading-relaxed" style={{ color: "#374151" }}>
            Runs a compliance check under an autonomous <span className="font-medium">service identity</span> rather
            than a signed-in person. It authenticates as itself, is provisioned against one organisation only, and
            holds read-only scope — so it cannot choose whose data it sees and cannot waive a requirement with
            nobody to approve it. Watch it appear in the Access log as a service identity.
          </p>
          <button
            onClick={() => run("proactive", "/api/demo/proactive-check")}
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-white self-start disabled:opacity-60"
            style={{ backgroundColor: "#0168B3" }}
          >
            <Zap className="w-3.5 h-3.5" />
            {busy === "proactive" ? "Running…" : "Run proactive check"}
          </button>
        </SectionCard>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[#111827]">Token from another service is refused</h3>
        <SectionCard>
          <p className="text-xs font-light leading-relaxed" style={{ color: "#374151" }}>
            Mints a token that is completely valid — correct issuer, correct signing key, real organisation, full
            scopes — but issued for a <span className="font-medium">different service</span>. Replayed here it is
            refused on the audience check alone, and the refusal is recorded in the Access log. This is what stops a
            token obtained elsewhere from turning this connector into someone&rsquo;s deputy.
          </p>
          <button
            onClick={() => run("deputy", "/api/demo/confused-deputy")}
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium self-start disabled:opacity-60"
            style={{ border: "1px solid #E0E4E8", color: "#374151" }}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {busy === "deputy" ? "Minting…" : "Mint a wrong-audience token"}
          </button>
        </SectionCard>
      </div>

      {output && (
        <pre
          className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto max-h-72 overflow-y-auto"
          style={{ backgroundColor: "#F9FAFB", border: "1px solid #E0E4E8", color: "#374151" }}
        >
          {output}
        </pre>
      )}
    </section>
  )
}

// ── Modal shell ──────────────────────────────────────────────────────────────

interface AiAccessModalProps {
  onClose: () => void
}

export function AiAccessModal({ onClose }: AiAccessModalProps) {
  const [tab, setTab] = useState<Tab>("connect")

  const tabs: { id: Tab; label: string }[] = [
    { id: "connect", label: "Connect" },
    { id: "log", label: "Access log" },
    { id: "security", label: "Security" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ border: "1px solid #E0E4E8" }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid #E0E4E8" }}>
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5" style={{ color: "#0168B3" }} />
            <h2 className="text-base font-semibold text-[#111827]">AI Assistant Access</h2>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3 shrink-0" style={{ borderBottom: "1px solid #E0E4E8" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-sm font-medium transition-colors"
              style={
                tab === t.id
                  ? { color: "#0168B3", borderBottom: "2px solid #0168B3" }
                  : { color: "#6B7280", borderBottom: "2px solid transparent" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
          {tab === "connect" && <ConnectTab />}
          {tab === "log" && <AccessLogTab />}
          {tab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  )
}
