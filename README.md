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
  selection code → product → gap-detail drill-down; the supplier's cross-target
  **Products Needing Enrichment** worklist; per-code CSV export;
  **Compliance Reports** on both sides (supplier: proactive scans against any
  retailer's account filter or a global System filter; retailer: defensive
  scans of the vendor base against its own profiles or the same System
  filters) — see `docs/feature-compliance-reports.md`.
- **Intentionally inert (shown for realism):** the supplier sidebar reproduces
  the full TGC left nav, but only **Selection Code List**, **Compliance
  Status**, and **Compliance Reports** are active. **Compliance Checks** stays
  inert on purpose — in the live product it's per-file validation at upload
  time, a different concept from the on-demand catalogue-wide report. The
  retailer **Dashboard** is a placeholder. The **AI Attributes Enrichment**
  step is shown as a hand-off signpost only — the enrichment screen itself is
  out of scope. The retailer-side **Import from CSV** dialog is a placeholder
  pending a decided CSV format. A **Vendor Exceptions** screen exists in the
  code but is not wired into navigation in this build (its data does feed the
  retailer-side Compliance Report, which skips waived attributes).

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
listing/inspecting attribute profiles, monitoring supplier compliance gaps,
running compliance reports across the vendor base (`run_compliance_report`,
against an attribute profile or a global System filter from
`list_system_filters`), and authoring requirements (including multi-brick
creation). Setup and usage:

- `docs/mcp-overview-and-enterprise-adoption.md` — start here if you're new to
  MCP, and the one document written for a reader with no repository access: what
  the standard is, the retail/CPG cost of the data disputes it addresses, why the
  in-product Compliance Agent and the external connector are two different jobs,
  how catalogue compliance expands across the Trading Grid network, and an
  evidence-backed verdict with the counter-evidence attached
- `docs/mcp-getting-started.md` — connect a client and try it
- `docs/mcp-demo-quickstart.md`, `docs/mcp-faq.md` — walkthrough and FAQ
- `docs/mcp-pm-presentation.md` — a 45-minute deck, the long-form read behind
  it, and an appendix. Covers the concepts, the security model, how far
  conversational access can go toward replacing the Compliance Report and the
  Dashboard, retail/CPG use cases, and the answer to "our customers won't
  accept Claude/ChatGPT"
- `docs/enterprise-safe-remote-mcp.md` — decision memo proposing a gated,
  read-only pilot, for a security and architecture audience
- `docs/embedded-agent-first-remote-mcp-selectively.md` — where the boundary
  between the in-portal agent and the external connector sits, and why both
  surfaces earn their place
- `docs/mcp-implementation-plan.md` — phased sequencing for everything above,
  including which gaps are pilot-blocking

The retailer tool surface covers the full lifecycle — read, create, edit, and
remove — with a human in the loop for every non-read action. **No mutating tool
acts on its first call**: it returns a preview of exactly what would change, what
that does to compliance numbers, and a short-lived single-use token, and a
separate `confirm_pending_change` tool is the only path that mutates. Removal
needs a fourth scope, `tgc.destructive`, *in addition to* the relevant write
scope. See [`docs/mcp-enterprise-auth-trd.md`](docs/mcp-enterprise-auth-trd.md)
ENT-06a for why the confirmation lives in the protocol rather than in a UI card
the external clients don't have.

The connector is built to survive cold, off-script exploration, not just the
example prompts above:
- **Discoverability** — a `get_capabilities` tool returns a plain-English catalog
  of what's possible plus a live snapshot of the demo data (profile names,
  suppliers, categories with data), built from the store so it never drifts from
  reality; six starter prompts are registered via the MCP prompts primitive and
  surface as clickable suggestions in clients like claude.ai.
- **Self-explaining empty results** — a read that matches nothing (e.g. an
  unknown supplier name) returns a helpful envelope (`{ matches: [], knownSuppliers:
  [...], note: "..." }`) instead of a bare empty array, so a miss redirects
  instead of dead-ending.

