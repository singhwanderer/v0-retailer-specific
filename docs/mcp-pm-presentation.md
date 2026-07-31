# Connecting TGC to AI Assistants (MCP)
### A concepts-first walkthrough for Product Manager colleagues

---

## Part 1 — The concepts (no TGC yet)

### What problem is this solving?

Today, if someone wants an AI assistant (Claude, ChatGPT, etc.) to answer
questions using *our* data — "which of my suppliers are behind on
compliance?" — the AI has no way to reach that data. It only knows what's in
its training data and whatever the user pastes into the chat box.

To make an AI assistant useful against a company's real, live data, someone
has to build a bridge between "the AI" and "our systems." Historically, every
company built that bridge differently — a custom plugin for this AI, a
different custom integration for that AI, none of them reusable.

### What is MCP?

**MCP (Model Context Protocol)** is an open, shared standard — think of it
like "USB-C for AI assistants." Instead of building a different one-off
integration for every AI product, a company builds **one MCP server**, and
*any* MCP-compatible AI assistant (Claude, ChatGPT, Microsoft Copilot Studio,
and a growing list of others) can plug into it the same way.

An MCP server exposes two kinds of things to the AI:

- **Tools** — specific actions the AI is allowed to take, e.g. "look up a
  supplier's compliance status" or "create a new requirement." Each tool
  comes with a strict, machine-readable description of exactly what
  information it needs and what it's allowed to return.
- **Prompts** (optional) — ready-made suggested questions the AI client can
  surface to the user as clickable starting points.

### The single most important idea: the AI reads the tool's rulebook itself

When a user connects their AI assistant to an MCP server, the assistant asks
the server, in effect, *"what can I do here, and what do you need from me?"*
The server answers with a precise contract for every tool — which fields are
**mandatory**, and for fields with a fixed set of valid choices, exactly
**which values are allowed**.

This means the AI doesn't need to be specially trained or prompt-engineered
to know your business rules. If a form requires "format" and only allows
JPEG/PNG/TIFF/WebP, the AI reads that requirement live, at the moment it
connects — and will ask the user for exactly those details, offering exactly
those choices, without a developer writing a single line of prompt text
describing the rule. **Change the rule on the server, and every connected AI
picks up the new rule automatically, with no retraining.**

### Why would a company do this instead of building a chatbot?

- **One integration, every AI.** Instead of a bespoke chatbot for our product,
  we publish one MCP server and any MCP-compatible assistant — including ones
  we don't control, like a customer's own Claude or ChatGPT — can use our data
  and take actions on our behalf, with the user's own AI subscription doing
  the reasoning.
- **The AI never invents your rules.** Because mandatory fields and valid
  values come from a strict machine-readable contract (not a paragraph of
  instructions the model might misread), the AI is far less likely to accept
  or propose invalid data.
- **Safety is layered, not just "hope the AI behaves."** The server enforces
  every rule again when the AI actually tries to act — so even if something
  went wrong upstream, invalid data cannot get written.

---

## Part 2 — What we built for TGC

### The pitch in one line

We stood up a small **MCP server** that exposes our (currently mock) retailer
requirement and supplier-compliance data as a set of tools, so anyone can
point their own Claude or ChatGPT at it and *just talk* to our data — no
custom chatbot, no API key of their own to manage, nothing to install — they
sign in with their own work account and choose how much access to grant.

### Plain-text flow — from connecting to getting an answer

```
   PM/user has their own Claude, ChatGPT, or             (no engineering
   Claude Desktop app — already, today                    involvement needed
        │                                                  for this step)
        ▼
   They paste ONE URL into their AI's "Connectors"
   settings:  https://v0-retailer-specific.vercel.app/api/mcp
   (no API key to create — the AI discovers the sign-in itself)
        │
        ▼
   They sign in with their OWN work account and pick how much
   access to grant (reading and authoring by default; activating
   and removing are separate). Which organisation's
   data they get is decided by WHO THEY ARE — never a choice.
        │
        ▼
   Their AI connects and asks the server:
   "what tools do you have, and what do each of them need?"
        │
        ▼
   Server answers with a precise contract per tool —
   e.g. "set_image_requirement needs a format, and format
   must be exactly one of: JPEG, PNG, TIFF, WebP"
        │
        ▼
   User types a plain-English question or request, e.g.:
   "Which of my suppliers are furthest behind on compliance?"
   or: "Add a lifestyle image requirement to Footwear."
        │
        ▼
   Their AI decides which tool(s) to call, fills in the
   required fields (asking the user for anything missing,
   offering only the valid choices), and calls the tool
        │
        ▼
   Our server runs the actual logic against our data,
   VALIDATES the request again (rejects anything invalid,
   naming the exact bad field), and returns a real answer
        │
        ▼
   The user's AI turns that into a natural-language answer:
   supplier names, gap counts, or a confirmation that a new
   requirement was created
```

**Nothing here required us to write any conversational/prompting logic.** The
"understanding what the user means" and "holding a natural conversation" parts
are entirely the connecting AI's job — ours is just to publish the tools and
their rules correctly and enforce them.

### What tools exist today

| Category | Tools |
| --- | --- |
| **Read (15)** | search GS1 categories, list/inspect requirement profiles, list/inspect supplier compliance, list global System filters, run a compliance report across the vendor base, **see a 6-month compliance trend, down to one supplier's one category**, **find which attributes many different vendors are failing at once, with the retailer's own authored guidance for each**, list vendor exceptions on file, **simulate a requirement change without applying it**, **draft vendor outreach from a supplier's real gaps**, **search this organisation's own AI access log** (administrators only), list proposals awaiting confirmation, and a `get_capabilities` "what can you do" helper |
| **Write (6)** | create a requirement profile, add an attribute requirement, change an attribute's label or guidance, set an image requirement, activate or deactivate a profile, grant or update a vendor exception |
| **Remove (4)** | drop an attribute requirement, drop an image requirement, delete a whole profile, revoke a vendor exception. Each needs `tgc.destructive` **on top of** the relevant write scope |

