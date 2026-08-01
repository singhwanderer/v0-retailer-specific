# TGC MCP — what's built, and what a prototype actually needs

> Companion to [`mcp-implementation-plan.md`](./mcp-implementation-plan.md). That
> document sequences work by dependency order, which answers *what must come
> first*. This one answers two different questions: **what does each feature do as
> a user flow**, and **does a prototype need it at all**.
>
> Status verified against the code at `38b57cf`. Legend: ✅ built · ⚠️ partial · ❌ absent

## Why this document exists

The implementation plan sequences for a system that will be *operated*. This
prototype is not operated — it is *shown*. Its job is to make a room of PMs, and
eventually a design-partner customer, believe one claim: "one MCP server, any AI
assistant, safely."

Judged against that job rather than against production-readiness, the plan's
ordering changes materially. Some large, prominently-placed items turn out to be
close to worthless until much later. Some small ones buried in Phase 5 turn out to
be the most persuasive things we could build. Keeping "a production system would
need this" apart from "this demo needs this" is most of the value here.

## The test applied throughout

A feature earns its place in the prototype if it does one of three things:

1. **Stops the demo breaking live**, in front of an audience, with no recovery.
2. **Proves a claim the demo actually makes.** If the deck argues conversational
   access should displace the screens, and the demo can't do what the screen does,
   the claim is unproven and someone in the room will notice.
3. **Makes someone believe the model** — the moment an audience stops evaluating a
   chatbot and starts seeing a network.

A feature does *not* earn its place merely because production would require it.
Quotas, requirement-set versioning, and container isolation are real requirements
that gate a customer pilot. They are invisible to a demo audience, and they are not
prototype work.

---

> **Update — two implementation passes have landed.**
>
> **Pass 1 (retailer-first):** Phase 2's report artifacts, the correlation id,
> and a startup warning for the OAuth key.
>
> **Pass 2 (supplier):** a `tenantId → supplier` resolver, the supplier-side
> report tool, and a fix for a real data leak. It also established that
> **`prioritise_my_gaps` is blocked, not merely unbuilt** — the data it would
> rank is fixture-invented, and the isolation doctrine does not stretch to cover
> the read it needs. Waivers/exceptions were left untouched by direction.
>
> Still deliberately not-prototype-work: captured history and the Phase 4
> scheduler. See "What the passes changed" at the end.

## Phase 0 — Pin the OAuth signing key ⚠️ (warned, not yet set)

**User flow.** A PM opens Claude, connects the TGC connector, signs in, and asks
"how many suppliers are non-compliant on Women's Footwear?" — works. They ask a
second question thirty seconds later and get *"Refused before sign-in"* plus a
forced re-authentication, on screen, mid-sentence. Nothing is wrong with their
session. The second call simply landed on a different serverless instance, and
`createKeys()` (`lib/mcp/oauth.ts:132`) minted that instance its own signing key,
so the token the first instance issued fails signature verification on the second.

**Why the prototype needs it.** This is the only item on the list that can break a
demo *live and unrecoverably*. There is no refresh token, so the failure surfaces
as a visible re-auth in the middle of the story being told. It costs one
environment variable — `pnpm gen:oauth-key` generates the value, and `createKeys()`
already prefers it whenever it is present.

> **REQUIRED — half done.** `createKeys()` now logs a loud, one-per-instance
> warning naming the symptom and the fix when the variable is unset, so the
> failure is diagnosable instead of mysterious. The variable itself still has to
> be set in the deploy environment; no code change can do that, and this stays
> ❌ until it is.

## Phase 1 — Persistence ❌ (one part is prototype work; the rest isn't)

**User flow.** The presenter says "add Heel Height as a required attribute for
Women's Footwear." The connector previews the change, they confirm, the audience
watches it land. Twenty minutes later — or when a PM opens the link unattended the
next day — it is gone. Every store is process memory pinned to `globalThis`
(`store.ts:134`, `oauth.ts:76`, `pending.ts:53`), and `audit.ts` is a plain
module-scoped array (`audit.ts:40`) that does not survive even a module
re-evaluation.

