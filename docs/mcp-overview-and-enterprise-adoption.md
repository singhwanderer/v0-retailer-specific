# MCP: what it is, why TGC has one, and whether it is actually the future

### A cold-start read for PM and leadership

Three questions, answered in order, ending in a verdict rather than a pitch:

1. **What is MCP?** — Part One. No TGC knowledge assumed.
2. **Why is it in this product?** — Part Two. The commercial reason and the
   architectural one, which are different.
3. **Is MCP adoption — internal and external — the future for enterprise
   products, and is that actually true?** — Part Three. A claim ledger with
   verdicts, confidence levels, counter-evidence, and what would prove each claim
   wrong.

Part Four is the practical residue: what we should build next, and which files in
this repo should be deleted.

## How this relates to the other MCP docs

There are fourteen of them. This one exists because none answers question 3, and
question 1 is only available in fragments inside documents written to argue
something else.

| If you want | Read |
| --- | --- |
| The concept, the security model, and whether chat replaces our screens — as a 45-minute deck | [`mcp-pm-presentation.md`](./mcp-pm-presentation.md) |
| To connect a client and try it | [`mcp-getting-started.md`](./mcp-getting-started.md), [`mcp-demo-quickstart.md`](./mcp-demo-quickstart.md) |
| The published schemas and the questions people actually ask | [`mcp-faq.md`](./mcp-faq.md) |
| The decision memo for a security/architecture audience | [`enterprise-safe-remote-mcp.md`](./enterprise-safe-remote-mcp.md) |
| Requirements, acceptance criteria, and what is deliberately not demonstrated | [`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md) |
| Where the in-portal agent ends and the external connector begins | [`embedded-agent-first-remote-mcp-selectively.md`](./embedded-agent-first-remote-mcp-selectively.md) |
| Phased sequencing | [`mcp-implementation-plan.md`](./mcp-implementation-plan.md) |

**A note on numbers.** Everything stated here about *this codebase* was
re-counted against the source while writing, because several of the documents
above have gone stale on exactly these figures (Part 4a lists which). Everything
stated about the outside world carries a source and a verification status at the
end — some sources block automated fetching and are marked accordingly.

---
---

# Part One — What MCP is

## The problem it was invented for

To make an AI assistant useful against a company's real, live data, someone has
to build a bridge between the assistant and the systems. Before MCP that bridge
was proprietary in both directions: each AI vendor defined its own plugin format,
and each company built to it. Supporting a second assistant meant building a
second integration — **including a second copy of the authorization logic**, which
is the expensive half and the one that gets it wrong.

Most companies did the arithmetic and concluded it wasn't worth it. That is why so
few products had an AI integration, not because the idea was unappealing.

**MCP is the standard that makes it one integration instead of one per vendor.**
The shorthand people use is "USB-C for AI assistants." It is an open protocol, not
a product, not a model, and — since December 2025 — not owned by any one vendor.

## The three primitives

Almost everything about MCP reduces to what a server is allowed to publish.

| Primitive | What it is | Plain example |
| --- | --- | --- |
| **Tools** | Things the assistant can *call*, each with a typed input contract | "run a compliance report", "grant a vendor exception" |
| **Resources** | Things that *exist and can be referred to again*, addressable by URI | "the Belk scan from Tuesday", a CSV, a help article |
| **Prompts** | Starter suggestions the client can surface as clickable entry points | "review supplier compliance" |

**TGC registers tools and prompts, and no resources at all.** That is not a
detail — it is the single most load-bearing gap in the product, and Part 4a
returns to it. The distinction that matters: a tool call produces *an answer that
happened once*; a resource produces *an artifact you can name, re-open, and hand
to an auditor*. Most of what a report screen is for is the second thing.

## The self-describing property, which is the actual innovation

When a client connects, it asks the server what is available and gets back every
tool's input contract as JSON Schema. Two fields do nearly all the work:

- **`required`** — the mandatory fields.
- **`enum`** — the fixed set of allowed values, which is a drop-down as far as the
  model is concerned.

Concretely, from TGC's own published schema for `set_image_requirement`:

```json
{
  "format":     { "type": "string", "enum": ["JPEG", "PNG", "TIFF", "WebP"] },
  "background": { "type": "string", "enum": ["Pure white (#FFFFFF)", "Light grey (#F5F5F5)", "Transparent", "Lifestyle/contextual"] },
  "required": ["brickCode", "requirementName", "format", "background", "minDimensions", "maxFileSize", "shapeCrop"]
}
```

So when a user says *"add a lifestyle image requirement to Footwear,"* the
assistant asks for the seven mandatory fields and offers only the four valid
formats — because it read the contract thirty seconds ago, not because anyone
wrote a prompt describing image formats. Change the enum on our side and every
connected assistant asks the new question immediately. No retraining, no
redeployment, no version negotiation.

**The contract is not the enforcement.** It is the first of two. The schema makes
the assistant cooperative; the server validating again on arrival makes it
irrelevant whether the assistant cooperated. Any argument that rests only on the
first layer is a bad argument.

## Where MCP stands as of August 2026

Four facts worth having, because they change the risk profile of betting on it:

- **It is vendor-neutral now.** Anthropic donated MCP to the **Agentic AI
  Foundation, a directed fund under the Linux Foundation**, announced 9 December
  2025. Co-founders are Anthropic, Block, and OpenAI; supporters include Google,
  Microsoft, AWS, Cloudflare, and Bloomberg. The Linux Foundation explicitly
  "will not dictate the technical direction of MCP" — maintainers keep decision
  authority, guided by a public standards process. *(Verified — fetched directly.)*
- **It is large.** TypeScript and Python SDKs have each passed one billion total
  downloads, with close to half a billion downloads a month across Tier 1 SDKs.
  *(Verified — fetched directly.)*
- **It just went stateless.** The **2026-07-28 specification**, released six days
  before this document, removes the initialize handshake so any request can land
  on any server instance behind an ordinary load balancer. It also adds
  header-based routing (`Mcp-Method`, `Mcp-Name`) so gateways and rate limiters
  can meter without parsing JSON bodies, cacheable list results, authorization
  hardening (RFC 9207 issuer validation; Client ID Metadata Documents replacing
  Dynamic Client Registration), and a formal extensions framework. Deprecated
  features get a twelve-month window. *(Verified — fetched directly.)*
- **Enterprise SSO is a solved, shipped part of the spec.** **Enterprise-Managed
  Authorization** — zero-touch OAuth, where an admin enables a server for the org
  and users get it automatically scoped to the groups they already have — went
  stable on 18 June 2026, with Okta as the first IdP, Claude and VS Code as
  clients, and Asana, Atlassian, Canva, Figma, Linear and Supabase among the
  servers. *(Verified — fetched directly.)*

## What MCP is *not*

This list earns the credibility that Part Three spends.

- **Not a model.** It carries no intelligence. A bad model connected over MCP is
  still a bad model.
- **Not a database connection.** A server publishes a short allowlist of named
  capabilities with typed inputs. It does not expose schemas, queries, or tables
  unless someone deliberately builds a tool that does.
- **Not a security product.** MCP standardises *where* authorization goes, not
  whether you did it. Part Three has the incident record on what happens when
  people skip it.
- **Not an Anthropic thing.** It was, for thirteen months. It is now a Linux
  Foundation project that OpenAI co-founded.
- **Not a replacement for your API.** It is a second façade over the same
  business logic, aimed at a different caller.

---
---

# Part Two — Why it is in TGC

## The customer problem, in two sentences

A category operations manager two weeks from an intake freeze wants to know
*"which of my suppliers will make the date, and what do I chase first?"* — a
question that is urgent, one-off, crosses suppliers and categories and attributes,
and therefore matches no screen anyone designed. Today, answering it means opening
screens, exporting, and reassembling by hand.

The commercial observation on top of that: **that manager already has Claude,
ChatGPT, or Copilot open, paid for and approved** — and it is the one tool on
their desk that cannot see any of this. The assistant is not missing intelligence.
It is missing access.

## The reason it was cheap, which is the part the other docs undersell

TGC did not "add MCP." It factored out a tool layer and then discovered MCP was
nearly free.

```
        lib/mcp/tools.ts  +  lib/mcp/tools-supplier.ts
        (the actual business logic: read / create / edit / remove)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Portal UI            External MCP          In-portal agent
   (app/page.tsx,       connector             (compliance-agent-panel
   direct calls)        (app/api/             → /api/copilot →
                        [transport]/route.ts) lib/copilot/tools.ts)
```

Three consumers, one implementation. `lib/mcp/attribute-assembly.ts` is the single
place that answers "what does this GS1 brick require," so the screen and the
connector cannot drift apart.

**This is the transferable lesson for any other OpenText product, and it is the
bridge into Part Three.** The expensive work was never the protocol — it was
having one authoritative, callable business layer with authority declared next to
it. A product that has that can publish an MCP server in a sprint. A product that
doesn't will spend the sprint discovering its logic lives in its React components.

## What is actually built

Re-counted against `lib/mcp/manifest.ts` while writing this:

| Surface | Tools | Split |
| --- | --- | --- |
| **Retailer** | 27 | 15 read, 12 write — of which 10 are business mutations and 2 (`confirm_pending_change`, `discard_pending_change`) are the confirmation plumbing |
| **Supplier** | 5 | all read — own status, retail partners, open gaps, own compliance report, exceptions granted to them |
| **Total** | **32** | **20 read, 12 write** |

Five scopes gate them: `tgc.read`, `tgc.requirements.write`,
`tgc.exceptions.write`, `tgc.requirements.activate` (required *in addition to*
write), `tgc.destructive` (required *in addition to* the relevant write scope).

Three design decisions are worth naming because Part Three's verdict depends on
them:

**1. The tenant is derived from identity, never chosen.** A supplier and a
retailer paste the identical URL; what they can do falls out of who signed in
(`lib/mcp/tenants.ts`, re-checked per call in `lib/mcp/guard.ts`). There is no
account picker anywhere in the flow and deliberately nowhere to add one. A user
can type "show me Belk's supplier gaps" and the server refuses, because natural
language does not override server-side policy.

**2. Authority is declared as data, not scattered through handlers.** Every entry
in the registry carries its required scope, which tenant classes may call it,
and whether an autonomous workload may. The route filters `tools/list` by the
caller's scopes — so a read-only grant means the write tools are *never listed*,
which makes read-only a configuration rather than a separate build. The header
comment on `lib/mcp/manifest.ts` makes the further claim that this shape
(tool + scope + tenant class + read/write) is a candidate **platform** registry
schema for the TG Aviator MCP Gateway, not just TGC plumbing. Part Three tests
whether that bet is a good one.

**3. Nothing mutates on a first call.** Every mutating tool returns a preview of
exactly what would change, what that does to compliance numbers, and a
short-lived single-use token; `confirm_pending_change` is the only path that
writes (`lib/mcp/pending.ts`). This lives in the *protocol* rather than in a UI
card because an external ChatGPT session has no card of ours to render — see
[`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md) ENT-06a. An
abandoned conversation changes nothing.

