# Feature — Compliance Reports (bilateral)

> Feature spec for the Compliance Report capability on both sides of Trading Grid
> Catalogue (TGC). Written to be lifted into a PRD. All data in the prototype is mock,
> watermarked "MOCK DATA FOR ILLUSTRATION ONLY."

## 1. Overview

A **Compliance Report** evaluates a catalogue against exactly one **attribute filter**
and produces a scorecard: overall compliance %, the missing attributes ranked by how
many items lack them, a per-category breakdown, item rows, and a CSV export. The same
capability serves both sides of the network, with opposite intents:

- **Supplier — proactive compliance scanning.** A supplier is *not* restricted to its
  own rules: it can run the report against **any retailer's account attribute filter**.
  Apply Retailer A's filter, get a scorecard of exactly which required fields are missing
  for that customer, fix them, then switch to Retailer B's filter and re-run — isolating
  trading-partner-specific exceptions *before* the retailer ever attempts to pull the
  data.
- **Retailer — defensive compliance scanning.** The retailer runs the report using its
  **own account attribute filters** (its attribute profiles), scanning its vendor base to
  surface gaps before ingestion into downstream BI/PIM systems.
- **System attribute filters** bridge the two: global rule sets (e.g. a GS1 scorecard)
  configured platform-wide. A supplier and a retailer running the same System filter
  evaluate the **exact same rules**, with no duplicated configuration on either side.

## 2. Users

- **Supplier catalogue owner** (persona: J.Renée) — auditing readiness per trading
  partner before publishing.
