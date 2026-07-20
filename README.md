# Trading Grid Catalogue — retailer-specific requirements (prototype)

A clickable prototype of how a **retailer** defines product-data requirements in
OpenText Trading Grid Catalogue (TGC), and how a **supplier** meets them across
the catalogue network. Everything here runs on mock data for illustration — it
is watermarked as such throughout.

## The two personas

The prototype has two personas, switched with the **Retailer / Supplier toggle**
in the top bar:

1. **Retailer (Dillard's).** Define the attributes and image specifications
   suppliers must provide, per product category, each mapped to one or more GS1
   categories. See `Attributes & Images Requirements`.
2. **Supplier (J.Renée).** See one product assessed against the GS1 baseline and
   every retailer at once. Assign a category to a product and watch compliance
   recalculate, then drill into a specific product's open gaps. The payoff:
   **fill a gap once, satisfy every retailer who requires it.**

A first-load overlay names both personas as a plain FYI (no guided tour).
Dismissal is remembered in `localStorage`; reopen it any time via **About this
prototype** in the top bar.

## What's wired vs. intentionally inert

This is a demo, so some surfaces are deliberately not built:

- **Wired:** retailer requirement authoring (create/activate/deactivate, edit
  attributes and image rules, map a requirement to one or more GS1 categories);
  supplier categorisation with live compliance recalculation; the compliance →
  selection code → product → gap-detail drill-down; per-code CSV export.
- **Intentionally inert (shown for realism):** the supplier sidebar reproduces
  the full TGC left nav, but only **Products** and **Compliance Status** are
  active. The retailer **Dashboard** is a placeholder. The **AI Attributes
  Enrichment** step is shown as a hand-off signpost only — the enrichment screen
  itself is out of scope. The retailer-side **Import from CSV** dialog is a
  placeholder pending a decided CSV format. A **Vendor Exceptions** screen exists
  in the code but is not wired into navigation in this build.

## Requirement authoring model — GS1 bricks, multi-brick profiles, one shared store

Attributes are always defined at **GS1 brick level**, not the free-text category
level. A retailer requirement (`AttributeProfile`) can map to **one or more GS1
bricks**, chosen either at creation (Screen 1's multi-select wizard step) or
later from the detail screen's "Add GS1 Category" action — both reuse the same
searchable brick picker (`components/portal/gs1-brick-picker.tsx`) and the same
cross-category confirmation (`components/portal/confirm-mixed-category-modal.tsx`):
if an added brick's segment (Footwear, Clothing, Jewellery, Accessories,
Sportswear, Homewear) differs from the requirement's established one, a
confirmation dialog asks "Add anyway?" — a soft override, not a hard block.

**Each mapped brick keeps its own attribute set — nothing is merged across
bricks.** A multi-brick profile's detail screen (Screen 2) shows a searchable
dropdown scoped to that profile's own bricks; switching bricks changes which
brick's Core/Extended/Image rows are shown and edited. The free-text
**Category / Product Type** field (typed once, in Step 1 of creation) always
drives the requirements list's Category column — independent of which or how
many GS1 categories end up mapped underneath it.

**One shared tool layer, two consumers.** `lib/mcp/tools.ts` — the same
functions the external MCP connector calls — is called directly by the portal
UI (Screen 1/2) as plain client-side function calls. `lib/mcp/attribute-assembly.ts`
holds the one place that assembles "what does this brick require" (baseline
core + the brick's standard extended attributes + its own custom rows and image
requirements), so authoring in the UI and querying via the connector go through
identical logic instead of two hand-synced copies.

> **Caveat:** the browser (client-rendered portal) and the Vercel serverless MCP
> route are separate runtime processes with separate in-memory stores.
> "Unifying" them means one shared assembly/mutation code path and shape — not
> literally shared live memory across that boundary. That would need a real
> backend, which is out of scope for this prototype.

## Conversational access (MCP)

The same catalogue data is also exposed through a **Model Context Protocol (MCP)
server** at `/api/mcp`, so the requirements and supplier-compliance data can be
queried conversationally from any MCP client (claude.ai, Claude Desktop, ChatGPT
developer mode). It covers the retailer side — searching GS1 categories,
listing/inspecting attribute profiles, monitoring supplier compliance gaps, and
authoring requirements (including multi-brick creation). Setup and usage:

- `docs/mcp-getting-started.md` — connect a client and try it
- `docs/mcp-demo-quickstart.md`, `docs/mcp-faq.md` — walkthrough and FAQ

The connector is built to survive cold, off-script exploration, not just the
example prompts above:
- **Discoverability** — a `get_capabilities` tool returns a plain-English catalog
  of what's possible plus a live snapshot of the demo data (profile names,
  suppliers, categories with data), built from the store so it never drifts from
  reality; five starter prompts are registered via the MCP prompts primitive and
  surface as clickable suggestions in clients like claude.ai.
- **Self-explaining empty results** — a read that matches nothing (e.g. an
  unknown supplier name) returns a helpful envelope (`{ matches: [], knownSuppliers:
  [...], note: "..." }`) instead of a bare empty array, so a miss redirects
  instead of dead-ending.

> This connector is a **directional investment preview** and may not ship in V1.
> All data is mock; write tools persist to an in-memory store that resets
> periodically. The endpoint has no authentication and is intended only for the
> watermarked demo data.

## Supplier view design intent

The supplier compliance view is built around one idea: **the GS1 brick code is
the pivot that lets many retailers assess one product.** GS1 Standard sits as
"row zero" in the merged Compliance list — the one baseline every product is
assessed against, before any retailer relationship even exists — with each
retailer's requirements framed as "GS1 baseline + N extras." Categorisation is
the gateway task (nothing else in the flow works until a product has a GS1
brick), so uncategorised products are surfaced prominently and routed to the
Catalogue screen's assign/enrich actions rather than left as a dead end. Progress
is framed positively — a **% ready** readiness figure alongside raw gap counts —
so filling a GS1-baseline gap visibly advances every retailer at once, the
concrete payoff of "comply once, benefit everywhere."

## Possible future direction — in-product chat

A natural next step, not built here: a docked chat panel inside the portal that
reuses `lib/mcp/tools.ts` the same way the external MCP connector does, so a
user could ask questions and make changes in plain English without leaving the
app. A simple version needs no LLM at all — a deterministic intent-matcher over
the existing tool functions; a fuller version would run an LLM agent loop behind
a new API route calling the same tools. Not part of this build.

## Running locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app is a single page
(`app/page.tsx`) that switches screens by state; the MCP endpoint lives at
`app/api/[transport]/route.ts`.
