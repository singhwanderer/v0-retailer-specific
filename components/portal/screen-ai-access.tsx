"use client"

// ── AI Assistant Access — the connector's front door and its access log ──────
// This account can be operated by an AI assistant (Claude, ChatGPT, etc.) over
// MCP — that connector already exists (app/api/[transport]/route.ts).
//
// Two axes decide what this screen shows, and they are deliberately different
// things:
//
//   perspective (retailer | supplier)  →  WHICH ORGANISATION you are, which
//                                         decides which tools exist and whose
//                                         audit lines you can read.
//   role        (admin | member)       →  WHAT YOU MAY SEE within it. The
//                                         access log is an administrative
//                                         artifact: a category buyer should not
//                                         be able to read every AI action taken
//                                         across their whole company.
//
// Both are demo persona switches here, because the prototype portal has no
// login of its own — see the note rendered on the Access log tab, and ENT-10 in
// docs/mcp-enterprise-auth-trd.md.

import { useCallback, useEffect, useState } from "react"
import { Bot, Check, Copy, Lock, RefreshCw, ShieldAlert, Trash2, X, Zap } from "lucide-react"

const MCP_ENDPOINT = "https://v0-retailer-specific.vercel.app/api/mcp"

export type AccessPerspective = "retailer" | "supplier"
export type AccessRole = "admin" | "member"

type ToolRow = { name: string; kind: "Read" | "Write"; scope: string; description: string }

