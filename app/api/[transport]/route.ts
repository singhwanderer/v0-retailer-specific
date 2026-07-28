// TGC MCP server — Streamable HTTP endpoint at /api/mcp.
//
// Exposes the prototype's mock catalogue data through the tool inventory
// described in the README's "Requirement authoring model" and "Conversational
// access (MCP)" sections, so any MCP client (claude.ai, ChatGPT developer
// mode, Claude Desktop) can query requirements and supplier compliance and
// create requirements against the demo store.
//
// ── What changed when enterprise auth landed ────────────────────────────────
// This route used to export createMcpHandler() directly as GET/POST/DELETE,
// with the tool list hard-coded inline and no caller identity anywhere. Now:
//
//   1. Every request is authenticated first (lib/mcp/auth.ts). No token means
//      a 401 carrying the discovery pointer, not an anonymous session.
//   2. The tool list is built PER CALLER from the manifest (lib/mcp/manifest.ts),
//      filtered by the scopes they consented to and the tenant class they
//      belong to. A read-only connection never sees the write tools at all.
//   3. Every handler runs through runGuarded() (lib/mcp/guard.ts), which
//      re-checks scope and tenant class on each invocation and emits the audit
//      line. Filtering the list is UX; the guard is the enforcement.
//
// Tenancy used to be a paragraph of English in `instructions` below, i.e. a
// request that the model behave. It is now a property of the code.

import { createMcpHandler } from "mcp-handler"
import { authenticateMcpRequest } from "@/lib/mcp/auth"
import type { CallerContext } from "@/lib/mcp/context"
import { runGuarded } from "@/lib/mcp/guard"
import { annotationsFor, guardSpecFor, invokeTool, toolsForScopes } from "@/lib/mcp/manifest"
import { getTenant } from "@/lib/mcp/tenants"

function asText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
}

/**
 * The server-level instruction block, written for whichever side signed in.
 *
 * Note what this no longer does: it used to assert tenancy in prose and hope
 * the model complied. It now *describes* an authorization decision the server
 * has already made and will re-make on every call.
 */
function buildInstructions(ctx: CallerContext, tenantName: string): string {
  const who =
    ctx.subjectType === "workload"
      ? "under an autonomous service identity with no user in the session"
      : `on behalf of ${ctx.subjectId}`

  const common =
    `You are connected as ${tenantName} (${ctx.tenantClass} tenant), ${who}. ` +
    `You have been granted these scopes: ${[...ctx.scopes].join(", ")}. ` +
    `Only the tools this connection is authorized for are listed — if an action you expect is missing, the user has not granted the scope for it, and you should tell them which scope is needed rather than trying to work around it. ` +
    `All data is mock data from a watermarked prototype. ` +
    `GROUNDING: answer questions about TGC data strictly from tool results — never invent profiles, suppliers, partners, categories, or numbers. ` +
    `When the user asks what they can do, is unsure, or asks something open-ended, call get_capabilities first to see what actions and data actually exist, then guide them. ` +
    `EMPTY RESULTS: some read tools return a note with known values when a filter matches nothing — relay those suggestions instead of just saying 'none found'. ` +
    `OUT OF SCOPE: other tenants' data is not reachable through this connection and asking for it will be refused by the server, not just declined by you. Sales, logistics, and pricing are not in this demo. `

  if (ctx.tenantClass === "supplier") {
    return (
      `Trading Grid Catalogue (TGC) — a B2B catalog data-sync network connecting retailer hubs and supplier spokes. ` +
      `This connection is the SUPPLIER side. ` +
      common +
      `SCOPE: this supplier's OWN position — how complete their catalogue is against the GS1 baseline and against each retail partner separately, which attributes and images are still outstanding, and which exceptions retailers have granted them. ` +
      `KEY IDEA: compliance is never one global score. A supplier is compliant FOR A GIVEN RETAILER, because each retailer layers its own required attributes on top of the GS1 baseline — always say which target a number refers to. ` +
      `Attributes a retailer has waived are NOT gaps; report them separately as waived rather than letting them disappear. ` +
      `This connection is READ-ONLY: the supplier cannot create or amend requirements or exceptions — only the granting retailer can. If they ask to change one, explain that and suggest they raise it with that retailer.`
    )
  }

  return (
    `Trading Grid Catalogue (TGC) — a B2B catalog data-sync network connecting retailer hubs and supplier spokes. ` +
    `This connection is the RETAILER side. ` +
    common +
    `SCOPE: authoring product requirements (attribute profiles, attributes, image requirements), monitoring the compliance of this retailer's OWN suppliers against those requirements, and managing vendor exceptions (waivers, extended deadlines, reduced scope). ` +
    `WRITES: before any write tool, restate the exact change to the user and get their explicit confirmation.`
  )
}

/**
 * Build an MCP server exposing exactly the tools this caller may use.
 *
 * The handler is constructed per request rather than once at module load
 * precisely because the tool list is caller-dependent — that is what makes
 * progressive scopes real rather than cosmetic.
 */