### Nothing writes on the first call

Every tool in the last two rows is two-phase. Called once, it does not act — it
returns a preview of exactly what would change, what that does to compliance
numbers, and a short-lived confirmation token. A separate `confirm_pending_change`
tool is the only path that mutates.

That is there because the in-portal agent gets a human in the loop for free (a
proposal card with Apply and Cancel) and an external Claude or ChatGPT session
does not. Putting the confirmation in the protocol rather than the UI buys three
things: the assistant has to state the consequence before a person can approve it,
the approval is a separate audited act, and a conversation somebody abandons
changes nothing, because an unconfirmed proposal simply expires.

Two smaller decisions worth noting, because both are product calls rather than
plumbing:

- **Removal tells you what it costs.** Ask to drop a requirement and the response
  says the reported number improves *without any supplier supplying anything* —
  that it lowers the bar rather than closing a gap. A tool that makes the chart
  look better without saying so will be used to make the chart look better.
- **Simulation states its own assumption.** "What happens if I require Sustainable
  Materials on Apparel?" returns the gap and vendor impact *and* the model behind
  it — that it assumes no supplier already holds the data. A forecast whose model
  is hidden is worse than no forecast.

### And the same server answers the supplier side

| Category | Tools |
| --- | --- |
| **Supplier reads (4)** | own compliance status (against the GS1 baseline *and* each retail partner separately), own retail partners with their open gaps and extra requirements, own outstanding attributes and images for a chosen partner, and the exceptions retailers have granted them |

**The point is that it's the same server, behind the same URL.** A supplier and
a retailer paste the identical connector address. Which set of tools they get is
decided by *who signed in* — not by a different deployment, a different URL, or
a setting anyone can flip. A supplier's assistant is never even shown the
retailer tools, and would be refused if it somehow called one.

That mirrors how the network actually works: TGC is bilateral, so a one-sided
connector was always half a product.

### Plain-text flow — the supplier side

```
   A J.Renée user pastes the SAME connector URL
        │
        ▼
   They sign in with THEIR OWN work account
   (a J.Renée account, not a Dillard's one)
        │
        ▼
   The server derives: supplier tenant → supplier tools
   The retailer tools are not listed at all
        │
        ▼
   "Which retail partner am I furthest behind for?"
   "What's still outstanding for Dillard's?"
   "What has been waived for me?"
        │
        ▼
   Answers about THEIR catalogue, per retail partner —
   because compliance is never one global score: each
   retailer layers its own requirements on the standard
```

One nuance worth calling out, because it is the interesting bit of a bilateral
network: a supplier **can** see the waivers a retailer granted *them* — that is
a shared fact, and they are a party to it — and **cannot** see anything else
that retailer holds. Not their other suppliers, not their requirements, not
their reports. "Rows about me" is a different thing from "their data", and the
server enforces the difference on every call.

### Explaining the security model to a non-technical room

Three of the eleven rows in §4A below are the ones people ask about, and all three
are hard to picture in the abstract. One framing carries all of them: **what an AI
assistant carries on every request is a building pass.** It says who printed it,
which building it is for, which doors it opens, and whose floor the holder may
stand on.

- **No pass** — refused. There is no guest mode and no shared key in a config file
  for someone to leak, because there is no key. What comes back instead is
  *directions to reception*: the refusal tells the assistant where to sign in,
  which is why the whole of a user's setup is pasting one URL.
- **A real pass, for the building next door** — also refused, and this is the one
  worth slowing down on. Picture a pass that is entirely genuine: right security
  desk, correct signature, real employee, every door ticked. Its only flaw is that
  it was issued for a *different service on the same platform*. We refuse it on the
  audience check alone, before it reaches any catalogue data. Without that, anyone
  who can obtain a pass to any Aviator service could walk in on it and have us act
  on their behalf — the "confused deputy". It is why tokens are bound to one
  resource.
- **A pass belonging to a robot rather than a person** — allowed, but capped in
  advance. A scheduled agent authenticates as itself rather than borrowing an
  employee's session, its identity is tied to one organisation, and it carries read
  access only. It can raise a flag; it cannot waive a requirement, because there is
  nobody present to approve that.

And the detail that makes the audit trail trustworthy rather than decorative: a
call refused *before* authentication is filed under **nobody**. The token names an
organisation, but the entire reason we rejected it is that we do not believe the
token. File it under the named organisation and anyone could write junk into any
customer's audit log with a forgery. Dropping them is not an option either — a
burst of rejected tokens is exactly what an administrator needs to see.

> **A note on where this lives.** This framing is presenter and reader material. It
> is deliberately *not* in the product: an earlier build had a "Security" tab in the
> AI Assistant Access screen that staged these three refusals as clickable demos,
> and it was removed. An administrator opening that screen has a real job — connect
> an assistant, review what it did — and a rehearsed attack demo dressed as an admin
> feature is not that job. The screen is now Connect and Access log.

### Who can see the audit trail

Every AI action against an account is logged — who, which assistant, which
tool, what was allowed or refused. Two limits on reading it, both of which
customers ask about immediately:

- **Only your own organisation's activity.** A Dillard's administrator sees
  Dillard's lines and nothing from Belk or J.Renée.
- **Administrators only.** A category buyer connects their own assistant, but
  does not get to read every AI action taken across the whole company.

This is retailer- and supplier-facing, and in both cases scoped to the signing-in
organisation's own data — no account can see another's.

### Vendor exceptions are chat-operable, and actually move the numbers

