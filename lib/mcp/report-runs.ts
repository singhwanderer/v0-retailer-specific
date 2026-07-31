// Report run history — the thing that turns a report from prose in a chat log
// into an artifact with a name.
//
// Before this, run_compliance_report computed a ReportResult, rendered it into
// the tool response, and dropped it. The report existed only as whatever the
// model chose to say about it, which is the wrong place for a number an auditor
// might ask about later. `ReportRequest` (lib/compliance-report.ts) already had
// exactly the right shape — id, requester, timestamp, parameters, result — and
// already drove the portal's own report queue. It simply had nowhere to live on
// the MCP path.
//
// ── Why the tenant key is load-bearing here ──────────────────────────────────
// These runs are served as MCP *resources*, and resources do not pass through
// runGuarded() the way tool calls do — the route registers only the calling
// tenant's runs (app/api/[transport]/route.ts), so another tenant's run is
// never addressable in the first place, and the read callback guards on top of
// that. Both of those depend on runs being partitioned by tenant at rest, which
// is what this module is for. A flat list keyed only by run id would make the
// isolation a filter someone has to remember rather than a property of storage.
//
// Storage is the same honest caveat as the rest of the prototype: process
// memory, pinned to globalThis, bounded, reset on cold start. Production ships
// this to the same datastore the portal's report queue reads from — at which
// point a run made in chat and a run made on-screen become one list, which is
// the actual point of the exercise.

import { reportToCsv, type ReportRequest } from "@/lib/compliance-report"

/**
 * Runs retained per tenant. Bounded like the audit ring buffer: a demo that
 * runs reports in a loop should drop old ones rather than grow without limit.
 */
const MAX_RUNS_PER_TENANT = 50

const globalScope = globalThis as typeof globalThis & {
  __tgcReportRuns?: Record<string, ReportRequest[]>
}

function runsFor(tenantId: string): ReportRequest[] {
  globalScope.__tgcReportRuns ??= {}
  globalScope.__tgcReportRuns[tenantId] ??= []
  return globalScope.__tgcReportRuns[tenantId]
}

let seq = 0

/**
 * A short, quotable run id.
 *
 * Deliberately not a UUID: the whole value of a run id here is that someone can
 * read it out of a chat response, paste it into a support ticket, or say it out
 * loud in a meeting. `run-20260731-4f2a` survives that; a 36-character UUID does
 * not.
 */
export function newRunId(at: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  const day = `${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}`
  const suffix = (Date.now() % 46656).toString(36).padStart(3, "0")
  return `run-${day}-${suffix}${(seq++ % 36).toString(36)}`
}

/**
 * The RFC 6570 template the MCP resource is registered under.
 *
 * Kept next to reportRunUri() so the address a tool response advertises and the
 * address the server actually serves cannot drift apart — the failure mode
 * there is a link that looks right and resolves to nothing.
 */
export const REPORT_RUN_URI_TEMPLATE = "report://run/{id}"

/** The canonical resource URI for a run. One place, so the tool response and the registration cannot drift. */
export function reportRunUri(id: string): string {
  return `report://run/${id}`
}

/** Parse a run id back out of a resource URI, or null if it isn't one. */
export function runIdFromUri(uri: string): string | null {
  const match = /^report:\/\/run\/(.+)$/.exec(uri)
  return match ? match[1] : null
}

export function recordReportRun(tenantId: string, request: ReportRequest): ReportRequest {
  const runs = runsFor(tenantId)
  runs.unshift(request)
  if (runs.length > MAX_RUNS_PER_TENANT) runs.length = MAX_RUNS_PER_TENANT
  return request
}

/** This tenant's runs, newest first. */
export function listReportRuns(tenantId: string, limit = MAX_RUNS_PER_TENANT): ReportRequest[] {
  return runsFor(tenantId).slice(0, limit)
}

/**
 * One run, scoped to the tenant asking for it.
 *
 * Taking `tenantId` rather than searching every tenant's runs is the isolation
 * boundary: there is no lookup-by-id-alone in this module, so no caller can
 * accidentally resolve another tenant's run by holding its id.
 */
export function getReportRun(tenantId: string, id: string): ReportRequest | undefined {
  return runsFor(tenantId).find((r) => r.id === id)
}

/**
 * The summary shape returned by list_report_runs and get_report_run.
 *
 * Deliberately omits `result.rows`: a vendor-base scan carries hundreds of rows,
 * and a run listing is a menu, not the report. The rows are in the CSV behind
 * the resource — which is the point of having a resource.
 */
export function summariseRun(run: ReportRequest) {
  return {
    run_id: run.id,
    resource_uri: reportRunUri(run.id),
    requested_by: run.requestedBy,
    requested_at: run.requestedAt,
    status: run.status,
    filter: {
      label: run.filterLabel,
      type: run.filter.kind === "system" ? "System" : "Account",
    },
    profile: run.profileName,
    vendor_scope: run.vendorScope,
    max_attributes: run.options.maxAttributes,
    file_name: run.fileName,
    headline: {
      overall_pct: run.result.overallPct,
      items_assessed: run.result.itemsAssessed,
      items_complete: run.result.itemsComplete,
      total_gaps: run.result.totalGaps,
    },
  }
}

/** The CSV for a run, generated from the stored request via the same exporter the portal uses. */
export function runCsv(run: ReportRequest): string {
  return reportToCsv(run)
}
