// Proactive compliance check running under a workload identity (§4A row 4).
//
// Everything else in this prototype is a human asking a question through their
// AI client. This is the other case, and the one most "enterprise MCP" demos
// skip: an agent acting on a schedule with NO human in the session.
//
// A delegated user token only exists while someone is signed in, so an
// autonomous run cannot borrow one. It authenticates as itself, through the
// client-credentials grant, using an identity provisioned against exactly one
// tenant (WORKLOAD_CLIENTS in lib/mcp/oauth.ts) and granted read-only scope.
// It therefore cannot pick a tenant, and cannot write — an agent must not be
// able to waive a compliance requirement with nobody to approve it.
//
// The run goes through the same token verification and the same runGuarded()
// choke point as any other caller, so it appears in the audit trail with
// subject_type "workload" and no subject id. That contrast — same tenant,
// different subject type, no human — is the point worth showing.
//
// (It calls the tool layer in-process after verifying its own token, rather
// than re-entering the MCP JSON-RPC transport. Authorization is identical; it
// just skips a network hop to itself.)

import { auditFor } from "@/lib/mcp/audit"
import type { CallerContext } from "@/lib/mcp/context"
import { runGuarded } from "@/lib/mcp/guard"
import { getToolDefinition } from "@/lib/mcp/manifest"
import {
  WORKLOAD_CLIENTS,
  issueAccessToken,
  originFromRequest,
  resourceIdentifier,
  verifyAccessToken,
} from "@/lib/mcp/oauth"
import { getTenant } from "@/lib/mcp/tenants"

const GAP_ALERT_THRESHOLD = 40

export async function POST(req: Request) {
  const issuer = originFromRequest(req)
  const audience = resourceIdentifier(req)
  const workload = WORKLOAD_CLIENTS[0]

  // 1. The agent authenticates as itself — no user, no borrowed token.
  const { token } = await issueAccessToken({
    issuer,
    audience,
    subject: `workload:${workload.client_id}`,
    tenantId: workload.tenantId,
    agentId: workload.client_id,
    subjectType: "workload",
    scopes: workload.scopes,
  })

  // 2. Verified exactly as the MCP endpoint verifies any caller.
  const verified = await verifyAccessToken(token, { issuer, audience })
  if (!verified.ok) {
    return Response.json({ error: verified.error.detail }, { status: 500 })
  }

  const tenant = getTenant(verified.value.tenantId)
  if (!tenant) return Response.json({ error: "Workload tenant is not provisioned." }, { status: 500 })

  const ctx: CallerContext = {
    tenantId: tenant.id,
    tenantClass: tenant.tenantClass,
    subjectType: "workload",
    subjectId: null,
    // No role: a service identity is not a person and holds no administrative
    // standing, however broad its scopes.
    role: null,
    agentId: verified.value.agentId,
    scopes: new Set(verified.value.scopes),
  }

  // 3. Same manifest, same guard, same audit trail as a human caller.
  const tool = getToolDefinition("run_compliance_report")
  if (!tool) return Response.json({ error: "run_compliance_report is not registered." }, { status: 500 })

  const outcome = runGuarded(
    ctx,
    {
      name: tool.name,
      requiredScope: tool.requiredScope,
      allowedTenantClasses: tool.allowedTenantClasses,
      allowWorkload: tool.allowWorkload,
    },
    () => tool.handler(ctx, { maxAttributes: 5 })
  )

  if (!outcome.ok) {
    return Response.json({ ranAs: describe(ctx, tenant.name), refused: outcome.error }, { status: 403 })
  }

  // 4. Turn the report into the alerts a proactive agent would actually raise.
  const report = outcome.result as {
    overallPct?: number
    totalGaps?: number
    missingAttributes?: { name: string; count: number }[]
    rows?: { kind: string; supplier?: string; category?: string; openGaps?: number; pct?: number }[]
  }
  const alerts = (report.rows ?? [])
    .filter((r) => r.kind === "vendor" && (r.openGaps ?? 0) >= GAP_ALERT_THRESHOLD)
    .sort((a, b) => (b.openGaps ?? 0) - (a.openGaps ?? 0))
    .slice(0, 5)
    .map((r) => ({
      vendor: r.supplier,
      category: r.category,
      openGaps: r.openGaps,
      compliancePct: r.pct,
      message: `${r.supplier} has ${r.openGaps} open compliance gaps on ${r.category} — above the ${GAP_ALERT_THRESHOLD}-gap alert threshold.`,
    }))

  // The run itself is audited by runGuarded; this second line records what the
  // agent decided to escalate, which is the part a human is accountable for.
  auditFor(ctx, "proactive_alert_raised", tool.requiredScope, "allowed", 0, `${alerts.length} vendor alert(s)`)

  return Response.json({
    ranAs: describe(ctx, tenant.name),
    alertThreshold: GAP_ALERT_THRESHOLD,
    overallCompliancePct: report.overallPct,
    totalGaps: report.totalGaps,
    alerts,
    topMissingAttributes: (report.missingAttributes ?? []).slice(0, 5),
    note:
      "Raised with no human in the session, under a read-only service identity provisioned for this tenant. The same identity cannot call any write tool — see the manifest's allowWorkload flag.",
  })
}

function describe(ctx: CallerContext, tenantName: string) {
  return {
    tenant: `${tenantName} (${ctx.tenantId})`,
    tenantClass: ctx.tenantClass,
    subjectType: ctx.subjectType,
    subjectId: ctx.subjectId,
    agentId: ctx.agentId,
    scopes: [...ctx.scopes],
  }
}
