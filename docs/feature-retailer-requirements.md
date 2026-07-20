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
- **Create New Requirement** opens a 3-step wizard: (1) internal name + initial status
  (Draft/Active), (2) **GS1 category picker** (search + segment filter, single-select),
  (3) preview of the standard extended attributes that will be pre-loaded. Creation maps
  to one brick; more are added later in the detail screen.
- **Activate / Deactivate** toggles a profile's visibility to suppliers (confirmation
  dialog; no data deleted on deactivate).
- **Import from CSV** is a cosmetic placeholder (out of scope).

### 3.2 Requirement detail — `components/portal/screen2-profile-detail.tsx`
- Three attribute groups, each add/edit-able: **Core**, **Extended**, **Image
  Requirements**. Each attribute row is tagged `source: "standard"` (inherited from the
  GS1 brick) or `"custom"` (added by the retailer).
- **GS1 Category Mapping** card (right column) lists **every** mapped brick with its
  segment badge, and an **"Add GS1 Category"** action.
- **Rename** the internal category name; **Activate/Deactivate** from here too.
- Per-attribute **guidance notes** authored here are meant to help suppliers get the
  value right (surfaced supplier-side in gap detail — see the supplier doc).

### 3.3 Multi-brick mapping + cross-category validation (this release)
A requirement can now map to **more than one GS1 brick**:
- The detail screen's "Add GS1 Category" opens the shared brick picker
  (`components/portal/gs1-brick-picker.tsx`); already-mapped bricks show as "Added."
- On adding, the brick's standard extended attributes are appended to the Extended group,
  **deduped by GS1 attribute code** (two bricks that share e.g. "Fabric or Material" don't
  double it).
- **Validation:** a requirement ideally covers one category, where *category = the GS1
  `segment`* (Footwear, Clothing, Jewellery, Accessories, Sportswear, Homewear) — not the
  free-text "Product Type" field. If an added brick's segment differs from the
  requirement's established segment (its primary brick's), a **confirmation dialog** warns
  and asks "Add anyway?" — a soft override, not a hard block. Same-segment adds go through
  silently.

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
`searchBricks`. The MCP demo store (`lib/mcp/store.ts`) holds the richer structured
requirement model (baseline core attributes + per-brick extras + image requirements),
exposed via `getProfileDetail(brickCode)`.

- **Requirement tiers:** Core (baseline: GTIN code/description, NRF colour/size, plus
  retailer core extras) · Extended (GS1 standard `extendedAttributes` ∪ retailer custom) ·
  Image (format, background, min dimensions, max file size, crop, guidance).
- **Category vs brick:** a category (segment) contains several bricks; a requirement maps
  to one segment ideally, spanning one or more of its bricks.

## 5. Metric / rule definitions

- **Effective bricks of a profile** = `profile.bricks` if non-empty, else the single
  `{ brickCode, brickName }` (`getProfileBricks`).
- **Extended attribute set of a multi-brick profile** = union of each brick's
  `extendedAttributes`, deduped by `code`.
- **Cross-category flag** fires when `candidateBrick.segment !== primaryBrick.segment`.

## 6. Open questions

- Should multi-brick selection also be allowed at **creation** (Step 2 multi-select), or
  stay detail-screen-only as today?
- When bricks from different segments are mixed intentionally, how should the list's
  "Product Type" / category label read?
- Should the MCP structured store (`getProfileDetail`) be unified with the profile list so
  the authored requirements and the connector's view share one source?
- Vendor exceptions (`screen3-vendor-exceptions.tsx`: waivers, extended deadlines, reduced
  scope) exist in code but are not wired into retailer navigation — in or out of scope?
