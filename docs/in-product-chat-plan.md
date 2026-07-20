# Build Plan — In-Product Chat (TGC portal assistant)

> An engineering plan for embedding a conversational assistant inside the TGC portal that
> talks to the same catalogue data the app already exposes. This is a build plan, not a
> shipped feature. All data is mock, watermarked "MOCK DATA FOR ILLUSTRATION ONLY."

## 1. Goal

Let a user, without leaving the portal, ask questions and make changes in plain
English — "which suppliers are furthest behind and on what," "what does my Footwear
profile require," "set up requirements for Swimwear" — and get answers grounded in the
app's real data, with the same actions the UI offers. Today this capability exists only
through an **external** MCP connector (claude.ai / ChatGPT / Claude Desktop pointed at
`/api/mcp`); the portal itself has no chat surface.

The code already anticipates this: `lib/mcp/tools.ts` notes its tool inventory is
"consumed today by the external MCP endpoint … and, in a later phase, by an embedded
portal assistant." This plan is that later phase.

## 2. Where it lives

- A **docked chat panel** (right-hand drawer or bottom-right launcher), available on both
  personas. Persona-aware: retailer context favours requirement authoring/monitoring;
  supplier context favours compliance/gap questions.
- Renders a message list, a text input, and **tool-call chips** ("used TGC · list
  profiles") so the user sees when the assistant reads or writes data.
- Writes always **restate the change and confirm** before committing, mirroring the MCP
  server's write contract.

## 3. Reuse — the existing tool layer

The one hard rule: **no data-layer duplication.** The chat calls the same pure-function
tool layer the MCP route already uses:

- `lib/mcp/tools.ts` — `get_capabilities`, `search_gs1_bricks`, `list_attribute_profiles`,
  `get_profile_detail`, `list_my_suppliers`, `get_supplier_compliance` (reads) and
  `create_attribute_profile`, `add_attribute_requirement`, `set_image_requirement`
  (writes), over the in-memory store `lib/mcp/store.ts`.
- `app/api/[transport]/route.ts` is the external MCP transport over the same functions;
  the in-product chat is a **second consumer** of that layer, not a fork of it.

Any tool added for the chat should be added to `lib/mcp/tools.ts` so the external
connector gets it too, keeping the two surfaces in lockstep.

## 4. Two build options

### Option A — Deterministic in-app assistant (recommended first)
An intent-matching assistant that maps recognised phrasings to tool functions and renders
the result — no LLM, no API key.

- **Pros:** works on the current Vercel deploy with zero new secrets; fully deterministic
  (good for demos/user groups); fast; no per-message cost.
- **Cons:** understands only the intents you script; not truly conversational.
- **Shape:** a small intent table (regex/keyword → tool call + argument extraction), a
  fallback that lists capabilities via `get_capabilities`, and confirm-before-write for
  the three write tools. Entirely client-side over the tool layer.
- **Scope:** ~1 chat panel component + 1 intent resolver module. Days, not weeks.

### Option B — LLM agent loop (production path)
A real agent behind a new App Router API route that calls the tool layer as tools.

- **Backend:** `app/api/chat/route.ts` runs an Anthropic SDK agent loop (latest Claude
  model), exposing the `lib/mcp/tools.ts` functions as tool definitions, streaming tokens
  and tool-call events to the panel.
- **Pros:** genuinely conversational; handles unseen phrasings; same UX as the external
  connector but embedded.
- **Cons / requirements:** needs an `ANTHROPIC_API_KEY` server env var and a hosting model
  that allows server-side calls; per-message cost; streaming + tool-loop plumbing;
  prompt-injection and write-confirmation guardrails.
- **Recommendation:** ship Option A first for demoability, then swap the resolver for the
  Option B route behind the same panel UI once a key/host is provisioned.

## 5. Component sketch

```
components/portal/chat/
  chat-panel.tsx         docked drawer: message list + input + tool-call chips
  use-chat.ts            message state; sends to resolver (A) or /api/chat (B)
  intent-resolver.ts     (Option A) phrase → tool call over lib/mcp/tools.ts
app/api/chat/route.ts    (Option B) Anthropic agent loop over the same tools
```
State: message list, streaming/pending flag, and a pending-write confirmation. The panel
reads the current persona from `app/page.tsx` to seed context and starter prompts.

## 6. Phasing

1. Chat panel UI + Option A resolver over the read tools (list profiles, profile detail,
   supplier compliance, GS1 search) with capability fallback.
2. Add the write tools to Option A with explicit confirm-before-commit.
3. Option B route (LLM agent) behind the same panel; feature-flag the switch.
4. Shared starter prompts and persona-aware context.

## 7. Risks

- **Write safety:** every write must restate + confirm; never auto-commit.
- **Prompt injection (Option B):** treat tool output and any external text as untrusted;
  keep writes gated behind explicit user confirmation.
- **Store lifetime:** the in-memory store reseeds on cold start — fine for a demo, flag for
  any real rollout.
- **Keeping surfaces in sync:** add new tools in `lib/mcp/tools.ts` only, so the chat and
  the external connector never drift.

## 8. Deliverable status

This document is the deliverable. Building the chat (Option A first) is a follow-up.
