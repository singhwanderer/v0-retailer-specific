# Supplier View: Categorization, GS1-as-Compliance, and the Enrichment Handoff

A set of recommendations for making it easier for suppliers to get their catalogue GS1-compliant and retailer-ready, building on the existing prototype in this repo.

## 1. What the prototype is doing, end to end

Both sides of this app revolve around one idea: **the GS1 brick code is the pivot that lets many retailers assess one product.**

- **Retailer view** (`screen1-attribute-profiles.tsx`, `screen2-profile-detail.tsx`, `screen3-vendor-exceptions.tsx`): a retailer creates a requirement, maps it to a GS1 brick, and inherits that brick's standard attributes automatically. They can add their own core/custom attributes on top, attach image specs, and carve out per-vendor exceptions (waivers, deadlines, reduced scope).
- **Supplier view** (`screen-supplier-trading-partners.tsx` → `screen-supplier-selection-codes.tsx` → `screen-supplier-products.tsx` → `screen-supplier-gap-detail.tsx`): a supplier drills from a retailer, into that retailer's selection codes, into the products under a code, into a specific product's missing attributes and images — all keyed to the same canonical GS1/TGC codes the retailer used.

The payoff, already stated in the product's own captions: **"You keep one product. Filling a gap once satisfies every retailer who requires it."** That promise only holds if the product has a GS1 brick in the first place — everything downstream depends on it.

```mermaid
flowchart LR
    subgraph Retailer["Retailer view"]
        R1[Create requirement] --> R2[Map to GS1 brick]
        R2 --> R3[Inherit standard attributes]
        R3 --> R4[Add retailer extras + image specs]
    end
    subgraph Supplier["Supplier view"]
        S1[One product record] --> S2{Has GS1 brick?}
        S2 -->|No| S3[Cannot be assessed]
        S2 -->|Yes| S4[Checked against every retailer's requirements]
    end
    R4 -. requirements published against .-> S4
```

## 2. Two systems, one product

This project owns the **compliance view** — diagnosing who requires what, and what's missing, per product and per partner. There is already a **separate AI enrichment screen (out of scope of this project)** that does the actual categorisation and attribute-filling work against GS1 baseline standards.

That's the right split of responsibility. The job of this document is to make the seam between the two invisible to the supplier: the compliance view should diagnose and then **hand off with context**, not ask the supplier to go find the right screen and re-figure-out what needed fixing.

## 3. The supplier journey has a missing first mile

Compliance assessment presupposes a category. Today:

- `screen-supplier-products.tsx` shows an uncategorised product with an **"Assign category" button that does nothing** (no `onClick` handler wired).
- The urgent red banner correctly says *"Compliance cannot be checked until a category is assigned"* — but gives no path to actually assign one.
- A standalone **"GS1" item in the left nav** (as in your newer working copy) makes this worse: a user who clicks it before categorising anything lands on an empty or confusing screen, because GS1 compliance can't be evaluated without a category either. It also splits the mental model — GS1 stops looking like "one more thing I comply with" and starts looking like a separate system.

Categorisation is the gateway task. Nothing else in the flow works until it's done, so the UI should treat it as such.

## 4. Recommendation 1 — GS1 Standard as "row zero" in Compliance

Rather than a standalone nav item, **GS1 should appear as a row inside the same compliance list as trading partners** (`screen-supplier-trading-partners.tsx`) — the one partner every supplier has by default, even before they're connected to any retailer.

- Same mechanics as any other row: product count, gap count, complete count, click through to gap detail.
- Requirements for this row are simply **the assigned brick's standard `extendedAttributes`** — that data already exists in `lib/gs1-standard-library.ts`; no new data model is needed.
- Visual distinction: a **"Baseline / Standard" badge** instead of a retailer logo, so it reads as the foundation everything else builds on, not just another buyer. Retailer rows can then show something like *"GS1 baseline + 3 extras"* to make the relationship explicit.
- Uncategorised products show up **inside this row** as "cannot be assessed — assign a category," which is the natural on-ramp into Recommendation 2. This also gives new suppliers (zero retailer connections yet) something meaningful to do on day one: get GS1-compliant before a retailer relationship even exists.

```mermaid
flowchart TB
    subgraph Before["Current nav"]
        B1[Trading Partners] 
        B2[Selection Codes]
        B3["GS1 (standalone item)"]
    end
    subgraph After["Proposed"]
        A1["Compliance list"]
        A1 --> A2["GS1 Standard — row zero<br/>(Baseline badge)"]
        A1 --> A3["Dillard's — baseline + 3 extras"]
        A1 --> A4["Nordstrom — baseline + 5 extras"]
    end
```

## 5. Recommendation 2 — Categorisation and attribute fill hand off to the existing AI flow, not rebuilt here