- **Retailer data steward** (persona: Dillard's) — auditing the vendor base against the
  requirements the retailer authored in Attributes & Images.

## 3. Current behavior (prototype)

Entry points: supplier sidebar **Data Management → Compliance Reports** (previously an
inert legacy item, now wired); retailer top nav / sidebar **Compliance Reports**. Both
render the same shared screen (`components/portal/screen-compliance-reports.tsx`) with
per-persona accent, identity, and request-dialog contents.

1. **Report request** — `report-request-modal.tsx`, a 3-step wizard modeled on the
   Create Requirement wizard. Step 1 keeps the legacy **System Filter / Account Filter**
   radio choice plus a filter dropdown (supplier: the retailer roster; retailer: its own
   profiles + a vendor-scope select; both: the shared System filter list). Step 2 keeps
   the legacy options: **Maximum Attributes to Report** (default 10, **999 = all**),
   **Exclude items updated before** (date), **Ignore discontinued items** (checkbox,
   default on). Step 3 reviews and runs.
2. **Report queue** — a modern take on the legacy queue. Columns: Report · Filter (name
   + System/Account type pill) · Status (Running… → Complete) · Requested by · Requested
   · Duration · CSV. The legacy hover card survives as a click-toggled **parameters
   popover** per row: filter name/type, profile/vendor scope, all options, and the
   generated file name.
3. **Scorecard** — `report-scorecard.tsx`. Header echoes the run parameters ("Run
   against: Belk · Account filter · Max 10 attributes · …") so the context travels with
   the results; stat tiles (overall %, items assessed/complete, open gaps, excluded);
   **Top missing attributes** ranked with bars and a truncation footer ("top N of M");
   per-category table; item rows (products with gaps on the supplier side, vendor rows on
   the retailer side); CSV download (parameters repeated in the CSV header block).

Reports are computed **eagerly from live state** at request time (categorising a product
or creating a profile changes the next run) and revealed after a brief simulated run, so
the queue demonstrates the request → running → complete lifecycle.

## 4. Data model

| Concept | Shape | Where |
|---|---|---|
| System filter | `SystemFilter { id, name, description, scope }` | `lib/system-filters.ts` (`SYSTEM_FILTERS`: GS1 Core Scorecard, GS1 Extended Scorecard, NRF Retail-Ready) |
| Partner roster + account filters | `Partner { id, name, extras }`, `resolveAccountFilterAttributes()` | `lib/partner-filters.ts` (extracted from the compliance screen so the two can't drift) |
| Report request | `ReportRequest { id, side, filter, filterLabel, options, status, fileName, result, … }` | `lib/compliance-report.ts` |
| Report result | `ReportResult { overallPct, itemsAssessed/Complete, totalGaps, excluded, missingAttributes (ranked), distinctMissingTotal, byCategory, rows }` | `lib/compliance-report.ts` |

Report queues are per-persona React state in `app/page.tsx` (`supplierReports` /
`retailerReports`) — reports are session-local, like every other prototype mutation.

## 5. Evaluation rules (deterministic by design)

Both engines are pure functions — no randomness — so an unchanged catalogue always
reproduces the same scorecard, and a re-run after fixing data visibly moves the numbers.

**Supplier engine** (`runSupplierReport`) mirrors the existing compliance math exactly:

- Assessability = `getTargetCompletion`'s rules: categorised products only; for an
  account filter, only products that retailer publishes against. A Dillard's report's
  assessed count therefore always equals the Compliance screen's Dillard's count.
- Gap counts come straight from the product store (retailer entry / `gs1Gaps`).
- Gap → attribute-name allocation reuses the gap-detail screen's slice convention
  (front of the brick's extended pool, overflow to image requirements), with one
  deliberate difference: **account filters put the retailer's extras first** — the
  retailer-specific fields are what a per-retailer scan exists to surface. Counts always
  agree with the drill-down screens; only the surfaced names differ.
- Core-scoped System filters (GS1 Core, NRF) allocate extended gaps first by convention,
  so only unusually deep gap counts leave core gaps: core scorecards read greener than
  extended ones ("core is nearly done; the work is in extended").
- Options: `maxAttributes` truncates the ranked list post-ranking (999 = all);
  `excludeUpdatedBefore` uses a stable per-item pseudo "last updated" date (string hash
  of the id, since the store tracks no timestamps); `ignoreDiscontinued` excludes the
  seed's flagged discontinued products.

**Retailer engine** (`runRetailerReport`) works on the aggregate vendor rows
(`RETAILER_SUPPLIERS`): per-vendor % = complete/total products; each vendor's open gaps
are distributed as evenly as possible across the first *k* attributes of its filter pool,
so ranked frequencies sum exactly to the headline gap total. Scope rules: a specific
profile only covers vendors whose GS1 brick that profile maps; "All active profiles"
excludes vendors covered only by Draft profiles. **Attributes waived by an Active vendor
exception are removed from that vendor's pool** — a waived attribute never appears as a
gap (J.Renée's waived Heel Height, for instance).

## 6. Design intent

- **Why "any retailer's filter" is allowed supplier-side:** the platform's promise is
  proactive correction — a supplier fixing Retailer A's exceptions before A pulls data is
  good for both sides of the network. This mirrors the live TGC behavior.
- **Why System filters exist:** without them, a market-wide standard (the GS1 scorecard)
  would require every account to hand-copy the same filter. One global definition, both
  sides evaluate it — the report footnote says exactly this.
- **Why Compliance Checks stays inert:** in the live product it's per-file validation at
  upload time — a different concept from the on-demand catalogue-wide report. The
  supplier sidebar's job is to mirror the legacy IA faithfully.
- **Parameter provenance at three levels** (inline filter column + type pill; per-row
  parameters popover; scorecard header + CSV header): when a supplier flips between
  Retailer A's and Retailer B's filters, each scorecard must be visibly labeled with
  which rules produced it.

## 7. Conversational access

The retailer connector gains `run_compliance_report` (profile mode, System-filter mode,
optional single-vendor scope, `maxAttributes`) and `list_system_filters`, plus a starter
prompt. The tool is a **stateless read** — computed on demand; the portal UI keeps its
own report queue (browser and serverless store are separate processes; see the README
caveat). Supplier-side MCP remains out of scope.

## 8. Open questions

- Should a completed report be **persistable/shareable** (retailer sends the scorecard to
  the vendor, supplier attaches it to a publication), rather than session-local?
- Should the retailer report drill into **product-level** vendor data once vendor rows
  carry it, replacing the deterministic gap distribution?
- Should **vendor exceptions** also affect the supplier-side view of that retailer's
  filter (today they only affect the retailer engine)?
- Scheduled/recurring reports (the legacy product's queue implies batch scheduling) and
  Subscription Profile integration — pushing a filter's rule set into outbound payloads —
  are out of scope for this prototype.
