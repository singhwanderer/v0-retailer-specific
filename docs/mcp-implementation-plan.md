# TGC MCP — implementation plan

> Sequencing for the capabilities named across
> [`mcp-pm-presentation.md`](./mcp-pm-presentation.md) — §6 of its long-form
> read, and the L1–L4 ladder in
> [Appendix B](./mcp-pm-presentation.md#appendix-b--the-l0-l4-capability-ladder)
> with its proposed tools in Appendix E.
>
> Nothing here is costed. Sizes are relative (S/M/L) and deliberately not
> converted into dates — the dependency order is the useful part, not the
> arithmetic.

## Why this document exists

The prototype has reached the point where the *next* thing to build is no
longer obvious from the demo. Several capabilities look independent and are
not: three separate gaps resolve to one missing MCP primitive (resources),
and almost everything resolves to one missing piece of infrastructure
(persistence). Building them in the wrong order means building some of them
twice.

## The dependency graph, stated once

```
  Phase 0  Demo safety ──────────────┐  (independent, hours)
                                     │
  Phase 1  Persistence ──────────────┼──> unblocks 2, 3, 4
     │                               │
     ├──> Phase 2  Artifact parity (L1) + async jobs
     │        │
     │        └──> resources primitive ──> also unblocks 4 (subscribe) and 5 (help docs)
     │
     ├──> Phase 3  Captured history (L2)
     │
     └──> Phase 4  Proactive push + subscriptions (L3)

  Phase 5  Coverage expansion ───────  (mostly independent, can run in parallel)
  Cross-cutting: guarded resources, the eval bar, deployment topology
```

Two things fall out of that graph and are worth saying plainly:

- **Persistence is not a feature, it is the gate.** L1 needs runs to persist,
  L2 needs snapshots to persist, L3 needs a schedule and a subscription
  registry to persist. Doing it once, first, is cheaper than three partial
  versions.
- **Resources are the highest-leverage single primitive.** The connector
  registers none today (no `server.resource(...)` anywhere in
  `app/api/[transport]/route.ts`). Adding them resolves artifact parity, help
  content, and the protocol-native form of subscriptions — three items that
  look unrelated on a roadmap.

---

## Phase 0 — Demo safety (S, independent, do first)

Not a feature. Removes the failure modes that can break a live session.

| Item | Detail |
| --- | --- |
| Pin the OAuth signing key | Set `TGC_OAUTH_PRIVATE_JWK` in the deploy environment (`scripts/generate-oauth-key.mjs` generates it). Without it, `createKeys()` (`lib/mcp/oauth.ts:148`) mints a **per-instance** key, so a token signed by one serverless instance fails verification on another. |
| Know the residual risk | Registered clients and auth codes (`oauth.ts:181`) and pending-change tokens (`pending.ts:58`) are still per-instance. A two-phase confirm can therefore fail between preview and confirm. Phase 1 fixes it properly; until then, run demos in one sitting. |

**Acceptance:** sign in, connect, propose a write, confirm it — repeatedly,
across enough calls to hit more than one instance.

---

## Phase 1 — Persistence foundation (M, the unlock)

**Goal:** one shared, tenant-keyed store so state survives instance
recycling and the prototype works for someone opening the link unattended.

**Decision required before starting.** The state is JSON-shaped and
tenant-keyed already (`DemoStore` in `lib/mcp/store.ts`), so a KV store fits
with almost no restructuring and no auto-pause is the property that matters
most for an unattended demo. A relational store only pays for itself if
Phase 3's snapshots want real range queries — which is a reason to decide
Phase 1 and Phase 3 together rather than separately.

**Work items**

- Introduce a storage interface with the current in-memory implementation
  behind it, so the migration is per-consumer rather than big-bang.
- Migrate, in this order (riskiest-to-demo first):
  1. `lib/mcp/pending.ts` — confirmation tokens
  2. `lib/mcp/oauth.ts` — registered clients, auth codes
  3. `lib/mcp/audit.ts` — the access log
  4. `lib/mcp/store.ts` — profiles, profile extras, vendor exceptions
- Keep tenant as the key prefix throughout. The existing comment in
  `store.ts` is explicit that per-tenant isolation is not properly testable
  against module state — this is where that becomes testable.
- Update the `demo_note` strings that currently say writes "reset
  periodically" / on cold start. They will no longer be true.

**Acceptance:** a write made in chat is still there after a redeploy; a
confirm token minted by one instance is honoured by another; two tenants'
writes never collide.

**Watch for:** the client-side copy of the store. `hydrateVendorExceptions`
(`store.ts`) exists because the browser bundle has its own module-global copy
seeded from mock data. Persistence changes what that reconciliation should do.

---

## Phase 2 — Artifact parity (L1) + async job handles (L, highest structural leverage)

**Goal:** a report stops being prose in someone's chat history and becomes a
thing that can be named, re-opened, attached, and handed to an auditor —
which is most of what the Compliance Reports screen was for.

**Work items**

- **Persist a report run**: `run_id`, parameters, timestamp, requester — the
  same fields the queue row already displays. `ReportRequest`
  (`lib/compliance-report.ts`) already has this shape; it just has nowhere to
  live.
- **Register the first MCP resources**: `report://run/{id}`, with the CSV that
  `reportToCsv()` already generates attached as a blob. Attach it every time
  rather than asking — asking burns a conversational turn on a question whose
  answer is almost always yes, and an unwanted attachment costs nothing.
- **Add `list_report_runs` / `get_report_run`** and return a resource link
  from `run_compliance_report` rather than only prose.
- **Async job handles**: `start_report` → `get_report_status`. MCP is
  synchronous and a real vendor-base scan will not return inside one tool
  call. The UI already simulates a Running → Complete queue, so the states
  exist conceptually. Same persistence work as the above — sequence together.

**The security rule this phase must not get wrong.** Every authorization
control in this codebase runs through `runGuarded()` on *tool* invocation.
Resources are a **new surface that does not pass through it**. Retailer-authored
`guidance` is tenant-owned data — one retailer's phrasing of what it wants
from suppliers is not neutral reference material. Serving resources unguarded
would walk straight around the choke point the whole authorization story
depends on.

> **Requirement:** resources are filtered per caller and guarded on read, from
> the first one registered — mirroring how `buildHandler()`
> (`app/api/[transport]/route.ts`) already filters tools by scope and tenant
> class before registering them.

**Acceptance:** "the Belk scan from Tuesday" resolves to a resource; a second
tenant cannot read it; the read appears in the audit log.

---

## Phase 3 — Captured history (L2) (M)

**Goal:** turn reconstructed history into recorded history.

Today `lib/compliance-history.ts` reconstructs past catalogue states and
scores each with the real engine — every point is genuine engine output, but
no month before today was ever *observed*. That distinction is currently
carried honestly in `provenance: "reconstructed"` and in every tool
`demo_note`.

**Work items**

- A scheduled snapshot job persisting monthly `ReportResult`s per tenant per
  filter (naturally the same scheduler Phase 4 needs — build once).
- Extend `get_compliance_trend` with real `from` / `to` / `grain`.
- **Mixed provenance, per point.** Once snapshots begin, some months are
  captured and earlier ones are still backfilled reconstruction. The payload
  should say which is which per point, not carry one flat label for the
  series. A series that silently mixes the two is worse than one that is
  wholly reconstructed and says so.

**Acceptance:** a month that was snapshotted reports `captured`; a month
before the job existed reports `reconstructed`; the trend abstention eval
still passes for questions neither can answer.

---

## Phase 4 — Proactive push and subscriptions (L3) (M, highest long-term leverage)

**Goal:** the rung where conversational access stops merely matching the
dashboard and starts beating it. Most dashboard visits end in nothing —
someone checks that nothing is on fire and closes the tab. A system that stays
quiet and speaks only when something *is* on fire removes the failure mode a
dashboard cannot fix: nobody looking on the day it mattered.

**The hard part is already built.** `app/api/demo/proactive-check/route.ts`
runs a compliance scan under a workload identity — its own client-credentials
token, read-only scope, tenant-pinned, through the same `runGuarded()` choke
point, landing in the audit trail with subject type `workload`. What it lacks
is a schedule and a delivery channel.

**Work items**

- A scheduler (shared with Phase 3's snapshot job).
- A delivery channel, and a decision about which: email digest, webhook, or
  in-portal notification. This is a product decision, not a technical one.
- **`resources/subscribe`** plus update notifications — the protocol-native
  form of "the dashboard becomes a subscription", rather than a bolted-on
  email job. Depends on Phase 2's resource layer.
- Threshold configuration per tenant (`GAP_ALERT_THRESHOLD` is currently a
  module constant).

**Acceptance:** a vendor crossing the threshold produces a notification with
no human in the session, attributed to a workload identity in the audit log.

---

## Phase 5 — Coverage expansion (mostly parallel)

| Item | Size | Notes |
| --- | --- | --- |
| **`get_attribute_help`** | S | Assemble authored `guidance` + GS1 standard definition + valid code-list values from `gs1_extended_attribute_master_code_list.csv`. Mostly an *exposure* problem — the data exists, nothing serves it. `BOTH_CLASSES`: a supplier asking "what does this field want?" and a retailer asking "what did we tell them?" are the same lookup. **Most in need of Phase 2's guard rule** — it mixes tenant-owned guidance with neutral standard reference in one response. |
| **`prioritise_my_gaps`** (supplier) | S | Ranks a supplier's outstanding attributes by **how many retail partners each one unblocks**, reusing `getMyOpenGaps()` / `listMyRetailPartners()` (`lib/mcp/tools-supplier.ts`). This is the payoff the README states as the supplier's whole reason to be on the network — fill a gap once, satisfy every retailer requiring it — and nothing computes it today on either surface. |
| **Supplier-side report tool** | M | `run_compliance_report` is `RETAILER_ONLY`; the engine (`runSupplierReport`) already exists. The supplier's "am I ready for Retailer B before they pull my data?" scan is arguably the most MCP-native workflow TGC has. |
| **Supplier write path** | — | Currently read-only by design, and correct for now. Their most-wanted write — "request an exception" — means leaving the conversation entirely. Worth deciding deliberately rather than by omission. |

---

## Cross-cutting workstreams

### A. The eval bar, before any screen is retired

Replacement is a claim about reliability, so it needs a threshold rather than
an impression. The harness exists (`lib/copilot/run-eval.ts`, see
[`eval-framework-pm-presentation.md`](./eval-framework-pm-presentation.md)).

| Check | Bar |
| --- | --- |
| Figure fidelity | **100%** exact match against tool output — a restated-from-memory number is worse than no answer |
| Run-id citation | Present on every quoted figure (requires Phase 2) |
| Trend provenance relayed | Every trend answer states reconstructed vs captured |
| Trend abstention | Correct refusal on history questions the data cannot answer |
| Tenant isolation | Zero cross-tenant leakage — enforced by `runGuarded()`, but asserted in evals too, because enforcement and evidence of enforcement are different deliverables |

Everything in the "requested only" column of the enforce-vs-request table in
[`mcp-pm-presentation.md`](./mcp-pm-presentation.md) §3.4 needs an eval,
because a request that is never measured is an assumption.

### B. Deployment topology — answering "our customers won't accept ChatGPT"

This is a **work item, not just a talking point**, and it is the one most
likely to gate an actual customer conversation. Argument in
[`mcp-pm-presentation.md`](./mcp-pm-presentation.md) §5; full memo in
[`enterprise-safe-remote-mcp.md`](./enterprise-safe-remote-mcp.md). The
engineering deliverables:

- A **supported-client matrix**: which MCP clients are tested and supported,
  and at what assurance level — a customer's own Microsoft Copilot in their
  own tenant (Entra SSO, tenant-governed declarative agent), an enterprise
  Claude/ChatGPT under the customer's own agreement, the TG Aviator Gateway
  with a Catalogue Domain Agent, and the in-portal agent (no third-party
  model at all).
- **Bounded retrieval per call**, which stops being only a cost control and
  becomes a data-minimisation control: the less a tool returns, the less
  leaves the customer's boundary. Already the stated discipline in the PM
  presentation's §6 (§4B); it needs actual caps. Note `list_my_suppliers` is
  *intentionally uncapped* today for eval purposes — that is exactly the kind
  of tool a pilot must cap.
- A **data-flow description per topology** — what leaves the customer's
  control boundary in each, so security review has something to review.

### C. Pilot readiness — closing the memo-to-code gaps

The decision memo assumes controls the prototype does not yet have. Each is a
discrete work item; none is large, and all are pilot-blocking because a
security reviewer will look for them by name.

| Gap | Work | Size |
| --- | --- | --- |
| **Requirement-set versioning** | The memo's output cites "Fall 2026 / v3.2". `AttributeProfile` has `status` + `lastUpdated` only — no version, no approval workflow, no published-version pinning. A compliance result that cannot name the rule-set version it was evaluated against is not auditable. Biggest of these. | **L** |
| **Correlation ID in responses** | `AuditEntry.id` already exists (`lib/mcp/audit.ts`) — return it in every tool response so a user can quote it and support can retrieve the record. Currently the audit trail is write-only from the caller's perspective. | **S** |
| **Portal deep links** | Every result should end with a link back to the system of record ("Open Supplier Compliance in the portal"). Cheap version of the artifact handoff in Phase 2. | **S** |
| **Retailer→supplier entitlement check** | Tenant isolation is enforced per call, but `RETAILER_SUPPLIERS` is shared across retailer tenants (caveat documented in `lib/mcp/tools.ts`). The memo's "unauthorized supplier visibility" control is therefore not modelled. Needs per-tenant vendor entitlement, not just per-tenant storage. | **M** |
| **Prompt-injection test suite** | The memo requires evidence of no allowlist bypass. Evals exist (`lib/copilot/run-eval.ts`) but cover accuracy, not adversarial input. Add injection cases to the golden set: prompts attempting cross-tenant access, tool-allowlist escape, and instruction override via retrieved text. | **M** |
| **Rate limits, quotas, response-size caps** | 4A rows 8–9 mark these as Gateway-owned and unimplemented. The pilot makes them **blocking rather than deferred** — "unbounded cost or scraping" is a named risk with required evidence. | **M** |
| **Read-only pilot profile** | A deployment configuration that grants only `tgc.read`, so no write tool is even listed. Mostly exists — scopes already filter the tool list in `buildHandler()`. Needs to be an explicit, documented, testable mode rather than an emergent property. | **S** |

**Sequencing note.** These are largely independent of Phases 1–5 and gate a
*customer* conversation rather than a capability. If a design-partner pilot is
the near-term goal, this table outranks Phases 2–4. If the goal is a stronger
internal demo, Phases 0–2 outrank it. That is a genuine either/or worth
deciding deliberately rather than by drift.

### D. The instrumentation that should precede funding decisions

Measure what fraction of report and dashboard sessions end in an **action** (a
fix, a waiver, an outreach) versus ending in nothing. If most dashboard
sessions end in nothing, Phase 4 replaces them and we should say so out loud.
If they end in multi-vendor forensics, they survive and we should stop
debating it. This is the cheapest item in this document and it de-risks the
most expensive ones.

---

## Deliberately not doing

- **Server-returned interactive UI (L4 / MCP Apps, `ui://`).** Directional.
  Client support is uneven and the pattern is still moving. Revisit after
  Phase 2 — resources are its prerequisite anyway.
- **Elicitation.** MCP can have the server ask the user a structured question
  mid-call. This prototype uses it nowhere, client support is uneven, and
  `lib/mcp/pending.ts` exists precisely because the confirmation was moved
  into the protocol instead of relying on it.
- **Replacing the in-portal Compliance Agent.** It is not a lesser copy of the
  connector — it is the surface where citation, provenance, and layout are
  *guarantees* rather than instructions, because we own the renderer. When
  someone asks "why maintain both?", that is the answer.
