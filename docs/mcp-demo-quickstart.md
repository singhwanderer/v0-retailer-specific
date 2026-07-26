# TGC Demo MCP Server — Quickstart

The prototype now serves a live MCP endpoint at **`/api/mcp`** on every deployment. It exposes the retailer's requirement and compliance data (mock, in-memory) as MCP tools — see the README's "Requirement authoring model" and "Conversational access (MCP)" sections for the concept, and `app/api/[transport]/route.ts` for the implementation. This connector is built for the retailer side (e.g. Dillard's) — it answers questions about the retailer's own suppliers, not other retail partners.

## Endpoint URLs

- Branch preview (this feature branch): `https://v0-retailer-specific-git-1d56dd-geminicanadapro-8402s-projects.vercel.app/api/mcp`
- Production (after merge to main): `https://v0-retailer-specific.vercel.app/api/mcp`

## Connect from claude.ai

1. claude.ai → **Settings → Connectors → Add custom connector**
2. Paste the endpoint URL. Your client discovers the sign-in automatically — there is no API key or token to create.
3. **Sign in with one of the demo identities below** and choose how much access to grant (read-only is the default).
4. Start a chat and enable the "tgc" connector via the tools menu

## Connect from ChatGPT

1. **Settings → Apps & Connectors → Advanced → Developer mode** (requires Plus/Pro/Team)
2. **Create** a connector with the endpoint URL — sign-in is discovered automatically
3. Sign in, grant scopes, then enable it in a new chat via the tools menu

> **If the connector can't reach the URL (401/403):** the Vercel project's
> Deployment Protection or Bot Protection is blocking anonymous requests.
> In Vercel: Project → Settings → Deployment Protection → set Vercel
> Authentication to off (or "Only Production" and use the production URL),
> and check Firewall/Bot Protection isn't challenging non-browser clients.

## Demo sign-in identities

The connector requires OAuth sign-in — see
[`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md). **Your organisation
is derived from who you sign in as; there is no account picker anywhere in the
flow, by design.**

| Sign in as | Password | Organisation | Class |
|---|---|---|---|
| `buyer@dillards.demo` | `demo` | Dillard's | retailer |
| `buyer@belk.demo` | `demo` | Belk | retailer (peer) |
| `catalog@jrenee.demo` | `demo` | J.Renée | supplier |

Demo credentials for watermarked mock data — the demo authorization server
stands in for a customer's real IdP (Entra ID / Okta / Ping).

### The three things worth demoing

1. **Tenant isolation.** Sign in as Dillard's and create a requirement or grant
   an exception. Sign in as Belk and look for it — it isn't there. Sign in as
   J.Renée (a supplier) and the retailer tools aren't even listed.
2. **Progressive scopes.** Grant read-only at sign-in: the four write tools
   don't appear in the assistant's tool list at all, and are refused if called
   directly.
3. **The access log.** Portal → Compliance Agent → AI Assistant Access →
   **Access log**. Every call and every refusal, live. The **Security** tab runs
   the proactive-agent and wrong-audience-token demos.

## Ask anything — these are just examples

The prompts below are illustrations, **not** a fixed command list. The connected LLM interprets free language and picks the right tool, so ask in your own words about any requirement or supplier-compliance question. Not sure where to start? Ask **"What can you help me with?"** and the assistant calls the `get_capabilities` tool to list its actions and the data that actually exists in the demo. In claude.ai the connector also contributes clickable **starter prompts** (review compliance, set up a category, audit a supplier, explain a profile) in the prompt picker.

1. **Query compliance:** "Which of my suppliers are furthest behind on compliance, and on what?"
2. **Understand requirements:** "What does my Footwear profile require, including image requirements?"
3. **Create a requirement:** "Create an attribute profile for Dresses, then require a lifestyle image, JPEG, 2000×2000 minimum, white background." Then: "List my profiles" — the new one appears.
4. **Audit a supplier:** "How is J.Renée doing on Footwear?"

All data is mock and watermarked; writes persist only in the demo server's memory and reset periodically.

## Local test (no deploy needed)

```bash
pnpm build && pnpm start

# Unauthenticated: 401 plus the discovery pointer that starts the OAuth flow.
curl -i -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{}'

# The metadata documents an MCP client fetches next.
curl -s http://localhost:3000/.well-known/oauth-protected-resource
curl -s http://localhost:3000/.well-known/oauth-authorization-server
```

Tool calls now need a token, so the quickest local check is the browser: open
the portal, and use **AI Assistant Access → Security** to run the proactive
agent and mint a wrong-audience token, then watch both land in **Access log**.