**The part that matters for a demo.** Not the profiles — "writes reset
periodically" is disclosed honestly in `DEMO_NOTE` and audiences accept it. The
part that matters is **`pending.ts`**. Two-phase confirmation is the centrepiece of
the safety story: *nothing writes on the first call.* If the preview lands on
instance A and the confirm lands on instance B, the token is not found and the
write fails — the exact flow being demonstrated fails, at the exact moment it is
being claimed as the thing that makes the system safe.

> **PARTIALLY REQUIRED.** Migrating `pending.ts` is prototype work. Migrating
> profiles, audit, and OAuth clients is production work wearing a prototype's
> clothes; the honest `demo_note` covers those for now.

## Phase 2 — Report artifacts and MCP resources ✅ (built)

**User flow, before.** A retailer asked "run the compliance report for the Belk
account filter" and got a good prose answer with real numbers. Then they asked what
everyone asks next — *"can you send that to my auditor?"* — and there was nothing
to send. The report existed only as prose in chat scrollback, while the portal's
Compliance Reports screen has had a working Export button for years.

**User flow, now.** The same question returns the same figures plus a `run_id`
(`run-20260731-4f2a`) and a `resource_uri` (`report://run/{id}`). The full CSV —
every vendor detail row, not just the ranked summary — is attached as an MCP
resource the client can read, save, or forward. `list_report_runs` answers "pull up
the Belk scan from Tuesday"; `get_report_run` re-opens it with the figures that
scan produced rather than re-scoring against today's data.

**How it was built.** `reportToCsv()` and `ReportRequest` already existed and
already drove the portal's report queue — the work was retention plus exposure, not
new reporting logic. `lib/mcp/report-runs.ts` holds tenant-keyed run history;
`run_compliance_report` records each run; the route registers a `ResourceTemplate`
for `report://run/{id}`.

**The security rule this had to get right.** Resources are a second surface that
the SDK does not route through `runGuarded()`. Three controls, all verified against
a live server: registration is gated to retailer + `tgc.read` like the tool it
mirrors; resolution goes through `getReportRun(tenantId, id)`, which has no
lookup-by-id-alone, so another tenant's run id resolves to nothing; and the read
runs through `runGuarded()` so it lands in the audit trail named by exact URI. A
run id that doesn't exist and one belonging to another tenant return the *same*
message, so the endpoint can't be used as an oracle for other tenants' run ids.

**Still not prototype work:** async job handles (`start_report` →
`get_report_status`). Mock data returns instantly and the UI already simulates the
Running → Complete queue.

> **DONE.** The screen no longer wins the "where's my CSV?" follow-up, so §4's
> inversion argument is now supported by the demo rather than asserted over it.

## Phase 3 — Captured history ❌

**User flow.** "How has Belk's compliance trended over six months?" returns a
six-month series where every point is genuine engine output, scored with the same
engine as today's number — but reconstructed by rolling catalogue state backward,
never observed at the time. The tool says so, in the `demo_note`, on both return
paths.

**Why the prototype does *not* need it.** You cannot demo captured history in a
prototype. A snapshot job started today yields its first genuinely captured month in
about thirty days and a credible series in six. The only way to have captured
history in a demo this quarter is to fabricate it — strictly worse than the current
position, because the current position is honest and the fabricated one is a lie a
customer's data team would eventually catch.

The reconstruction is a **strength to present, not a gap to apologise for**: it
demonstrates the engine is real and deterministic enough to re-score historical
states. Per-point provenance only becomes meaningful once real snapshots exist to
mix in.

> **NOT REQUIRED.** Start the snapshot job whenever persistence lands so the clock
> begins running, but nothing here changes a demo held this year.

## Phase 4 — Proactive push ⚠️ (the demo already exists)

**User flow.** Nobody is in a session. A vendor crosses forty open gaps. The
retailer's compliance lead is told, without anyone having thought to look. This is
the rung where conversational access stops matching the dashboard and starts
beating it — because the failure a dashboard cannot fix is nobody opening it on the
day it mattered.

