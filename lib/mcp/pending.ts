// Two-phase confirmation for every non-read tool.
//
// ── Why this exists ──────────────────────────────────────────────────────────
// The in-portal Compliance Agent gets a human in the loop for free: it renders
// a proposal card with Apply and Cancel, and nothing mutates until someone
// clicks. An external Claude or ChatGPT session has no such card. If the only
// safeguard is "the assistant will probably describe what it's about to do",
// then the safeguard is a hope, not a control.
//
// So the confirmation lives in the protocol instead of the UI. A write tool
// never mutates on its first call: it validates, computes the exact effect, and
// returns a preview plus a short-lived token. A single separate tool,
// confirm_pending_change, is the only path that executes. That buys three
// properties worth defending in review:
//
//   1. The assistant must state the consequence before a human can approve it,
//      because the preview IS the tool's first response.
//   2. Approval is a distinct, separately audited act — the log shows a
//      proposal and an approval as two lines, not one opaque mutation.
//   3. An abandoned conversation changes nothing. A token nobody confirms
//      simply expires.
//
// ── The token carries no authority ───────────────────────────────────────────
// Holding a token is not permission to execute. On confirm, the tenant, the
// scopes and the tenant class are all re-checked against the *confirming*
// caller's context, exactly as they were on the proposing call — the token only
// says "this is the change that was described", never "this caller may make
// it". Anything else would make the token a bearer credential we minted to
// bypass our own guard.

import type { CallerContext } from "@/lib/mcp/context"

/** Deliberately short. A proposal is a live conversational turn, not a ticket. */
export const PENDING_TTL_MS = 10 * 60 * 1000

export interface PendingChange {
  token: string
  /** The tool that will actually run at confirm time. */
  tool: string
  /** Validated arguments, replayed verbatim into the tool's handler. */
  args: unknown
  /** One line: what this will do, in the user's terms. */
  summary: string
  /** The consequences a human needs before approving — one bullet per line. */
  effect: string[]
  /** Bound at proposal time and re-checked at confirm time. */
  tenantId: string
  subjectId: string | null
  createdAt: number
  expiresAt: number
}

const globalScope = globalThis as typeof globalThis & {
  __tgcPendingChanges?: Map<string, PendingChange>
}

function store(): Map<string, PendingChange> {
  globalScope.__tgcPendingChanges ??= new Map()
  return globalScope.__tgcPendingChanges
}

function sweepExpired(now: number): void {
  for (const [token, pending] of store()) {
    if (pending.expiresAt <= now) store().delete(token)
  }
}

let seq = 0

export function createPendingChange(
  ctx: CallerContext,
  tool: string,
  args: unknown,
  summary: string,
  effect: string[]
): PendingChange {
  const now = Date.now()
  sweepExpired(now)
  const pending: PendingChange = {
    token: `chg_${now.toString(36)}_${(seq++).toString(36)}`,
    tool,
    args,
    summary,
    effect,
    tenantId: ctx.tenantId,
    subjectId: ctx.subjectId,
    createdAt: now,
    expiresAt: now + PENDING_TTL_MS,
  }
  store().set(pending.token, pending)
  return pending
}

export type PendingLookup =
  | { ok: true; pending: PendingChange }
  | { ok: false; error: string }

/**
 * Resolve a token for a caller who wants to execute it.
 *
 * The tenant check here is the load-bearing one: a token proposed inside one
 * organisation's session must not be redeemable from another's, or the token
 * becomes a way to smuggle a change across the tenant boundary that every other
 * check in this codebase exists to hold.
 */
export function takePendingChange(ctx: CallerContext, token: string): PendingLookup {
  const now = Date.now()
  sweepExpired(now)

  const pending = store().get(token)
  if (!pending) {
    return {
      ok: false,
      error: `No pending change with token "${token}". It may have already been confirmed, or expired — proposals are valid for ${PENDING_TTL_MS / 60000} minutes. Re-run the original request to get a fresh proposal.`,
    }
  }

  if (pending.tenantId !== ctx.tenantId) {
    // Deliberately the same message as an unknown token: confirming or denying
    // that someone else's token exists is itself a cross-tenant disclosure.
    return {
      ok: false,
      error: `No pending change with token "${token}". It may have already been confirmed, or expired — proposals are valid for ${PENDING_TTL_MS / 60000} minutes. Re-run the original request to get a fresh proposal.`,
    }
  }

  // Single-use. Removed before execution so a retried confirm can't apply the
  // same change twice.
  store().delete(token)
  return { ok: true, pending }
}

/** Outstanding proposals for this tenant — powers list_pending_changes. */
export function listPendingChanges(ctx: CallerContext): PendingChange[] {
  const now = Date.now()
  sweepExpired(now)
  return [...store().values()]
    .filter((p) => p.tenantId === ctx.tenantId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function discardPendingChange(ctx: CallerContext, token: string): boolean {
  const pending = store().get(token)
  if (!pending || pending.tenantId !== ctx.tenantId) return false
  return store().delete(token)
}
