// Tenant registry + home-realm resolution for the TGC MCP server.
//
// This is the demo stand-in for what production does at the TG Aviator
// Gateway: a customer signs in against their OWN corporate IdP (Entra ID,
// Okta, Ping), and the tenant is derived from which realm authenticated them —
// the federated `iss` — never from anything the caller supplies.
//
// The rule this file exists to enforce: a caller can NEVER assert its own
// tenant. There is no tenant parameter, no tenant picker, and no code path
// that reads a tenant from user input. You authenticate as a person; the
// tenant follows from who that person is. A user-selectable tenant would be a
// privilege-escalation surface, so the demo doesn't model one even as a
// shortcut — see docs/mcp-enterprise-auth-trd.md (ENT-01, ENT-05).

/**
 * The two tenant *classes* on the network. §4A requires these to be isolated
 * from each other, not merely peers within one class: a supplier tenant must
 * never reach retailer-side tools, and vice versa.
 */
export type TenantClass = "retailer" | "supplier"

export interface Tenant {
  id: string
  /** Display name, e.g. "Dillard's". */
  name: string
  tenantClass: TenantClass
  /**
   * The email domain that maps to this tenant. Stands in for production's
   * home-realm discovery on the federated issuer — same shape (an
   * authenticated property of the identity), local source.
   */
  realm: string
}

/**
 * A demo identity. In production these live in the customer's own directory
 * and TGC never sees them — no password, no user table, and offboarding at the
 * customer revokes access without any action by us.
 */
export interface DemoUser {
  email: string
  /** Demo-only. Documented in docs/mcp-demo-quickstart.md. */
  password: string
  displayName: string
  jobTitle: string
  role: TenantRole
}

/**
 * Role *within* a tenant.
 *
 * Tenant isolation answers "whose data". It does not answer "which employee" —
 * and an access log is an administrative artifact: a category buyer should not
 * be able to read every AI action taken across their whole company.
 *
 * Deliberately narrow in scope: role governs who may read the audit log.
 * What an AI assistant may *do* stays governed by OAuth scopes, which is what
 * the consent screen grants. Two clean concepts rather than one muddled one —
 * scopes are what the agent may do, role is what the person may see.
 */
export type TenantRole = "admin" | "member"

// Three tenants, chosen so both halves of §4A row 5 are demonstrable:
//   - dillards vs. belk   → peer isolation WITHIN the retailer class
//   - dillards vs. jrenee → isolation ACROSS tenant classes
export const TENANTS: Tenant[] = [
  { id: "dillards", name: "Dillard's", tenantClass: "retailer", realm: "dillards.demo" },
  { id: "belk", name: "Belk", tenantClass: "retailer", realm: "belk.demo" },
  { id: "jrenee", name: "J.Renée", tenantClass: "supplier", realm: "jrenee.demo" },
]

// An admin and a member on each of the two demoed sides, so the role gate can
// be shown rather than merely asserted. Belk carries one member only — it
// exists purely as a peer-isolation foil.
export const DEMO_USERS: DemoUser[] = [
  {
    email: "admin@dillards.demo",
    password: "demo",
    displayName: "Priya Raman",
    jobTitle: "Catalogue Administrator, Dillard's",
    role: "admin",
  },
  {
    email: "buyer@dillards.demo",
    password: "demo",
    displayName: "Dana Reyes",
    jobTitle: "Category Buyer, Dillard's",
    role: "member",
  },
  {
    email: "buyer@belk.demo",
    password: "demo",
    displayName: "Alex Nwosu",
    jobTitle: "Category Buyer, Belk",
    role: "member",
  },
  {
    email: "admin@jrenee.demo",
    password: "demo",
    displayName: "Tomas Lindqvist",
    jobTitle: "Data Administrator, J.Renée",
    role: "admin",
  },
  {
    email: "catalog@jrenee.demo",
    password: "demo",
    displayName: "Sam Okafor",
    jobTitle: "Catalogue Manager, J.Renée",
    role: "member",
  },
]

/**
 * The tenant the in-portal (non-MCP) prototype runs as. The portal is a
 * single-persona demo whose retailer screens are Dillard's — but it still
 * calls the tool layer through an explicit identity rather than an implicit
 * one, so there is no unauthenticated code path into tenant data.
 */
export const PORTAL_TENANT_ID = "dillards"

export function getTenant(tenantId: string): Tenant | undefined {
  return TENANTS.find((t) => t.id === tenantId)
}

/**
 * Home-realm discovery: authenticated identity → tenant. The ONLY supported
 * way to determine a tenant. Returns undefined for an identity whose realm
 * isn't provisioned, which is a hard authentication failure — never a fallback
 * to a default tenant.
 */
export function resolveTenantByRealm(email: string): Tenant | undefined {
  const domain = email.split("@")[1]?.toLowerCase().trim()
  if (!domain) return undefined
  return TENANTS.find((t) => t.realm === domain)
}

export function findDemoUser(email: string): DemoUser | undefined {
  const q = email.toLowerCase().trim()
  return DEMO_USERS.find((u) => u.email.toLowerCase() === q)
}