The catalogue/products screen (`screen-supplier-products.tsx`) is where this project's responsibility ends and the enrichment flow's begins.

- Add a **selection mechanism** to the product table — checkboxes per row, plus shortcuts like "select all uncategorised" and "select all with GS1 baseline gaps." This supports the range the user described: a couple of products picked manually, or hundreds selected in bulk for AI.
- A single action — **"Assign category" / "Enrich with AI"** — sends the selected product IDs to the external enrichment flow. For gap-filling specifically, it also passes the missing GS1/TGC attribute codes and which requirement (GS1 baseline vs. a named retailer) surfaced them, so the enrichment flow can pre-scope its work instead of the supplier re-finding it.
- On return, the compliance view **re-syncs live**: newly categorised products get their brick and appear across every relevant row; filled attributes clear the matching gap in the GS1 row *and* every retailer row that required it; progress counters update immediately.

> **Scope note:** The enrichment screen's own interaction design (review grid, confidence bands, accept/edit flow, etc.) is intentionally treated as a black box in this document — it's a separate project. Exactly what the redirected screen looks like, and the precise shape of the handoff payload, is a follow-up conversation once both sides are ready to design the integration together.

**Current limitation to flag honestly:** the existing enrichment flow fills **GS1 baseline attributes only**. It has no path today for retailer-specific extras (e.g., a custom core attribute Dillard's requires beyond the brick standard). The natural next step for that external flow is to accept an **arbitrary GS1/TGC-coded requirement set**, not just the baseline — at that point, retailer-extra gaps in this compliance view could deep-link the same way baseline gaps do. Until then, retailer-extra gaps should keep today's manual fill / CSV path, clearly labeled as such so suppliers aren't left waiting on an AI fix that doesn't exist yet.

```mermaid
sequenceDiagram
    participant S as Supplier
    participant C as Compliance view (this project)
    participant E as AI enrichment flow (external, out of scope)

    S->>C: Select N products (manual or "select all uncategorised")
    C->>E: Hand off product IDs + missing GS1/TGC codes + source (baseline/retailer)
    E-->>E: Categorise / suggest attribute values (black box)
    E->>S: Supplier reviews & accepts in enrichment screen
    E->>C: Return updated products
    C->>C: Re-sync gap counts across GS1 row + every affected retailer row
    C-->>S: Compliance list reflects new state immediately
```

## 6. Recommendation 3 — Keep the GS1-baseline-first framing even without new enrichment UX

Independent of what the enrichment screen can automate today, the compliance view itself should always present requirements in two tiers:

- **GS1 baseline** (required everywhere) — first, and visually primary.
- **+N retailer extras** (Dillard's, Nordstrom, …) — clearly secondary, additive.

Filling GS1 baseline gaps (via the AI hand-off) visibly moves every retailer row forward at once — this is the concrete payoff of "comply once, benefit everywhere," and it's what nudges suppliers toward baseline-first enrichment even while retailer extras still require manual work.

Retailer guidance notes, already authored in the retailer view (`EditAttributeDialog` in `screen2-profile-detail.tsx`), should stay visible in gap detail regardless of which fix path applies — manual or AI-assisted. They're written once by the retailer specifically to help the supplier get it right; today they're captured but not surfaced anywhere in the supplier's gap view.

## 7. Recommendation 4 — Supporting changes

- **Progress-oriented language** — "87% ready for Nordstrom" reads as forward motion; "8 gaps" reads as a penalty. Same numbers, different framing, same screens.
- **Keep the CSV path** (`screen-supplier-selection-codes.tsx`) as the offline bulk alternative — it remains the only path for retailer-extra attributes until the enrichment flow is extended, so it shouldn't be deprecated.
- **Fix the dead-end CTAs in gap detail** (`screen-supplier-gap-detail.tsx`): the disabled "Upload Image" button and inert attribute rows should become real actions — "Fix with AI" for GS1-baseline gaps (routes into the hand-off), "Fill manually" for retailer extras.
- **Reflect vendor exceptions in supplier-facing gap counts.** Exceptions already exist on the retailer side (`screen3-vendor-exceptions.tsx` — waivers, extended deadlines, reduced scope) but nothing in the supplier view shows their effect. A waived attribute should not count as a gap for that supplier.

## 8. Suggested phasing (non-binding)

This document is a recommendation, not a build plan — but if it becomes one, a reasonable order is:

1. GS1 as row zero in the compliance list (Recommendation 1) — no dependency on the enrichment flow, ships independently.
2. Bulk selection UI + hand-off wiring on the products screen (Recommendation 2) — depends on agreeing the handoff contract with the enrichment flow's owners.
3. Extend the external enrichment flow to accept retailer-extra requirement sets, closing the gap flagged in Recommendation 2.
