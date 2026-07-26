// Audit log for MCP tool calls (§4A row 10).
//
// Without conversation-level logging a security incident can't be
// reconstructed and compliance can't be demonstrated. Every line records the
// full set of claims that authorized the call — who, which agent, which
// tenant, which tool, which scope — plus the outcome.
//
// The single emit point is withTenantGuard() in lib/mcp/guard.ts, so a tool
// cannot be added that silently skips auditing. That is the reason the guard
// exists as one wrapper rather than per-tool discipline.
//
// Demo storage is a bounded in-memory ring buffer, which means it is per
// serverless instance and resets on cold start — the same honest caveat the
// demo store already carries. Production ships these to the platform's log
// sink, not to process memory.

import type { CallerContext } from "@/lib/mcp/context"

export type AuditOutcome = "allowed" | "denied" | "error"

export interface AuditEntry {
  id: string
  timestamp: string
  tenantId: string
  tenantClass: string
  subjectType: "user" | "workload"
  subjectId: string | null
  agentId: string
  tool: string
  /** The scope the tool required, whether or not the caller had it. */
  requiredScope: string
  outcome: AuditOutcome
  /** Populated when outcome is denied/error — why it was refused. */
  reason?: string
  latencyMs: number
}

const MAX_ENTRIES = 200
const entries: AuditEntry[] = []
let seq = 0

export function recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${seq++}`,
    timestamp: new Date().toISOString(),
  }
  entries.unshift(full)
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
  return full
}

/**
 * Record a refusal that happened before a CallerContext could be built — an
 * unauthenticated call, a bad signature, or a token minted for a different
 * resource (the confused-deputy case, §4A rows 2 and 7). These matter most in
 * an audit trail precisely because there is no established identity to blame.
 */
export function recordUnauthenticated(
  tool: string,
  reason: string,
  detail?: { agentId?: string; tenantId?: string }
): AuditEntry {
  return recordAudit({
    tenantId: detail?.tenantId ?? "—",
    tenantClass: "—",
    subjectType: "user",
    subjectId: null,
    agentId: detail?.agentId ?? "unauthenticated",
    tool,
    requiredScope: "—",
    outcome: "denied",
    reason,
    latencyMs: 0,
  })
}

export function auditFor(
  ctx: CallerContext,
  tool: string,
  requiredScope: string,
  outcome: AuditOutcome,
  latencyMs: number,
  reason?: string
): AuditEntry {
  return recordAudit({
    tenantId: ctx.tenantId,
    tenantClass: ctx.tenantClass,
    subjectType: ctx.subjectType,
    subjectId: ctx.subjectId,
    agentId: ctx.agentId,
    tool,
    requiredScope,
    outcome,
    latencyMs,
    reason,
  })
}

export function listAudit(limit = 100): AuditEntry[] {
  return entries.slice(0, limit)
}

export function clearAudit(): void {
  entries.length = 0
}