**What is already built, and it is the hard part.**
`app/api/demo/proactive-check/route.ts` runs a real compliance scan under its own
client-credentials workload identity: read-only scope, tenant-pinned, through the
same `runGuarded()` choke point, landing in the audit trail with
`subjectType: "workload"` and no subject id. Everything security-interesting about
this feature is done. What is missing is a schedule and a delivery channel.

**Why the prototype does not need those.** For a demo, "a person triggers the
endpoint" and "a cron triggers the endpoint" produce an identical audience
experience: an alert appears, and the audit log attributes it to a machine identity
with no human in the session. That contrast — same tenant, same guard, different
subject type — *is* the demonstration. A scheduler and an email integration add
production plumbing and no persuasive content. The delivery channel is also an
undecided product question, so building one now would be guessing.

> **NOT REQUIRED.** Manual trigger is a legitimate demo affordance.

## Phase 5 — Coverage expansion (the persuasion tier)

### `prioritise_my_gaps` ⛔ — blocked, and the reason is not the tool

**This changed on inspection.** The entry below argued this was the highest
persuasion-per-line item available. That case still holds on merit — but the
feature is **not honestly buildable today**, because the data it would rank does
not exist:

- **Supplier gaps are static fixture integers.** `SupplierProduct.retailers`
  carries `{ retailer: "Dillard's", gaps: 3 }`, and `allocateGaps` turns that
  opaque integer into attribute *names* by slicing the head of the GS1 brick's
  attribute pool. **No retailer's `ATTRIBUTE_PROFILES` or `profileExtras` is
  ever consulted when computing a supplier gap.**
- **Four of the six "retail partners" are not tenants.** `PARTNERS`
  (`lib/partner-filters.ts`) is a supplier-side fixture; Nordstrom, Macy's, Saks
  and Bloomingdale's exist nowhere else, and their extras are a rotating slice of
  an eight-name hardcoded pool at a per-retailer offset.

Shipping it would loop that pool and emit a confident number with no source —
the worst failure mode available, because it doesn't look wrong.

**And there is no isolation doctrine to lean on.** ENT-05a's "bilateral fact"
carve-out works for exceptions because the supplier is a *named party*, so the
read narrows to "rows about me". A requirement is a unilateral policy statement
addressed to a whole vendor base: `AttributeProfile`, `AttributeRequirement` and
`ProfileExtras` carry no party identity, so there is no field to filter on. The
carve-out fails on its load-bearing leg.

**Decision taken: named disclosure with retailer opt-in.** That needs a
*published requirement index* keyed `(retailer, brickCode, attributeName,
status)` that a retailer **emits**, rather than anything read out of
`getStore(retailerTenantId)` — and it must filter on `status`, because
`ATTRIBUTE_PROFILES` contains `Draft` rows and leaking unreleased retailer policy
would be worse than the feature is worth. A trading-relationship record
(retailer × supplier) is also needed and exists in no form today.

> **BLOCKED, not merely unbuilt.** The prerequisite is a published requirement
> index plus an ENT-05b doctrine written next to ENT-05a. Recorded here so it
> isn't re-scoped as a small tool again.

### The original case, for when it is unblocked

**User flow.** A supplier asks the question every supplier actually has: *"I have
sixty open gaps and limited hours — what do I fix first?"* Today they get a flat
list from `get_my_open_gaps()`. With this, they get gaps ranked by **how many retail
partners each one unblocks** — fix Heel Height once, satisfy four retailers who all
require it.

**Why the prototype needs it.** This is the payoff the README states as the
supplier's entire reason to be on TGC — fill a gap once, satisfy every retailer
requiring it — and **nothing on either surface computes it today**, not the portal
and not the connector. It is the moment an audience stops seeing a compliance
checker and starts seeing a network, which is the belief this prototype exists to
create. Both ingredients already exist (`getMyOpenGaps()`, `listMyRetailPartners()`
in `lib/mcp/tools-supplier.ts`); what is missing is the join and the ranking.

> **REQUIRED — highest persuasion per line of code here.** Small, needs no
> persistence, and *demonstrates* the network effect rather than asserting it.

### `get_attribute_help` ⚠️

