# Connecting TGC to AI Assistants (MCP)
### A concepts-first walkthrough for Product Manager colleagues

## How to use this document

One file, three zones, meant to be read in different ways by different people.

| Zone | What it is | Who it's for |
| --- | --- | --- |
| **Part One** | A 45-minute presentation, ~28 slides. Every `###` heading is one slide: a title, at most six bullets or one table, and a bolded **line to say**. Copy-paste it straight into a deck. | The presenter, and the room |
| **Part Two** | The long-form version of the same six sections, in the same order. This is what the slides compressed. | Anyone who saw the talk and wants the argument in full, or who is reading cold |
| **Appendix** | Reference material — tool inventory, the capability ladder, the enterprise-readiness checklist, design questions, proposed tools, sources, and the honest limits. | Engineering, security, and anyone checking a claim |

Every slide in Part One is written in complete sentences, so the deck also reads
correctly as prose. No slide depends on anything above it, so sections can be
cut or reordered for a shorter session.

**A note on scope.** Everything stated here about *this codebase* — tool counts,
what is delivered, what is not — is verified against the code. Claims about the
outside world carry their sources in Appendix F, with a caveat about which ones
could not be fetched directly.

---
---

# Part One — The 45-minute presentation

---

## Section 1 — The concept (~7 min)

### 1.1 The problem this solves

- If someone wants an AI assistant to answer questions using *our* data —
  "which of my suppliers are behind on compliance?" — the AI has no way to
  reach it.
- It knows only its training data and whatever the user pastes into the chat.
- Historically, every company built that bridge differently: a custom plugin
  for this AI, a different integration for that one, none of them reusable.

**The line to say:** *Every AI integration used to be bespoke, which is why
almost nobody had one.*

### 1.2 What MCP is

**MCP (Model Context Protocol)** is an open standard — think "USB-C for AI
assistants." Build **one** MCP server, and *any* MCP-compatible assistant
(Claude, ChatGPT, Microsoft Copilot Studio, and a growing list) plugs into it
the same way.

A server exposes two things:

- **Tools** — specific actions the AI may take, each with a strict,
  machine-readable description of what it needs and what it returns.
- **Prompts** (optional) — ready-made suggested questions the client surfaces
  as clickable starting points.

**The line to say:** *One integration, every AI — that is the whole bet.*

### 1.3 The single most important idea: the AI reads the rulebook itself

When an assistant connects, it asks the server *"what can I do here, and what
do you need from me?"* The server answers with a precise contract per tool:
which fields are **mandatory**, and where a field has fixed choices, exactly
**which values are allowed**.

- No special training. No prompt engineering.
- If a form requires `format` and allows only JPEG/PNG/TIFF/WebP, the AI reads
  that live and offers exactly those choices.
- **Change the rule on the server, and every connected AI picks it up
  immediately, with no retraining.**

**The line to say:** *We publish the rules; the AI obeys them because it read
them thirty seconds ago, not because someone described them in a prompt.*

### 1.4 Why do this instead of building a chatbot?

- **One integration, every AI.** Including assistants we don't control — a
  customer's own Claude or ChatGPT — with the user's own AI subscription doing
  the reasoning.
- **The AI never invents our rules.** Mandatory fields and valid values come
  from a machine-readable contract, not a paragraph a model might misread.
- **Safety is layered, not hoped for.** The server enforces every rule again
  when the tool is actually called, so invalid data cannot get written even if
  something went wrong upstream.

**The line to say:** *We are not in the chatbot business — we publish
capabilities and enforce them.*

---

## Section 2 — What we built (~10 min)

### 2.1 The pitch in one line

We stood up a small **MCP server** exposing our (currently mock) retailer
requirement and supplier-compliance data as a set of tools — so anyone can
point their own Claude or ChatGPT at it and *just talk* to our data.

- No custom chatbot.
- No API key of their own to manage.
- Nothing to install.
- They sign in with their own work account and choose how much access to grant.

**The line to say:** *The user's setup is pasting one URL and signing in.*

### 2.2 What happens when someone connects

```
   User pastes ONE URL into their AI's "Connectors" settings
   (no API key to create — the AI discovers the sign-in itself)
        │
        ▼
   They sign in with their OWN work account and pick how much access
   to grant. Which organisation's data they get is decided by
   WHO THEY ARE — never a choice, and there is no account picker.
        │
        ▼
   Their AI asks: "what tools do you have, and what does each need?"
   Server answers with a precise contract per tool
        │
        ▼
   User asks in plain English: "Which of my suppliers are furthest
   behind on compliance?"  or  "Add a lifestyle image requirement
   to Footwear."
        │
        ▼
   Their AI picks the tool, fills the required fields (asking the
   user for anything missing, offering only valid choices), calls it
        │
        ▼
   Our server runs the real logic, VALIDATES again — rejecting
   anything invalid and naming the exact bad field — and returns
   a real answer, which their AI turns into natural language
```

**The line to say:** *We wrote no conversational logic at all — understanding
the user is the connecting AI's job; ours is publishing correct tools and
enforcing them.*

### 2.3 The tool surface today

| Category | Count | Examples |
| --- | --- | --- |
| **Retailer reads** | 15 | Compliance reports across the vendor base, 6-month trend down to one supplier's one category, cross-vendor gap diagnosis, simulate a requirement change, draft vendor outreach, search the AI access log |
| **Retailer writes** | 6 | Create a profile, add/change an attribute requirement, set an image requirement, activate a profile, grant a vendor exception |
| **Retailer removals** | 4 | Drop an attribute or image requirement, delete a profile, revoke an exception — each needs `tgc.destructive` **on top of** the relevant write scope |
| **Supplier reads** | 4 | Own compliance per retail partner, own retail partners, own outstanding attributes and images, exceptions granted to them |

Full inventory in Appendix A.

**The line to say:** *Twenty-nine tools, and the split between them is where the
security model lives.*

### 2.4 Nothing writes on the first call

Every write and removal tool is two-phase. Called once it does **not** act — it
returns a preview of exactly what would change, what that does to compliance
numbers, and a short-lived confirmation token. A separate `confirm_pending_change`
call is the only path that mutates.

Why it lives in the protocol rather than a UI card:

- The assistant must state the consequence before a person can approve it.
- The approval becomes a separate, audited act.
- An abandoned conversation changes nothing — an unconfirmed proposal expires.

**The line to say:** *The in-portal agent gets a human in the loop for free from
its Apply button; an external ChatGPT session doesn't, so we put the
confirmation in the protocol instead.*

### 2.5 One connector, two audiences

A supplier and a retailer paste the **identical** URL. Which tools they get is
decided by *who signed in* — not a different deployment, a different URL, or a
setting anyone can flip.

- A supplier's assistant is never even shown the retailer tools, and would be
  refused if it somehow called one.
- A supplier **can** see the waivers a retailer granted *them* — a shared fact
  they are party to — and **cannot** see anything else that retailer holds.
- "Rows about me" is a different thing from "their data," and the server
  enforces the difference on every call.

**The line to say:** *TGC is bilateral, so a one-sided connector was always half
a product.*

### 2.6 Two things built for real use, not a scripted demo

- **"What can you help me with?" always works.** A `get_capabilities` tool
  returns a plain-English list of what's possible *plus* a live snapshot of what
  data actually exists — built from the store, so it cannot drift from reality.
- **Empty results redirect instead of dead-ending.** Ask about a supplier that
  doesn't exist and the tool returns a note naming the suppliers that *do*, so
  the conversation keeps moving instead of hitting a wall.

**The line to say:** *A demo survives its script; a product survives someone
ignoring it.*

---

## Section 3 — Why it is safe (~8 min)

### 3.1 The building-pass framing

**What an AI assistant carries on every request is a building pass.** It says
who printed it, which building it is for, which doors it opens, and whose floor
the holder may stand on.

- **No pass** — refused. There is no guest mode and no shared key in a config
  file to leak, because there is no key. What comes back is *directions to
  reception*: the refusal tells the assistant where to sign in.
