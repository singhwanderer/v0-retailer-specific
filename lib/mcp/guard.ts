// The single authorization choke point for every MCP tool call.
//
// §4A's most-cited multi-tenant failure mode is isolation enforced at login
// but never re-checked per call. This wrapper is the answer to that: it runs
// on EVERY invocation, re-checking tenant class and scope against the caller's
// context even though both were already checked when the token was issued.
//
// It is also the only place audit lines are emitted (§4A row 10). Keeping both
// responsibilities in one wrapper is deliberate — it makes the guarantees
// structural rather than a rule each new tool has to remember. A tool that
// isn't registered through the manifest, and therefore through this guard,
// doesn't reach tenant data at all.

import { auditFor } from "@/lib/mcp/audit"
import type { CallerContext, Scope } from "@/lib/mcp/context"
import type { TenantClass } from "@/lib/mcp/tenants"

export interface ToolGuardSpec {
  name: string
  requiredScope: Scope
  /** Which tenant classes may call this tool at all. */
  allowedTenantClasses: TenantClass[]
  /** Workload (no-human) identities are refused unless this is true. */
  allowWorkload: boolean
}

export type GuardOutcome<T> =
  | { ok: true; result: T }
  | { ok: false; error: { error: string; code: "forbidden_tenant_class" | "insufficient_scope" | "tool_error" } }

/**
 * Authorize and run one tool invocation.
 *
 * Checks run in order of how much they reveal: tenant class first (a supplier
 * tenant shouldn't even learn which scopes a retailer tool wants), then scope,
 * then the call itself. Every path — including a thrown error — produces
 * exactly one audit line.
 */
export function runGuarded<T>(
  ctx: CallerContext,
  spec: ToolGuardSpec,
  invoke: () => T
): GuardOutcome<T> {
  const started = Date.now()

  if (!spec.allowedTenantClasses.includes(ctx.tenantClass)) {
    const reason = `Tool "${spec.name}" is not available to ${ctx.tenantClass} tenants.`
    auditFor(ctx, spec.name, spec.requiredScope, "denied", Date.now() - started, reason)
    return { ok: false, error: { error: reason, code: "forbidden_tenant_class" } }
  }

  if (!ctx.scopes.has(spec.requiredScope)) {
    const reason = `Missing required scope "${spec.requiredScope}". This connection was granted: ${[...ctx.scopes].join(", ") || "(none)"}.`
    auditFor(ctx, spec.name, spec.requiredScope, "denied", Date.now() - started, reason)
    return { ok: false, error: { error: reason, code: "insufficient_scope" } }
  }

  if (ctx.subjectType === "workload" && !spec.allowWorkload) {
    const reason = `Tool "${spec.name}" requires a human-delegated session. This caller is an autonomous workload identity with no user to act on behalf of.`
    auditFor(ctx, spec.name, spec.requiredScope, "denied", Date.now() - started, reason)
    return { ok: false, error: { error: reason, code: "forbidden_tenant_class" } }
  }

  try {
    const result = invoke()
    auditFor(ctx, spec.name, spec.requiredScope, "allowed", Date.now() - started)
    return { ok: true, result }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    auditFor(ctx, spec.name, spec.requiredScope, "error", Date.now() - started, reason)
    return { ok: false, error: { error: `Tool "${spec.name}" failed: ${reason}`, code: "tool_error" } }
  }
}
