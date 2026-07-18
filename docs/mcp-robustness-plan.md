# MCP Connector — Robustness Plan (freeform prompts for a travelling doc)

> Status: **proposed / not yet implemented.** This is the agreed plan for the next
> increment. The getting-started guide (`docs/mcp-getting-started.md`) and the current
> connector (`app/api/[transport]/route.ts`) are already live; the items below are the
> work that makes the connector robust when teammates freeform-explore it.

## The question this answers
"Will it only work on the demo prompts? How do I make it work on any prompt, since the
prototype will travel around the team?"

**It already works on any prompt in the retailer domain** — the demo prompts are just
examples, not a fixed command list. The connected LLM interprets free language and picks
tools; general (non-TGC) questions are answered from the model's own knowledge. What a
travelling doc needs is not "more prompts" but three things that make cold, off-script
exploration reliable.

## The three levers (all agreed; scope stays retailer-only)

### 1. Discoverability — so a teammate knows what they can ask
- **Starter prompts** via the MCP prompts primitive (`server.prompt(...)`, supported by
  SDK 1.26). claude.ai surfaces these as clickable suggestions in the connector's prompt
  picker. ~5 retailer flows: review supplier compliance, set up category requirements,
  audit a vendor, explain a profile, grant an exception.
- **`get_capabilities` help tool**: returns a plain-English catalog — available actions
  (read vs. write) and a live snapshot of what exists in the demo (profile names, vendor
  names, categories with data) plus example phrasings. The LLM calls it when a user asks
  "what can I do?" or is unsure. Built from the store, so it never drifts from reality.
- **Stronger server `instructions`**: declare scope, tell the model to call
  `get_capabilities` when unsure, answer strictly from tool results for TGC data, and —
  when asked something out of scope — say what IS available instead of inventing.

### 2. Data breadth — so plausible questions land on real answers
The seed is thin today (3 attribute profiles; supplier catalogue only Dresses/Footwear
across Dillard's + Belk). Expand it modestly, keeping the "MOCK DATA" honesty:
- 3–4 more attribute profiles across GS1 segments already present in
  `lib/gs1-standard-library.ts` (Accessories, Sportswear, Homewear).
- A broader vendor roster + a few products in the new categories so
  `get_supplier_compliance_summary` and `list_vendor_gaps` show real spread.
- 2–3 more vendor exceptions covering the new vendors/profiles.
The UI screens read the same modules, so they benefit too (same shapes, no regressions).

### 3. Self-explaining empty results — so a miss redirects instead of dead-ends
When a read finds nothing, return a helpful envelope instead of bare `[]`:
`list_vendor_gaps` for an unknown vendor → `{ matches: [], knownVendors: [...], note: "No
vendor matched 'X'. Known vendors: …" }`. Extend the pattern `getProfileDetail` already
uses to the other filtered reads; keep fuzzy matching and add case/whitespace tolerance.

## Files touched
- `app/api/[transport]/route.ts` — prompts, `get_capabilities` tool, instructions
- `lib/mcp/tools.ts` — help-catalog function + self-explaining empties
- `lib/retailer-requirements.ts`, `lib/supplier-catalogue.ts` — broader seed
- `docs/mcp-faq.md`, `docs/mcp-demo-quickstart.md` — reframe "demo prompts" as examples

## Verification
- `pnpm exec tsc --noEmit` + `pnpm build`
- Local curl: `prompts/list` returns the starter prompts; `get_capabilities` returns the
  live catalog; `list_vendor_gaps` for an unknown vendor returns the redirect envelope;
  `/` still renders with the enlarged data.
- Manual: reconnect in claude.ai, confirm starter prompts appear, try off-script prompts
  ("what can you do?", "how are my accessories vendors doing?").

## Out of scope
- Supplier-side tools (retailer-only, by decision) — supplier questions get a graceful
  "not in this demo" via instructions.
- Portal UI reading the MCP store (separate future increment).
- Real auth/persistence (P1/P2 in `docs/mcp-concept.md`).
