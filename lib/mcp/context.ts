// Caller identity for every tool invocation.
//
// §4A's load-bearing requirement is that a valid token is NOT proof the caller
// may see this tenant's data — the check has to happen again at each
// individual tool call. That is only possible if every tool receives a caller
// identity, so CallerContext is threaded as the first parameter of every
// function in lib/mcp/tools.ts rather than resolved at the edge and forgotten.
//
// Note the deliberate separation of claims: "which tenant" and "which agent"
// are distinct, independently checkable fields, not one bucket credential
// everyone shares (§4A row 3). And `subjectType` distinguishes a human-
// delegated session from an autonomous workload (§4A row 4).

import {
  DEMO_USERS,
  PORTAL_TENANT_ID,
  resolveTenantByRealm,
  type TenantClass,
  type TenantRole,
} from "@/lib/mcp/tenants"

/**
 * Progressive scopes (§4A row 6). A connection starts at read-only; write
 * scopes are granted only when a specific action needs them.
 */
export const SCOPES = {
  read: "tgc.read",
  requirementsWrite: "tgc.requirements.write",
  exceptionsWrite: "tgc.exceptions.write",
  /**
   * Removal and deactivation, required IN ADDITION to the relevant write scope.
   *
   * Adding an attribute to a profile and deleting a profile that thousands of
   * vendor items are assessed against are not the same authority, and consenting
   * to the first should not silently grant the second. Kept unchecked by default
   * on the consent screen for that reason.
   */
  destructive: "tgc.destructive",
} as const

export type Scope = (typeof SCOPES)[keyof typeof SCOPES]

export const ALL_SCOPES: Scope[] = [
  SCOPES.read,
  SCOPES.requirementsWrite,
  SCOPES.exceptionsWrite,
  SCOPES.destructive,
]

/** The default a fresh connection gets if it asks for nothing specific. */
export const DEFAULT_SCOPES: Scope[] = [SCOPES.read]

export function isScope(value: string): value is Scope {
  return (ALL_SCOPES as string[]).includes(value)
}

export function parseScopes(scopeParam: string | null | undefined): Scope[] {
  if (!scopeParam) return []
  return scopeParam.split(/[\s+]+/).filter(isScope)
}

export interface CallerContext {
  /** Derived from the authenticated identity's realm. Never from user input. */
  tenantId: string
  /** Retailer and supplier tenants are isolated from each other. */
  tenantClass: TenantClass
  /**
   * "user" = a human delegated the action in a live session.
   * "workload" = an autonomous agent acting under its own scoped service
   * identity, with no human in the session (§4A row 4).
   */
  subjectType: "user" | "workload"
  /** The acting human, or null for a workload. */
  subjectId: string | null
  /**
   * The acting human's role within the tenant. Governs who may read the audit
   * log — NOT what tools may be called, which stays scope-governed. A workload
   * has no role: it is not a person and has no administrative standing.
   */
  role: TenantRole | null
  /** Which agent/client is calling — a separate claim from tenant. */
  agentId: string
  scopes: Set<Scope>
}

export function hasScope(ctx: CallerContext, scope: Scope): boolean {
  return ctx.scopes.has(scope)
}

/**
 * The identity the in-portal prototype's own direct calls run under. The
 * portal's retailer screens call lib/mcp/tools.ts in-process (not over MCP),
 * and they still pass an explicit context — so no code path reaches tenant
 * data without one.
 */
export const PORTAL_CTX: CallerContext = {
  tenantId: PORTAL_TENANT_ID,
  tenantClass: "retailer",
  subjectType: "user",
  subjectId: "portal-session",
  role: "admin",
  agentId: "tgc-portal-ui",
  scopes: new Set(ALL_SCOPES),
}

/** Distinguishes the in-app copilot from the connector in the audit trail. */
export const COPILOT_AGENT_ID = "tgc-compliance-agent"

/**
 * The identity the in-app TGC Compliance Agent runs under.
 *
 * It is an AI agent reading this tenant's catalogue and compliance data, so its
 * calls belong in the same access log as the external connector's. But note the
 * difference the log has to stay honest about: a connector's identity is proved
 * by a verified token, whereas this one is *asserted by the browser* — the
 * prototype portal has no login to derive it from. Same documented compromise
 * as the `?tenant=` parameter on /api/mcp-audit (ENT-10), and the reason these
 * lines carry their own agent id rather than blending in.
 */
export function copilotCtx(role: TenantRole): CallerContext {
  const persona = DEMO_USERS.find(
    (u) => u.role === role && resolveTenantByRealm(u.email)?.id === PORTAL_TENANT_ID
  )

  return {
    tenantId: PORTAL_TENANT_ID,
    tenantClass: "retailer",
    subjectType: "user",
    subjectId: persona?.email ?? "portal-session",
    role,
    agentId: COPILOT_AGENT_ID,
    // What this agent's own tools actually need — it reads, and it proposes
    // changes the user applies by hand. It is never granted destructive scope.
    scopes: new Set<Scope>([SCOPES.read, SCOPES.requirementsWrite]),
  }
}
