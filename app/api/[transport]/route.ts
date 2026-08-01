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
import { type CallerContext } from "@/lib/mcp/context"
import { runGuarded } from "@/lib/mcp/guard"
import { buildInstructions } from "@/lib/mcp/instructions"
import { annotationsFor, guardSpecFor, invokeTool, toolsForScopes } from "@/lib/mcp/manifest"
import { registerPrompts } from "@/lib/mcp/prompts"
import { getTenant } from "@/lib/mcp/tenants"

function asText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
}

/**
 * Attach the audit id to a tool response.
 *
 * The audit trail used to be write-only from the caller's point of view: every
 * call produced a line, and the caller was never told which one. That makes the
 * log unusable for the person who actually needs it — someone querying a figure
 * can describe what they asked but not name the record. Returning the id turns
 * "I ran a report this morning" into "audit-1753977600000-42".
 *
 * Only object payloads are annotated; a tool returning a bare array or scalar is
 * left alone rather than being wrapped into a different shape.
 */
function withAuditId(payload: unknown, auditId: string): unknown {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return payload
  return { ...(payload as Record<string, unknown>), audit_id: auditId }
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
            return asText(withAuditId(outcome.ok ? outcome.result : outcome.error, outcome.auditId))
          }
        )
      }

      registerPrompts(server, ctx, visible)
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