// Mirrors lib/mcp/manifest.ts — each tool's required scope and the tenant class
// that may call it are part of what the connector publishes about itself, not
// implementation details.
const RETAILER_TOOLS: ToolRow[] = [
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

const SUPPLIER_TOOLS: ToolRow[] = [
  { name: "get_my_compliance_status", kind: "Read", scope: "tgc.read", description: "Your own completion against the GS1 baseline and each retail partner." },
  { name: "list_my_retail_partners", kind: "Read", scope: "tgc.read", description: "Who you trade with, their open gaps, and their extra attribute requirements." },
  { name: "get_my_open_gaps", kind: "Read", scope: "tgc.read", description: "What is still outstanding for one target — and what has been waived." },
  { name: "list_my_exceptions", kind: "Read", scope: "tgc.read", description: "Waivers and extensions retailers have granted you, and what each changes." },
]

const SHARED_TOOLS: ToolRow[] = [
  { name: "get_capabilities", kind: "Read", scope: "tgc.read", description: "Discover what this connector can do for you, and a live snapshot of your data." },
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

const TENANT: Record<AccessPerspective, { id: string; name: string; admin: string; member: string }> = {
  retailer: { id: "dillards", name: "Dillard's", admin: "admin@dillards.demo", member: "buyer@dillards.demo" },
  supplier: { id: "jrenee", name: "J.Renée", admin: "admin@jrenee.demo", member: "catalog@jrenee.demo" },
}

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

function LockedPanel({ tenantName }: { tenantName: string }) {
  return (
    <div
      className="rounded-lg flex flex-col items-center gap-2 px-6 py-10 text-center"
      style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
    >
      <Lock className="w-5 h-5" style={{ color: "#9CA3AF" }} />
      <p className="text-sm font-medium text-[#111827]">Administrators only</p>
      <p className="text-xs font-light max-w-md" style={{ color: "#6B7280" }}>
        The access log records every AI action taken across {tenantName}, so it is available to administrators of{" "}
        {tenantName} rather than to every user. You can still connect your own assistant from the Connect tab.
      </p>
    </div>
  )
}

function ToolTable({ tools, muted }: { tools: ToolRow[]; muted?: boolean }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF", opacity: muted ? 0.55 : 1 }}
    >
      <table className="w-full text-sm">
        <tbody>
          {tools.map((tool, idx) => (
            <tr key={tool.name} style={{ borderBottom: idx < tools.length - 1 ? "1px solid #F3F4F6" : undefined }}>
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
  )
}

// ── Tab: Connect ─────────────────────────────────────────────────────────────

function ConnectTab({ perspective }: { perspective: AccessPerspective }) {
  const tenant = TENANT[perspective]
  const isSupplier = perspective === "supplier"
  const mine = isSupplier ? SUPPLIER_TOOLS : RETAILER_TOOLS
  const theirs = isSupplier ? RETAILER_TOOLS : SUPPLIER_TOOLS

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
              <span className="font-medium text-[#111827]">Sign in with your work account</span> (demo:{" "}
              <code className="text-xs font-mono">{tenant.member}</code> / <code className="text-xs font-mono">demo</code>
              ) and choose how much access to grant. Read-only is the default.
            </ConnectStep>
            <ConnectStep n={4}>
              Start a new chat, enable the connector, and ask a question — e.g.{" "}
              {isSupplier ? (
                <>&ldquo;which retail partner am I furthest behind for?&rdquo;</>
              ) : (
                <>&ldquo;which of my suppliers has the most open gaps?&rdquo;</>
              )}
            </ConnectStep>
          </ol>
          <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
            Your organisation is determined by who you sign in as. It is not something you or the AI client can
            choose — which is why there is no account picker anywhere in the flow.
          </p>
        </SectionCard>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#111827]">
            What it can do for {tenant.name}
          </h3>
          <span className="text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
            {perspective} tenant
          </span>
        </div>
        <ToolTable tools={[...SHARED_TOOLS, ...mine]} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold" style={{ color: "#6B7280" }}>
            {isSupplier ? "Retailer-side tools" : "Supplier-side tools"} — not available to you
          </h3>
          <span className="text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
            {isSupplier ? "retailer" : "supplier"} tenants only
          </span>
        </div>
        <ToolTable tools={theirs} muted />
        <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
          Same server, same URL. These tools exist, but this connection cannot see them in its tool list and would be
          refused if it called one directly — the network is bilateral, and the identity you sign in with decides
          which side you are on.
        </p>
      </section>
    </>
  )
}

// ── Tab: Access log ──────────────────────────────────────────────────────────

function AccessLogTab({ perspective, role }: { perspective: AccessPerspective; role: AccessRole }) {
  const tenant = TENANT[perspective]
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [unattributed, setUnattributed] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [reloadKey, setReloadKey] = useState(0)
  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (role !== "admin") return

    // Guard against a late response landing after the viewer has switched
    // organisation: without this, Dillard's rows could be painted into
    // J.Renée's log by an in-flight request — the exact confusion this screen
    // exists to rule out.
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/mcp-audit?tenant=${encodeURIComponent(tenant.id)}&limit=100`, {
          cache: "no-store",
        })
        const data = (await res.json()) as { entries?: AuditEntry[]; unattributed?: AuditEntry[] }
        if (cancelled) return
        setEntries(data.entries ?? [])
        setUnattributed(data.unattributed ?? [])
      } catch {
        // The log is a demo convenience — a failed poll shouldn't break the modal.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), 4000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [tenant.id, role, reloadKey])

  if (role !== "admin") return <LockedPanel tenantName={tenant.name} />

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111827]">Access log — {tenant.name}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
            style={{ border: "1px solid #E0E4E8", color: "#374151" }}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            onClick={async () => {
              await fetch("/api/mcp-audit", { method: "DELETE" })
              refresh()
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
            style={{ border: "1px solid #E0E4E8", color: "#374151" }}
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
        Every tool call an AI assistant made against <span className="font-medium">{tenant.name}</span>, and every
        call that was refused. Only this organisation&rsquo;s activity appears here. Updates live — make a request in
        Claude and it shows up.
      </p>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}>
        {loading ? (
          <p className="px-4 py-6 text-xs font-light text-center" style={{ color: "#9CA3AF" }}>
            Loading…
          </p>
        ) : entries.length === 0 ? (
          <p className="px-4 py-6 text-xs font-light text-center" style={{ color: "#9CA3AF" }}>
            No connector activity recorded for {tenant.name} yet. Connect an AI client and ask it something, or run
            one of the checks on the Security tab.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E0E4E8" }}>
                  {["Time", "Acting as", "Agent", "Tool", "Scope", "Outcome"].map((h) => (
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

      {unattributed.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-[#111827]">Refused before sign-in ({unattributed.length})</h4>
          <p className="text-[11px] font-light leading-relaxed" style={{ color: "#6B7280" }}>
            These were rejected before an identity could be established, so they cannot be attributed to any
            organisation — a rejected token&rsquo;s own claims are not evidence of who sent it.
          </p>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}>
            {unattributed.map((e, idx) => (
              <div
                key={e.id}
                className="px-3 py-2 flex items-start gap-3"
                style={{ borderBottom: idx < unattributed.length - 1 ? "1px solid #F3F4F6" : undefined }}
              >
                <span className="font-mono text-[11px] whitespace-nowrap" style={{ color: "#6B7280" }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
                <OutcomePill outcome={e.outcome} />
                <span className="text-[11px] font-light" style={{ color: "#6B7280" }}>
                  {e.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] font-light leading-relaxed" style={{ color: "#9CA3AF" }}>
        In production this log is scoped to your signed-in organisation and visible to administrators only, and is
        shipped to the platform log sink. In this prototype the portal has no login, so it follows the persona and
        role selected in the top bar.
      </p>
    </section>
  )
}

// ── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab({ perspective, role }: { perspective: AccessPerspective; role: AccessRole }) {
  const tenant = TENANT[perspective]
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

  if (role !== "admin") return <LockedPanel tenantName={tenant.name} />

  // Both demos are provisioned against the retailer tenant, so showing them on
  // the supplier side would be misleading — the activity would land in
  // Dillard's log, which a J.Renée administrator cannot read.
  if (perspective === "supplier") {
    return (
      <SectionCard>
        <h3 className="text-sm font-semibold text-[#111827]">Security demonstrations</h3>
        <p className="text-xs font-light leading-relaxed" style={{ color: "#374151" }}>
          The proactive-agent and wrong-audience-token demonstrations run under identities provisioned for the
          retailer tenant, so their activity appears in that organisation&rsquo;s access log — which, correctly, an
          administrator of {tenant.name} cannot read. Switch the portal to the retailer perspective to run them.
        </p>
        <p className="text-xs font-light leading-relaxed" style={{ color: "#6B7280" }}>
          {tenant.name}&rsquo;s own connector activity appears on the Access log tab.
        </p>
      </SectionCard>
    )
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
            refused on the audience check alone. Because it never got past authentication, the refusal is logged as
            unattributed rather than filed under any organisation.
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
  perspective: AccessPerspective
  role: AccessRole
}

export function AiAccessModal({ onClose, perspective, role }: AiAccessModalProps) {
  const [tab, setTab] = useState<Tab>("connect")
  const tenant = TENANT[perspective]

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "connect", label: "Connect" },
    { id: "log", label: "Access log", adminOnly: true },
    { id: "security", label: "Security", adminOnly: true },
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
            <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
              {tenant.name} · {role === "admin" ? "administrator" : "standard user"}
            </span>
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
              className="px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
              style={
                tab === t.id
                  ? { color: "#0168B3", borderBottom: "2px solid #0168B3" }
                  : { color: "#6B7280", borderBottom: "2px solid transparent" }
              }
            >
              {t.label}
              {t.adminOnly && role !== "admin" && <Lock className="w-3 h-3" style={{ color: "#9CA3AF" }} />}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
          {tab === "connect" && <ConnectTab perspective={perspective} />}
          {tab === "log" && <AccessLogTab perspective={perspective} role={role} />}
          {tab === "security" && <SecurityTab perspective={perspective} role={role} />}
        </div>
      </div>
    </div>
  )
}