Earlier drafts of this doc's own example prompts ("Give Levi's a 60-day
extension on sustainable-materials fields," "Show all active exceptions")
promised this before it existed — it's now real. Granting an **Attribute
Waiver** exception through the AI immediately reduces that vendor's reported
gap count for that exact category, the next time a compliance report runs —
in the same conversation, in both `run_compliance_report` and the portal's
own Compliance Reports/Dashboard screens (they share one engine). Extended
Deadline and Reduced Scope exceptions still change which attribute gets
named as a gap, but — deliberately — don't reduce the count, since a
deadline extension doesn't erase the requirement, only delays it.

### Two things we specifically designed for real-world (not scripted-demo) use

- **"What can you help me with?" always works.** A dedicated `get_capabilities`
  tool returns a plain-English list of what's possible *plus* a live snapshot
  of what data actually exists (which profiles, suppliers, categories) — built
  live from the data store, so it can never go stale or drift from reality.
- **Empty results redirect instead of dead-ending.** If someone asks about a
  supplier that doesn't exist in the demo, the tool doesn't just return
  nothing — it returns a note suggesting the suppliers that *do* exist, so the
  conversation keeps moving instead of hitting a wall.

---

## Part 3 — Guardrails, current limits, and what's next

### Safety by construction, not by hoping the AI behaves well

- Mandatory fields and allowed values are enforced **twice**: once as a
  contract the AI reads before acting, and again by our server when the tool
  is actually called. An invalid value cannot be written even if the AI
  proposes it.
- Every write includes a `demo_note` making clear it went into a temporary,
  in-memory demo store — nothing about this prototype touches a real system.

### Honest current limits (this is a demo, not production)

- **Auth is now real, but the identity provider is not.** The connector
  requires OAuth 2.1 sign-in and enforces tenant isolation on every single tool
  call, progressive read/write scopes, and full audit logging. What's still a
  stand-in is *where the people come from*: a local demo sign-in rather than a
  customer's own Entra ID / Okta, federated through TG Aviator. See
  [the technical requirements doc](./mcp-enterprise-auth-trd.md) for exactly
  which boxes are checked and which are deliberately not.
- **Writes don't persist.** Changes made via chat live in server memory and
  reset when the server restarts. A real version needs a real database.
  Related: chat-created requirements don't yet show up in the existing portal
  UI, because the portal screens don't read from this store yet — closing
  that loop is a planned next step.
- **This is a directional preview**, not a committed V1 feature — it exists to
  prove the experience is real and compelling before committing engineering
  time to production-harden it.

### Why this is worth PM attention now, even pre-production

- It's a **cheap way to validate demand**: does "just ask your AI" actually
  feel better to users than clicking through screens? We can find out before
  investing in hardening it.
- The **backend swap is invisible to the AI.** Because the AI only ever sees
  the tool contract, we can point the exact same connector at mock data today
  and real TGC services later — the AI-facing experience doesn't change.
- It's a **forward-compatible bet**: MCP is being adopted as a standard across
  the industry (Claude, ChatGPT, Microsoft Copilot Studio, developer tools
  like Cursor). Investing here is a "many AIs, one integration" bet, not a
  bet on any single AI vendor.

---

## Part 4 — Making this enterprise-ready and external-facing

Everything above is deliberately a **demo bar**, not a **production bar**. Those
are different checklists, and the industry has converged on what the
production one actually contains — this isn't us inventing security theater,
it's catching up to a documented standard.

### 4A — What "enterprise-ready, external-facing" actually requires

| Requirement | Why it matters | Where it's documented |
| --- | --- | --- |
| **Real auth (OAuth 2.1), no shared credentials** | An unauthenticated endpoint is fine for mock data and nowhere near acceptable once real customer data is behind it. Note what this really means: the *customer's* IdP authenticates their own employee — we never hold a user directory, and their offboarding revokes access without a ticket to us | MCP's own authorization spec now mandates OAuth 2.1 for any server handling real resources |
| **Tokens scoped to *this* server only (Resource Indicators, RFC 8707)** | Stops a token stolen from one system being replayed against another | Prevents the "confused deputy" attack pattern called out across enterprise MCP security guides |
| **Delegated identity, not a shared service account** | Every action needs to carry *both* "which customer/tenant" and "which agent" as separate, checkable claims — not one bucket credential everyone shares | OAuth token-exchange delegation (RFC 8693) — the emerging standard for agent-acts-on-behalf-of-user flows |
| **Separate service/workload identity for agent-initiated actions** | A delegated user token only exists while a human is in the session. An agent acting on its own — e.g. a scheduled compliance check with no user connected at that moment — needs its own scoped, short-lived credential (client-credentials style), not a borrowed user token | Standard distinction between "on-behalf-of" delegation and workload identity for autonomous agent actions |
| **Tenant checked on every tool call, not just at login — across *both* tenant classes** | A valid token isn't proof the caller should see *this* tenant's data — that check has to happen again at each individual tool invocation. For us specifically, that means keeping retailer tenants and supplier tenants isolated from each other, not just isolating peers within the same class | Called out repeatedly as the #1 multi-tenant MCP failure mode: isolation enforced at login but not re-checked per call |
| **Least privilege / progressive scopes** | Scope a connection by *authority*, not by refusing to write: authoring is safe to grant up front because it previews before it acts and can only produce Drafts, while the authorities that bite — *activating* a requirement across the vendor base, and *removing* things — are separate scopes. Consenting to "author requirements" should not silently also consent to "enforce" or "delete" them | Standard "progressive scope" pattern for MCP servers handling sensitive data |
| **A human approves every mutation** | An assistant that can delete a requirement inside a chat window with no confirmation step is not a feature. Every mutating tool returns a preview and a token; a separate call executes. The token carries no authority of its own — scope and tenant are re-checked on confirm | The human-in-the-loop expectation for agentic write access; MCP's own tool annotations exist to signal exactly this |
| **No token passthrough** | Our server must never blindly forward a token it didn't issue itself, or accept one meant for a different service | Explicitly called out as forbidden in current MCP security guidance |
| **Rate limits and bounded retrieval per call** | Caps on how much a single tool call can fetch or how often it can be called — without this, tool surface growth means unpredictable cost and blast radius, not just a security gap | One of the 5 essential practices in current enterprise MCP security guidance |
| **Container / process isolation per tenant or session** | Keeps one tenant's (or one compromised agent's) blast radius from reaching another tenant's runtime, not just their data | Listed alongside per-request identity and least privilege as core enterprise MCP practice |
| **Full audit logging (who, which agent, which tenant, which tool, what scope)** | Without conversation-level logging, a security incident can't be reconstructed and compliance can't be demonstrated | Table stakes for any MCP server described as "enterprise" in 2026 guidance |
| **Curated tool registry, not ad hoc tool sprawl** | Agents need a discoverable, vetted catalog of approved tools rather than every team wiring up its own — this was also raised directly by our own platform stakeholder (Rick) as a gap today | Standard recommendation alongside least privilege and audit logging |
| **Central gateway ownership** | Auth, tenancy, and rate-limiting should live in one shared layer (for us: the **TG Aviator MCP Gateway**), not be rebuilt inside every product's MCP server | Matches both external best practice and our own platform's stated direction |

