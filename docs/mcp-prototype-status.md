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

## Phase 0 — Pin the OAuth signing key ❌

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

> **REQUIRED.** Highest ratio of demo risk removed to effort spent, anywhere here.

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

## Phase 2 — Report artifacts and MCP resources ❌

**User flow.** A retailer asks "run the compliance report for the Belk account
filter" and gets a good prose answer with real numbers. Then they ask what everyone
asks next — *"can you send that to my auditor?"* — and there is nothing to send.
`reportToCsv()` (`lib/compliance-report.ts:496`) already generates the file.
`ReportRequest` (`:121`) already carries `id`, `requestedBy`, `requestedAt`,
`status`. Neither is surfaced: no `server.resource(...)` is registered anywhere in
the codebase, so the report exists only as prose in chat scrollback. The portal's
Compliance Reports screen, meanwhile, has had a working Export button for years.

**Why the prototype needs it.** Because of what the deck claims. §4 argues for
*inversion* — conversation as the primary surface, screens as fallback. An audience
member who knows the portal will ask "where's my CSV?", and the honest answer today
is "go back to the screen," which concedes the argument. This is the widest gap
between what the demo claims and what the demo does.

**Not prototype work:** async job handles (`start_report` → `get_report_status`).
Mock data returns instantly and the UI already simulates the Running → Complete
queue. Real vendor-base scans need this; a demo does not.

> **REQUIRED IF the demo makes the inversion claim.** Either build the artifact or
> soften the claim — but don't keep asserting it while the screen still wins the
> most obvious follow-up question.

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

### `prioritise_my_gaps` ❌ — the strongest case on the list

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

### Supplier-side report tool ❌

**User flow.** *"Am I ready for Retailer B before they pull my data?"* — arguably
the most MCP-native workflow TGC has, because nobody would open a dashboard to ask
it. `runSupplierReport()` (`lib/compliance-report.ts:250`) is fully implemented and
called only from the portal (`app/page.tsx:283`). No MCP tool wraps it.

> **NICE TO HAVE.** Genuinely small — a manifest entry over an existing engine — but
> `prioritise_my_gaps` tells a better story for comparable effort.

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
| **Correlation ID in responses** | ❌ | **Yes, cheap.** `AuditEntry.id` exists (`audit.ts:23`) but `query_access_log` strips it before returning (`tools.ts:1253`). Returning it lets a demo say "quote this id to support" — small, and makes responses feel operated rather than mocked. |
| **Portal deep links** | ❌ | **Yes, cheap.** Ending a result with "open this in the portal" is the honest version of the artifact handoff, and it demos coexistence — conversation and screen pointing at each other rather than competing. |
| **Prompt-injection evals** | ❌ | No. Gates a security review; invisible to a demo. Zero adversarial cases exist today in `lib/copilot/run-eval.ts` or `scripts/generate-golden-dataset.ts`. |
| **Requirement-set versioning** | ❌ | No. `AttributeProfile` carries `status` + `lastUpdated` only. Large, and an auditability requirement rather than a demo one. |
| **Retailer→supplier entitlement** | ❌ | No. `RETAILER_SUPPLIERS` is one shared fixture across retailer tenants. A security reviewer will ask; an audience will not. |
| **Rate limits and quotas** | ⚠️ | No. Bounded retrieval partly exists (`maxAttributes`); quotas are gateway-owned per ENT-08. Note the unresolved tension: `list_my_suppliers` is deliberately uncapped as the large-output eval fixture (`tools.ts:111`) while a pilot would need it capped — resolved by a deployment profile, not by editing that function. |
| **Read-only pilot profile** | ❌ | No. Scope filtering is already per-connection via `buildHandler()`; making it a named mode is pilot packaging. |
| **Action-rate instrumentation** | ❌ | Not code, but **do it anyway.** Measuring what fraction of report and dashboard sessions end in an action versus nothing is the cheapest item in either document, and it de-risks the most expensive decisions in both. |

---

## The short answer

**Build for the prototype** — all small, none dependent on each other:

1. **Pin the OAuth key.** One env var; removes the only live-failure risk.
2. **`prioritise_my_gaps`.** The network-effect payoff nothing computes today.
3. **Persist `pending.ts`.** Protects two-phase confirm, the safety centrepiece.
4. **Correlation ID + portal deep links.** Two small touches that make responses
   feel operated.

**Build only if the demo makes the inversion claim:**

5. **Report resources + the CSV as an attachable artifact.** Otherwise the screen
   wins the most obvious follow-up question and §4's argument goes unsupported.

**Explicitly not prototype work:** captured history (cannot be demoed for six
months, and the honest reconstruction is a strength), the Phase 4 scheduler and
delivery channel (a manual trigger demos identically), async job handles, and every
pilot-readiness control — versioning, entitlement, quotas, injection evals, the
read-only profile. Those gate a *customer* conversation, not this one.

## How to verify each, when built

- **OAuth key** — set `TGC_OAUTH_PRIVATE_JWK`, then run enough successive tool
  calls to hit more than one serverless instance with no re-auth prompt.
- **`prioritise_my_gaps`** — connect as a supplier tenant; confirm ranking shifts
  when a gap is shared by more retail partners, and that the tool is absent from a
  retailer connection's tool list.
- **`pending.ts` persistence** — preview a write, force an instance change, confirm
  the token is still honoured.
- **Report resources** — confirm a second tenant cannot read another tenant's run
  and that the read lands in the audit log. Resources do not pass through
  `runGuarded()`, so this must be asserted, never assumed.