**User flow.** A supplier hits a field they don't understand — *"what does Heel
Height actually want?"* — and no tool answers. Retailer-authored guidance is already
assembled (`assembleBrickAttributes()`, `lib/mcp/attribute-assembly.ts`) and already
served *retailer-side* through `get_profile_detail` and `diagnose_gap_pattern`. The
allowed-value lists exist too (`getAllowedValues()`, `lib/gs1-attribute-values.ts`)
but have only portal consumers: the supplier's dropdown knows the valid values; the
supplier's assistant does not.

**Why the prototype needs it.** It is the most natural question on the supplier
surface and the surface cannot answer it. It also makes the bilateral point in a
single response — the retailer asking "what did we tell them?" and the supplier
asking "what does this want?" are the same lookup, which is the argument for one
connector serving both tenant classes.

> **REQUIRED IF the supplier surface is demoed as more than a stub.** Smaller than
> the implementation plan implies: the assembly layer is done, so this is exposure
> plus the code lists.

### Supplier-side report tool ✅ (built)

**User flow.** *"Am I ready for Belk before they pull my data?"* — arguably the
most MCP-native workflow TGC has, because nobody would open a dashboard to ask it.
`run_my_compliance_report` scans the supplier's own catalogue against either a
System scorecard or one retail partner's account filter, and returns a `run_id`
plus the full CSV as an MCP resource — the same artifact path the retailer side
uses, so parity arrived on both surfaces from one implementation.

**It needed none of the disclosure work above**, which is why it shipped while
`prioritise_my_gaps` did not: it scans the supplier's own products against gap
state the supplier already holds, and crosses no tenant boundary.

**One thing that had to be got right.** The first version accepted a `target` of
`"gs1"`, borrowing `get_my_open_gaps`' vocabulary, and mapped it onto the
`gs1-core` System filter. Those are different measures — the scorecard has its own
allocation rule in the report engine — and the alias made the tool report **100%
complete on a catalogue the existing tool scored at 41%**. Two surfaces
disagreeing about a gap count is precisely what this codebase's shared engines
exist to prevent. The tool now takes the report vocabulary (`systemFilterId` or
`retailer`), matching the supplier portal's own report modal, and was verified to
agree with the portal on every filter.

> **DONE.** `list_report_runs`, `get_report_run` and `list_system_filters` were
> widened to both tenant classes to support it — safe because run storage is
> tenant-keyed and has no lookup-by-id-alone, and because System scorecards are
> platform-wide standards owned by no tenant.

### Supplier write path ❌ (correctly)

Every `SUPPLIER_ONLY` tool is `kind: "read"`, and the connection is explicitly
instructed as read-only. The most-wanted supplier write — "request an exception" —
requires a retailer approval workflow that does not exist.

> **NOT REQUIRED, and right as it stands.** Worth stating in the demo as a
> deliberate choice rather than letting someone discover it as an omission.

---

## Cross-cutting — almost all pilot work, not prototype work

| Item | Status | Prototype? |
| --- | --- | --- |
| **Correlation ID in responses** | ✅ | **Built.** `runGuarded()` now returns the id of the audit line it wrote — on success *and* on refusal — and the route attaches it to every tool response as `audit_id`. `query_access_log` returns `id` too, so the loop closes: a user quotes the id, support resolves it. Refusals carrying one matters most, since "why was I refused?" is only answerable against a specific record. Three tools that returned bare arrays (`list_attribute_profiles`, `list_system_filters`, `list_vendor_exceptions`) now return objects, because an array has nowhere to put the id; two already returned objects when empty, so this also removed a response shape that varied by result count. |
| **Portal deep links** | ❌ | **Blocked on a prerequisite the plan didn't anticipate.** The portal has no URL addressing — screens are React `useState` in `app/page.tsx` — so there is no address to link *to*. A "deep link" today could only point at the app root and name a screen in prose, which is worse than nothing: it looks like a link and doesn't behave like one. Needs query-param or route-based screen selection first. Small, but it is a portal change, not a connector change. |
| **Prompt-injection evals** | ❌ | No. Gates a security review; invisible to a demo. Zero adversarial cases exist today in `lib/copilot/run-eval.ts` or `scripts/generate-golden-dataset.ts`. |
| **Requirement-set versioning** | ❌ | No. `AttributeProfile` carries `status` + `lastUpdated` only. Large, and an auditability requirement rather than a demo one. |
| **Retailer→supplier entitlement** | ❌ | No. `RETAILER_SUPPLIERS` is one shared fixture across retailer tenants. A security reviewer will ask; an audience will not. |
| **Rate limits and quotas** | ⚠️ | No. Bounded retrieval partly exists (`maxAttributes`); quotas are gateway-owned per ENT-08. Note the unresolved tension: `list_my_suppliers` is deliberately uncapped as the large-output eval fixture (`tools.ts:111`) while a pilot would need it capped — resolved by a deployment profile, not by editing that function. |
| **Read-only pilot profile** | ❌ | No. Scope filtering is already per-connection via `buildHandler()`; making it a named mode is pilot packaging. |
| **Action-rate instrumentation** | ❌ | Not code, but **do it anyway.** Measuring what fraction of report and dashboard sessions end in an action versus nothing is the cheapest item in either document, and it de-risks the most expensive decisions in both. |