The common thread across all of it: **a working demo and a safe one aren't the
same claim.** Nothing here is a surprise or a blocker we're discovering late —
it's the standard checklist, and we already know which boxes are unchecked.

**Where the prototype now stands against this table.** Rows 1-6, 10 and 11 are
implemented and demonstrable end-to-end: OAuth sign-in with the tenant derived
from the authenticated identity (never chosen), audience-bound tokens,
per-call tenant checks across both tenant classes, progressive scopes, workload
identity for agent-initiated runs, a live audit log, and a curated tool
registry. Row 7 is half done, rows 8 and 9 belong to the Gateway, and the
identity provider itself is still a local stand-in. Each row's requirement,
acceptance criteria, owner and demo status is in
**[the technical requirements doc](./mcp-enterprise-auth-trd.md)** — including a
section on what this prototype deliberately does *not* demonstrate, because a
demo that fakes container isolation or rate limiting gets caught in the first
technical review.

Two of these rows exist specifically because of what's in 4B below, not in
spite of it: **service/workload identity** is what the proactive,
event-triggered agent needs (no human in the session to delegate from), and
**two-tenant-class isolation** is what supplier-side tools require (retailer
and supplier tenants must never see each other, not just peers within one
side). Neither capability in 4B is safe to build until its matching row here
is checked.

### 4B — Beyond the prototype: what else becomes possible

Today's server is still deliberately narrow — 15 retailer read tools, 6
retailer write tools, 4 retailer removal tools, 4 supplier read tools, no
persistence. None of that is a ceiling. Once the enterprise-readiness
checklist above is in place, the same "one server, any AI" bet opens up:

- **Real integration with TG Aviator MT.** Per direct guidance from our
  platform stakeholder, TGC has been named the first implementation of
  TG Aviator's multi-tenant agent platform — meaning our MCP tool sits behind
  the shared **TG Aviator MCP Gateway** with a **Catalogue Domain Agent** in
  front of it, and any customer gets ad-hoc, conversational access with
  multi-tenant security enforced by the platform, not by us.
- ~~**Supplier-side tools, not just retailer-side.**~~ **Delivered.** This was
  gated on two-tenant-class isolation, and that box is now checked — so the
  supplier tool set shipped with it: own compliance per retail partner, own
  outstanding attributes and images, and the exceptions granted to them. It is
  the clearest example of the discipline this section describes: the capability
  waited for its control, and arrived the moment the control did.
- **Persistence and a real portal sync.** Writes made through chat should
  land in the same database the portal UI reads from, so a requirement
  created by an AI conversation shows up on-screen immediately — no separate
  demo store.
- **Agent-to-agent (A2A), not just human-to-agent.** Once identity and tenant
  scoping are solid, this doesn't have to be human-chat-only — a supplier's
  own agent could query our compliance tools directly (under its own scoped,
  audited identity), which is the same pattern the industry is standardizing
  under the A2A protocol.
- **Proactive, not just reactive.** Beyond "answer when asked," an
  event-triggered agent could flag a supplier falling behind on compliance the
  moment a report goes red, running under a scoped service identity tied to
  the affected tenant. This is also the rung where conversational access stops
  merely matching the Compliance Report and Dashboard screens and starts
  beating them — see Part 5 below and
  [the full analysis](./mcp-vs-reports-and-dashboards.md). The blocker named
  there — no captured compliance history, so nothing could answer "is this
  improving?" — is now half-addressed: `get_compliance_trend` reconstructs
  past catalogue states and re-scores them with the live engine, down to one
  supplier's one category, and states its own provenance
  (`"reconstructed"`, not `"simulated"`) on every answer. What's still missing
  is a real snapshot job — no month before today was ever actually observed.
- **Embedded, not just external chat.** The same tool contract can power an
  in-portal copilot, not only a user's external Claude/ChatGPT session —
  same backend, different front door.
- **Bounded, cost-aware retrieval.** As tool surface grows, apply the same
  discipline we already use internally for our Notion-based PM tooling —
  explicit caps on retrieval depth and payload size per call — so a bigger
  tool catalog doesn't mean unbounded, unpredictable cost per question.

None of this requires re-architecting the core idea — it's the same "AI reads
our rulebook live" model from Part 1, extended to more tools, more identities,
and more callers.

---

## Part 5 — Does this replace the Compliance Report and the Dashboard?

