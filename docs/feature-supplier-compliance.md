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
   the new **% Ready** cell, and a status pill (raw gaps / complete counts).
2. **Selection codes** — `screen-supplier-selection-codes.tsx`. Per-retailer, the
   supplier's products grouped by GS1 category (one code per brick).
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

## 5. Data model

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

## 6. Metric definitions (summary)

- **complete(product, target)** = `target === "gs1" ? gs1Gaps === 0 : retailerEntry.gaps === "complete"`.
- **category(product)** = `getBrickByCode(product.brickCode).segment`.
- **pct(target)** = complete products / assessable products, and the same per category.

## 7. Open questions

- Add **requirement-level coverage %** (met attributes / total required) alongside
  product-completion, once a per-attribute denominator exists?
- Should vendor exceptions (waivers/deadlines) reduce a supplier's gap counts and lift its
  % ready? (Exceptions exist retailer-side but don't yet affect supplier figures.)
- Progress-oriented framing ("87% ready for Nordstrom") vs neutral counts — how far to push
  the language (see `docs/supplier-view-recommendations.md`).
- Where should the category-wise breakdown live at deeper levels (selection codes are
  per-brick, categories are per-segment)?