- **A real pass, for the building next door** — also refused. Right security
  desk, correct signature, real employee, every door ticked — but issued for a
  *different service on the same platform*. Refused on the audience check alone,
  before it reaches any catalogue data.
- **A pass belonging to a robot rather than a person** — allowed, but capped in
  advance. A scheduled agent authenticates as itself, is tied to one
  organisation, and carries read access only. It can raise a flag; it cannot
  waive a requirement, because nobody is present to approve that.

**The line to say:** *Without the audience check, anyone holding a pass to any
Aviator service could walk in on ours and have us act on their behalf.*

### 3.2 The tenant is derived, never chosen

Nobody — not the user, not the AI client, not an autonomous agent — can assert
which customer's data they are acting on. It falls out of who authenticated.

- A user can type "show me Belk's supplier gaps" and the server refuses, because
  the verified caller is not entitled to that tenant.
- Natural-language phrasing never overrides server-side policy.
- This is why there is no account picker anywhere in the flow.

**The line to say:** *That single rule — derived, never chosen — is what makes a
multi-tenant connector safe.*

### 3.3 Who can read the audit trail

Every AI action is logged: who, which assistant, which tool, what was allowed or
refused. Two limits customers ask about immediately:

- **Only your own organisation's activity.** A Dillard's administrator sees
  Dillard's lines and nothing from Belk or J.Renée.
- **Administrators only.** A category buyer connects their own assistant but
  does not get to read every AI action across the company.

One detail that makes the trail trustworthy rather than decorative: a call
refused *before* authentication is filed under **nobody**. The token names an
organisation, but the whole reason we rejected it is that we do not believe the
token — file it under that organisation and anyone could write junk into any
customer's audit log with a forgery.

**The line to say:** *Refusals are logged too, which is what makes this evidence
rather than a feature list.*

### 3.4 What MCP can enforce vs. what it can only request

| Property | In-portal agent | Over MCP |
|---|---|---|
| Tenant isolation | Enforced | **Enforced** — re-checked per call |
| Scope / authority | Enforced | **Enforced** — declared as data, tool list filtered per caller |
| No write on first call | Enforced by the proposal card | **Enforced** — moved into the protocol |
| Citation of sources | Enforced — derived from which tools fired | **Requested only** |
| Layout and rendering | Enforced — we own the panel | **Not ours** — the client's choice |
| Relaying `provenance` | Enforceable in the renderer | **Requested only** |
| Not restating figures from memory | Constrained by the rendered card | **Requested only** |

**The line to say:** *Every "requested only" row needs an eval, because a request
that is never measured is an assumption — and this table is also the clearest
argument for keeping the in-portal agent.*

### 3.5 "Enterprise-ready" is a checklist, not a vague future

Twelve requirements, documented industry practice, not security theatre: real
OAuth 2.1, tokens scoped to this server only, delegated identity, separate
workload identity for agent-initiated actions, tenant checked on every call
across both tenant classes, progressive scopes, a human approving every
mutation, no token passthrough, rate limits, container isolation, full audit
logging, and a curated tool registry.

**Where we stand:** eight of the twelve are implemented and demonstrable
end-to-end. One is half done, two belong to the Gateway, and the identity
provider is still a local stand-in. Full table with acceptance criteria and
owners in Appendix C.

**The line to say:** *A working demo and a safe one are different claims, and we
already know exactly which boxes are unchecked.*

### 3.6 Honest current limits

- **Auth is real; the identity provider is not.** OAuth 2.1 sign-in, per-call
  tenant isolation, progressive scopes, and audit logging all run. What is a
  stand-in is *where the people come from* — a local demo sign-in rather than a
  customer's Entra ID or Okta federated through TG Aviator.
- **Writes don't persist.** Chat-made changes live in server memory and reset on
  restart. Chat-created requirements don't yet appear in the portal screens,
  because those screens don't read from this store.
- **This is a directional preview**, not a committed V1 feature. It exists to
  prove the experience is real before committing engineering time to
  production-harden it.

**The line to say:** *Saying this out loud is what makes the rest of the deck
credible.*

---

## Section 4 — Does this replace the Compliance Report and the Dashboard? (~6 min)

### 4.1 Stop scoring surfaces. Score jobs.

A report and a dashboard are each five or six jobs wearing one name. Score them
separately and the answer stops being a matter of taste.

- **The Compliance Report is mostly replaceable.** Not because the model is
  clever, but because the request wizard is a parameter-collection form, and
  natural language collects parameters better than a form does. "Run a GS1 Core
  scorecard on Levi's, all attributes" replaces a 3-step wizard with one
  sentence.
- **The Dashboard is half replaceable.** MCP can take over the alerting half —
  decisively — but should not take the forensic half.

**The line to say:** *"Does the chatbot kill the screen" is the wrong question;
ask which jobs each surface actually does.*

### 4.2 The pattern, stated once

**MCP wins the beginning of the workflow and the end. It loses the middle.**

- **The beginning** — framing the question. Natural language beats a dropdown
  wizard.
- **The end** — acting on the answer. `draft_vendor_outreach` and
  `set_vendor_exception` live in the same conversation as the finding.
- **The middle** — displaying a lot of numbers at once. ~180 vendor rows × N
  attributes reads faster as a table your eye scans than as tokens that stream.

**The line to say:** *Finding a problem and doing something about it stop being
two different applications — that is the strongest case in the whole argument.*

### 4.3 The recommendation is inversion, not replacement

- **Chat becomes the entry point and the action layer** — framing the question,
  interrogating the result off-script, and doing something about it.
- **The scorecard becomes the artifact the conversation produces and links to**,
  rather than a destination you navigate to first.
- **The dashboard becomes a subscription.** Its alerting job moves to a
  push-based agent; its forensic job stays on screen, for the days someone
  genuinely needs to compare 180 vendors at once.

**The line to say:** *We are not retiring screens — we are inverting which
surface starts the workflow.*

### 4.4 What we should not try to replace

Each of these is a permanent property of the medium, not a prompt-engineering
gap:

- **The zero-intent glance.** A dashboard is a tab you check by presence; chat
  requires deciding to ask.
- **One canonical number a team argues from.** Mitigated by an architectural
  rule — the model never does arithmetic; every figure is quoted verbatim from
  the deterministic engine.
- **Audit-grade evidence.** A chat transcript is not a citable artifact with a
  timestamp and a named requester.
- **Dense multi-vendor comparison.**

**Where we are today:** `run_compliance_report` already replaces the ad hoc "I
want to know X right now" reason for opening the screen. What is still missing
is the artifact layer — no report run persists, so nothing is citable — and the
proactive half, which has no schedule or delivery channel. Full ladder in
Appendix B.

**The line to say:** *The blocker on trend is not MCP and never was — it is that
we store no history.*

---

## Section 5 — "Our customers will never accept Claude or ChatGPT" (~7 min)

### 5.1 The reframe that does most of the work

**MCP expands the user interface, not the data perimeter.** An external endpoint
is public only in *network reachability*. The data and tools stay private behind
authentication and authorization — the same authorization this prototype already
enforces on every call.

The objection usually contains a hidden assumption: that "connecting an AI" means
handing a model access to a database. It doesn't. What is exposed is a short
allowlist of named tools with typed inputs, policy validation on every request,
and minimized outputs. No raw catalogue, no schemas, no queries.

**The line to say:** *Network reachability is not data access.*

### 5.2 The alternatives are worse, and that is the strongest argument

| Option | What it enables | The problem |
| --- | --- | --- |
| CSV export / direct data feed | Bulk consumption | **Copies data outside our control boundary permanently.** No real-time policy enforcement, no revocation, no audit of what was read |
| A per-client chatbot integration | One tailored experience | Rebuilds integration *and security logic* for every AI client. Every rebuild is a new place to get authorization wrong |
| Governed remote MCP | A small reusable set of live capabilities across approved clients | Requires disciplined identity, tool design, and monitoring — which is the work, and it is done once |

**The line to say:** *A governed MCP server can be safer than the broad API
access many customers already grant, precisely because it exposes fewer
capabilities — and that is a better argument than "MCP is secure," which nobody
should claim.*

