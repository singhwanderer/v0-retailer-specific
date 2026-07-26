// Read side of the MCP audit trail, for the portal's Access Log screen.
//
// Every line here was written by runGuarded() (lib/mcp/guard.ts) or by the
// authentication layer rejecting a caller before it got that far — so the log
// shows refusals, not just successes, which is the half that matters during an
// incident.
//
// Demo scoping note, recorded in the TRD: this endpoint is unauthenticated
// because the prototype's portal has no login of its own, and the log contains
// only mock activity. In production the audit trail is tenant-scoped and
// readable only by that tenant's administrators.

import { clearAudit, listAudit } from "@/lib/mcp/audit"

export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 100)
  return Response.json(
    { entries: listAudit(Number.isFinite(limit) ? limit : 100) },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function DELETE() {
  clearAudit()
  return Response.json({ cleared: true })
}
