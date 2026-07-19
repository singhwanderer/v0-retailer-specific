# TGC Demo MCP Server — Quickstart

The prototype now serves a live MCP endpoint at **`/api/mcp`** on every deployment. It exposes the retailer's requirement and compliance data (mock, in-memory) as 11 MCP tools — see `docs/mcp-concept.md` for the concept and `app/api/[transport]/route.ts` for the implementation.

## Endpoint URLs

- Branch preview (this feature branch): `https://v0-retailer-specific-git-1d56dd-geminicanadapro-8402s-projects.vercel.app/api/mcp`
- Production (after merge to main): `https://v0-retailer-specific.vercel.app/api/mcp`

## Connect from claude.ai

1. claude.ai → **Settings → Connectors → Add custom connector**
2. Paste the endpoint URL, no authentication
3. Start a chat, enable the "tgc-demo" connector via the tools menu

## Connect from ChatGPT

1. **Settings → Apps & Connectors → Advanced → Developer mode** (requires Plus/Pro/Team)
2. **Create** a connector with the endpoint URL, no authentication
3. Enable it in a new chat via the tools menu

> **If the connector can't reach the URL (401/403):** the Vercel project's
> Deployment Protection or Bot Protection is blocking anonymous requests.
> In Vercel: Project → Settings → Deployment Protection → set Vercel
> Authentication to off (or "Only Production" and use the production URL),
> and check Firewall/Bot Protection isn't challenging non-browser clients.

## Ask anything — these are just examples

The prompts below are illustrations, **not** a fixed command list. The connected LLM interprets free language and picks the right tool, so ask in your own words about any requirement or supplier-compliance question. Not sure where to start? Ask **"What can you help me with?"** and the assistant calls the `get_capabilities` tool to list its actions and the data that actually exists in the demo. In claude.ai the connector also contributes clickable **starter prompts** (review compliance, set up a category, audit a vendor, explain a profile, grant an exception) in the prompt picker.

1. **Query compliance:** "Which of my vendors are furthest behind on compliance, and on which products?"
2. **Understand requirements:** "What does my Footwear profile require, including image requirements?"
3. **Create a requirement:** "Create an attribute profile for Dresses, then require a lifestyle image, JPEG, 2000×2000 minimum, white background." Then: "List my profiles" — the new one appears.
4. **Grant an exception:** "Give J.Renée a 60-day extension on Toe Shape for the Footwear profile." Then: "Show me all active vendor exceptions."

All data is mock and watermarked; writes persist only in the demo server's memory and reset periodically.

## Local test (no deploy needed)

```bash
pnpm build && pnpm start
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_supplier_compliance_summary","arguments":{}}}'
```
