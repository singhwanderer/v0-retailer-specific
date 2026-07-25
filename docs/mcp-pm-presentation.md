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
custom chatbot, no API key of their own to manage, nothing to install.

### Plain-text flow — from connecting to getting an answer

```
   PM/user has their own Claude, ChatGPT, or             (no engineering
   Claude Desktop app — already, today                    involvement needed
        │                                                  for this step)
        ▼
   They paste ONE URL into their AI's "Connectors"
   settings:  https://v0-retailer-specific.vercel.app/api/mcp
   (no API key, no login — just a URL)
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
| **Read (9)** | search GS1 categories, list/inspect requirement profiles, list/inspect supplier compliance, list global System filters, run a compliance report across the vendor base, list vendor exceptions on file, and a `get_capabilities` "what can you do" helper |
| **Write (4)** | create a requirement profile, add an attribute requirement to it, set an image requirement (format/background/dimensions/etc.), grant or update a vendor exception (waiver / extended deadline / reduced scope) |

This is retailer-facing only (e.g. a Dillard's-style user asking about their
own suppliers) — not a supplier-facing tool set, and not able to see other
retailers' data.

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

- **No authentication yet.** Anyone with the URL can connect. Acceptable only
  because all data behind it is mock/watermarked. A real rollout needs proper
  auth (OAuth 2.1) so a connecting user only ever sees their own tenant's
  data — this is a known, planned requirement, not an oversight.
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
| **Real auth (OAuth 2.1), no shared credentials** | Today's "no auth, anyone with the URL" model is fine for mock data and nowhere near acceptable once real customer data is behind it | MCP's own authorization spec now mandates OAuth 2.1 for any server handling real resources |
| **Tokens scoped to *this* server only (Resource Indicators, RFC 8707)** | Stops a token stolen from one system being replayed against another | Prevents the "confused deputy" attack pattern called out across enterprise MCP security guides |
| **Delegated identity, not a shared service account** | Every action needs to carry *both* "which customer/tenant" and "which agent" as separate, checkable claims — not one bucket credential everyone shares | OAuth token-exchange delegation (RFC 8693) — the emerging standard for agent-acts-on-behalf-of-user flows |
| **Separate service/workload identity for agent-initiated actions** | A delegated user token only exists while a human is in the session. An agent acting on its own — e.g. a scheduled compliance check with no user connected at that moment — needs its own scoped, short-lived credential (client-credentials style), not a borrowed user token | Standard distinction between "on-behalf-of" delegation and workload identity for autonomous agent actions |
| **Tenant checked on every tool call, not just at login — across *both* tenant classes** | A valid token isn't proof the caller should see *this* tenant's data — that check has to happen again at each individual tool invocation. For us specifically, that means keeping retailer tenants and supplier tenants isolated from each other, not just isolating peers within the same class | Called out repeatedly as the #1 multi-tenant MCP failure mode: isolation enforced at login but not re-checked per call |
| **Least privilege / progressive scopes** | Start every connection at read-only/discovery; only grant write scopes when a specific action actually needs them | Standard "progressive scope" pattern for MCP servers handling sensitive data |
| **No token passthrough** | Our server must never blindly forward a token it didn't issue itself, or accept one meant for a different service | Explicitly called out as forbidden in current MCP security guidance |
| **Rate limits and bounded retrieval per call** | Caps on how much a single tool call can fetch or how often it can be called — without this, tool surface growth means unpredictable cost and blast radius, not just a security gap | One of the 5 essential practices in current enterprise MCP security guidance |
| **Container / process isolation per tenant or session** | Keeps one tenant's (or one compromised agent's) blast radius from reaching another tenant's runtime, not just their data | Listed alongside per-request identity and least privilege as core enterprise MCP practice |
| **Full audit logging (who, which agent, which tenant, which tool, what scope)** | Without conversation-level logging, a security incident can't be reconstructed and compliance can't be demonstrated | Table stakes for any MCP server described as "enterprise" in 2026 guidance |
| **Curated tool registry, not ad hoc tool sprawl** | Agents need a discoverable, vetted catalog of approved tools rather than every team wiring up its own — this was also raised directly by our own platform stakeholder (Rick) as a gap today | Standard recommendation alongside least privilege and audit logging |
| **Central gateway ownership** | Auth, tenancy, and rate-limiting should live in one shared layer (for us: the **TG Aviator MCP Gateway**), not be rebuilt inside every product's MCP server | Matches both external best practice and our own platform's stated direction |

The common thread across all of it: **a working demo and a safe one aren't the
same claim.** Nothing here is a surprise or a blocker we're discovering late —
it's the standard checklist, and we already know which boxes are unchecked.

Two of these rows exist specifically because of what's in 4B below, not in
spite of it: **service/workload identity** is what the proactive,
event-triggered agent needs (no human in the session to delegate from), and
**two-tenant-class isolation** is what supplier-side tools require (retailer
and supplier tenants must never see each other, not just peers within one
side). Neither capability in 4B is safe to build until its matching row here
is checked.

### 4B — Beyond the prototype: what else becomes possible

Today's server is intentionally narrow — 6 read tools, 3 write tools, one
retailer's-eye view, no persistence. None of that is a ceiling. Once the
enterprise-readiness checklist above is in place, the same "one server, any
AI" bet opens up:

- **Real integration with TG Aviator MT.** Per direct guidance from our
  platform stakeholder, TGC has been named the first implementation of
  TG Aviator's multi-tenant agent platform — meaning our MCP tool sits behind
  the shared **TG Aviator MCP Gateway** with a **Catalogue Domain Agent** in
  front of it, and any customer gets ad-hoc, conversational access with
  multi-tenant security enforced by the platform, not by us.
- **Supplier-side tools, not just retailer-side.** Today's server only
  answers "how are my suppliers doing" for a retailer. A supplier-facing tool
  set (own compliance status, own outstanding requirements) is the natural
  next surface.
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
  the affected tenant.
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

### Sources for the practices above

- [MCP Authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Enterprise-Managed Authorization: Zero-touch OAuth for MCP](https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/)
- [MCP Security Best Practices for Enterprise Deployments (2026) — Stacklok](https://stacklok.com/blog/mcp-security-best-practices-what-every-enterprise-team-needs-to-know-in-2026/)
- [MCP Security for Enterprises: Best Practices Checklist — MintMCP](https://www.mintmcp.com/blog/mcp-security-enterprises)
- [How to Architect a Multi-Tenant MCP Server for Enterprise B2B SaaS — Truto](https://truto.one/blog/how-to-architect-a-multi-tenant-mcp-server-for-enterprise-b2b-saas/)
- [MCP Security for Multi-Tenant AI Agents: Isolation Patterns — Prefactor](https://prefactor.tech/blog/mcp-security-multi-tenant-ai-agents-explained)
- [OAuth for MCP — Emerging Enterprise Patterns for Agent Authorization — GitGuardian](https://blog.gitguardian.com/oauth-for-mcp-emerging-enterprise-patterns-for-agent-authorization/)

---

## Talking points for the room

- **MCP is a standard, not our invention** — "USB-C for AI assistants." We
  built one small server; any compatible AI can use it.
- **The AI reads our rules live, from a strict contract** — not from prompt
  engineering. Change a rule once on our server, every connected AI obeys the
  new rule immediately.
- **No new chatbot to build or maintain.** The user's own AI subscription does
  the conversation; we only publish and enforce the actions.
- **It's a demo today by design** — no auth, no persistence, mock data — but
  every one of those gaps is a known, scoped step, not a surprise blocker.
- **"Enterprise-ready" is a checklist, not a vague future** — real OAuth,
  tokens scoped per server, tenant checked on every call across both retailer
  and supplier tenants, workload identity for agent-initiated actions, rate
  limits, container isolation, full audit logging. It's documented industry
  practice, and we already know which boxes are unchecked.
- **Every expansion idea maps to a specific checklist item.** Proactive agents
  need workload identity; supplier-side tools need two-tenant-class isolation.
  We're not adding scope faster than we're adding the controls it requires.
- **We're not building this security layer alone.** TGC is the named first
  implementation for TG Aviator's multi-tenant platform — our job is a
  Catalogue-specific Domain Agent behind their shared Gateway, not a bespoke
  auth stack.
- **The tool surface is a floor, not a ceiling** — supplier-side tools,
  agent-to-agent access, proactive alerts, and an in-portal copilot are all
  the same underlying model, just with more callers and more identities.