### 5.3 If Claude isn't acceptable, don't use Claude — nothing about our server changes

| Client | Identity path | Whose governance |
| --- | --- | --- |
| **Microsoft 365 Copilot** | Entra SSO; tenant-governed declarative agent calling our tools | The customer's own Microsoft tenant — usually already approved |
| **Claude / ChatGPT, enterprise agreements** | OAuth after the customer's own OIDC/SSO | The customer's own vendor contract and DPA |
| **TG Aviator Gateway + Catalogue Domain Agent** | Platform-issued, per the Gateway | Ours, under the existing customer relationship |
| **The in-portal Compliance Agent** | In-process, no external client at all | Entirely ours — no third-party model in the path |

**The line to say:** *Which client a customer permits is a procurement decision,
not an architectural one — and that is the USB-C argument finally paying off
somewhere it costs real money.*

### 5.4 What we should not claim

Worth saying out loud, because it is what makes the rest credible:

- **Not** "MCP is inherently secure." Security depends on implementation and
  governance.
- **Not** "Claude or Copilot can access our data safely by default." They must be
  explicitly authorized and constrained.
- **Not** "read-only means zero risk." Read tools still disclose data —
  entitlement checks and output minimization are mandatory.
- **Not** "the model decides access." It does not. Our platform and gateway do.

**The line to say:** *The credibility of everything else in this deck comes from
being specific about what we are not claiming.*

---

## Section 6 — Roadmap and the ask (~7 min)

### 6.1 The roadmap, ranked two ways

Leverage order and demo-wow order are genuinely different lists, and saying so is
more useful than pretending there is one ranking.

| | Leverage (long-term value) | Wow (live-demo impact) |
| --- | --- | --- |
| Cross-vendor gap diagnosis | High, and already shipped | **Highest** — no screen can produce this view at all |
| Per-category vendor trend | High — the piece that unblocks "is this improving?" | High — answers the question a dashboard trend line implies but can't honestly answer |
| Proactive push | **Highest long-term** — where MCP stops matching the dashboard and starts beating it | High, *if* a real delivery channel exists |
| Report-as-artifact | **Highest structurally** — the missing primitive behind three gaps at once | Medium — a citable link reads quieter live than a diagnosis |
| Persistence / a real datastore | Prerequisite for nearly everything above | Zero on its own, but its absence is the biggest live-demo risk |

**The line to say:** *The highest-leverage rung and the best demo are not the
same row, and pretending otherwise wastes a roadmap conversation.*

### 6.2 Retail is already validating this bet — mostly not our version of it

Three different things all get called "MCP," and they should be separated before
citing anyone:

| Pattern | Who owns the chat surface | Example | TGC's analogue |
| --- | --- | --- | --- |
| **A — Embedded agent** | The vendor | Walmart's supplier-facing **Marty**; Akeneo's Agentic Ziggy | The in-portal Compliance Agent |
| **B — Vendor experience inside someone else's assistant** | Shared | Walmart's Sparky **inside ChatGPT** | Not built |
| **C — External connector** | The customer's AI | Shopify Storefront MCP; Microsoft Dynamics 365 Commerce; SAP Commerce Cloud | **This is TGC's bet** |

**The honest read:** Category C is real and shipping, but almost entirely from
*commerce platforms and data aggregators* — companies whose product **is** the
data interface. Individual retailers are choosing A and B. TGC's specific bet has
no direct precedent I could find in retail/CPG.

**The line to say:** *That's genuinely differentiating, and less validated than
"everyone's doing MCP" would suggest — say so, because peer PMs trust the framing
more for the honesty.*

### 6.3 The one risk worth naming before a live session

Every piece of this server's state — OAuth signing keys, registered clients,
pending-change tokens, the audit log, and all demo writes — lives in process
memory, not a database.

- On serverless hosting, a token minted by one instance can be unknown to the
  next, so a two-phase confirm can fail mid-conversation.
- **Cheap mitigation**, unrelated to any feature work: pin a single signing key
  via environment configuration so every instance verifies the same tokens.
- **Complete fix:** a real shared store — the prerequisite row in 6.1.

**The line to say:** *This is the failure that ruins a live demo, and it is
twenty minutes of configuration to avoid.*

### 6.4 The ask

A **gated, read-only pilot**:

- 5–15 named users, or one design-partner tenant.
- Synthetic or pre-approved data first. No writes.
- 6–8 weeks.
- Cross-tenant, wrong-audience, invalid-token, missing-scope, and
  unauthorized-supplier tests all required to **fail closed**.
- A prompt-injection suite showing no bypass of the tool allowlist.

Note the deliberate difference from what the prototype demonstrates: the
prototype *shows* the two-phase write path, because proving a human approves
every mutation is the point. The pilot proposes not *enabling* writes externally
at first — and scopes already make that a configuration rather than a rebuild.

**The line to say:** *Grant read-only and the AI is never even shown the write
tools — that is a switch, not a roadmap item.*

---

## Talking points for the room

For the discussion after the deck, or for anyone presenting a shorter version.

- **MCP is a standard, not our invention** — "USB-C for AI assistants." We built
  one small server; any compatible AI can use it.
- **The AI reads our rules live, from a strict contract** — not from prompt
  engineering. Change a rule once, every connected AI obeys it immediately.
- **No new chatbot to build or maintain.** The user's own AI subscription does
  the conversation; we publish and enforce the actions.
- **The security model is no longer a promise — it runs.** Sign in as two
  different customers and the same question returns different data; sign in
  read-only and the AI is not shown the tools that write.
- **"Enterprise-ready" is a checklist, not a vague future**, and we already know
  which boxes are unchecked.
- **Every expansion idea maps to a specific checklist item.** Proactive agents
  need workload identity; supplier-side tools needed two-tenant-class isolation.
  We're not adding scope faster than we're adding the controls it requires.
- **One connector, two audiences.** A supplier and a retailer paste the same URL
  and get different tools — because the identity decides which side you're on.
  Nobody configures that.
- **The tenant is derived, never chosen.** That single rule is what makes a
  multi-tenant connector safe.
- **We're not building this security layer alone.** TGC is the named first
  implementation for TG Aviator's multi-tenant platform.
- **The tool surface is a floor, not a ceiling** — agent-to-agent access,
  proactive alerts, and richer in-portal assistance are the same underlying
  model with more callers.
- **This isn't "replace the dashboard" — it's inversion.** Chat wins framing the
  question and acting on the answer; the screen wins dense comparison.
- **Retail is validating this bet — mostly not our version of it.** Say the
  Category A/B/C distinction out loud; it's more credible than pretending the
  industry already proved the idea.
- **The regulatory case, not just the AI case:** EU ESPR's Digital Product
  Passport for textiles ties data to a product with tiered, audience-scoped
  visibility — exactly the shape TGC's tenant isolation already enforces.
- **"Our customers won't accept Claude/ChatGPT" is a procurement question, not an
  architecture one.** The honest counterpart: the alternative most customers
  already permit — a CSV export — copies data outside our control boundary
  permanently, with no revocation and no audit of what was read.

---
---

# Part Two — The long-form read

The same six sections, in the same order, with what the slides compressed.

---

## §1 — The concept, in full

### Why every AI integration used to be bespoke

To make an AI assistant useful against a company's real, live data, someone has
to build a bridge between "the AI" and "our systems." Before MCP, that bridge was
proprietary in both directions: the AI vendor defined its own plugin format, and
the company built to it. Supporting a second assistant meant building a second
integration, including a second copy of the security logic. Most companies
concluded it wasn't worth it, which is why so few products had one.

### What the contract actually contains

When a client connects, it calls `tools/list` and receives every tool's input
contract as JSON Schema. Two parts do the work:

- **`required`** — the list of mandatory fields.
- **`enum`** — the fixed set of allowed values, which is a drop-down as far as
  the model is concerned.

This is why the demo's create flows work without prompt engineering. The AI knows
that `set_image_requirement` needs a `format`, and that `format` must be exactly
one of JPEG, PNG, TIFF, or WebP, because the server said so at connection time.
The connection guide (`mcp-faq.md`) shows the published schema in full.

