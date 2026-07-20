# Feature — Supplier Compliance View

> Feature spec for the supplier (spoke) side of Trading Grid Catalogue (TGC). Written to be
> lifted into a PRD. All data in the prototype is mock, watermarked "MOCK DATA FOR
> ILLUSTRATION ONLY."

## 1. Overview

A supplier (e.g. J.Renée) sees its catalogue assessed against two kinds of target: the
**GS1 industry baseline** (required everywhere) and **each retailer** that has published
requirements against the supplier's account. The promise: **fill a gap once, satisfy every
retailer who requires it** — because every target is keyed to the same canonical GS1
bricks the retailer authored against (see `feature-retailer-requirements.md`).

This release adds a **% ready** readiness metric to the compliance list so progress is
legible at a glance instead of only as raw gap counts.

## 2. Users

- **Primary:** supplier catalogue owner getting products retailer-ready.
- Assessment presupposes a **category** on each product; uncategorised products cannot be
  assessed until a GS1 brick is assigned (the categorisation on-ramp).

## 3. Current behavior (prototype)

Entry: the **Supplier** persona → *Compliance*. A drill-down:

1. **Compliance list** — `components/portal/screen-supplier-compliance.tsx`. A table of
   targets: **row zero = GS1 Standard (Baseline)**, then one row per retailer (Dillard's,
   Belk, Nordstrom, Macy's, Saks, Bloomingdale's). Each row shows requirements summary,
   the **% Ready** cell, and a status pill (raw gaps / complete counts). Every retailer row
   also shows an amber "N uncategorised (account-wide)" pill whenever any product lacks a
   category, linking to the Catalogue's assign/enrich actions — not just the GS1 row.
2. **Selection codes** — `screen-supplier-selection-codes.tsx`. Per-retailer, the
   supplier's products grouped by GS1 category (one code per brick). A red banner surfaces
   the account-wide uncategorised count here too (see §4a) — until this release, a product
   missing a category was invisible one level above the Product screen.
3. **Product leaf** — `screen-supplier-products.tsx`. Products under a code/target with a
   per-product compliance badge. Also the **categorisation** on-ramp (assign a GS1 brick;
   hands off to the external AI enrichment flow, which is out of scope here).
4. **Gap detail** — `screen-supplier-gap-detail.tsx`. A product's missing attributes and
   images for a target, "X of Y provided," with retailer guidance notes.

## 4. The % Ready metric (this release)

**Definition — product-completion %, per target, category-wise.** A product is *complete*
for a target when it has **zero open gaps** for that target. Readiness is the share of
assessable products that are complete.

- **GS1 target:** assessable = categorised products; complete when `gs1Gaps === 0`.
- **Retailer target:** assessable = categorised products carrying a status for that
  retailer; complete when that retailer's entry reads `"complete"`.
- `pct = round(complete / total × 100)`; a target with nothing assessable reads "Not yet
  assessed."
- **Category-wise:** the same ratio is also computed per **category (GS1 segment)**, so a
  category that spans several bricks (e.g. Clothing = Dresses + Skirts + Sweaters + …) is
  **aggregated into one figure**. The row shows the overall % plus a compact breakdown
  (e.g. *Clothing 80% · Footwear 60% · Accessories 50%*).

Why product-completion rather than requirement-level coverage: it answers "how many of my
products are ready for this target," and rolls up cleanly across the multiple bricks in a
category. Uncategorised products are excluded from the denominator (they can't be assessed)
and remain surfaced by the existing "N uncategorised" flag on the GS1 row.

Implementation: `getTargetCompletion(products, target)` and `getCategory(product)` in
`lib/supplier-catalogue.ts`; rendered by `ReadinessCell` in the compliance screen. The
existing raw gap/complete pills are kept — the % is additive.

## 5. Uncategorised visibility, one level above Products (this release)

Products without a category are **account-wide** (they have no `brickCode` and no
`retailers[]` entries yet, so they can't be attributed to a specific retailer or selection
code). Previously this was only surfaced on the GS1 row of the Compliance list and inside
the GS1 product leaf — invisible from the Selection Codes screen, one level above the
Product screen, and invisible on retailer rows.

This release adds:
- A red banner on `screen-supplier-selection-codes.tsx` (same visual pattern as the
  existing GS1-mode banner in `screen-supplier-products.tsx`) whenever
  `countUncategorised(products) > 0`: *"N products without a category. This is
  account-wide, not specific to {partner}. Click here to use AI to enrich your selection
  codes, or manually add a category to the classification fields in GTIN attributes."*
- An amber "N uncategorised (account-wide)" pill on every retailer row in the Compliance
  list, not just the GS1 row.

Both link to the same `goToCatalogueWithUncategorised()` handler (`app/page.tsx`) already
used by the GS1 leaf — it pre-selects every uncategorised product and opens the Catalogue
screen, where the existing "Assign Category" (manual) and "Send to AI Attributes
Enrichment" (hand-off) actions both apply.

## 6. Data model

`SupplierProduct` (`lib/supplier-catalogue.ts`):

| field | type | notes |
|---|---|---|
| `id`, `description` | string | |
| `state` | `"categorised" \| "uncategorised"` | uncategorised = no brick, not assessable |
| `brickCode` | string? | GS1 category brick → resolves the category (segment) via `getBrickByCode` |
| `gs1Gaps` | number? | open GS1 baseline gaps (0 = baseline-complete) |
| `retailers` | `{ retailer, gaps: number \| "complete" }[]?` | per-retailer status |

Derived helpers: `countUncategorised`, `countBaselineGaps`, `getSelectionCodesForPartner`,
`getPartnerSummary`, and (new) `getCategory`, `getTargetCompletion`. Compliance is modelled
as an **opaque per-product gap integer** per target, not a per-attribute checklist — so the
% is a product-completion ratio, and requirement-level coverage would need a stored
denominator (a future extension).

## 7. Metric definitions (summary)

- **complete(product, target)** = `target === "gs1" ? gs1Gaps === 0 : retailerEntry.gaps === "complete"`.
- **category(product)** = `getBrickByCode(product.brickCode).segment`.
- **pct(target)** = complete products / assessable products, and the same per category.
- **uncategorised(products)** = `countUncategorised(products)` — account-wide, shown
  identically on every retailer row and on the Selection Codes screen (§5).

## 8. Design intent

The compliance view is built around one idea: **the GS1 brick code is the pivot that lets
many retailers assess one product.** GS1 Standard is "row zero" — the baseline every
product is assessed against before any retailer relationship even exists — with each
retailer's requirements framed as "GS1 baseline + N extras." Categorisation is the gateway
task (nothing else works until a product has a GS1 brick), which is why this release
extends uncategorised visibility further up the funnel (§5) instead of leaving it a dead
end below the Product screen. Progress-oriented framing (a headline **% ready** alongside
raw counts) is deliberate: it reads as forward motion, and filling a GS1-baseline gap
visibly advances every retailer at once — the concrete payoff of "comply once, benefit
everywhere." (See the README's "Supplier view design intent" section for the fuller
product thesis.)

## 9. Open questions

- Add **requirement-level coverage %** (met attributes / total required) alongside
  product-completion, once a per-attribute denominator exists?
- Should vendor exceptions (waivers/deadlines) reduce a supplier's gap counts and lift its
  % ready? (Exceptions exist retailer-side but don't yet affect supplier figures.)
- Where should the category-wise breakdown live at deeper levels (selection codes are
  per-brick, categories are per-segment)?