## Honest limits of what is built

Stated compactly rather than re-argued; the full version is
[`mcp-pm-presentation.md`](./mcp-pm-presentation.md) Appendix G.

- All data is mock, watermarked, in an in-memory store that resets on cold start.
- The OAuth is real; the identity provider is a local demo stand-in for a
  customer's Entra ID or Okta federated through the Gateway.
- Chat-made writes do not appear in the portal screens — separate runtime
  processes, separate module scope.
- No report run persists, so nothing the connector produces is citable.
- Connector calls are not traced and are not covered by the golden eval set.

---
---

# Part Three — Is MCP adoption the future for enterprise products?

The question has two halves that get conflated and shouldn't be:

- **External adoption** — a vendor publishes a server; the *customer's* assistant
  connects to it. This is TGC's bet.
- **Internal adoption** — an enterprise runs MCP as its own integration fabric:
  its systems behind its own gateway and registry, called by its own agents and
  employees. For us that means the TG Aviator MCP Gateway, a Catalogue Domain
  Agent, product-to-product access, and the in-portal Compliance Agent — which
  already consumes the same tool layer today.

They have different buyers, different timelines, and different risks. Below, each
claim gets a verdict, a confidence level, and — the part that makes this a ledger
rather than a pitch — **what would prove it wrong.**

