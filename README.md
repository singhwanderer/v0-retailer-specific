# Trading Grid Catalogue — retailer-specific requirements (prototype)

A clickable prototype of how a **retailer** defines product-data requirements in
OpenText Trading Grid Catalogue (TGC), and how a **supplier** meets them across
the catalogue network. Everything here runs on mock data for illustration — it
is watermarked as such throughout.

## The two-act story

The prototype has two personas, switched with the **Retailer / Supplier toggle**
in the top bar:

1. **Act 1 — Retailer (Dillard's).** Define the attributes and image
   specifications suppliers must provide, per product category, each mapped to a
   GS1 category. See `Attributes & Images Requirements`.
2. **Act 2 — Supplier (J.Renée).** See one product assessed against the GS1
   baseline and every retailer at once. Assign a category to a product and watch
   compliance recalculate, then drill into a specific product's open gaps. The
   payoff: **fill a gap once, satisfy every retailer who requires it.**

A welcome overlay lays out this story and a suggested viewing path on first load
(dismissal is remembered in `localStorage`). Reopen it any time via **About this
prototype** in the top bar.

### Suggested viewing path

1. Start on the retailer side — the requirements table.
2. Open a requirement to see the attributes and image rules a category demands.
3. Flip the Retailer / Supplier toggle in the top bar.
4. As the supplier, assign a category to a product (Catalogue → Products), watch
   compliance recalculate, then open a product's compliance to see its gap
   detail.

## What's wired vs. intentionally inert

This is a demo, so some surfaces are deliberately not built:

- **Wired:** retailer requirement authoring (create/activate/deactivate, edit
  attributes and image rules); supplier categorisation with live compliance
  recalculation; the compliance → selection code → product → gap-detail
  drill-down; per-code CSV export.
- **Intentionally inert (shown for realism):** the supplier sidebar reproduces
  the full TGC left nav, but only **Products** and **Compliance Status** are
  active. The retailer **Dashboard** is a placeholder. The **AI Attributes
  Enrichment** step is shown as a hand-off signpost only — the enrichment screen
  itself is out of scope. The retailer-side **Import from CSV** dialog is a
  placeholder pending a decided CSV format. A **Vendor Exceptions** screen exists
  in the code but is not wired into navigation in this build.

## Conversational access (MCP) — directional

The same catalogue data is also exposed through a **Model Context Protocol (MCP)
server** at `/api/mcp`, so the requirements and supplier-compliance data can be
queried conversationally from any MCP client (claude.ai, Claude Desktop, etc.).
It covers the retailer side — searching GS1 categories, listing/inspecting
attribute profiles, monitoring supplier compliance gaps, and authoring
requirements. Setup and usage:

- `docs/mcp-getting-started.md` — connect a client and try it
- `docs/mcp-concept.md` — the concept and where it fits
- `docs/mcp-demo-quickstart.md`, `docs/mcp-faq.md` — walkthrough and FAQ

> This connector is a **directional investment preview** and may not ship in V1.
> All data is mock; write tools persist to an in-memory store that resets
> periodically. The endpoint has no authentication and is intended only for the
> watermarked demo data.

## Design intent

The broader product intent — the "missing first mile" of categorisation, GS1 as
the compliance baseline ("row zero"), and the enrichment hand-off — is written
up in `docs/supplier-view-recommendations.md`.

## Running locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app is a single page
(`app/page.tsx`) that switches screens by state; the MCP endpoint lives at
`app/api/[transport]/route.ts`.