### The layered-safety point, stated precisely

The contract is not the enforcement. It is the *first* of two enforcements: the
AI reads the rules and is unlikely to propose something invalid, and the server
validates again when the tool is actually called and rejects anything that is —
naming the exact bad field. The contract makes the AI cooperative; the server
makes it irrelevant whether the AI cooperated.

---

## §2 — What we built, in full

### The retailer flow, end to end

The Part One flow diagram compresses one detail worth stating: **which
organisation's data a user gets is decided by who they are, never by a choice.**
There is no account picker in the flow, and there is deliberately nowhere to add
one. Sign-in identity determines tenant; tenant determines data.

### The supplier flow

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
   Answers about THEIR catalogue, per retail partner — because
   compliance is never one global score: each retailer layers its
   own requirements on the standard
```

The interesting bit of a bilateral network: a supplier **can** see the waivers a
retailer granted *them* — that is a shared fact and they are a party to it — and
**cannot** see anything else that retailer holds. Not their other suppliers, not
their requirements, not their reports.

### Two product calls inside the two-phase write pattern

Both are judgement, not plumbing:

- **Removal tells you what it costs.** Ask to drop a requirement and the response
  says the reported number improves *without any supplier supplying anything* —
  that it lowers the bar rather than closing a gap. A tool that makes the chart
  look better without saying so will be used to make the chart look better.
- **Simulation states its own assumption.** "What happens if I require Sustainable
  Materials on Apparel?" returns the gap and vendor impact *and* the model behind
  it — that it assumes no supplier already holds the data. A forecast whose model
  is hidden is worse than no forecast.

### Vendor exceptions are chat-operable, and actually move the numbers

Granting an **Attribute Waiver** through the AI immediately reduces that vendor's
reported gap count for that exact category the next time a compliance report runs
— in the same conversation, in both `run_compliance_report` and the portal's own
Compliance Reports and Dashboard screens, because they share one engine.

Extended Deadline and Reduced Scope exceptions still change which attribute gets
named as a gap but — deliberately — don't reduce the count, since a deadline
extension doesn't erase the requirement, only delays it.

---

## §3 — Why it is safe, in full

### Where the building-pass framing lives, and where it doesn't

That framing is presenter and reader material. It is deliberately **not** in the
product. An earlier build had a "Security" tab in the AI Assistant Access screen
staging those three refusals as clickable demos, and it was removed. An
administrator opening that screen has a real job — connect an assistant, review
what it did — and a rehearsed attack demo dressed as an admin feature is not that
job. The screen is now Connect and Access log.

### Safety by construction

- Mandatory fields and allowed values are enforced **twice**: once as a contract
  the AI reads before acting, and again by our server when the tool is called. An
  invalid value cannot be written even if the AI proposes it.
- Every write includes a `demo_note` making clear it went into a temporary,
  in-memory demo store — nothing about this prototype touches a real system.

### The enforce-vs-request distinction, and why it matters beyond TGC

This is the most portable idea in the whole document, and the codebase already
draws it about itself. The route's own header comment, on tenancy: it "used to be
a paragraph of English in `instructions`, i.e. a request that the model behave. It
is now a property of the code."

Two conclusions follow from the Part One table, and both are actionable:

1. **Every row in the "requested only" column needs an eval**, because a request
   that is never measured is an assumption. That is what the bar in Appendix D is
   for.
2. **This is a concrete argument for keeping the in-portal Compliance Agent**, not
   a limitation to apologise for. The panel is not a lesser copy of the connector
   — it is the surface where citation, provenance, and layout are *guarantees*
   rather than instructions. When someone asks "why maintain both?", that table is
   the answer, and the fuller version of the argument is in
   [`embedded-agent-first-remote-mcp-selectively.md`](./embedded-agent-first-remote-mcp-selectively.md).

The pattern generalises past TGC: **when a capability moves from a surface you
render to a surface you don't, re-audit which of its guarantees were properties of
the renderer.** Some of them silently become hopes.

### Why the readiness checklist and the expansion list are the same conversation

Two rows of Appendix C exist specifically because of what §6 proposes, not in
spite of it: **service/workload identity** is what a proactive, event-triggered
agent needs (there is no human in the session to delegate from), and
**two-tenant-class isolation** is what supplier-side tools require. Neither
capability was safe to build until its matching control was checked — and the
supplier tool set shipped the moment its box was ticked, which is the clearest
example of the discipline this section describes.

---

## §4 — Does this replace the screens, in full

This section absorbs what was previously a separate brief. Every claim about what
TGC does today is grounded in the code.

### What a Compliance Report actually does

| Job | Verdict | Why |
|---|---|---|
| Pick a rule set | **MCP-superior** | The 3-step wizard exists to collect four parameters. "Run a GS1 Core scorecard on Levi's, all attributes" collects them in one sentence, with no dropdown to hunt for |
| Evaluate the catalogue | **Neutral** | Same engine either way — `run_compliance_report` calls the identical pure function the screen uses |
| Rank the gaps | **Neutral, leaning MCP** | The ranked list is data. The model adds the "so what" the screen can't: which of these is worth your Tuesday |
| Produce a citable artifact | **MCP-hostile today** | The screen produces a scorecard and a CSV with the parameters in its header. The connector produces prose in someone's chat history. This is the real gap, and it is fixable |
| Keep a provenance record | **MCP-hostile today** | Report queue rows carry requester, timestamp, duration, parameters, file name. The connector persists nothing |
| Drive an action | **MCP-superior** | The strongest case in the whole argument. The screen ends at "here are your worst vendors." The connector has `draft_vendor_outreach` and `set_vendor_exception` in the same session, behind confirmation |

### What a Dashboard actually does

| Job | Verdict | Why |
|---|---|---|
| Ambient "is anything on fire," with zero intent | **MCP-hostile — until push exists** | A dashboard is a pull you perform by presence: it's a tab, you glance, you close it. Chat requires you to *decide to ask*. You don't fix this with a better tool description; you fix it by inverting the direction of travel |
| Trend over time | **Blocked — not by MCP** | The single most important finding here. See below |
| One canonical number a team argues from | **MCP-hostile, mitigable** | Two people asking differently get differently framed answers. The mitigation is an engineering rule, not a prompt |
| Dense multi-vendor comparison | **MCP-hostile** | ~180 vendor rows × N attributes reads faster as a table your eye scans. A genuine, permanent property of the medium |
| Drill-down | **MCP-superior** | The screen's drill-down is a fixed hierarchy someone designed in advance. "Why is Blackwood Collective at 61% in Footwear?" doesn't have to match a path the designer anticipated |

### The trend finding, stated plainly

**TGC captures no compliance history.** The report engine computes from live
state; re-run it after a supplier fixes their data and the number moves, but
nothing anywhere records what the number *was*.

What changed recently is how the missing months are produced. An earlier version
hashed a supplier's name into a percentage curve — numbers with no relationship
to the compliance engine at all. The trend functions now **reconstruct a
plausible past catalogue state** for each month, rolling gap counts backward
along a seeded, deterministic per-supplier-per-category trajectory, and score
each reconstructed state with the same engine that produces today's live number.
Every point on the line is now genuine engine output over *some* catalogue state;
only the five past states are synthetic. The provenance tag changed accordingly,
from `"simulated"` to `"reconstructed"`.

That is a materially stronger claim, and it is still not captured history:

> No amount of MCP tooling, prompt engineering, or model capability can turn a
> reconstructed catalogue state into an observed one. The correct behaviour is to
> relay `provenance: "reconstructed"` on every trend answer, not to present it as
> read from a record.

**The category gap is closed.** `get_compliance_trend` takes an optional
`category` (requiring `supplier`), which is what actually unblocks "is this
improving?" — properly restated as "is *Blackwood Collective* improving in
*Footwear*?", since Belk is a peer retailer tenant, not a supplier, and Dillard's
asking about Belk's number is exactly what tenant isolation exists to refuse.
That correction matters beyond phrasing: the original trend example was,
unnoticed, an example of the isolation model failing.

**Still not delivered:** a scheduled snapshot job and a real `from`/`to`/`grain`
range. That is a data-model change, not an AI change — **a finding about the
absence of a datastore, not about MCP.**

### What we should not try to replace, with mitigations

None of the mitigations is "write a better system prompt."

- **Zero-intent glance.** Chat is pull. Mitigate with scheduled digests; do not
  claim to eliminate. Some people want a tab open, and that is a legitimate
  preference.
- **One canonical number.** If two colleagues ask differently and get differently
  framed answers, the number stops being something a team can argue from. The
  mitigation is an architectural rule: **the model never does arithmetic.** Every
  figure is quoted verbatim from the deterministic engine and should carry the
  `run_id` it came from. The report functions are pure, with no randomness,
  precisely so this is enforceable.
- **Audit-grade evidence.** A chat transcript is not an artifact with parameters,
  a timestamp, and a named requester. This needs the artifact layer plus the audit
  trail that already exists.
- **Dense comparison.** Permanent until server-rendered UI, and partly permanent
  after.
- **Cost and latency per view.** A cached dashboard render is close to free; every
  conversational view costs tokens and seconds. At one steward asking a few
  questions a day this is noise; at every steward across ~180 retailer hubs
  refreshing all morning it is not. Bounded retrieval per call matters more as the
  tool surface grows.

### Two things that follow directly from the inversion recommendation

1. **The trend chart should be fixed or removed, independent of any MCP work.**
   Fine in a watermarked prototype; not fine the moment someone screenshots it
   into a deck.
2. **Supplier-side has no report tool.** The supplier connector covers own status,
   partners, open gaps, and exceptions — the compliance report is retailer-only.
   That is now the clearest missing capability in the product, because the
   supplier's "am I ready for Retailer B before they pull my data?" scan is the
   most MCP-native workflow TGC has: proactive, per-partner, repeated across many
   partners, and its whole value is doing it *before* anyone asks. The engine
   already exists. The tool doesn't.

### Where we actually are today

`run_compliance_report` already replaces the ad hoc "I want to know X right now"
reason for opening the screen. `get_compliance_trend` and `diagnose_gap_pattern`
extend the case — the trend tool answers a real per-category question instead of
only an aggregate one, and the diagnosis tool is the clearest example in the
product of advice a conversational surface can give that the dashboard
structurally cannot: the screen is organised per vendor, and "four vendors are
failing the same field" is a cross-vendor insight.

What's still missing is the artifact layer — no report run persists, so nothing is
citable — and the proactive/subscription half, which has no schedule or delivery
channel. The full five-rung sequence is Appendix B.

---

## §5 — The customer-acceptance objection, in full

### Why this doesn't leak by design

The server returns data only when *all* of these hold: the user authenticated
through an approved authorization server; the token is valid, unexpired, and
issued **for this resource**; the caller holds the required scope; the tenant is
derived from verified claims; the requested scope is entitled; the tool is on the
allowlist; and the response is minimized.

Four of those are demonstrable in the prototype today — audience-bound tokens,
per-call tenant checks across both tenant classes, progressive scopes, and a full
audit log. **The AI client is never the authorization decision-maker.**

### Where the companion memo is ahead of the code

The security-audience memo assumes versioned, approved, published requirement sets
("Fall 2026 / v3.2"), a correlation ID on every response, a portal deep link, and
a per-call retailer→supplier entitlement check. The prototype has profile *status*
but no versioning, an audit id that is never returned to the caller, no portal
links, and a supplier fixture shared across retailer tenants.

Those are tracked as sized work items in
[`mcp-implementation-plan.md`](./mcp-implementation-plan.md) §C, and the
reconciliation tables at the top of both
[`enterprise-safe-remote-mcp.md`](./enterprise-safe-remote-mcp.md) and
[`embedded-agent-first-remote-mcp-selectively.md`](./embedded-agent-first-remote-mcp-selectively.md)
name each one — so nobody discovers them in security review instead.

---

## §6 — Roadmap, evidence, and what becomes possible

### Beyond the prototype

> **Also known as §4B.** Code comments in `lib/mcp/manifest.ts`,
> `lib/mcp/tools-supplier.ts`, and the auth TRD cite this list as `§4B` — the
> capabilities gated on a matching control in Appendix C (§4A).

Today's server is deliberately narrow — 29 tools, no persistence. None of that is
a ceiling. Once the readiness checklist is in place, the same "one server, any AI"
bet opens up:

- **Real integration with TG Aviator MT.** TGC has been named the first
  implementation of TG Aviator's multi-tenant agent platform — our MCP tool sits
  behind the shared **TG Aviator MCP Gateway** with a **Catalogue Domain Agent** in
  front of it, and any customer gets ad-hoc conversational access with
  multi-tenant security enforced by the platform, not by us.
- ~~**Supplier-side tools.**~~ **Delivered.** This was gated on two-tenant-class
  isolation, and shipped the moment that box was checked — the clearest example of
  the discipline in §3: the capability waited for its control, and arrived with it.
- **Persistence and a real portal sync.** Writes made through chat should land in
  the same database the portal reads from, so a requirement created by a
  conversation shows up on-screen immediately.
- **Agent-to-agent (A2A), not just human-to-agent.** Once identity and tenant
  scoping are solid, a supplier's own agent could query our compliance tools
  directly under its own scoped, audited identity.
- **Proactive, not just reactive.** An event-triggered agent could flag a supplier
  falling behind the moment a report goes red, under a scoped service identity
  tied to the affected tenant. This is the rung where conversational access stops
  merely matching the screens and starts beating them.
- **Bounded, cost-aware retrieval.** Explicit caps on retrieval depth and payload
  size per call, so a bigger tool catalog doesn't mean unbounded cost per question.

None of this requires re-architecting the core idea — it is the same "AI reads our
rulebook live" model from §1, extended to more tools, identities, and callers.

### The evidence that carries the room

- **A retailer is already building the supplier-facing agent TGC's thesis
  describes — on MCP, at the largest scale in the industry.** Walmart is
  consolidating its AI into four "super agents" connected via MCP; **Marty** is the
  supplier/seller-facing one — onboarding, order management, analytics, ad
  campaigns. The strongest validation available, with the caveat that Marty is
  Category A (embedded), not C.
- **Retail's own numbers say MCP is exposing a data-quality problem, not solving
  one.** Stacklok surveyed 100 technical leaders at leading retailers: more than
  40% run MCP in production, top use cases are supply chain and pricing
  optimization, and — the line worth a slide — *"MCP usage is exposing concerns
  about data quality and availability."* That is precisely the layer TGC governs.
  Frame TGC not as another agent, but as the thing the other agents are failing for
  want of.
- **The PIM category has already made the same bet.** Akeneo shipped Agentic Ziggy
  with specialist agents including schema mapping for **retailer specification
  compliance**, with governance and approval built into every step — TGC's problem
  space and TGC's two-phase confirm pattern, in an adjacent product. The approach
  is validated; the window to be early is not indefinite.
- **Platform vendors are shipping retail MCP servers** — Microsoft's Dynamics 365
  Commerce MCP server and SAP's Commerce Cloud Storefront MCP server. This is the
  concrete version of the "forward-compatible bet" claim.

One nuance that makes Shopify the most useful Category C comparison rather than a
clean match: Storefront MCP is consumer-facing catalog search, where TGC is B2B and
authenticated — but the "one URL, auto-provisioned, zero setup" property is the
same one this demo leans on.

### One finding to present as a challenge, not a win

Logicbroker — a retailer↔supplier dropship network running $10bn+ GMV for Samsung,
Walgreens, and Home Depot — already exposes over MCP what this document calls
future work: **resources** (orders, products, inventory, events) alongside tools,
and **event subscriptions that trigger corrective tools** ("notify suppliers,"
reprocess a failed document). TGC registers no resources and has no subscription
mechanism today.

Its posture spans Category B and C rather than being a clean comparison, so don't
cite it as a like-for-like competitor — but the pattern is shipped, in a network
shape close to TGC's own. Worth naming in the room rather than having someone else
raise it in review.

### The regulatory driver

EU ESPR delegated acts for textiles are expected in 2027 with an ~18-month
transition period. The Trace4Value pilot converged on roughly 126 data points per
textile product, **tiered by audience** — some visible to brands only, some to
suppliers, some to recyclers. TGC's categories are apparel and footwear, and the
tenant-class isolation plus the "rows about me" rule already documented here is
the shape that kind of tiered visibility requires.

**This is the clearest available answer to "why would a retailer pay for this
beyond a nicer UI?"**

---
---

# Appendix

---

## Appendix A — Tool inventory

### Retailer surface

| Category | Tools |
| --- | --- |
| **Read (15)** | Search GS1 categories; list and inspect requirement profiles; list and inspect supplier compliance; list global System filters; run a compliance report across the vendor base; **see a 6-month compliance trend, down to one supplier's one category**; **find which attributes many vendors are failing at once, with the retailer's own authored guidance for each**; list vendor exceptions on file; **simulate a requirement change without applying it**; **draft vendor outreach from a supplier's real gaps**; **search this organisation's own AI access log** (administrators only); list proposals awaiting confirmation; and a `get_capabilities` "what can you do" helper |
| **Write (6)** | Create a requirement profile; add an attribute requirement; change an attribute's label or guidance; set an image requirement; activate or deactivate a profile; grant or update a vendor exception |
| **Remove (4)** | Drop an attribute requirement; drop an image requirement; delete a whole profile; revoke a vendor exception. Each needs `tgc.destructive` **on top of** the relevant write scope |

### Supplier surface

| Category | Tools |
| --- | --- |
| **Read (4)** | Own compliance status (against the GS1 baseline *and* each retail partner separately); own retail partners with their open gaps and extra requirements; own outstanding attributes and images for a chosen partner; the exceptions retailers have granted them |

### Scopes

`tgc.read` · `tgc.requirements.write` · `tgc.exceptions.write` ·
`tgc.requirements.activate` (required **in addition to** write) ·
`tgc.destructive` (required **in addition to** the relevant write scope).

A connection granted only `tgc.read` is never shown the write tools at all — the
tool list is filtered per caller, so read-only is a configuration rather than a
separate build.

---

## Appendix B — The L0-L4 capability ladder

The sequencing doc, [`mcp-implementation-plan.md`](./mcp-implementation-plan.md),
names its phases after these rungs. This is their definition.

### L0 — Today

`run_compliance_report` is a read-only tool over the deterministic report
engines. It takes a System filter id or a profile name, an optional single-vendor
scope, and `maxAttributes` (999 = all, matching legacy semantics). It returns
overall %, ranked missing attributes, per-category breakdown, and per-vendor rows
— and it correctly drops attributes waived by an Active vendor exception, so the
conversational number agrees with the screen's number.

**This already replaces the ad hoc report.** If your reason for opening the
Compliance Reports screen was "I want to know X right now," the connector is a
better version of that. What it doesn't replace is the reason you opened it to
produce something *for someone else*.

### L1 — Artifact parity (the highest-leverage next step)

The MCP server registers **tools and prompts, and no resources at all**. That is
the missing primitive. Resources are how MCP represents *a thing that exists and
can be referred to again*, as opposed to an answer that happened once.

What closes the gap:

- Persist a report run with a `run_id`, its parameters, timestamp, and requester —
  the same fields the queue row already shows.
- Expose it as a resource (`report://run/{id}`), with the CSV the existing
  `reportToCsv()` already generates attached as a blob.