## The ledger: external adoption

| # | Claim | Verdict | Confidence | Basis | What would falsify it |
| --- | --- | --- | --- | --- | --- |
| E1 | Implement once, and every major assistant can call it | **True** | **High** | OpenAI, Google, Microsoft, AWS all support MCP; OpenAI co-founded the foundation that now governs it; ~half a billion SDK downloads/month | A major client shipping a competing proprietary format *and* refusing MCP. No current signal of this |
| E2 | The standard is durable enough to build on | **True** | **High** | Linux Foundation stewardship since Dec 2025 with maintainer independence; a formal standards process; a 12-month deprecation window on the 2026-07-28 spec | Foundation governance stalling, or a spec revision without a migration window |
| E3 | Enterprise B2B software vendors — not just commerce platforms — are shipping customer-facing servers | **True, and this updates our own prior** | **Medium-high** | Asana, Atlassian, Canva, Figma, Linear, Supabase are named server-side adopters of Enterprise-Managed Authorization. That is enterprise SaaS, not commerce | These proving to be pilots that quietly lapse. Worth re-checking in two quarters |
| E4 | Customers will permit third-party assistants against their data | **Partly — and it is a procurement question, not an architecture one** | **Medium** | Zero-touch OAuth (stable Jun 2026, Okta + Microsoft + Anthropic) exists precisely because enterprises demanded central control. The customer's own IdP is the gatekeeper; TGC never holds a user directory | Enterprises standardising on "internal agents only, no external connectors." Plausible in regulated sectors |
| E5 | A governed MCP server is safer than the alternative customers already accept | **True, and under-used as an argument** | **Medium-high** | The realistic alternative is a CSV export or a bulk feed, which copies data outside our control boundary permanently, with no revocation and no audit of what was read | A customer demonstrating equivalent per-call policy enforcement on their existing feed. Rare in practice |