> This connector is a **directional investment preview** and may not ship in V1.
> All data is mock; write tools persist to an in-memory store that resets
> periodically.
>
> The endpoint requires **OAuth 2.1 sign-in**, and enforces per-call tenant
> isolation, progressive scopes, and audit logging — see
> [`docs/mcp-enterprise-auth-trd.md`](docs/mcp-enterprise-auth-trd.md) for the
> requirements, what is genuinely demonstrated, and what is deliberately not.
> The authorization server here is a **demo** stand-in for a customer's own IdP
> federated through the TG Aviator Gateway.
>
> **Deploying it:** run `pnpm gen:oauth-key` and set the printed value as
> `TGC_OAUTH_PRIVATE_JWK` in the hosting project (Production **and** Preview).
> This variable is required, not an optimisation. Without it every serverless
> instance derives its own key material, which breaks the connector two ways:
> a token minted by one instance is rejected by the next (re-authentication
> mid-session), and a client registration issued by one instance is rejected by
> the next as `Unknown client_id` — which shows up as a connector that worked
> when it was added and fails on every reconnect after a redeploy. The audit
> log remains per instance, so an empty Access log is not proof that nothing
> happened.

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

### Products Needing Enrichment — the one cross-target view

Every screen above looks at gaps through **one compliance target at a time**,
reached via that retailer's selection codes. That answers "am I ready for
Dillard's" but never "what across my whole catalogue needs work", which is the
question that actually precedes an enrichment run. **Products Needing
Enrichment** (`components/portal/screen-supplier-gaps.tsx`) is that view:

- **One row per product**, listing everything with an outstanding requirement —
  no category, missing attributes, or missing images — irrespective of selection
  code. Filterable by gap kind, category, and which target requires it.
- **Gaps are unioned** across the GS1 baseline and every retailer that assesses
  the product (`lib/supplier-gaps.ts`), so a requirement three retailers want is
  counted once and cleared once. This is the "comply once, benefit everywhere"
  claim computed rather than asserted: because a retailer's gap allocation is a
  head-slice of the same brick attribute pool the baseline draws from, the union
  is a strict superset of each per-target set. Every figure routes back through
  `getGapRecords`/`getGapCount`, so it can never disagree with the drill-down.
- **Gaps expand inline** with the targets that require each one, and can be
  filled in place — the same confirm step and the same shared catalogue write as
  the gap-detail screen, via the shared `AttributeFillControl`.
- Reached from a callout on **Compliance Status**, not a sidebar item of its own:
  it is a roll-up of that screen, and the supplier sidebar mirrors the live
  product's IA rather than inventing entries for it (the Catalogue screen sits
  the same way).
- Bulk-select products and hand them to **AI Attributes Enrichment** — still a
  signpost only, sharing one `EnrichHandoffModal` with the Catalogue screen.

Deliberately **not** an AI feature: the gap engine is fully deterministic, so
this worklist needs no agent to produce it. That is the point — a supplier-side
compliance agent would be a convenience over this data, not the only way to
reach it.

## In-product chat — the TGC Compliance Agent panel

A docked chat panel inside the portal (`components/portal/compliance-agent-panel.tsx`),
retailer-side, toggled from the top bar and off by default. It runs an LLM agent
loop behind `/api/copilot` (`lib/copilot/agent.ts`) over its own tool set in
`lib/copilot/tools.ts`.

**How it relates to the connector.** Its *read* tools proxy the same functions in
`lib/mcp/tools.ts` that the external MCP connector calls, so both surfaces answer
from one data model. Its *write* tools deliberately do not: they never mutate
server-side, returning a `proposal` the panel renders as a confirm card, and only
an "Apply" click calls the same create/update functions Screen 1 and Screen 2
already use. The connector's equivalent is protocol-level — a pending change plus
a single-use token redeemed through `confirm_pending_change` — because an outside
assistant has no UI of ours to render a card in. Deleting a profile is the one
action where a single Apply click is too weak a gate for how far it reaches, so
its card also makes the user retype the profile name. The panel still has a
narrower surface overall: no simulation, exceptions or audit tools.

**This is the surface under evaluation.** Every panel turn is traced to LangSmith
(`lib/copilot/agent.ts`), and `lib/copilot/run-eval.ts` runs an uploaded golden
set with bound scorers through the *same* agent function, so an eval score speaks
to production behaviour rather than to a harness. Connector calls are not traced
and not covered by the golden set — that gap is named in
[`docs/eval-framework-pm-presentation.md`](docs/eval-framework-pm-presentation.md).

## Running locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app is a single page
(`app/page.tsx`) that switches screens by state; the MCP endpoint lives at
`app/api/[transport]/route.ts`.
