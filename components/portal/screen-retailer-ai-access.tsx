"use client"

import { useState } from "react"
import {
  Bot,
  Check,
  Copy,
  KeyRound,
  ListChecks,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react"

// ── AI Assistant Access — signpost for the external MCP connector ────────────
// This account can be operated by an AI assistant (Claude, ChatGPT, etc.) over
// MCP — that connector already exists (app/api/[transport]/route.ts) but had no
// in-app signpost telling a retailer user it's there. This screen tells them
// what it is, how to connect, exactly what it can do, and — honestly — that it
// has no authentication yet. The "planned hardening" controls below follow the
// same convention as the image-upload screen: shown, clearly labeled, inert.

const MCP_ENDPOINT = "https://v0-retailer-specific.vercel.app/api/mcp"

type ToolRow = { name: string; kind: "Read" | "Write"; description: string }

const TOOLS: ToolRow[] = [
  { name: "get_capabilities", kind: "Read", description: "Discover what this connector can do and a live snapshot of your data." },
  { name: "search_gs1_bricks", kind: "Read", description: "Search the GS1 category library by name, segment, or code." },
  { name: "list_attribute_profiles", kind: "Read", description: "List your attribute profiles, status, and mapped GS1 category." },
  { name: "get_profile_detail", kind: "Read", description: "Get the full requirement set (attributes + image specs) for a category." },
  { name: "list_my_suppliers", kind: "Read", description: "List your suppliers ranked by open compliance gaps." },
  { name: "get_supplier_compliance", kind: "Read", description: "Get compliance detail for one named supplier." },
  { name: "list_system_filters", kind: "Read", description: "List global System filters (e.g. GS1 Core, GS1 Extended)." },
  { name: "run_compliance_report", kind: "Read", description: "Run a defensive compliance report across your vendor base." },
  { name: "create_attribute_profile", kind: "Write", description: "Create a new attribute profile for a product category." },
  { name: "add_attribute_requirement", kind: "Write", description: "Add a custom attribute requirement to a profile." },
  { name: "set_image_requirement", kind: "Write", description: "Add or update an image requirement on a profile." },
]

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

export function ScreenRetailerAiAccess() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5" style={{ color: "#0168B3" }} />
          <h1 className="text-xl font-semibold text-[#111827]">AI Assistant Access</h1>
        </div>
        <p className="text-sm font-light text-[#6B7280]">
          Let an AI assistant (Claude, ChatGPT, etc.) author requirements and monitor supplier
          compliance on your behalf, over MCP.
        </p>
      </div>

      {/* What this is */}
      <section
        className="rounded-lg px-4 py-3.5 flex items-start gap-2.5"
        style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
      >
        <ListChecks className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#1E40AF" }}>
          This account publishes a small connector (an <span className="font-semibold">MCP server</span>).
          Once added to your AI assistant, it can read your requirement profiles and supplier
          compliance, and create requirements — in plain English, on your behalf. It only ever
          acts as this retailer account; it cannot see other retailers' or peer accounts' data.
        </p>
      </section>

      {/* How to connect */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#111827]">How to connect</h2>
        <div
          className="rounded-lg overflow-hidden flex flex-col gap-3 p-4"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
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
              <span className="font-medium text-[#111827]">Settings → Connectors</span> and add a
              custom connector.
            </ConnectStep>
            <ConnectStep n={2}>
              Paste the URL above. Leave authentication blank — see the security note below.
            </ConnectStep>
            <ConnectStep n={3}>
              Start a new chat, enable the connector for that chat, and ask it a question — e.g.
              &ldquo;which of my suppliers has the most open gaps?&rdquo;
            </ConnectStep>
          </ol>
        </div>
      </section>

      {/* What it can do */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#111827]">What it can do</h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <table className="w-full text-sm">
            <tbody>
              {TOOLS.map((tool, idx) => (
                <tr
                  key={tool.name}
                  style={{
                    borderBottom: idx < TOOLS.length - 1 ? "1px solid #F3F4F6" : undefined,
                  }}
                >
                  <td className="px-4 py-2.5 w-20 align-top">
                    <ToolKindPill kind={tool.kind} />
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <code className="text-xs font-mono text-[#111827]">{tool.name}</code>
                  </td>
                  <td className="px-4 py-2.5 align-top text-xs font-light" style={{ color: "#6B7280" }}>
                    {tool.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#111827]">Security</h2>

        <div
          className="rounded-lg px-4 py-3.5 flex items-start gap-2.5"
          style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A" }}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#92400E" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
            <span className="font-semibold">This prototype's connector has no authentication.</span>{" "}
            Anyone with the URL above can use it against this demo's mock data. Do not connect it
            to a real account, and do not treat this as a template for a production connector
            until the controls below are actually built.
          </p>
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E0E4E8", backgroundColor: "#FFFFFF" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F9FAFB" }}>
            <h3 className="text-xs font-medium text-[#111827]">Planned hardening — not built yet</h3>
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#111827]">API key per connection</span>
                <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
                  Issue and revoke a scoped key instead of leaving the endpoint open.
                </span>
              </div>
            </div>
            <button
              disabled
              title="Work in progress — out of scope for this prototype"
              className="px-3.5 py-2 rounded-md text-sm font-medium text-white cursor-not-allowed opacity-60 shrink-0"
              style={{ backgroundColor: "#0168B3" }}
            >
              Generate API Key
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#111827]">Per-tool write permissions</span>
                <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
                  Turn off create/update tools independently of read access.
                </span>
              </div>
            </div>
            <button
              disabled
              title="Work in progress — out of scope for this prototype"
              className="px-3.5 py-2 rounded-md text-sm border cursor-not-allowed opacity-60 shrink-0"
              style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
            >
              Manage Permissions
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <ListChecks className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#111827]">Access log</span>
                <span className="text-xs font-light" style={{ color: "#9CA3AF" }}>
                  See every call an AI assistant made against this account, and when.
                </span>
              </div>
            </div>
            <button
              disabled
              title="Work in progress — out of scope for this prototype"
              className="px-3.5 py-2 rounded-md text-sm border cursor-not-allowed opacity-60 shrink-0"
              style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
            >
              View Access Log
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