**Where this corrects the existing deck.** `mcp-pm-presentation.md` §6.2 concludes
that external connectors are "almost entirely from commerce platforms and data
aggregators" and that TGC's bet has "no direct precedent in retail/CPG." The first
half is now out of date — the enterprise-auth adopter list is squarely enterprise
SaaS. The second half still stands: **retailer↔supplier catalogue compliance
specifically remains unprecedented.** Keep saying that; it is the honest and more
credible framing.

## The ledger: internal adoption

| # | Claim | Verdict | Confidence | Basis | What would falsify it |
| --- | --- | --- | --- | --- | --- |
| I1 | Large enterprises are standardising MCP internally, not only consuming it | **True** | **Medium-high** | Block runs MCP company-wide with all servers built in-house; Bloomberg adopted it as an organisation-wide standard across 9,500+ engineers, explicitly building *identity-aware, multi-tenant* servers — the same shape as TGC's | These turning out to be engineering-productivity deployments only, never reaching line-of-business systems |
| I2 | The gateway + registry split is becoming the standard enterprise pattern | **True** | **Medium** | The pattern is consistently described the same way — the registry *discovers*, the gateway *enforces* — and Kong, Azure API Management with Entra ID, and several dedicated vendors ship it. The 2026-07-28 spec added header-based routing specifically so gateways can meter without parsing bodies | Clients moving to direct server connections with policy enforced client-side. The spec is moving the other way |
| I3 | TGC's registry shape is a reasonable candidate platform schema for the Aviator Gateway | **Plausible, unproven** | **Low-medium** | It carries exactly the metadata a gateway needs — tool, scope, tenant class, read/write, workload-callable — and the industry consensus is that gateways need this. But it has never been reviewed by the platform team, and no second product has tried to adopt it | Aviator selecting a commercial gateway with its own registry schema. **This is the claim in this document most likely to be wrong**, and it is cheap to test: show it to the platform team |
| I4 | Internal adoption should precede external, because the hard work is shared | **True, and it is the strategic recommendation** | **Medium-high** | Identity, tenancy, audit and the tool layer are identical either way; the blast radius of getting them wrong is smaller internally. TGC already demonstrates the pattern — the in-portal Compliance Agent consumes the same `lib/mcp/tools.ts` | A customer signing for the external connector before the internal work lands. A good problem, and it would reorder the roadmap |
| I5 | Internal MCP will eat conventional internal integration | **Not yet — and don't claim it** | **Low** | MCP is a façade over business logic, not a replacement for it. Everything cited above wraps existing services; nothing retires an integration layer | It becoming true would look like a company running MCP as its primary system-to-system transport. Nobody credible is doing this |

