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

import { PORTAL_TENANT_ID, type TenantClass, type TenantRole } from "@/lib/mcp/tenants"

/**
 * Progressive scopes (§4A row 6). A connection starts at read-only; write
 * scopes are granted only when a specific action needs them.
 */
export const SCOPES = {
  read: "tgc.read",
  requirementsWrite: "tgc.requirements.write",
  exceptionsWrite: "tgc.exceptions.write",
  /**
   * Switching enforcement on or off for a whole profile, required IN ADDITION
   * to `requirementsWrite`.
   *
   * Authoring produces a Draft, which nothing is assessed against — activating
   * it starts measuring every vendor item in the category against it. That is
   * the moment the requirement acquires teeth, so it is a separate grant and is
   * never pre-checked: a human ticks it, or a human activates in the portal.
   */
  activate: "tgc.requirements.activate",
  /**
   * Removal, required IN ADDITION to the relevant write scope.
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
  SCOPES.activate,
  SCOPES.destructive,
]

/**
 * The default a fresh connection gets if it asks for nothing specific — i.e.
 * the floor for a token whose grant carries no scope claim at all. Read-only,
 * deliberately: an unspecified grant should never be able to write.
 */
export const DEFAULT_SCOPES: Scope[] = [SCOPES.read]

/**
 * What the consent screen arrives with pre-checked, which is a different
 * question from the fallback above: here a human is looking at the list and
 * approving it.
 *
 * Authoring is included because it cannot act unilaterally — a write previews
 * first and only applies once the person approves the confirmation token, and
 * what it produces is a Draft that nothing is assessed against until someone
 * activates it. Activation and removal are the authorities that bite, and they
 * stay unchecked (see SCOPES.activate / SCOPES.destructive). Least privilege
 * here is about which authorities a connection holds, not about refusing to
 * write at all.
 */
export const CONSENT_DEFAULT_SCOPES: Scope[] = [SCOPES.read, SCOPES.requirementsWrite]

export function isScope(value: string): value is Scope {
  return (ALL_SCOPES as string[]).includes(value)
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