Short answer: partially, and unevenly. The long version is its own document —
[`mcp-vs-reports-and-dashboards.md`](./mcp-vs-reports-and-dashboards.md) — but
the argument is worth presenting directly, because "does the chatbot kill the
screen" is exactly the question a leadership room asks the moment a
conversational interface starts overlapping one they already paid for.

**Stop scoring surfaces. Score jobs.** A report and a dashboard are each five
or six jobs wearing one name — score them separately and the answer stops
being a matter of taste.

- **The Compliance Report is mostly replaceable.** Not because the model is
  clever, but because the request wizard is a parameter-collection form, and
  natural language collects parameters better than a form does — "run a GS1
  Core scorecard on Levi's, all attributes" replaces a 3-step wizard with one
  sentence. What blocks *full* replacement isn't intelligence — a chat answer
  evaporates and a report is supposed to be an artifact you can name, re-open,
  and hand to an auditor.
- **The Dashboard is half replaceable.** MCP can take over the alerting half —
  and take it over *decisively* — but shouldn't take the forensic half. ~180
  vendor rows × N attributes reads faster as a table your eye scans than as
  tokens that stream; that's a permanent property of the medium, not a gap to
  engineer away.

**The pattern, stated once:** MCP wins the beginning of the workflow (framing
the question — natural language beats a dropdown wizard) and the end (acting
on the answer — `draft_vendor_outreach` and `set_vendor_exception` live in the
same conversation as the finding, behind the same two-phase confirmation as
every other write). It loses the middle: displaying a lot of numbers at once.

**The recommendation is inversion, not replacement:**

- **Chat becomes the entry point and the action layer.** Framing the question,
  interrogating the result off-script, and doing something about it — finding
  a problem and fixing it stop being two different applications.
- **The scorecard becomes the artifact the conversation produces and links
  to**, not a destination you navigate to first.
- **The dashboard becomes a subscription.** Its alerting job moves to a
  push-based agent (the proactive pattern in Part 4B); its forensic job stays
  on screen, for the days someone genuinely needs to compare 180 vendors at
  once.

**What we should not try to replace**, because each of these is a genuine,
permanent property rather than a prompt-engineering gap: the zero-intent
glance (a dashboard is a tab you check by presence; chat requires deciding to
ask), one canonical number a team can argue from (mitigated by an
architectural rule — the model never does arithmetic, every figure is quoted
verbatim from the deterministic engine, though a stable `run_id` to cite
alongside it isn't wired up yet — that's the artifact-layer gap named below),
audit-grade evidence (a chat transcript isn't a citable artifact with a
timestamp and a named requester), and dense multi-vendor comparison.

**Where we actually are today, against that recommendation:** `run_compliance_report`
already replaces the ad hoc "I want to know X right now" reason for opening the
screen. `get_compliance_trend` and `diagnose_gap_pattern` extend the case —
the trend tool now answers a real per-category question instead of only an
aggregate one, and the diagnosis tool is the clearest example in the product of
advice a conversational surface can give that the dashboard structurally
cannot: it's organised per vendor, and "four vendors are failing the same
field" is a cross-vendor insight. What's still missing is the artifact
layer — no report run persists yet, so nothing is citable — and the
proactive/subscription half of the dashboard replacement, which has no
schedule or delivery channel wired up yet.

---

## Part 6 — Enterprise use cases: retail and CPG

Part 4A's sources are generic enterprise-security material — real, but they
don't answer "is anyone actually doing this in retail?" This section does,
with citations, and it's honest about the difference between what's shipping
and what TGC is specifically betting on.

### Three different things all get called "MCP" — separate them before citing examples

| Pattern | Who owns the chat surface | Example | TGC's analogue |
| --- | --- | --- | --- |
| **A — Embedded agent.** MCP is internal plumbing connecting the vendor's own agent to the vendor's own systems. Nobody pastes a URL. | The vendor | Walmart's supplier-facing agent **Marty** (and customer-facing Sparky) — both run on MCP internally; Akeneo's **Agentic Ziggy**, "embedded directly in the Akeneo Product Cloud" | The in-portal Compliance Agent |
| **B — Vendor experience hosted inside someone else's assistant.** The vendor controls login, rendering, and payment, but inside a third-party client. | Shared | Walmart's Sparky **inside ChatGPT** — a Walmart-managed environment with Walmart's own login and payment, not OpenAI's | Not built (this is what "L4 — rendered UI" would be) |
| **C — External connector.** A customer points *their own* Claude or ChatGPT at your endpoint and gets your tools. | The customer's AI | Shopify's Storefront MCP (auto-provisioned on every store, zero merchant setup); Microsoft Dynamics 365 Commerce MCP; SAP Commerce Cloud Storefront MCP | **This is TGC's bet** |

**The honest read.** Category C is real and shipping — but almost entirely
from *commerce platforms and data aggregators*, companies whose product **is**
the data interface. Individual retailers are choosing A and B instead: Walmart
built Marty as an in-product supplier agent, not a supplier-facing connector
anyone can point their own Claude at. TGC's specific bet — a customer pasting
one URL into their own AI to reach a bilateral, authenticated
retailer↔supplier **compliance** network — has no direct precedent I could
find in the retail/CPG space. That's genuinely differentiating, and it's less
validated than "everyone's doing MCP" would suggest. Worth saying exactly that
in the room, because peer PMs will trust the framing more for the honesty.

One nuance that makes Shopify the most useful Category C comparison rather
than a clean match: Storefront MCP is consumer-facing catalog search, where
TGC is B2B and authenticated — but the "one URL, auto-provisioned, zero setup"
property is the same one this demo leans on.

### The evidence that carries the room

- **A retailer is already building the supplier-facing agent TGC's thesis
  describes — on MCP, at the largest scale in the industry.** Walmart is
  consolidating its AI into four "super agents" connected via MCP: **Marty**
  is the supplier/seller-facing one — onboarding, order management,
  analytics, ad campaigns. That's the single strongest validation slide in
  this deck, with the caveat above: Marty is Category A (embedded), not C.
