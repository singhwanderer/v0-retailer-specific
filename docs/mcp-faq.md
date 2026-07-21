# TGC MCP Connector — Connection Guide & FAQ

Companion to the README's "Conversational access (MCP)" section (the concept) and `docs/mcp-demo-quickstart.md` (the short card). This is the full guide: how to connect, what the API URL is, how the end-to-end create flow works — including mandatory fields and drop-down options — and answers to the questions people ask.

---

## 1. API URL

| Environment | MCP endpoint |
|---|---|
| Feature branch (live now) | `https://v0-retailer-specific-git-1d56dd-geminicanadapro-8402s-projects.vercel.app/api/mcp` |
| Production (after merging to `main`) | `https://v0-retailer-specific.vercel.app/api/mcp` |

The endpoint speaks MCP over Streamable HTTP. No authentication is configured — acceptable only because everything behind it is watermarked mock data. A real rollout gets OAuth 2.1 (see FAQ below).

## 2. How to connect

**claude.ai (recommended for the demo)**
1. Settings → **Connectors** → **Add custom connector**
2. Name it "TGC", paste the endpoint URL, no authentication → Add
3. In a new chat, open the tools/search menu and enable the TGC connector
4. Ask: *"Which of my suppliers are furthest behind on compliance?"*

**ChatGPT**
1. Settings → **Apps & Connectors** → enable **Developer mode** (Plus/Pro/Team)
2. **Create** connector → paste the endpoint URL, no authentication
3. Enable it in a new conversation via the tools menu

**Claude Desktop**
1. Settings → Connectors → Add custom connector → paste the URL

> **Getting a 401/403 when adding?** The Vercel project's Deployment
> Protection is blocking anonymous requests. In Vercel: Project → Settings →
> Deployment Protection → turn Vercel Authentication off for previews (or
> merge to `main` and use the production URL). Also check Firewall/Bot
> Protection isn't challenging non-browser clients.

## 3. The end-to-end create flow — mandatory fields and drop-downs

**Short answer: yes, the AI knows the mandatory fields and the drop-down options — natively.** This isn't prompt engineering; it's how MCP works. When the client connects, it calls `tools/list` and receives every tool's input contract as JSON Schema. Two parts of that schema do the work:

- **`required`** — the list of mandatory fields
- **`enum`** — the fixed set of allowed values (a drop-down, as far as the model is concerned)

This is what the server actually publishes for `set_image_requirement`:

```json
{
  "name": "set_image_requirement",
  "inputSchema": {
    "type": "object",
    "properties": {
      "format":     { "type": "string", "enum": ["JPEG", "PNG", "TIFF", "WebP"] },
      "background": { "type": "string", "enum": ["Pure white (#FFFFFF)", "Light grey (#F5F5F5)", "Transparent", "Lifestyle/contextual"] },
      "minDimensions": { "type": "string" },
      "maxFileSize":   { "type": "string" },
      "shapeCrop":     { "type": "string" },
      "guidanceNote":  { "type": "string" }
    },
    "required": ["brickCode", "requirementName", "format", "background", "minDimensions", "maxFileSize", "shapeCrop"]
  }
}
```

So the conversation plays out like a form the model fills in on your behalf:

1. **You:** "Add a lifestyle image requirement to Footwear."
2. **The model reads the schema**, sees seven mandatory fields and that `format` and `background` only accept the listed options.
3. **It asks for what's missing**, offering only valid choices: *"What format — JPEG, PNG, TIFF, or WebP? And which background: pure white, light grey, transparent, or lifestyle/contextual? Minimum dimensions and max file size?"*
4. **It confirms the staged change** before writing (the tool descriptions instruct it to).
5. **It calls the tool.** The server validates *again* — a missing mandatory field or an out-of-list value is rejected with an error naming the exact field, which the model reads and corrects. Two layers: schema guides, server enforces.
6. **The created object comes back** and the model shows you the confirmation.

Same mechanics on every write: `exceptionType` is an enum (Attribute Waiver / Extended Deadline / Reduced Scope), `target` is an enum (core / extended), and every tool's mandatory fields are in its `required` list. When TGC changes a form, you change the schema in one place and every connected LLM immediately asks the new questions — no retraining, no prompt updates.

## 4. FAQs

