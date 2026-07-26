// Read side of the MCP audit trail, for the portal's Access Log screen.
//
// Every line here was written by runGuarded() (lib/mcp/guard.ts) or by the
// authentication layer rejecting a caller before it got that far — so the log
// shows refusals, not just successes, which is the half that matters during an
// incident.
//
// ── Tenant scoping (ENT-05 applies to the log too) ──────────────────────────
// An audit log that shows every tenant's activity would undermine the very
// isolation it exists to evidence: a Dillard's administrator must not see
// J.Renée's or Belk's calls. So `?tenant=<id>` is REQUIRED, and omitting it
// returns nothing rather than everything — an unscoped audit read should never
// be the easy path.
//
// ── Honest demo caveat ──────────────────────────────────────────────────────
// The tenant arrives as a query parameter, which is precisely the "caller
// asserts its own tenant" pattern banned everywhere else in this codebase. It
// is tolerable here for one reason only: the prototype portal has no login of
// its own, so there is no session to derive a tenant from, and everything
// behind it is watermarked mock data.
//
// In production this endpoint takes a bearer token like any other: tenant from
// the token, `role === "admin"` required, and the log shipped to the platform's
// log sink rather than read out of process memory. Recorded as a named gap in
// docs/mcp-enterprise-auth-trd.md (ENT-10) rather than left to be discovered.

import { clearAudit, listAudit } from "@/lib/mcp/audit"
import { getTenant } from "@/lib/mcp/tenants"

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const tenantId = params.get("tenant")

  if (!tenantId) {
    return Response.json(
      {
        entries: [],
        error: "missing_tenant",
        error_description:
          "An audit read must name the tenant it is scoped to. Returning nothing rather than everything is deliberate.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }

  if (!getTenant(tenantId)) {
    return Response.json(
      { entries: [], error: "unknown_tenant" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    )
  }

  const limitParam = Number(params.get("limit") ?? 100)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100

  const all = listAudit(200)

  // Filter before slicing, so a busy neighbouring tenant can't push this
  // tenant's own lines out of the window.
  const entries = all.filter((e) => e.tenantId === tenantId).slice(0, limit)

  // ── Unattributed refusals ─────────────────────────────────────────────────
  // A call refused *before* authentication succeeded has no trustworthy tenant:
  // the token may name one, but the whole reason it was refused is that we
  // don't believe it. Filing those under the named tenant would let anyone
  // write lines into any tenant's log just by presenting a forged token.
  //
  // They can't be dropped either — an unexplained burst of rejected tokens is
  // precisely what an administrator needs to see. So they are returned in their
  // own band, labelled as unattributed, and the screen renders them separately.
  const unattributed = all.filter((e) => e.tenantId === "—").slice(0, limit)

  return Response.json(
    {
      tenant: tenantId,
      entries,
      unattributed,
      unattributedNote:
        "Refused before identity could be established, so these cannot be attributed to any organisation — a rejected token's own claims are not evidence of who sent it.",
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function DELETE() {
  clearAudit()
  return Response.json({ cleared: true })
}