- **Retail's own numbers say MCP is exposing a data-quality problem, not
  solving one on its own.** Stacklok surveyed 100 technical leaders at
  leading retailers: more than 40% run MCP in production, top use cases are
  supply chain and pricing optimization, and — the line worth building a
  slide around — *"MCP usage is exposing concerns about data quality and
  availability."* The industry is discovering that agents are only as good as
  the product data underneath. That's precisely the layer TGC governs. Frame
  TGC not as another agent, but as the thing the other agents are failing for
  want of.
- **The PIM category has already made the same bet TGC has.** Akeneo shipped
  Agentic Ziggy (8 July 2026): specialist agents including schema mapping for
  **retailer specification compliance** and quality checks, with governance
  and approval built into every step — TGC's problem space and TGC's
  two-phase confirm pattern, in an adjacent product. The approach is
  validated; the window to be early is not indefinite.
- **Platform vendors are shipping retail MCP servers**, which is the concrete
  version of Part 3's "forward-compatible bet" claim: Microsoft's Dynamics
  365 Commerce MCP server (NRF 2026) and SAP's Commerce Cloud Storefront MCP
  server (Q2 2026 GA).

**One finding to present as a challenge, not just a win.** Logicbroker — a
retailer↔supplier dropship network running $10bn+ GMV for Samsung, Walgreens,
and Home Depot — already exposes over MCP what this doc's own Part 4B calls
future work: **resources** (orders, products, inventory, events) alongside
tools, and **event subscriptions that trigger corrective tools** ("notify
suppliers," reprocess a failed document). TGC registers no resources and has
no subscription mechanism today. Its posture spans Category B and C rather
than being a clean comparison, so don't cite it as a like-for-like
competitor — but the pattern is shipped, in a network shape close to TGC's
own. Worth naming in the room rather than having someone else raise it in
review.

**A regulatory driver worth one slide.** EU ESPR delegated acts for textiles
are expected in 2027 with an ~18-month transition period. The Trace4Value
pilot converged on roughly 126 data points per textile product, **tiered by
audience** — some visible to brands only, some to suppliers, some to
recyclers. TGC's categories are apparel and footwear, and the tenant-class
isolation plus the "rows about me" rule already documented in this doc (the
security-model section, and the supplier exception example) is the shape that
kind of tiered visibility requires. This is the clearest available answer to
"why would a retailer pay for this beyond a nicer UI?"

### Sources for the retail & CPG landscape

- [Walmart consolidating AI agents into 4 super agents — Modern Distribution Management](https://www.mdm.com/news/technology/ai/walmart-consolidating-ai-agents-into-4-super-agents/)
- [Meet Sparky and Marty — TechInformed](https://techinformed.com/meet-sparky-and-marty-walmarts-ai-super-agents/)
- [Walmart's Marty for retail media advertisers — Digital Commerce 360](https://www.digitalcommerce360.com/2026/01/09/walmart-marty-agent-ai-retail-media-network-advertisers/)
- [Walmart Global Tech — All in on Agents](https://tech.walmart.com/content/walmart-global-tech/en_us/blog/post/all-in-on-agents.html)
- [Walmart brings Sparky to ChatGPT as OpenAI rethinks Instant Checkout — Grocery Dive](https://www.grocerydive.com/news/walmart-sparky-chatgpt-instant-checkout/815961/)
- [Stacklok — State of MCP in Retail 2026](https://stacklok.com/resources/state-of-mcp-in-retail-2026/) ([PDF](https://stacklok.com/wp-content/uploads/2026/01/State-of-MCP-in-Retail-2026_FINAL.pdf))
- [Akeneo — first truly agentic Product Experience Platform (Agentic Ziggy)](https://www.akeneo.com/press-release/akeneo-introduces-the-first-truly-agentic-product-experience-platform/)
- [Microsoft — Dynamics 365 Commerce MCP server](https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2026/06/29/dynamics-365-commerce-introduces-agentic-capabilities-with-model-context-protocol-mcp/)
- [Logicbroker — agentic integrations via MCP](https://logicbroker.com/features/agentic-integrations-via-mcp/)
- [Shopify — Storefront MCP server (developer docs)](https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront)
- [TrusTrace — preparing for the EU Digital Product Passport](https://trustrace.com/knowledge-hub/how-fashion-brands-can-prepare-for-the-eu-digital-product-passport-a-practical-guide-1)

> **Verify before presenting.** Several primary sources above (the Stacklok
> PDF, Walmart's own tech blog, Akeneo's press release) blocked automated
> fetching, so figures like ">40% of retailers in production" and specific
> launch dates come from search-result summaries and secondary coverage, not
> a direct read of the source document. Pull the exact numbers from the
> primary source before they go on a slide. Everything stated above about
> *this codebase* — tool counts, what's delivered, what isn't — is verified
> directly against the code and needs no such check.

---

## Part 7 — The roadmap, ranked two ways

Leverage order and demo-wow order are genuinely different lists, and saying so
plainly is more useful to a PM audience than pretending there's one ranking.

| | Leverage (long-term value) | Wow (live-demo impact) |
| --- | --- | --- |
| Cross-vendor gap diagnosis (`diagnose_gap_pattern`) | High, and already shipped | **Highest** — no screen can produce this view at all |
| Per-category vendor trend (`get_compliance_trend`) | High — the piece that actually unblocks "is this improving?" | High — answers the exact question a dashboard trend line implies but can't honestly answer |
| Proactive push (Part 4B, L3) | **Highest long-term** — this is the rung where MCP stops matching the dashboard and starts beating it | High, *if* a real delivery channel exists — the scanning logic already runs under a workload identity today |
| Report-as-artifact (Part 5, L1) | **Highest structurally** — resources are the missing MCP primitive behind three separate gaps at once | Medium — a citable link appearing is real progress, but reads quieter live than a diagnosis or a trend |
| Persistence / a real datastore | Prerequisite for nearly everything above it | Zero on its own, but its absence is the single biggest live-demo risk (see below) |

**The one risk worth naming before a live session, regardless of ranking.**
Every piece of this server's state — OAuth signing keys, registered clients,
pending-change confirmation tokens, the audit log, and all demo writes — lives
in process memory, not a database. On serverless hosting, a token minted by
one instance can be unknown to the next, so a two-phase confirm can fail
mid-conversation. The cheap mitigation, unrelated to any feature work above:
pin a single signing key via environment configuration so every instance
verifies the same tokens. The complete fix — a real shared store — is the
prerequisite row in the table above, and is intentionally scoped as its own
piece of work rather than folded into this pass.

---

## Part 8 — "Our customers will never accept Claude or ChatGPT"

This is the objection most likely to come back from the room, and it deserves
a direct answer rather than a reassurance. The full version is a companion
decision memo —
[`enterprise-safe-remote-mcp.md`](./enterprise-safe-remote-mcp.md) — written
for a security and architecture audience. This is the PM-length version.

### The reframe that does most of the work

**MCP expands the user interface, not the data perimeter.** An external
endpoint is public only in *network reachability*. The data and the tools stay
private behind authentication and authorization — the same authorization this
prototype already enforces on every single call.

The objection usually contains a hidden assumption: that "connecting an AI"
means handing a model access to a database. It doesn't. What is exposed is a
short allowlist of named tools with typed inputs, policy validation on every
request, and minimized outputs. No raw catalogue, no schemas, no queries.

### The alternatives are worse, and that is the strongest argument

| Option | What it enables | The problem |
| --- | --- | --- |
| CSV export / direct data feed | Bulk consumption | **Copies data outside our control boundary permanently.** No real-time policy enforcement, no revocation, no audit of what was read. |
| A per-client chatbot integration | One tailored experience | Rebuilds integration *and security logic* for every AI client. Every rebuild is a new place to get authorization wrong. |
| Governed remote MCP | A small reusable set of live capabilities across approved clients | Requires disciplined identity, tool design, and monitoring — which is the work, and it is done once |

A governed MCP server can be **safer than the broad API access many customers
already grant**, precisely because it exposes fewer capabilities. That is a
better argument than "MCP is secure," which is not a claim anyone should make.

### If Claude isn't acceptable, don't use Claude — nothing about our server changes

This is the "USB-C for AI assistants" point from Part 1 finally paying off in
a procurement conversation rather than an architecture one. The same endpoint,
the same compliance engine, the same entitlement checks, and the same audit
trail serve every one of these:

| Client | Identity path | Whose governance |
| --- | --- | --- |
| **Microsoft 365 Copilot** | Entra SSO; tenant-governed declarative agent calling our MCP tools | The customer's own Microsoft tenant — usually already approved |
| **Claude / ChatGPT, enterprise agreements** | OAuth after the customer's own OIDC/SSO | The customer's own vendor contract and DPA |
| **TG Aviator Gateway + Catalogue Domain Agent** | Platform-issued, per the Gateway | Ours, under the existing customer relationship |
| **The in-portal Compliance Agent** | In-process, no external client at all | Entirely ours — no third-party model in the path |

**Which client a customer permits is a procurement decision, not an
architectural one.** We do not build a compliance engine per assistant; the
governed service stays one, and integration adapters stay thin. A customer
that forbids consumer AI can still have this — through Copilot in their own
tenant, or through the Gateway.

### Why this doesn't leak by design — and what already runs

The server returns data only when *all* of these hold: the user authenticated
through an approved authorization server; the token is valid, unexpired, and
issued **for this resource**; the caller holds the required read scope; the
tenant is derived from verified claims; the requested scope is entitled; the
tool is on the read-only allowlist; and the response is minimized.

Four of those are demonstrable in the prototype today — audience-bound tokens,
per-call tenant checks across both tenant classes, progressive scopes, and a
full audit log. **The AI client is never the authorization decision-maker.** A
user can type "show me Belk's supplier gaps" and the server refuses, because
the verified caller is not entitled to that tenant. Natural-language phrasing
never overrides server-side policy — which is exactly why the tenant is
derived from identity and can never be chosen.

### What we should not claim

Worth saying out loud in the room, because it is what makes the rest credible:

- **Not** "MCP is inherently secure." Security depends on implementation and
  governance.
- **Not** "Claude or Copilot can access our data safely by default." They must
  be explicitly authorized and constrained.
- **Not** "read-only means zero risk." Read tools still disclose data —
  entitlement checks and output minimization are mandatory, not optional.
- **Not** "the model decides access." It does not. Our platform and gateway do.

### The ask

A **gated, read-only pilot**: 5–15 named users or one design-partner tenant,
synthetic or pre-approved data first, no writes, 6–8 weeks, with cross-tenant
/ wrong-audience / invalid-token / missing-scope / unauthorized-supplier tests
all required to **fail closed**, and a prompt-injection suite showing no
bypass of the tool allowlist.

Note the deliberate difference from what the prototype demonstrates: the
prototype *shows* the two-phase write path (Part 2), because proving a human
approves every mutation is the point. The pilot proposes not *enabling* writes
externally at first. Scopes already make that a configuration rather than a
rebuild — grant read-only and the AI is never even shown the write tools.

> **Where the memo is ahead of the code.** It assumes versioned, approved,
> published requirement sets ("Fall 2026 / v3.2"), a correlation ID on every
> response, a portal deep link, and a per-call retailer→supplier entitlement
> check. The prototype has profile *status* but no versioning, an audit id
> that is never returned to the caller, no portal links, and a supplier
> fixture shared across retailer tenants. Those are tracked as work items in
> [`mcp-implementation-plan.md`](./mcp-implementation-plan.md) — and the
> reconciliation table at the top of the memo names each one, so nobody
> discovers them in security review instead.

---

### Sources for the practices above

- [MCP Authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Enterprise-Managed Authorization: Zero-touch OAuth for MCP](https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/)
- [MCP Security Best Practices for Enterprise Deployments (2026) — Stacklok](https://stacklok.com/blog/mcp-security-best-practices-what-every-enterprise-team-needs-to-know-in-2026/)
- [MCP Security for Enterprises: Best Practices Checklist — MintMCP](https://www.mintmcp.com/blog/mcp-security-enterprises)
- [How to Architect a Multi-Tenant MCP Server for Enterprise B2B SaaS — Truto](https://truto.one/blog/how-to-architect-a-multi-tenant-mcp-server-for-enterprise-b2b-saas/)
- [MCP Security for Multi-Tenant AI Agents: Isolation Patterns — Prefactor](https://prefactor.tech/blog/mcp-security-multi-tenant-ai-agents-explained)
- [OAuth for MCP — Emerging Enterprise Patterns for Agent Authorization — GitGuardian](https://blog.gitguardian.com/oauth-for-mcp-emerging-enterprise-patterns-for-agent-authorization/)

**Governance and standards sources** (from the companion memo — these carry
more weight with a security or architecture audience than vendor blog posts,
because they are frameworks a customer's own reviewers already recognise):

- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — least privilege, per-tool scopes, separating tool sets by trust level, human approval for high-impact actions
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) and its Generative AI Profile
- [Microsoft Learn — Secure access to MCP servers in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/secure-mcp-servers) — gateway token validation, managed credential handling
- [GS1 US National Data Quality Playbook](https://www.gs1us.org/industries-and-insights/by-industry/retail-grocery/data-quality-playbook) — trading-partner data quality as complete, accurate, standards-based, timestamped
- [GS1 Data Quality Framework](https://gs1.org/standards/data-quality-framework) — the standards basis for retailer/supplier master-data integrity

---

## Talking points for the room

- **MCP is a standard, not our invention** — "USB-C for AI assistants." We
  built one small server; any compatible AI can use it.
- **The AI reads our rules live, from a strict contract** — not from prompt
  engineering. Change a rule once on our server, every connected AI obeys the
  new rule immediately.
- **No new chatbot to build or maintain.** The user's own AI subscription does
  the conversation; we only publish and enforce the actions.
- **The security model is no longer a promise — it runs.** Sign in as two
  different customers and the same question returns different data; sign in
  read-only and the AI is not even shown the tools that write. What's still
  demo-grade is persistence, the identity provider, and platform-level controls
  that belong to Aviator — each a known, scoped step, not a surprise blocker.
- **"Enterprise-ready" is a checklist, not a vague future** — real OAuth,
  tokens scoped per server, tenant checked on every call across both retailer
  and supplier tenants, workload identity for agent-initiated actions, rate
  limits, container isolation, full audit logging. It's documented industry
  practice, and we already know which boxes are unchecked.
- **Every expansion idea maps to a specific checklist item.** Proactive agents
  need workload identity; supplier-side tools need two-tenant-class isolation.
  We're not adding scope faster than we're adding the controls it requires.
- **One connector, two audiences.** A supplier and a retailer paste the same
  URL and get different tools, different data, and different suggested
  questions — because the network is bilateral and the identity decides which
  side you're on. Nobody configures that; it falls out of who signed in.
- **The tenant is derived, never chosen.** Nobody — not the user, not the AI
  client, not an autonomous agent — can assert which customer's data they're
  acting on. It falls out of who authenticated. That single rule is what makes
  a multi-tenant connector safe, and it's why there's no account picker
  anywhere in the flow.
- **We're not building this security layer alone.** TGC is the named first
  implementation for TG Aviator's multi-tenant platform — our job is a
  Catalogue-specific Domain Agent behind their shared Gateway, not a bespoke
  auth stack.
- **The tool surface is a floor, not a ceiling** — supplier-side tools,
  agent-to-agent access, proactive alerts, and an in-portal copilot are all
  the same underlying model, just with more callers and more identities.
- **This isn't "replace the dashboard" — it's inversion.** Chat wins framing
  the question and acting on the answer; the screen wins dense comparison.
  The report becomes the artifact chat produces; the dashboard becomes a
  subscription. Two new tools ship the first half of that argument today:
  `get_compliance_trend` (down to one supplier, one category) and
  `diagnose_gap_pattern` (the cross-vendor insight no per-vendor screen can
  show).
- **Retail is already validating this bet — mostly not our version of it.**
  Walmart's supplier-facing agent Marty runs on MCP, and Stacklok's retail
  survey shows MCP already exposing data-quality problems industry-wide. But
  most of that is agents embedded in a vendor's own product (Category A), not
  a customer pasting a URL into their own Claude (Category C, TGC's bet).
  Say that distinction out loud — it's more credible than pretending the
  whole industry already proved the idea.
- **The regulatory case, not just the AI case:** EU ESPR's Digital Product
  Passport for textiles ties data to a product with tiered, audience-scoped
  visibility — exactly the shape TGC's tenant isolation already enforces.
- **"Our customers won't accept Claude/ChatGPT" is a procurement question, not
  an architecture one.** MCP expands the user interface, not the data
  perimeter — the endpoint is public only in network reachability. If a
  customer forbids consumer AI, they use Copilot in their own Entra tenant or
  the Aviator Gateway, and *nothing about our server changes*. That's the
  USB-C argument finally paying off somewhere it costs real money. The honest
  counterpart: the alternative most customers already permit — a CSV export or
  a data feed — copies data outside our control boundary permanently, with no
  revocation and no audit of what was read.
