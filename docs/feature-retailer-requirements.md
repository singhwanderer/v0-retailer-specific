# Feature — Retailer Requirements Authoring

> Feature spec for the retailer (hub) side of Trading Grid Catalogue (TGC). Written to be
> lifted into a PRD. All data in the prototype is mock, watermarked "MOCK DATA FOR
> ILLUSTRATION ONLY."

## 1. Overview

A retailer (e.g. Dillard's) defines the product data it requires from its suppliers, per
product category. Each requirement — an **attribute profile** — is mapped to one or more
**GS1 category bricks**, inherits that brick's standard extended attributes, and can be
extended with the retailer's own core/custom attributes and image specifications.
Publishing a requirement makes it visible to every supplier trading under the retailer's
account, who are then assessed against it (see `feature-supplier-compliance.md`).

The organising idea: **the GS1 brick is the pivot that lets many retailers assess one
supplier product.** A retailer authors against the standard once; suppliers who satisfy
the standard satisfy every retailer who requires it.

## 2. Users

- **Primary:** retailer catalogue/data-standards owner (Dillard's persona) authoring and
  maintaining category requirements.
- **Downstream consumer:** suppliers, who see published (Active) requirements and are
  measured against them. Suppliers never edit requirements.

## 3. Current behavior (prototype)

Entry: the **Retailer** persona → *Attributes & Images Requirements*.

### 3.1 Requirements list — `components/portal/screen1-attribute-profiles.tsx`
- A table of attribute profiles. Columns: Category (internal name), Product Type, **GS1
  Category**, Requirements (attribute count), Status, Last Updated, Actions.
- The **GS1 Category** column shows the primary brick's name + code, and a **"+N more"**
  chip when the profile maps to multiple bricks.
- **Create New Requirement** opens a 3-step wizard: (1) internal name, a required
  free-text **Category / Product Type** field, and initial status (Draft/Active); (2)
  **GS1 category picker**, multi-select — a requirement can map to several bricks at
  creation, with the same cross-category confirmation as the detail screen; (3) a
  per-brick preview of the standard extended attributes that will be pre-loaded (one card
  per selected brick — nothing merged).
- **Activate / Deactivate** toggles a profile's visibility to suppliers (confirmation
  dialog; no data deleted on deactivate).
- **Import from CSV** is a cosmetic placeholder (out of scope).

### 3.2 Requirement detail — `components/portal/screen2-profile-detail.tsx`
- Three attribute groups, each add/edit-able: **Core**, **Extended**, **Image
  Requirements** — scoped to whichever brick is currently selected (see 3.3). Each
  attribute row is tagged `source: "standard"` (inherited from the GS1 brick) or
  `"custom"` (added by the retailer).
- **GS1 Category Mapping** card (right column) lists **every** mapped brick with its
  segment badge, highlights the one currently selected, and has an **"Add GS1 Category"**
  action.
- **Rename** the internal category name; **Activate/Deactivate** from here too.
- Per-attribute **guidance notes** — including on standard/GS1-inherited rows — help
  suppliers get the value right (surfaced supplier-side in gap detail — see the supplier
  doc). Editing a standard row's label/guidance is recorded as an override keyed by GS1
  name, since standard rows aren't themselves stored — they're derived live from the brick.

### 3.3 Multi-brick mapping: attributes are brick-scoped, not merged
A requirement can map to **more than one GS1 brick**, added at creation (multi-select) or
later via the detail screen's "Add GS1 Category" (shared brick picker,
`components/portal/gs1-brick-picker.tsx`; already-mapped bricks show as "Added").

**Attributes are always defined at GS1 brick level.** A profile with several bricks keeps
each brick's Core/Extended/Image rows **fully independent — nothing is merged or deduped
across bricks.** The detail screen shows a searchable dropdown
(`components/portal/profile-brick-selector.tsx`) scoped to just that profile's own mapped
bricks (distinct from the whole-library picker used to *add* a brick); switching the
selection changes which brick's attributes are shown and edited. A single-brick profile
shows no dropdown chrome.