**Q: How does the AI know which fields are mandatory?**
From the tool's JSON Schema `required` list, delivered at connection time via `tools/list`. See section 3.

**Q: Where do the drop-down options come from?**
From `enum` constraints in the same schema. In production these would be generated from TGC's actual picklists (NRF code tables, GS1 code lists), so the "dropdown" the AI offers is always the live one.

**Q: What happens if I give an invalid value ("make the format a GIF")?**
The model will usually push back immediately because the schema says GIF isn't allowed. If it calls anyway, the server rejects the call with a field-level validation error, and the model relays the valid options. Invalid data cannot enter the store.

**Q: Can it create requirements or only answer questions?**
Both. Six read tools (search bricks, list/get profiles, list/get supplier compliance, and a `get_capabilities` help tool) and three write tools (create profile, add attribute, set image requirement).

**Q: Does data created via chat persist?**
Demo-grade only: writes go to the server's in-memory store, survive while the serverless instance is warm, and reset on cold start. Every write response carries a `demo_note` saying exactly this. Production persistence (a database or the real TGC API) is the P1 step.

**Q: Why don't chat-created requirements show up in the portal UI?**
The prototype's screens render their own client-side data and don't fetch from the MCP server's store yet. Closing that loop (portal reads the same store via a small API) is a planned next increment — then "create in ChatGPT, refresh the portal, it's there" works.

**Q: Is this real TGC data?**
No. Everything is watermarked mock data living in this repo (`lib/gs1-standard-library.ts`, `lib/supplier-catalogue.ts`, `lib/retailer-requirements.ts`). That's the point of the demo: the MCP layer is identical whether it wraps mock modules or real TGC services — the LLM can't tell the difference, so we can prove the experience before any backend work.

**Q: What about security for a real rollout?**
Three non-negotiables before real data: OAuth 2.1 + PKCE per the MCP auth spec; tokens scoped to tenant and role (a supplier token reads only requirements published to them); and per-tool authorization checks mirroring the portal's RBAC. Plus audit logging of every tool call so support can reconstruct what the AI saw.

**Q: Which LLMs can connect?**
Any MCP client: claude.ai, Claude Desktop, ChatGPT (developer mode), Microsoft Copilot Studio, Cursor, and a growing list. That's the strategic argument for a protocol over a bespoke chatbot API — one integration, every assistant.

**Q: Can suppliers use it too?**
The current tool set is retailer-first. Supplier-side tools (e.g. `get_my_compliance`, `get_retailer_requirements`, `explain_gap`) are a natural later phase on the same server, with a different token scope — not built in this prototype.

**Q: Does it cost anything to run?**
The demo runs on the existing Vercel project (serverless, no LLM key — the connecting user's own AI does the reasoning). At scale, MCP calls are just API events; the commercial question of metering them like network events is flagged in the concept doc.

**Q: What breaks if TGC changes a form or picklist?**
Nothing on the AI side — the schema is the contract. Update the enum/required list in the tool definition and every connected client picks it up on the next connection.

## 5. What can I ask? (it is NOT a fixed list)

**Ask anything** about your requirements and supplier compliance, in your own words — the examples below are just illustrations, not the only supported inputs. The connected LLM interprets free language and picks the right tool; general (non-TGC) questions are answered from the model's own knowledge, and out-of-scope questions get a graceful redirect to what IS available.

Two discoverability aids make cold, off-script exploration reliable:

- **Ask "What can you help me with?"** — the assistant calls the `get_capabilities` tool, which returns a plain-English catalog of actions plus a live snapshot of the demo data (which profiles, suppliers, and categories actually have data). Because it's built from the store, it never drifts.
- **Starter prompts in the picker** — in claude.ai the connector contributes clickable suggestions (*review supplier compliance*, *set up category requirements*, *audit a supplier*, *explain a profile*) via the MCP prompts primitive. Look for them in the connector's prompt picker.

Example prompts to try:

1. "Which of my suppliers are furthest behind on compliance, and on what?"
2. "What does my Footwear profile require, including image requirements?"
3. "How is J.Renée doing on Footwear?" *(off-script — resolves against the seeded supplier data)*
4. "Create an attribute profile for Dresses." *(watch it resolve the GS1 brick and confirm before writing)*
5. "Add a lifestyle image requirement to Footwear." *(watch it ask for format and background, offering only the valid options — that's the schema at work)*