- Add `list_report_runs` and `get_report_run`, and return a resource link from
  `run_compliance_report` rather than only prose.

The payoff is not technical elegance. It is that "the Belk scan from Tuesday"
becomes a thing you can name, re-open, attach to an email, and hand to an auditor
— which is most of what the screen was for. This was Open Question #1 in
[`feature-compliance-reports.md`](./feature-compliance-reports.md) §8 when it was
a UI question. It is now the question that decides whether the connector can stand
in for the screen.

### L2 — Trend (partially addressed; still not MCP's to fix)

See §4's trend finding for the full argument. In short: history is reconstructed
and engine-scored rather than hashed, the per-category gap is closed, and what
remains missing is a scheduled snapshot job and real `from`/`to`/`grain` range —
a data-model change, not an AI change.

### L3 — Proactive (where MCP stops matching and starts beating)

The proactive-check endpoint already does the hard part. It runs a compliance scan
under a **workload identity** — no human in the session, its own
client-credentials token, read-only scope, tenant-pinned — through the same guard
choke point as any other caller, and flags vendors past an alert threshold. It
lands in the audit trail with subject type `workload` and no subject id.

Put a schedule and a delivery channel on that and you have replaced the actual
reason people open dashboards. Be honest about what that reason is: **most
dashboard visits end in nothing.** Someone checks that nothing is on fire and
closes the tab. A system that stays quiet and speaks only when something *is* on
fire is strictly better than one that requires you to remember to look — and it
removes the failure mode a dashboard can't fix, which is nobody looking on the day
it mattered.