## Where the thesis is weakest

Four things, stated plainly, because a document that only argues one way is worth
less to the person reading it.

**1. Agentic AI is heading into the trough, and MCP rides that curve.** Gartner's
2026 Hype Cycle places agentic AI at the Peak of Inflated Expectations, reports
only 17% of organisations having deployed agents, and predicts **over 40% of
agentic AI projects will be cancelled by the end of 2027** on cost, unclear value,
or inadequate risk controls. Publishing a server does not make anyone use it. The
useful nuance in the same analysis: results are coming from *well-scoped agents in
constrained workflows with human oversight* — which is a fair description of a
32-tool server with per-call authorization and a two-phase confirm, and not a fair
description of most things being funded.

**2. The security record is genuinely bad, and it is the strongest argument
against naive adoption.** Tool poisoning — malicious instructions hidden in tool
descriptions or responses, invisible to the user but read by the model — is now an
OWASP-catalogued attack class. Microsoft has published warnings about poisoned
tool descriptions causing agents to leak data. Invariant Labs demonstrated a
cross-server attack using the official GitHub MCP server, exploiting the fact that
users routinely grant broad repository scope. Scans of public servers report
double-digit percentages with command-injection or SSRF findings, and hundreds
exposed to the internet with no authentication at all. The NSA published a
security-guidance document on MCP in June 2026.

The correct conclusion is not "therefore don't." It is that **the governance is
the product**, and every one of those failures is an implementation failure that
TGC's design already answers: no unauthenticated access, tenant derived not
chosen, authority split into five scopes, nothing mutates on a first call,
everything logged including refusals. That is a defensible position — but it has
to be stated as *"we did the work,"* never as *"MCP is secure."*

**3. Protocol churn moves our own boundaries.** The 2026-07-28 spec is six days
old and materially changes the deployment model. Multi Round-Trip Requests, which
let a server return `input_required` mid-call, are a direct alternative to the
custom pending-token mechanism in `lib/mcp/pending.ts`. Server-returned UI would
move "dense comparison" out of the MCP-hostile column. The enforce-vs-request
table in the deck is a snapshot of a moving boundary, not a property of the
protocol.

**4. Consolidation risk.** If gateways and registries become where the value sits,
individual product servers become commodity plumbing — a checkbox, not a
differentiator. TGC's answer has to be the thing a gateway can't supply: the
domain model, the compliance engine, and the bilateral tenancy rules. **The moat
is the requirement graph and the engine, not the connector.** Worth saying out
loud before someone else says it in review.