function buildHandler(ctx: CallerContext) {
  const tenant = getTenant(ctx.tenantId)
  const visible = toolsForScopes(ctx.scopes).filter(
    (t) => t.allowedTenantClasses.includes(ctx.tenantClass) && (ctx.subjectType !== "workload" || t.allowWorkload)
  )

  return createMcpHandler(
    (server) => {
      for (const tool of visible) {
        server.tool(
          tool.name,
          tool.description,
          tool.schema,
          annotationsFor(tool),
          async (args: unknown) => {
            // invokeTool interposes the confirmation step: a mutating tool's
            // first call previews and mints a token instead of acting. The
            // guard still wraps both phases, so the proposal and the approval
            // each produce their own audit line.
            const outcome = runGuarded(ctx, guardSpecFor(tool), () => invokeTool(ctx, tool, args))
            return asText(outcome.ok ? outcome.result : outcome.error)
          }
        )
      }

      // ── Starter prompts ────────────────────────────────────────────────────
      // Surfaced by MCP clients (e.g. claude.ai's prompt picker) as clickable
      // suggestions so a teammate opening the connector cold knows what to try.
      // Only offered when the tools behind them are actually available to this
      // caller — suggesting an action they'd be refused for is a worse
      // experience than not suggesting it.
      const canRead = visible.some((t) => t.kind === "read")
      const canWrite = visible.some((t) => t.kind === "write")
      const isSupplier = ctx.tenantClass === "supplier"

      const prompt = (text: string) => ({
        messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
      })

      // Supplier-side starters. A supplier asks the mirror question of a
      // retailer's, so offering them the retailer set would suggest actions
      // they'd simply be refused for.
      if (canRead && isSupplier) {
        server.prompt(
          "how-am-i-doing",
          "See your own compliance position across every retail partner.",
          async () =>
            prompt(
              "Using the TGC connector, how compliant is my catalogue? Break it down by retail partner and against the GS1 baseline, and tell me which partner I'm furthest behind for."
            )
        )

        server.prompt(
          "what-am-i-missing",
          "See exactly which attributes and images are still outstanding.",
          async () =>
            prompt(
              "What am I still missing in TGC? Ask me which retail partner (or the GS1 baseline), then list the attributes and images I most often fail to supply, and tell me separately which attributes have been waived for me."
            )
        )

        server.prompt(
          "what-has-been-waived",
          "Review the exceptions retailers have granted you.",
          async () =>
            prompt(
              "What exceptions have my retail partners granted me in TGC? For each, tell me who granted it, which attributes it covers, what it actually changes, and when it expires."
            )
        )
      }

      if (canRead && !isSupplier) {
        server.prompt(
          "review-supplier-compliance",
          "See which of your suppliers are furthest behind on compliance and on what.",
          async () =>
            prompt(
              "Using the TGC connector, which of my suppliers are furthest behind on compliance, and on what categories? Rank them by open gaps and cite the tool results."
            )
        )

        server.prompt(
          "audit-a-vendor",
          "Review one of your suppliers' open compliance gaps.",
          async () =>
            prompt(
              "I want to audit one of my suppliers in TGC. Ask me which supplier, then show their compliance — category, product counts, and open gaps. If the name doesn't match one of my suppliers, tell me which suppliers do have data."
            )
        )

        server.prompt(
          "run-compliance-report",
          "Run a compliance report across your vendor base against a profile or a System scorecard.",
          async () =>
            prompt(
              "Run a compliance report across my vendor base in TGC. Ask me whether to scan against one of my attribute profiles or a global System filter (list them with list_system_filters — e.g. GS1 Core Scorecard), then run it and summarize the worst vendors and the top missing attributes from the tool result."
            )
        )

        server.prompt(
          "explain-a-profile",
          "Get the full requirement breakdown for a category profile.",
          async () =>
            prompt(
              "Explain one of my TGC attribute profiles in full. Ask me which category, then break down its core attributes, extended attributes (standard GS1 vs. custom), per-attribute guidance, and image requirements."
            )
        )
      }

      if (canWrite) {
        server.prompt(
          "set-up-category-requirements",
          "Guided flow to create requirements for a new product category.",
          async () =>
            prompt(
              "Help me set up requirements for a new product category in TGC. First ask me which GS1 category it should cover, offering the ones still free by name and code, then create the attribute profile and walk me through adding key attributes and an image requirement — confirming each change before you write it."
            )
        )
      }
    },
    {
      serverInfo: { name: "tgc", version: "0.2.0" },
      instructions: buildInstructions(ctx, tenant?.name ?? ctx.tenantId),
    },
    { basePath: "/api" }
  )
}

/**
 * Authenticate, then dispatch. Everything tenant-owned sits behind this — the
 * MCP handler is never even constructed for an unauthenticated caller.
 */
async function handle(req: Request) {
  const auth = await authenticateMcpRequest(req)
  if (!auth.ok) return auth.response
  return buildHandler(auth.ctx)(req)
}

export const GET = handle
export const POST = handle
export const DELETE = handle