---

## What the passes changed

### Pass 1 — retailer-first, by request

| Item | Before | After |
| --- | --- | --- |
| Report runs | Computed and discarded | Retained per tenant, `run_id` returned, re-openable via `list_report_runs` / `get_report_run` |
| The CSV | Generated by `reportToCsv()`, never surfaced | Served as an MCP resource at `report://run/{id}` |
| Resources primitive | None registered anywhere | `ResourceTemplate`, gated + tenant-keyed + audited on read |
| Correlation id | `AuditEntry.id` written, never returned | `audit_id` on every tool response, success and refusal alike |
| OAuth key | Silent per-instance fallback | Loud startup warning naming the symptom and the fix |

**Two things worth flagging that only turned up in the building.**

*Registering one resource per run was wrong, and the live test is what caught it.*
The SDK only advertises the `resources` capability if something is registered, so a
fresh connection with no retained runs declared no capability at all — and since
the handler is rebuilt per request, the capability would blink in and out as runs
came and went. A `ResourceTemplate` declares it unconditionally and lets a caller
read the id it just received without waiting for a `resources/list` refresh. The
in-process tests all passed against the broken version; only driving the real
protocol surfaced it.

*Portal deep links are blocked on a prerequisite nobody had noticed.* The portal
has no URL addressing — screens are `useState` in `app/page.tsx` — so there is
nothing to link to. Shipping a link that points at the app root and names a screen
in prose would look like a feature and behave like a dead end, so it was left
undone rather than faked.

### Pass 2 — supplier surface

| Item | Before | After |
| --- | --- | --- |
| Supplier identity | `myVendorName(_ctx)` discarded its context and returned a constant | Resolved from the authenticated tenant via `Tenant.vendorName` |
| An unprovisioned supplier tenant | Would be served J.Renée's catalogue | Refused, with a message that names neither the fixture nor its holder |
| Supplier report | `runSupplierReport` existed, portal-only | `run_my_compliance_report`, with `run_id` + CSV resource |
| `get_capabilities` (supplier) | Returned Dillard's authored attribute **names** | Returns partner extras as a **count** |
| `prioritise_my_gaps` | "Small, needs no persistence" | Blocked, with the prerequisite named |

**Three things only the building surfaced.**

*The leak was real and arrived through a default parameter.*
`getSupplierCapabilities` called `getPartnerExtraAttributes("Dillard's", …)`,
whose Dillard's branch calls `assembleBrickAttributes(brickCode)` with `tenantId`
**omitted** — defaulting to the Dillard's store — and returned the literal names
of custom attributes a Dillard's admin had authored, to a supplier. Nobody
decided that; a fallback argument did. Confirmed by authoring a canary attribute
in the Dillard's tenant and watching the old code path return it, so the
regression test asserts against something that genuinely leaked rather than
passing vacuously.

*My first fail-closed guard didn't fail closed.* It tested whether the tenant had
a vendor *name*, so a named supplier with no catalogue sailed through and got a
confident `0 products, 0% complete, no open gaps` — a clean bill of health for a
supplier nobody holds any data about. An empty catalogue and a missing catalogue
are different facts. The resolver now returns identity and catalogue together, or
refuses.