## What we should not claim

Extends the existing list in `mcp-pm-presentation.md` §5.4:

- **Not** "MCP is inherently secure." It standardises where authorization goes,
  not whether you did it.
- **Not** "Claude or Copilot can access our data safely by default." They must be
  explicitly authorized and constrained.
- **Not** "read-only means zero risk." Read tools disclose data; entitlement
  checks and output minimisation are mandatory.
- **Not** "the model decides access." Our platform and gateway do.
- **Not** "everyone is doing MCP, therefore it works." Adoption of a protocol is
  not evidence of value from the integrations built on it — and Gartner's
  cancellation forecast is the counterweight.
- **Not** "we are ahead." We have a prototype on mock data with no persistence.

## The verdict

**Yes, with two qualifications.**

MCP as the standard interface between AI systems and enterprise software is about
as settled as an eighteen-month-old protocol can be: vendor-neutral governance,
every major client, enterprise SSO shipped and stable, and a spec that has already
made the jump from local tool to distributed infrastructure. Betting *against* it
now requires believing something specific and unlikely.

The two qualifications are what the ledger is for:

1. **The protocol is settled; the value is not.** Nothing above shows that MCP
   integrations produce outcomes, and the most credible analyst view expects most
   agentic projects to be cancelled. Treat "MCP is the future" as a claim about
   *plumbing* and keep the *value* claim tied to something we can measure. The
   cheapest available measurement is still the one in the deck's Appendix D:
   instrument what fraction of report and dashboard sessions end in an **action**
   rather than in nothing.
2. **Internal-first is the better sequence for us**, and it is not what the
   current documentation set implies. The identity, tenancy, audit and tool-layer
   work is identical for both; internal has a smaller blast radius, a shorter
   procurement path, and a named vehicle already waiting in the TG Aviator
   Gateway. The external connector should follow the internal registry, not race
   it.

---
---

# Part Four — What follows

## 4a. TODO backlog

Consolidates what is currently scattered across the deck's L0–L4 ladder,
Appendix E, and [`mcp-implementation-plan.md`](./mcp-implementation-plan.md), and
adds the items that follow from Part Three. Ranked by leverage, not by effort.

| # | Item | Why it matters | Depends on | Size |
| --- | --- | --- | --- | --- |
| 1 | **Fix the stale numbers in the existing docs** | Four documents state tool counts and a supplier gap that are no longer true. A reviewer who checks one and finds it wrong discounts everything else. Details below | Nothing | XS |
| 2 | **Show `lib/mcp/manifest.ts` to the Aviator platform team** | Directly tests claim I3, the weakest claim in this document, and it costs a meeting | Nothing | XS |
| 3 | **Register resources** | The missing primitive. Unblocks report-as-artifact, help content, and subscriptions at once. **Security note: every control today runs through the guard on tool invocation. Resources are a new surface that walks around that choke point — they need the same guard from the first one registered** | Nothing | M |
| 4 | **Persist report runs** (`run_id`, parameters, requester, timestamp) and add `list_report_runs` / `get_report_run` | Makes "the Belk scan from Tuesday" a thing you can name, re-open, attach to an email, and hand to an auditor — which is most of what the report screen is for. `reportToCsv()` already exists and has nowhere to go | A real datastore; #3 | L |
| 5 | **Return the audit correlation id to the caller** | `AuditEntry.id` already exists in `lib/mcp/audit.ts` and is never surfaced. The record exists; it just isn't quotable. Highest value-to-effort ratio in the list | Nothing | XS |
| 6 | **Instrument the action rate** on report and dashboard sessions | The measurement that decides whether conversational access replaces the screens, and it can be taken before committing engineering either way | Analytics on the portal | S |
| 7 | **Eval coverage for the connector** | Every "requested only" row in the enforce-vs-request table is an unmeasured assumption today. Connector calls are not traced and not in the golden set | Existing LangSmith harness | M |
| 8 | **Supplier `prioritise_my_gaps`** | Ranks gaps by how many retail partners each one unblocks. This is the payoff the README claims as the supplier's whole reason to be on the network — *fill a gap once, satisfy every retailer* — and nothing computes it on either surface | Existing supplier functions | S |
| 9 | **Requirement-set versioning** | The security memo assumes published, approved versions ("Fall 2026 / v3.2"). The code has `status` and `lastUpdated` only, so the memo's own sample output cannot currently be produced | Data model change | M |
| 10 | **Scheduled compliance snapshots** | Turns reconstructed history into captured history. Today's trend is engine-scored over reconstructed past states, correctly labelled `provenance: "reconstructed"` — no amount of tooling makes that observed | A datastore | M |
| 11 | **Bounded, cost-aware retrieval per call** | Explicit caps on retrieval depth and payload size, before the tool surface grows further. Currently unbounded | Nothing | S |
| 12 | **Evaluate Multi Round-Trip Requests against `lib/mcp/pending.ts`** | The 2026-07-28 spec's `input_required` result type may replace our custom pending-token mechanism with a protocol-native one. Do not migrate reflexively — our version survives an abandoned conversation and carries an audit trail — but do not let it drift into unmaintained bespoke plumbing either | SDK support for the new spec | S to assess |
| 13 | **Track the 2026-07-28 migration** | Stateless core, Client ID Metadata Documents replacing Dynamic Client Registration, RFC 9207 issuer validation. There is a twelve-month deprecation window, so this is planning, not panic — but our client-registration code is directly affected | Tier 1 SDK releases | M |