**This is the rung to fund.** It's the only one where the conversational surface is
better than the screen rather than merely adequate.

### L4 — Rendered (directional)

Server-returned interactive UI — the emerging MCP Apps / `ui://` resource pattern —
would let the connector hand back the scorecard itself: the ranked bars and
per-category table already laid out in the scorecard component, rendered inside the
chat client. That closes most of the dense-comparison gap without asking anyone to
read a table as prose.

Directional, not a commitment. But it is the reason the "MCP-hostile" verdicts on
display in §4 should be read as *today's* medium constraints, not laws.

---

## Appendix C — What "enterprise-ready, external-facing" requires

> **Also known as §4A.** This checklist is cited as `§4A` throughout the codebase
> (`lib/mcp/*`, `app/api/*`) and in
> [`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md), which traces each
> row to an acceptance criterion. Row numbers below are stable — that label is
> load-bearing, so keep it if this table moves again. The expansion list those
> comments call `§4B` is §6 of the long-form read, "Beyond the prototype."

| Requirement | Why it matters | Where it's documented |
| --- | --- | --- |
| **Real auth (OAuth 2.1), no shared credentials** | An unauthenticated endpoint is fine for mock data and nowhere near acceptable once real customer data is behind it. Note what this really means: the *customer's* IdP authenticates their own employee — we never hold a user directory, and their offboarding revokes access without a ticket to us | MCP's own authorization spec mandates OAuth 2.1 for any server handling real resources |
| **Tokens scoped to *this* server only (Resource Indicators, RFC 8707)** | Stops a token stolen from one system being replayed against another | Prevents the "confused deputy" pattern called out across enterprise MCP security guides |
| **Delegated identity, not a shared service account** | Every action needs to carry *both* "which customer/tenant" and "which agent" as separate, checkable claims — not one bucket credential everyone shares | OAuth token-exchange delegation (RFC 8693) |
| **Separate service/workload identity for agent-initiated actions** | A delegated user token only exists while a human is in the session. An agent acting on its own — a scheduled compliance check with no user connected — needs its own scoped, short-lived credential | Standard distinction between "on-behalf-of" delegation and workload identity |
| **Tenant checked on every tool call, across *both* tenant classes** | A valid token isn't proof the caller should see *this* tenant's data. For us, that means keeping retailer and supplier tenants isolated from each other, not just peers within a class | The #1 multi-tenant MCP failure mode: isolation enforced at login but not re-checked per call |
| **Least privilege / progressive scopes** | Scope by *authority*, not by refusing to write: authoring is safe to grant up front because it previews before it acts and can only produce Drafts, while the authorities that bite — *activating* across the vendor base, and *removing* — are separate scopes | Standard progressive-scope pattern for MCP servers handling sensitive data |
| **A human approves every mutation** | An assistant that can delete a requirement in a chat window with no confirmation is not a feature. Every mutating tool returns a preview and a token; a separate call executes. The token carries no authority of its own — scope and tenant are re-checked on confirm | The human-in-the-loop expectation for agentic write access |
| **No token passthrough** | Our server must never blindly forward a token it didn't issue, or accept one meant for a different service | Explicitly forbidden in current MCP security guidance |
| **Rate limits and bounded retrieval per call** | Without this, tool surface growth means unpredictable cost and blast radius, not just a security gap | One of the 5 essential practices in enterprise MCP security guidance |
| **Container / process isolation per tenant or session** | Keeps one tenant's (or one compromised agent's) blast radius from reaching another tenant's runtime, not just their data | Listed alongside per-request identity and least privilege as core practice |
| **Full audit logging (who, which agent, which tenant, which tool, what scope)** | Without conversation-level logging, an incident can't be reconstructed and compliance can't be demonstrated | Table stakes for any MCP server described as "enterprise" |
| **Curated tool registry, not ad hoc sprawl** | Agents need a discoverable, vetted catalog rather than every team wiring up its own — also raised directly by our own platform stakeholder as a gap today | Standard recommendation alongside least privilege and audit logging |
| **Central gateway ownership** | Auth, tenancy, and rate-limiting should live in one shared layer (for us: the **TG Aviator MCP Gateway**), not be rebuilt inside every product's MCP server | Matches external best practice and our platform's stated direction |

**Where the prototype stands.** Rows 1-6, 10 and 11 are implemented and
demonstrable end-to-end: OAuth sign-in with the tenant derived from the
authenticated identity (never chosen), audience-bound tokens, per-call tenant
checks across both tenant classes, progressive scopes, workload identity for
agent-initiated runs, a live audit log, and a curated tool registry. Row 7 is half
done, rows 8 and 9 belong to the Gateway, and the identity provider itself is
still a local stand-in.

Each row's requirement, acceptance criteria, owner, and demo status is in
**[the technical requirements doc](./mcp-enterprise-auth-trd.md)** — including a
section on what this prototype deliberately does *not* demonstrate, because a demo
that fakes container isolation or rate limiting gets caught in the first technical
review.

---

## Appendix D — The bar before retiring a screen, and four design questions

### The bar

Replacement is a claim about reliability, so it needs a threshold, not an
impression. The harness exists — the golden-set eval runs through the agent with
exact-match, GS1-validity, evidence/abstention, and LLM-as-judge scores bound to
the dataset (see
[`eval-framework-pm-presentation.md`](./eval-framework-pm-presentation.md)).

| Check | Bar | Why this one |
|---|---|---|
| Figure fidelity | **100%** exact match against tool output | A restated-from-memory number is worse than no answer. Nothing below 100% justifies retiring a screen people trust |
| Run-id citation | Present on every quoted figure | Makes the canonical-number problem auditable rather than hypothetical |
| Trend abstention | Correct refusal on every history question while captured history is absent | Exactly what the existing abstention evaluator measures. The model must decline, not extrapolate from one snapshot |
| Tenant isolation | Zero cross-tenant leakage | Enforced in code, but assert it in evals too — enforcement and evidence of enforcement are different deliverables |

**And one product metric worth more than all four:** instrument what fraction of
report and dashboard sessions end in an **action** (a fix, a waiver, an outreach)
versus ending in nothing. If most dashboard sessions end in nothing, push replaces
them and we should say so out loud. If they end in multi-vendor forensics, they
survive and we should stop debating it. That is a measurement we can take before
committing engineering time either way — the cheapest item in this document.

### D.1 Do we have to generate data for trends?

**Partly resolved — the shared-function half.** The question that mattered was
*where the generated data lives*, and that is fixed: the trend algorithm no longer
lives inside the dashboard component but in a shared history module, a single
source of truth the Dashboard screen and `get_compliance_trend` both call. Both
consumers anchor to the same live percentage, so a chat answer and the dashboard
cannot disagree.

What is **not** delivered: this is reconstructed history, not captured history. No
snapshot job exists, so every month before today is reconstructed — just
reconstructed once, in one place, instead of duplicated per surface.

Two constraints are easy to miss and expensive to retrofit:

- **Anchor the series to the live computation.** The most recent point must equal
  what the engine returns today, or the connector contradicts itself inside one
  answer: "you're at 68%, down from 71% last month" is incoherent if the live
  engine says 64%.
- **Carry provenance in the payload.** Reconstructed history is more dangerous in
  chat than on screen. The dashboard sits under a MOCK DATA watermark; a sentence
  in someone's Claude window carries no such context. The tool result includes
  `provenance` and the instructions require relaying it — note this is a *request*,
  not an enforcement, which is exactly why it needs an eval.

### D.2 Does MCP ask whether to produce a CSV or an artifact?

It *can*, it probably shouldn't, and the better design is to always attach.

**It can:** MCP has *elicitation* — the server asks the user a structured question
mid-call. This prototype uses it nowhere, and client support is uneven. That gap is
not hypothetical: the pending-change module exists precisely because of it. The
in-portal agent gets a human in the loop for free by rendering a proposal card; an
external Claude or ChatGPT session has no such card, so the confirmation moved into
the protocol instead of the UI.

**It shouldn't, for CSV:** asking burns a conversational turn on a question whose
answer is nearly always yes. Attach it every time; an unwanted attachment costs the
user nothing. `reportToCsv()` already exists and already writes the run parameters
into the CSV header block. It has nowhere to go — again, because no resources are
registered.

**One distinction worth being precise about:** *artifacts are a client feature.*
The server cannot make ChatGPT render an artifact, and shouldn't be described in a
leadership setting as if it could. What a server controls is returning a
**resource**; each client renders it its own way. That asymmetry is the real
argument for server-returned UI.

### D.3 Can it advise the retailer on guiding suppliers, and serve help content?

**Advice: half of it already ships.** `draft_vendor_outreach` builds a remediation
message for one supplier from their actual open gaps, ranked worst-first, with
attributes under an Active exception excluded, and returns it for a human to review
— nothing sends, and no outreach record is stored.

The missing half was the layer *above* per-vendor remediation: when four vendors
are all failing the same attribute, that is usually not four vendor problems, it is
one requirement-clarity problem. That is now `diagnose_gap_pattern`.

**Help content splits three ways, and only one part is genuinely missing:**

| Kind | Status |
|---|---|
| Retailer-authored supplier guidance, per attribute | **Already live** — `guidance` fields on profile attributes, returned by `get_profile_detail`, settable via the attribute-requirement tools |
| GS1 standard reference — the standard library and valid code-list values | Exists as data, **not exposed** |
| Product how-to / process documentation | **Doesn't exist** as anything a client could read |

So "give the retailer access to help files" is mostly an exposure problem, and
resources are the right primitive for it.

**One security note, worth raising before the work starts rather than in review.**
Resources are a *new surface*. Every control in this codebase currently runs
through the guard on tool invocation — that is the choke point the whole
authorization story depends on. Retailer-authored guidance is tenant-owned data:
one retailer's phrasing of what it wants from suppliers is not neutral reference
material. Serving it through an unguarded resource would walk straight around the
control that tool calls go through. **Resources need the same guard, from the first
one registered.**

### D.4 Can we ensure a citation on every response?

Not over MCP. Worth stating plainly rather than softening, because it is a real
boundary with a consequence.

In the portal, citation is a code guarantee: the source is derived from *which
tools actually fired*, mapped through a fixed table and capped at two. The comment
above it is explicit that the system prompt is never told to "cite a screen,"
because a model guessing at UI structure is exactly the hallucination the feature
exists to prevent. That works because we own the renderer.

Over MCP we own neither the renderer nor the final wording. The best available
approach is three layers, none of which is enforcement:

1. **Put the citation in the payload as structured data** — `run_id`, `as_of`,
   source, filter used — so the model has something exact to relay rather than
   something to characterise.
2. **Ask for it in `instructions`**, alongside the grounding rules already there.
3. **Measure it in evals**, because 1 and 2 are both requests.

---

## Appendix E — Proposed tools

Specified in the manifest's own vocabulary so they can be lifted into a PRD or
dropped into the registry without translation. All are reads, so all require only
`tgc.read` — none needs a write, activate, or destructive grant.

**1. `get_compliance_trend`** — **Delivered**

- Params as shipped: `systemFilterId` or `profileName` (mutually exclusive, same
  resolution as `run_compliance_report`), optional `supplier`, optional `category`
  (requires `supplier`) — added specifically to answer "is this vendor improving in
  this category?" without the aggregate-only version averaging the answer away.
- `kind: "read"` · retailer-only · workload-callable, because this is what a future
  scheduled alert would compare against.
- Returns a 6-month series anchored to the live percentage plus
  `provenance: "reconstructed"` and a `demo_note`.
- Not yet shipped: `from`/`to`/`grain` flexibility and a real snapshot store — no
  month before today was ever actually observed.

**2. `diagnose_gap_pattern`** — **Delivered** — *the cross-vendor insight from D.3*

- Params: `profileName` or `systemFilterId`, optional `minVendors` (default 3).
- `kind: "read"` · retailer-only · workload-callable.
- **Correction to how this was originally specified:** it does not reuse the
  `missingCounts` map — that sums gap *shares* (each vendor's open-gap count
  distributed across their attribute pool), not distinct vendors, so it answers a
  different question. The report result gained an additive `attributeVendorCounts`
  field instead — a per-attribute tally of distinct vendors with at least one gap
  on it, built in the same per-vendor loop.
- Returns attributes failed by many vendors at once, separating "these vendors are
  behind" from "this requirement is unclear" at a 30%-of-vendors threshold, with the
  retailer's own `guidance` text included so the answer can point at what to
  rewrite. Every response states the distinction from `missingAttributes`
  explicitly — an unlabelled "47 vendors are missing X" that was actually an
  allocation artifact would not survive a technical review.

**3. `list_report_runs` / `get_report_run`** — *the L1 pair*

- Params: `list` takes optional `filter`, `since`, `limit`; `get` takes `runId`.
- `kind: "read"` · retailer-only · workload-callable.
- Returns run metadata — parameters, requester, timestamp — plus a resource link to
  the stored scorecard and the CSV from the existing `reportToCsv()`. Depends on
  persisting runs; this is the work that makes a report citable.

**4. `get_attribute_help`** — *the exposure fix from D.3*

- Params: `attributeName`, optional `brickCode`.
- `kind: "read"` · both tenant classes · workload-callable.
- Assembles the retailer's authored `guidance`, the GS1 standard definition, and the
  valid code-list values. Serves both sides of the network from one definition — a
  supplier asking "what does this field want?" and a retailer asking "what did we
  tell them?" are the same lookup.
- The tool that most needs D.3's guard note: authored guidance is tenant-owned, the
  standard reference is not, and the response mixes them.

**5. `prioritise_my_gaps`** — *supplier-side, and the biggest gap in the product*

- Params: optional `limit`.
- `kind: "read"` · supplier-only · workload-callable.
- Reuses the existing supplier open-gaps and retail-partners functions. Ranks
  outstanding attributes by **how many retail partners each one unblocks**, so the
  answer to "what do I fix first?" is network-aware rather than per-partner.
- This is the payoff the README states as the supplier's whole reason to be on the
  network — *fill a gap once, satisfy every retailer who requires it* — and nothing
  in the product computes it today, on either surface.

### Also worth naming

- **Resource subscriptions.** §4 claims the dashboard becomes a subscription. MCP
  has a primitive for exactly that — `resources/subscribe` plus update notifications
  — which is the protocol-native form of proactive push rather than a bolted-on
  email job.
- **Async job handles.** The UI already simulates a Running → Complete queue; MCP is
  synchronous. A real vendor-base scan will not return inside one tool call, so a
  `start_report` → `get_report_status` pair is needed. Same persistence work as L1,
  so sequence them together.
- **The supplier has no write path at all.** Read-only by design and correct for
  now — but their most-wanted write, "request an exception," means leaving the
  conversation entirely. Worth deciding deliberately rather than by omission.
- **The audit trail is a product surface, not only a control.** Once runs persist,
  `query_access_log` plus run history answers "who ran which report, against what
  filter, when" conversationally. Neither screen offers that, and it is the kind of
  thing a compliance team asks for by name.

---

## Appendix F — Sources

### Enterprise security and MCP practice

- [MCP Authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Enterprise-Managed Authorization: Zero-touch OAuth for MCP](https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/)
- [MCP Security Best Practices for Enterprise Deployments (2026) — Stacklok](https://stacklok.com/blog/mcp-security-best-practices-what-every-enterprise-team-needs-to-know-in-2026/)
- [MCP Security for Enterprises: Best Practices Checklist — MintMCP](https://www.mintmcp.com/blog/mcp-security-enterprises)
- [How to Architect a Multi-Tenant MCP Server for Enterprise B2B SaaS — Truto](https://truto.one/blog/how-to-architect-a-multi-tenant-mcp-server-for-enterprise-b2b-saas/)
- [MCP Security for Multi-Tenant AI Agents: Isolation Patterns — Prefactor](https://prefactor.tech/blog/mcp-security-multi-tenant-ai-agents-explained)
- [OAuth for MCP — Emerging Enterprise Patterns for Agent Authorization — GitGuardian](https://blog.gitguardian.com/oauth-for-mcp-emerging-enterprise-patterns-for-agent-authorization/)

### Governance and standards

These carry more weight with a security or architecture audience than vendor blog
posts, because they are frameworks a customer's own reviewers already recognise.

- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — least privilege, per-tool scopes, separating tool sets by trust level, human approval for high-impact actions
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) and its Generative AI Profile
- [Microsoft Learn — Secure access to MCP servers in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/secure-mcp-servers) — gateway token validation, managed credential handling
- [GS1 US National Data Quality Playbook](https://www.gs1us.org/industries-and-insights/by-industry/retail-grocery/data-quality-playbook) — trading-partner data quality as complete, accurate, standards-based, timestamped
- [GS1 Data Quality Framework](https://gs1.org/standards/data-quality-framework) — the standards basis for retailer/supplier master-data integrity

### Retail and CPG landscape

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

> **Verify before presenting.** Several primary sources above (the Stacklok PDF,
> Walmart's own tech blog, Akeneo's press release) blocked automated fetching, so
> figures like ">40% of retailers in production" and specific launch dates come
> from search-result summaries and secondary coverage, not a direct read of the
> source document. Pull the exact numbers from the primary source before they go
> on a slide. Everything stated about *this codebase* — tool counts, what's
> delivered, what isn't — is verified directly against the code and needs no such
> check.

---

## Appendix G — Honest limits

### Of the prototype

- **Auth is real; the identity provider is not.** OAuth 2.1, per-call tenant
  isolation, progressive scopes, and audit logging all run. What is a stand-in is a
  local demo sign-in rather than a customer's own Entra ID or Okta federated
  through TG Aviator.
- **Writes don't persist.** Chat-made changes live in server memory and reset on
  restart. Chat-created requirements don't appear in the portal screens yet.
- **All data is mock**, under a watermark, with an in-memory write store.
  Conclusions about *experience* transfer; conclusions about *performance and cost
  at scale* do not.
- **This is a directional preview**, not a committed V1 feature.

### Of the analysis in §4 and the appendices

- The L0-L4 ladder is a sequence of options, not a committed roadmap. Only L1 is
  scoped tightly enough to estimate today.
- The action-rate metric in Appendix D has not been instrumented. Until it is, §4's
  split between the alerting and forensic halves of the dashboard is a well-argued
  hypothesis, not a measured finding.
- The Appendix E tools are specified, not estimated. Their guard metadata is valid
  against the existing tool-definition shape, but none has been costed, and two of
  them depend on persistence work that is itself unscoped.
- The enforce-vs-request table describes MCP as this prototype uses it today.
  Elicitation and server-returned UI both move rows between columns as client
  support matures, so it is a snapshot of a moving boundary, not a fixed property of
  the protocol.

### What we should not claim

- **Not** "MCP is inherently secure." Security depends on implementation and
  governance.
- **Not** "Claude or Copilot can access our data safely by default." They must be
  explicitly authorized and constrained.
- **Not** "read-only means zero risk." Read tools still disclose data — entitlement
  checks and output minimization are mandatory, not optional.
- **Not** "the model decides access." It does not. Our platform and gateway do.