**Validation:** a requirement ideally covers one category, where *category = the GS1
`segment`* (Footwear, Clothing, Jewellery, Accessories, Sportswear, Homewear) — not the
free-text "Category / Product Type" field, which is always whatever the retailer typed and
never derived from a brick name, however many/whichever bricks end up mapped. If an added
brick's segment differs from the requirement's established segment (its primary brick's),
a **confirmation dialog** (`components/portal/confirm-mixed-category-modal.tsx`, shared
between creation and the detail screen) warns and asks "Add anyway?" — a soft override, not
a hard block. Same-segment adds go through silently.

### 3.4 Store unification
Authoring here and the MCP connector's view are one code path: `lib/mcp/tools.ts`'s
`createAttributeProfile`, `addAttributeRequirement`, `setImageRequirement`, and
`updateAttributeRequirement` are called directly from the UI (plain client-side function
calls — no HTTP hop), and `lib/mcp/attribute-assembly.ts`'s `assembleBrickAttributes` is
the one place that assembles a brick's full attribute set, used by both the connector's
`get_profile_detail` and the detail screen. A profile lookup by brick code
(`findProfileForBrick`) checks *all* of a profile's mapped bricks, not just its primary —
fixing a bug where a profile's secondary bricks were invisible to the connector. See the
caveat in the README about client/serverless memory not being literally shared.

## 4. Data model

`AttributeProfile` (`lib/retailer-requirements.ts`):

| field | type | notes |
|---|---|---|
| `name` | string | internal category name; the profile key |
| `category` | string | free-text product-type grouping (e.g. "Women's Apparel") — **not** the GS1 segment |
| `attributes` | string | display summary (e.g. "51 attributes · 2 GS1 categories") |
| `status` | `"Active" \| "Draft"` | Active = visible to suppliers |
| `brickCode` / `brickName` | string | **primary** GS1 brick (kept for single-brick readers) |
| `bricks` | `{ code, name }[]?` | **all** mapped bricks; read via `getProfileBricks()` |
| `lastUpdated`, `actions`, `isLink` | — | list metadata |

GS1 standard library (`lib/gs1-standard-library.ts`): `Gs1Brick = { brickCode, brickName,
segment, extendedAttributes: { name, code }[] }`; helpers `getBrickByCode`, `getSegments`,
`searchBricks`. The shared attribute-assembly layer (`lib/mcp/attribute-assembly.ts`) and
store (`lib/mcp/store.ts`) hold the structured requirement model — baseline core
attributes, per-brick extras (custom rows, overrides, image requirements) keyed by GS1
brick code — read by both the connector's `get_profile_detail` and Screen 2 directly.

- **Requirement tiers, per brick:** Core (global baseline: GTIN code/description, NRF
  colour/size, plus that brick's own custom core rows) · Extended (that brick's standard
  `extendedAttributes` plus that brick's own custom extended rows) · Image (format,
  background, min dimensions, max file size, crop, guidance) — all scoped to one brick,
  never merged with another mapped brick's set.
- **Category vs brick:** a category (segment) contains several bricks; a requirement maps
  to one segment ideally, spanning one or more of its bricks, each kept independent.

## 5. Metric / rule definitions

- **Effective bricks of a profile** = `profile.bricks` if non-empty, else the single
  `{ brickCode, brickName }` (`getProfileBricks`).
- **A profile's attribute-count summary** (`describeProfileAttributes`) counts the global
  4-row baseline once, and sums every mapped brick's own custom core, standard extended,
  custom extended, and image-requirement counts — no dedup across bricks.
- **Cross-category flag** (`isDifferentSegment`) fires when `candidateBrick.segment !==
  establishedSegment` (the requirement's first/primary brick's segment).
- **Profile lookup by brick** (`findProfileForBrick`) matches if the brick code is in
  *any* of the profile's mapped bricks, not just its primary.

## 6. Resolved from the previous round

- Multi-brick selection is now allowed at **creation** (Step 2 multi-select), not just the
  detail screen.
- The list's Category / Product Type label is always the retailer's typed free text —
  never derived from a brick name, regardless of which/how-many segments get mapped.
- The MCP structured store and the profile UI are unified: one shared assembly module
  (`lib/mcp/attribute-assembly.ts`) and the UI calls the same write functions
  (`lib/mcp/tools.ts`) the connector calls — see §3.4 and the README's client/serverless
  caveat.

## 7. Open questions

- Vendor exceptions (`screen3-vendor-exceptions.tsx`: waivers, extended deadlines, reduced
  scope) exist in code but are not wired into retailer navigation — in or out of scope?
- Should `updateAttributeRequirement` (editing a standard row via an override) become an
  external MCP tool too, or stay UI-internal as it is today?