### The stale claims behind item 1

Verified against `lib/mcp/manifest.ts` on 2026-08-03:

| Document | Says | Actually |
| --- | --- | --- |
| `mcp-faq.md` §4 | "Six read tools and three write tools" | 32 tools: 20 read, 12 write |
| `mcp-faq.md` §4 | Supplier-side tools "not built in this prototype" | 5 supplier tools shipped |
| `mcp-pm-presentation.md` §2.2, §6 | "About thirty capabilities" / "29 tools" | 32 |
| `mcp-pm-presentation.md` Appendix A | Supplier "Read (4)" | 5 |
| `mcp-pm-presentation.md` §4 | "Supplier-side has no report tool… The engine already exists. The tool doesn't" | `run_my_compliance_report` exists |
| `README.md` | The connector "covers the retailer side" | Both sides shipped |

## 4b. Files recommended for removal

Verified while writing this document. **These are recommendations — nothing is
deleted in the change that adds this file.** Each should be its own small commit
so a reviewer can disagree with one without reverting the others.

| File(s) | Finding | Risk |
| --- | --- | --- |
| `enterprise_safe_remote_mcp_retailer_catalog_compliance.md` (repo root, 231 lines) | A superseded duplicate of [`enterprise-safe-remote-mcp.md`](./enterprise-safe-remote-mcp.md) (274 lines) — same memo, same audience, same purpose line, but the `docs/` copy also carries the editor's-note table reconciling the memo against the code as built. A repo-wide grep finds **no reference to the root copy from anywhere** | **None.** Safe to delete |
| `docs/*.csv` — 15 files (`Accessories.csv`, `Body Washing.csv`, `Cosmetics-Makeup Products.csv`, `Footwear.csv`, `Fragrances.csv`, `Hair Care.csv`, `Hair Removal.csv`, `Handbags.csv`, `Jewelry.csv`, `Nail Care.csv`, `Skin Care.csv`, `Sleepwear.csv`, `Sunscreen-Tanning.csv`, `Swimwear.csv`, `Underwear.csv`) | **Byte-identical** to the repo-root copies (`diff -q` on all 15). Every consumer reads from the repo root — `scripts/generate-golden-dataset.ts`, `scripts/upload-golden-dataset.mjs`, and the derivation comments in `lib/gs1-standard-library.ts`. Nothing reads the `docs/` path | **Low.** `CLAUDE.md` currently describes them as an intentional duplicate "for the MCP/docs context", so that line must be updated in the same commit |
| `package-lock.json` (386 KB) | A second lockfile for a pnpm project. `CLAUDE.md` names `pnpm-lock.yaml` as the source of truth and says this one "is not the one to update" — i.e. it is already documented as drifting | **Medium.** Some CI and host package-manager detection keys off its presence. Verify a clean Vercel build before deleting |

