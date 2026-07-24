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
| **Read (6)** | search GS1 categories, list/inspect requirement profiles, list/inspect supplier compliance, run a compliance report across the vendor base, and a `get_capabilities` "what can you do" helper |
| **Write (3)** | create a requirement profile, add an attribute requirement to it, set an image requirement (format/background/dimensions/etc.) |

This is retailer-facing only (e.g. a Dillard's-style user asking about their
own suppliers) — not a supplier-facing tool set, and not able to see other
retailers' data.

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