*Aliasing two vocabularies produced a 100%-vs-41% contradiction.* The report tool
first accepted `target: "gs1"`, borrowing the gap tool's vocabulary and mapping it
onto the `gs1-core` System scorecard, which has its own allocation rule. It
reported a catalogue as fully complete that the existing tool scored at 41%. The
tool now uses the report vocabulary and was checked filter-by-filter against what
the portal renders.

## Still open, in the order I'd take them

1. **Pin `TGC_OAUTH_PRIVATE_JWK`** in the deploy environment — the warning now
   tells you when it's missing, but only setting it fixes the failure. Minutes.
   This got more load-bearing, not less: client registrations and authorization
   codes are now signed with material derived from the same key, so an unset
   variable no longer costs only a mid-session re-auth — it means every
   reconnect fails with `Unknown client_id`, because the client kept the
   registration and the server derived a different secret.
2. **Single-use authorization codes across instances** — codes are signed and
   self-contained, so any instance can verify one, but the redemption record is
   still per-instance memory. Single-use therefore holds per instance; what
   carries the weight globally is the five-minute expiry, the PKCE binding, and
   the `redirect_uri` check. A shared store (Redis) is the real fix and is the
   same piece of work as item 4 below.
2. **`get_attribute_help`, GS1-only** (supplier) — standard definitions plus the
   allowed-value lists (`getAllowedValues`, currently portal-only). Neutral
   reference data, crosses no boundary. The retailer-guidance half waits on the
   publication model.
3. **Persist `pending.ts`** — protects two-phase confirm across instances.
4. **The published requirement index** — the prerequisite for
   `prioritise_my_gaps`, and the larger piece: a retailer-emitted index keyed
   `(retailer, brick, attribute, status)`, a `Draft` filter, an ENT-05b doctrine,
   and a trading-relationship record.
5. **Portal URL addressing**, which unblocks deep links.

**Still explicitly not prototype work:** captured history (cannot be demoed for six
months, and the honest reconstruction is a strength), the Phase 4 scheduler and
delivery channel (a manual trigger demos identically), async job handles, and every
pilot-readiness control — versioning, entitlement, quotas, injection evals, the
read-only profile. Those gate a *customer* conversation, not this one.

## How this pass was verified

Not by inspection — by running it.

- **33 in-process assertions** covering run persistence, re-open-by-id, the
  summary shape, CSV generation, correlation ids on success and refusal, and
  tenant isolation from four angles (a second tenant sees no runs, cannot resolve
  a known run id through the store or the tool, and gets a refusal that does not
  leak the first tenant's run ids).
- **A live MCP session against a running server** — real OAuth client-credentials
  token, real `initialize` / `tools/list` / `resources/list` / `resources/read`
  handshake. Confirmed: unauthenticated calls get 401; the capability is advertised
  with zero runs retained; a run becomes addressable after `run_compliance_report`;
  `resources/read` returns 5.8 KB of real CSV across 163 lines; an unknown run id
  errors rather than returning empty content; and write tools are absent from a
  read-only identity's tool list.
- **The audit trail, read back from the live server**, confirming resource reads
  are logged by exact URI and attributed to the calling identity — including the
  failed read, recorded with `outcome: error`.

Build and lint are clean; the three pre-existing type errors in
`screen1-attribute-profiles.tsx` and two pre-existing lint errors are unchanged by
this work and were confirmed present on a clean tree.

## How to verify what's still open

- **OAuth key** — set `TGC_OAUTH_PRIVATE_JWK`, then run enough successive tool
  calls to hit more than one serverless instance with no re-auth prompt. The
  sharper check is a redeploy: connect the connector, redeploy, and use it again
  without re-adding it. That exercises the registration path, which is the one
  that fails days later rather than immediately.
- **`prioritise_my_gaps`** — connect as a supplier tenant; confirm ranking shifts
  when a gap is shared by more retail partners, and that the tool is absent from a
  retailer connection's tool list.
- **`pending.ts` persistence** — preview a write, force an instance change, confirm
  the token is still honoured.