**Do not remove** the repo-root `*.csv` files or
`gs1_extended_attribute_master_code_list.csv`. They look like build artifacts and
are not: they are source data read at generation time, and `CLAUDE.md` flags them
explicitly.

---

## Sources and verification status

Following the convention set in
[`mcp-pm-presentation.md`](./mcp-pm-presentation.md) Appendix F: several sites
block automated fetching, so verification status is stated per source rather than
implied.

### Verified — fetched and read directly

- [MCP joins the Agentic AI Foundation](https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/) — Linux Foundation stewardship, co-founders, maintainer independence
- [The 2026-07-28 Specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/) — stateless core, MRTR, header routing, cacheable lists, authorization hardening, extensions, deprecation window, SDK download figures
- [Enterprise-Managed Authorization: Zero-touch OAuth for MCP](https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/) — stable 18 Jun 2026, IdP/client/server adopter list
- [Model Context Protocol blog index](https://blog.modelcontextprotocol.io/) — release timeline
- [Official MCP Registry](https://registry.modelcontextprotocol.io/) — exists and is live; **no server count is published on the page**, so any "N thousand servers" figure in circulation is not sourced from here

### Not verified — search-result summaries only (the source blocked automated fetching)

Treat every figure below as needing a primary-source check before it goes in front
of a customer or on a slide.

- [Gartner — Hype Cycle for Agentic AI, 2026](https://www.gartner.com/en/articles/hype-cycle-for-agentic-ai) — the 17% deployed figure, the >40% cancellation forecast, and the Peak-of-Inflated-Expectations placement. **Gartner is paywalled; these come from secondary coverage**
- [OWASP — MCP Tool Poisoning](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning) — the attack class
- [Invariant Labs — Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) — the GitHub MCP cross-server demonstration
- [Microsoft warning on poisoned MCP tool descriptions](https://thehackernews.com/2026/06/microsoft-warns-poisoned-mcp-tool.html)
- [NSA — Security Design Considerations for AI-Driven Automation (CSI, Jun 2026)](https://media.defense.gov/2026/Jun/02/2003943289/-1/-1/0/CSI_MCP_SECURITY.PDF)
- [MDPI — MCP threat modelling and tool-poisoning analysis](https://www.mdpi.com/2624-800X/6/3/84)
- Block and Bloomberg internal-deployment details — including the "9,500+ engineers" and "identity-aware, multi-tenant MCP servers" characterisations — reached via [ZenML's LLMOps database entry](https://www.zenml.io/llmops-database/ai-powered-developer-productivity-platform-with-mcp-servers-and-agent-based-automation). **Find the original Bloomberg engineering talk before citing these publicly**
- Vulnerability-prevalence percentages (command injection, SSRF, exposed unauthenticated servers) — multiple secondary scan reports, none independently verified. **The claim "the security record is bad" is well supported; the specific percentages are not**
- Circulating enterprise-adoption percentages (e.g. "41% in production", "78% of enterprise AI teams") — **no primary source located; do not use**

### Already in the repo, unchanged by this document

The retail and CPG landscape sources — Walmart, Stacklok, Akeneo, Shopify,
Microsoft Dynamics 365 Commerce, Logicbroker, and the EU ESPR / Digital Product
Passport material — are in
[`mcp-pm-presentation.md`](./mcp-pm-presentation.md) Appendix F with their own
verification caveat, which still applies.
