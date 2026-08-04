# User Stories — Retailer (hub) side

> Expanded user stories for the **retailer** surface of Trading Grid Catalogue (TGC).
> Companion file: `user-stories-supplier.md`. All data in the prototype is mock,
> watermarked "MOCK DATA FOR ILLUSTRATION ONLY."

## How to read this file

- **Source of truth** is the prototype itself, not a prior description of it: the
  `RetailerScreen` enum in `app/page.tsx`, the `components/portal/screen-*.tsx`
  components, the shared tool layer `lib/mcp/tools.ts`, the copilot tools in
  `lib/copilot/tools.ts`, and the connector plumbing in `app/api/[transport]/route.ts`
  + `lib/mcp/*`. Background specs: `feature-retailer-requirements.md`,
  `feature-compliance-reports.md`, `mcp-enterprise-auth-trd.md`.
- **Personas** are drawn from the fixed TGC persona list. The retailer side uses
  *retailer category manager* (authors requirements, monitors vendors) and
  *retailer hub administrator* (configuration, access, audit).
- **Task-hints** are limited to **UI** — and **AI** on the criteria where LLM output
  is actually consumed by application code. Fetch / State / Persist lines are
  deliberately omitted from this set.
- **Anti-criteria** state what must *not* happen. They are as binding as the
  acceptance criteria.

Stories appear in screen order: Dashboard → Attributes & Images → Profile Detail →
Image Requirements → Vendor Exceptions → Compliance Reports → Compliance Agent →
MCP connector.

---

## Screen / flow inventory

| Screen / surface | Component | Stories |
|---|---|---|
| Compliance Dashboard | `screen-compliance-dashboard.tsx` | RET-01 – RET-03 |
| Attributes & Images (profile list) | `screen1-attribute-profiles.tsx` | RET-04 – RET-06, RET-10 |
| Profile Detail | `screen2-profile-detail.tsx` | RET-07 – RET-10 |
| Image Requirements (shared) | `screen-image-requirements.tsx` | RET-11 |
| Vendor Exceptions (routable, not in nav) | `screen3-vendor-exceptions.tsx` | RET-12 |
| Compliance Reports | `screen-compliance-reports.tsx`, `report-request-modal.tsx`, `report-scorecard.tsx` | RET-13 – RET-15 |
| Compliance Agent panel | `compliance-agent-panel.tsx`, `lib/copilot/*` | RET-16 – RET-18 |
| AI Assistant Access + connector | `screen-ai-access.tsx`, `lib/mcp/*` | RET-19 – RET-23 |
| Connector-only tools | `lib/mcp/tools.ts` | RET-24 – RET-27 |

---

# Compliance Dashboard

---

**Screen / Flow:** Compliance Dashboard
**Story ID:** RET-01

**User story**
As a retailer category manager, I want a dashboard summarising overall compliance,
open gaps, suppliers tracked and categories covered, so that I can see the state of
my vendor base without configuring and running a report.

**Acceptance criteria**

- Given I open the Compliance Dashboard, when it loads, then a KPI strip shows four
  tiles: overall compliance %, open gaps, suppliers tracked, and categories covered.
  - UI: four tiles in one row; each renders a headline figure and a secondary line
    ("across N suppliers", "N meet the 80% threshold", "N below 60%").

- Given the dashboard is computed from all Active attribute profiles across all
  vendors, when I read the overall compliance %, then it equals the figure a
  Compliance Report run with the same scope produces.
  - UI: figure rendered once, from a single computed result; no separately
    maintained dashboard number.

- Given some profiles are still in Draft, when the dashboard computes, then vendors
  covered only by Draft profiles are excluded from the assessed population.
  - UI: no Draft-only vendor appears in any dashboard table or count.

- Given the dashboard is a snapshot, when I read it, then a snapshot date and a
  mock-data caveat are displayed.
  - UI: caption beneath the KPI strip carrying the snapshot date and the standard
    "MOCK DATA FOR ILLUSTRATION ONLY" watermark line.

- Given the dashboard is a read-only overview, when I look for controls, then there
  are no filters, no export and no editable fields on the screen.
  - UI: no filter row, no download button, no inputs rendered.

**Anti-criteria**

- Given the dashboard is open, when it renders, then a baseline core attribute
  (Product ID, Product Description, GTIN code, GTIN Description, NRF Size Code,
  NRF Color Code, Size Description, Color Description) must NOT appear as an open gap.
- Given a vendor is covered only by a Draft profile, when the dashboard computes
  compliance, then that vendor must NOT be counted in "suppliers tracked".

---

**Screen / Flow:** Compliance Dashboard → Supplier Performance
**Story ID:** RET-02

**User story**
As a retailer category manager, I want each supplier row to show a six-month trend
alongside its current compliance band, so that I can tell a chronically weak vendor
from one that is actively deteriorating.

**Acceptance criteria**

- Given the Supplier Performance table renders, when I read a row, then it shows
  supplier, category, a colour-banded compliance pill, open gaps, a six-month
  sparkline and a trend badge.
  - UI: pill bands at ≥80% (green), ≥60% (amber), below 60% (red); trend badge reads
    ▲ / ▼ / Stable with a delta percentage.

- Given a supplier's compliance is below 60%, when its row renders, then a warning
  triangle is shown against that row.
  - UI: red warning triangle rendered inline with the compliance pill.

- Given trend history is reconstructed rather than captured, when I read a sparkline,
  then the most recent point equals the supplier's current live compliance figure.
  - UI: sparkline's final point aligns with the pill value on the same row.

- Given trend data is reconstructed, when the trend is displayed anywhere, then its
  provenance is stated to the reader.
  - UI: a "reconstructed" note travels with the trend column, not only in the
    underlying data.

- Given two suppliers have the same current compliance %, when their trends differ,
  then their trend badges differ accordingly.
  - UI: badge is derived from the six-month series, never from the current figure.

**Anti-criteria**

- Given trend history is reconstructed by re-scoring rolled-back catalogue states,
  when a sparkline is shown, then it must NOT be presented as captured historical
  measurement.
- Given a supplier has no assessable products, when its row renders, then a trend
  badge implying movement must NOT be shown.

---

**Screen / Flow:** Compliance Dashboard → Most Frequently Missing Attributes
**Story ID:** RET-03

**User story**
As a retailer category manager, I want the attributes most often missing across my
whole vendor base ranked in one place, so that I can tell a requirement-clarity
problem from N separate vendor problems.

**Acceptance criteria**

- Given gaps exist across the vendor base, when the panel renders, then the top eight
  missing attributes are shown as a ranked bar list with a supplier count each.
  - UI: horizontal bars sorted descending; each row labelled "N suppliers".

- Given more distinct attributes have gaps than are shown, when the panel renders,
  then a truncation line states how many of how many are displayed.
  - UI: footer reading "Top N of M distinct attributes with gaps".

- Given the Compliance by Category panel renders, when I read it, then categories are
  sorted worst-first with complete/total counts alongside each bar.
  - UI: horizontal bars, worst readiness at the top.

- Given no gaps exist anywhere in the vendor base, when the panel renders, then an
  empty state is shown rather than an empty chart frame.
  - UI: explanatory empty state replaces the bar list.

**Anti-criteria**

- Given a baseline core attribute is always populated by construction, when the
  ranked list renders, then it must NOT appear in the list.
- Given the list is truncated at eight, when I read the headline gap total, then the
  bars' sum must NOT be presented as the total number of open gaps.

---

# Attributes & Images Requirements

---

**Screen / Flow:** Attributes & Images — profile list
**Story ID:** RET-04

**User story**
As a retailer category manager, I want a list of my attribute profiles showing GPC
classification, requirement counts and status, so that I always know what I am
currently asking suppliers for.

**Acceptance criteria**

- Given profiles exist, when the list renders, then each row shows Category (as a
  link), GPC Classification, Requirements summary, Status, Last Updated and Actions.
  - UI: Category cell is a link into Profile Detail; Status renders as an
    Active/Draft pill.

- Given a profile maps to more than one GS1 brick, when its row renders, then the
  GPC Classification cell shows the primary brick's name and code plus a "+N more"
  chip.
  - UI: chip label counts the non-primary mapped bricks only.

- Given a profile's requirements span attributes and images, when its row renders,
  then the Requirements cell summarises both (e.g. "30 attributes · 1 image
  requirement").
  - UI: single summary string; counts sum every mapped brick's own rows without
    deduplicating across bricks.

- Given Active and Draft mean different things to suppliers, when the list renders,
  then a callout states that Active profiles are visible to suppliers and Draft
  profiles are not.
  - UI: informational callout above the table.

- Given the free-text Category / Product Type field is independent of brick mapping,
  when a profile maps bricks from a segment unrelated to its typed name, then the
  Category column still shows exactly what the retailer typed.
  - UI: Category cell never derives its label from a brick name.

**Anti-criteria**

- Given a profile is in Draft, when a supplier views their requirements, then that
  profile's attributes must NOT appear to them.
- Given a profile maps several bricks, when the Requirements count is computed, then
  attributes shared by two bricks must NOT be silently deduplicated into one count.

---

**Screen / Flow:** Attributes & Images — Create New Requirement (3-step wizard)
**Story ID:** RET-05

**User story**
As a retailer category manager, I want to name a requirement, select the GS1
categories it covers, and preview the standard attributes it will inherit, so that I
can author a category requirement without hand-listing the GS1 standard.

**Acceptance criteria**

- Given I open Create New Requirement, when Step 1 renders, then I can enter a
  free-text internal category name and choose an initial status of Draft or Active.
  - UI: text input plus a two-option radio; Next disabled until a name is entered.

- Given I am on Step 2, when I search the GS1 brick picker, then I can filter by
  name or 8-digit code and by segment, and select more than one brick.
  - UI: shared `gs1-brick-picker` in multi-select mode; each row shows brick name,
    code and "N standard attributes".

- Given I do not want to map a brick yet, when I am on Step 2, then I can skip brick
  selection and add attributes manually instead.
  - UI: explicit "Skip — add attributes manually" action alongside the picker.

- Given I have selected two or more bricks, when Step 3 renders, then one preview
  card per brick lists every standard attribute that brick will pre-load, with
  nothing merged across cards.
  - UI: one card per selected brick; Standard/Custom pills explained inline.

- Given a previewed standard attribute is not something I require, when I delete it
  in Step 3, then a confirmation states that values already submitted are kept.
  - UI: confirm modal before the row is removed from the preview.

- Given I want a requirement the GS1 standard does not carry, when I add an attribute
  in Step 3, then I choose from the segment's TGC attribute pool and may attach
  supplier guidance.
  - UI: searchable picker over real TGC attribute names; guidance is an optional
    free-text field.

- Given I abandon the wizard part-way, when I close it and reopen Create New
  Requirement, then the wizard starts again at Step 1 with no partial profile
  created.
  - UI: no draft row appears in the profile list for an abandoned wizard.

- Given I complete Step 3, when I click through to create, then the profile is
  created and I land on its Profile Detail screen.
  - UI: success toast, then navigation into the new profile.

**Anti-criteria**

- Given I abandon the wizard before the final step, when I return to the profile
  list, then a partially configured profile must NOT have been created.
- Given a brick's standard attributes are derived from the GS1 library, when I delete
  one in the preview, then the underlying GS1 library definition must NOT be altered.

---

**Screen / Flow:** GS1 brick picker — cross-category confirmation
**Story ID:** RET-06

**User story**
As a retailer category manager, I want to be warned when I map a brick from a
different GS1 segment than the requirement's established one, so that a requirement
spans categories because I chose it to, not by accident.

**Acceptance criteria**

- Given a requirement's established segment is set by its primary brick, when I add a
  brick from a different segment, then a confirmation dialog asks me to confirm
  before the brick is mapped.
  - UI: `confirm-mixed-category-modal` reading "Different category — requirements
    usually cover a single category. Add it anyway?"

- Given I confirm the dialog, when it closes, then the brick is mapped and the
  requirement now spans two segments.
  - UI: the new brick appears in the GS1 Category Mapping card with its own segment
    badge.

- Given I cancel the dialog, when it closes, then no brick is mapped and the
  requirement is unchanged.
  - UI: picker remains open with the candidate brick unselected.

- Given the brick I add is in the same segment as the requirement's established one,
  when I add it, then no confirmation is shown.
  - UI: brick is mapped silently.

- Given the same guard applies in both authoring paths, when I add a cross-segment
  brick from the creation wizard or from Profile Detail, then the identical dialog
  and identical wording appear.
  - UI: one shared modal component used by both surfaces.

**Anti-criteria**

- Given the cross-category rule is advisory, when I confirm the dialog, then the
  system must NOT block the mapping.
- Given the requirement's established segment comes from its primary brick, when the
  guard evaluates, then it must NOT compare against the free-text Category / Product
  Type field.

---

# Profile Detail

---

**Screen / Flow:** Profile Detail — attribute authoring
**Story ID:** RET-07

**User story**
As a retailer category manager, I want to add, edit and remove core and extended
attributes with my own label and a supplier guidance note, so that suppliers know
exactly what value to send for each GS1 field.

**Acceptance criteria**

- Given a profile is open, when the Core and Extended groups render, then each
  attribute row shows my retailer label, the read-only TGC/GS1 attribute name, and
  the supplier guidance note.
  - UI: three-column tables; GS1 name rendered non-editable; Extended rows also carry
    a Standard/Custom source pill.

- Given I add an extended attribute, when I open the picker, then I may only choose
  from the segment's real TGC attribute names, excluding ones already on the profile.
  - UI: searchable dropdown; the attribute name cannot be free-typed, only the
    guidance note can.

- Given I add a core attribute, when I complete the form, then it is added as a
  custom core row on the currently selected brick.
  - UI: free-text name field for core rows; row renders with a Custom pill.

- Given a row is inherited from the GS1 standard, when I edit its label or guidance,
  then the change is recorded as an override rather than as a new stored row.
  - UI: row keeps its Standard pill after editing; the GS1 name stays locked.

- Given I delete an attribute row, when I confirm, then it is removed from that
  brick's requirement set only.
  - UI: confirm modal before removal; other mapped bricks' tables are unchanged.

- Given the GS1 code is what ties a requirement to submitted data, when the tables
  render, then a footnote states that the GS1 code carries the mapping regardless of
  the label I use.
  - UI: footnote beneath the attribute tables.

**Anti-criteria**

- Given standard rows are derived from the GS1 brick rather than stored, when I edit
  one, then a duplicate copy of that row must NOT be written into the profile.
- Given attributes are brick-scoped, when I add or delete an attribute, then the
  other bricks mapped to the same profile must NOT be affected.
- Given the GS1 attribute name is the join key, when I edit a row, then the GS1 name
  must NOT become editable.

---

**Screen / Flow:** Profile Detail — image requirements
**Story ID:** RET-08

**User story**
As a retailer category manager, I want to define image specifications on a category,
so that suppliers know the shot specs before they submit rather than after a
rejection.

**Acceptance criteria**

- Given a profile is open, when the Image Requirements group renders, then each row
  shows requirement name, format, background, minimum dimensions, maximum file size,
  shape/crop and guidance.
  - UI: seven-column table; rows inherited from the shared set carry a "Shared" badge.

- Given I add or edit an image requirement, when the form opens, then all seven
  fields are editable and the requirement is scoped to the currently selected brick.
  - UI: single form used by both add and edit so the two cannot drift.

- Given I edit a row that carries the Shared badge, when I save, then the change
  applies to this category only and the shared definition is untouched.
  - UI: row keeps its Shared badge and now reflects the category's own values.

- Given TGC checks presence rather than content, when the group renders, then a
  footnote states that TGC confirms an image was provided but does not verify image
  content, dimensions or format.
  - UI: footnote beneath the image table.

- Given a profile maps several bricks, when I switch the selected brick, then the
  Image Requirements group shows that brick's own rows.
  - UI: table re-renders scoped to the selected brick.

**Anti-criteria**

- Given the footnote states TGC does not verify image content, when a supplier
  provides an image, then the system must NOT report it as validated against the
  stated dimensions or format.
- Given I override a shared image requirement for one category, when the override is
  saved, then the shared definition used by other categories must NOT change.

---

**Screen / Flow:** Profile Detail — GPC classification mapping
**Story ID:** RET-09

**User story**
As a retailer category manager, I want to map additional GS1 categories to an
existing requirement and switch which one I am editing, so that one requirement can
cover several bricks without their attribute sets being merged.

**Acceptance criteria**

- Given a profile maps more than one brick, when Profile Detail renders, then a
  searchable brick selector scoped to that profile's own bricks is shown.
  - UI: `profile-brick-selector`; no dropdown chrome at all on a single-brick profile.

- Given I switch the selected brick, when the screen re-renders, then the Core,
  Extended and Image groups show that brick's rows only.
  - UI: all three groups re-scope together; no merged or deduplicated view exists.

- Given I click Add GPC Classification, when the picker opens, then bricks already
  mapped to this profile render as disabled and labelled "Added".
  - UI: shared brick picker in single-select mode.

- Given a GS1 category may belong to at most one profile, when I try to map a brick
  another profile already claims, then the mapping is refused and the still-free
  categories are named.
  - UI: refusal message lists available categories rather than failing silently.

- Given the right rail summarises the profile, when it renders, then it lists every
  mapped classification with its code, the Core/Extended/Image counts, and a supplier
  visibility statement.
  - UI: counts suffixed "(this category)" when the profile maps more than one brick.

**Anti-criteria**

- Given attributes are defined at brick level, when a profile maps several bricks,
  then their attribute sets must NOT be merged, deduplicated or presented as one
  combined list.
- Given every GS1 category belongs to at most one profile, when I map a claimed
  brick, then it must NOT be silently reassigned away from the profile that holds it.

---

**Screen / Flow:** Profile list / Profile Detail — lifecycle
**Story ID:** RET-10

**User story**
As a retailer category manager, I want to rename a requirement and activate or
deactivate it behind a confirmation that states the consequence, so that I control
exactly when suppliers start being measured against it.

**Acceptance criteria**

- Given a profile is open, when I click the inline rename control, then I can edit
  the internal category name and save it.
  - UI: pencil affordance beside the title, turning it into an editable field.

- Given a Draft profile, when I activate it, then a confirmation states that
  suppliers will now see it, and on confirm the status pill changes to Active.
  - UI: confirm modal; success toast; pill updates in both the detail screen and the
    list.

- Given an Active profile, when I deactivate it, then the confirmation states that
  suppliers will no longer see it and that no data will be deleted.
  - UI: confirm modal with that exact consequence wording.

- Given I deactivate from Profile Detail, when the change is applied, then I am
  returned to the profile list.
  - UI: navigation back to the list with the updated status visible.

- Given activation changes what is measured, when a report is next run after
  activating a profile, then previously unmeasured gaps appear in the results.
  - UI: no separate warning is required beyond the activation confirmation copy.

**Anti-criteria**

- Given deactivation only changes visibility, when I deactivate a profile, then its
  attributes, image requirements, overrides or exclusions must NOT be deleted.
- Given renaming is a label change, when I rename a profile, then its GS1 brick
  mapping must NOT change.

---

# Image Requirements (shared)

---

**Screen / Flow:** Image Requirements — shared specifications
**Story ID:** RET-11

**User story**
As a retailer hub administrator, I want image specifications defined once and applied
to every category, so that a house-wide shot standard is stated in one place rather
than copied into every profile.

**Acceptance criteria**

- Given shared image requirements exist, when the screen renders, then they are shown
  in the same table format used on Profile Detail.
  - UI: shared `ImageRequirementsTable` component; dedicated empty state when none
    exist.

- Given I add a shared image requirement, when I save it, then it becomes required in
  every category and renders on each profile with a "Shared" badge.
  - UI: same seven-field form as the per-category one.

- Given a category has customised a shared requirement for itself, when I edit the
  shared definition, then that category keeps its own override.
  - UI: per-category deviation is stored as an override, never as a copy.

- Given I remove a shared image requirement, when the confirmation opens, then it
  states that the requirement will no longer be required in any category, including
  categories that customised it, and that custom category-only image requirements are
  unaffected.
  - UI: confirm modal carrying that exact wording; toast on completion.

- Given a category excluded a shared requirement for itself, when the shared list
  renders, then the shared definition still appears here as active.
  - UI: exclusions are recorded per profile, not reflected back into this list.

**Anti-criteria**

- Given a category holds a custom, category-only image requirement, when I remove a
  shared requirement, then that custom requirement must NOT be removed.
- Given per-category deviations are modelled as overrides, when a shared requirement
  is edited, then a per-category copy must NOT be created.

---

# Vendor Exceptions

---

**Screen / Flow:** Vendor-Level Attribute Exceptions (read-only)
**Story ID:** RET-12

**User story**
As a retailer category manager, I want each vendor exception to show its computed
effect, so that I can see which waivers genuinely reduce reported gaps and which only
change which attribute gets named.

**Acceptance criteria**

- Given exceptions are on file, when the table renders, then each row shows vendor,
  category (profile name plus brick name and code), type, affected attribute chips,
  valid-until date, status and effect.
  - UI: type pill reads Attribute Waiver, Extended Deadline or Reduced Scope; status
    pill reads Active or Expired.

- Given an Active Attribute Waiver is scoped to a category the vendor really
  supplies, when its effect is computed, then it reads that reported gaps are reduced
  by a stated number.
  - UI: effect cell renders "Reduces reported gaps by N".

- Given an exception is an Extended Deadline or Reduced Scope, when its effect is
  computed, then it reads that blame is re-ranked but gap counts are not reduced.
  - UI: effect cell renders "Re-ranks blame only — does not reduce gap counts".

- Given an exception has no effect, when its effect is computed, then the reason is
  stated: expired, not scoped to a category this vendor supplies, no matching
  attributes in that category, or the vendor has no open gaps there.
  - UI: effect cell renders the specific reason, never a bare "none".

- Given the effect column and the report engine must agree, when an effect is
  computed, then it uses the same matcher the compliance report uses.
  - UI: a single shared `describeExceptionEffect` result drives the cell.

- Given many exceptions exist, when I search by vendor, category or attribute, then
  the table filters and a counter shows how many of how many are displayed.
  - UI: single free-text search input plus an "N of M exceptions" counter.

- Given this screen is read-only, when I look for authoring controls, then a footnote
  names the connector tool used to change an exception instead.
  - UI: no create, edit or revoke control on the screen.

**Anti-criteria**

- Given the effect column and the report engine share a matcher, when a report is
  run, then a waiver described here as reducing gaps must NOT leave those gaps
  counted in the report.
- Given the screen is read-only by design, when I interact with any row, then it must
  NOT be possible to grant, amend or revoke an exception from this screen.

---

# Compliance Reports

---

**Screen / Flow:** Compliance Reports — request wizard
**Story ID:** RET-13

**User story**
As a retailer category manager, I want to scan my vendor base against my own
attribute profiles or a global System filter, so that I surface gaps before the data
is ingested into downstream BI and PIM systems.

**Acceptance criteria**

- Given I open Request Report, when Step 1 renders, then I choose between an Account
  Filter (my own profiles) and a System Filter (a global standard).
  - UI: two-option radio; the selection swaps which dropdown is shown beneath it.

- Given I choose Account Filter, when the dropdown opens, then I can select all
  active profiles or one named Active profile.
  - UI: Draft profiles are not offered as a report scope.

- Given I choose System Filter, when the dropdown opens, then GS1 Core Scorecard, GS1
  Extended Scorecard and NRF Retail-Ready are offered with descriptions.
  - UI: each option renders its description inline.

- Given I want to scan one vendor, when I set vendor scope in Step 1, then I can
  choose all vendors or a single named vendor.
  - UI: separate vendor-scope select beneath the filter choice.

- Given I am on Step 2, when the options render, then I can set maximum attributes to
  report, an "exclude items updated before" date, and whether to ignore discontinued
  items.
  - UI: 999 in the maximum-attributes field means "all"; ignore-discontinued defaults
    to on.

- Given I am on Step 3, when the review renders, then every chosen parameter is
  restated before I run the report.
  - UI: parameter recap list, then a Run Report action; toast on queueing.

- Given the same catalogue state, when I run the same report twice, then both runs
  produce identical results.
  - UI: no randomised element anywhere in the displayed scorecard.

- Given I close the wizard part-way, when I reopen it, then it starts at Step 1 and
  no report was queued.
  - UI: queue unchanged after an abandoned wizard.

**Anti-criteria**

- Given a profile is in Draft, when I choose "all active profiles", then vendors
  covered only by that Draft profile must NOT be assessed.
- Given the report engine is deterministic, when an unchanged catalogue is re-scanned,
  then the scorecard must NOT differ between runs.

---

**Screen / Flow:** Compliance Reports — queue
**Story ID:** RET-14

**User story**
As a retailer category manager, I want the report queue to carry each run's
parameters and its export, so that two scorecards produced under different rules can
never be mistaken for each other.

**Acceptance criteria**

- Given reports have been requested, when the queue renders, then each row shows
  report ID, filter label with a System/Account type pill, status, requester,
  requested time, duration and a CSV download.
  - UI: report ID becomes clickable only once the row reads Complete.

- Given a report is still running, when its row renders, then the status pill shows
  an in-progress state and resolves to Complete when the run finishes.
  - UI: animated "Running…" pill, then a static Complete pill.

- Given I need to know exactly how a report was run, when I open its parameters
  popover, then it shows filter name and type, attribute profile, vendor scope,
  maximum attributes, exclude-before date, ignore-discontinued and the generated file
  name.
  - UI: click-toggled popover anchored to an info button in the Filter cell.

- Given no reports have been requested yet, when the queue renders, then an empty
  state with its own call to action is shown.
  - UI: empty state replaces the table, not an empty table body.

- Given I download a report's CSV, when the file is produced, then the run parameters
  are repeated in its header block.
  - UI: download action available directly from the queue row.

**Anti-criteria**

- Given a report is still running, when I click its row, then a partial or empty
  scorecard must NOT be opened.
- Given a scorecard is displayed or exported, when I read it, then it must NOT appear
  without the parameters that produced it.

---

**Screen / Flow:** Compliance Reports — scorecard
**Story ID:** RET-15

**User story**
As a retailer category manager, I want a scorecard that ranks what is missing and
breaks it down by category and vendor, so that one scan turns into a prioritised
remediation list.

**Acceptance criteria**

- Given I open a completed report, when the header renders, then it shows the filter
  label, type pill, the full run parameters, the requester and timestamp, and a CSV
  download.
  - UI: parameters rendered as a single readable line, e.g. "Run against: X · Account
    filter · Vendor: Y · Max 10 attributes · discontinued excluded".

- Given the summary band renders, when I read it, then it shows overall compliance %
  with a bar, items assessed and complete, open gaps, and items excluded.
  - UI: excluded tile breaks down into uncategorised, discontinued and
    before-cutoff counts.

- Given attributes are ranked by how many items lack them, when the list renders and
  is truncated, then a note names the maximum-attributes setting that truncated it.
  - UI: ranked bar list plus a truncation footer.

- Given the per-category table renders, when I read a row, then it shows category,
  items, complete, % complete with a bar, and gaps.
  - UI: sortable-looking table matching the dashboard's category presentation.

- Given the per-vendor table renders, when I read a row, then it shows supplier,
  category, products, complete, open gaps and % complete.
  - UI: vendor rows are the retailer-side equivalent of the supplier's product rows.

- Given an Active vendor exception waives an attribute, when the report is run
  against an account filter, then that attribute is absent from the vendor's gaps and
  a footnote states so.
  - UI: footnote reading that attributes waived by an active vendor exception are not
    counted as gaps.

- Given I fix data and re-run the same report, when the new scorecard renders, then
  the figures move accordingly.
  - UI: reports are computed from live state at request time.

**Anti-criteria**

- Given an attribute is waived for a vendor by an Active exception, when that vendor's
  row renders, then the waived attribute must NOT be counted as one of its open gaps.
- Given the ranked attribute list is truncated, when I read the headline gap total,
  then the truncated list's sum must NOT be presented as the total.

---

# Compliance Agent (in-portal chat)

---

**Screen / Flow:** Compliance Agent panel — reading
**Story ID:** RET-16

**User story**
As a retailer category manager, I want to ask a docked chat agent about my profiles,
suppliers and reports and get answers that cite where they came from, so that I can
get an answer without first learning the navigation.

**Acceptance criteria**

- Given the AI toggle is on, when the panel mounts, then it docks beside the portal
  and the rest of the application stays interactive.
  - UI: non-blocking right-hand aside, collapsible to a floating pill; off by default.

- Given I have not sent a message yet, when the panel renders, then starter prompts
  are offered and disappear once the conversation begins.
  - UI: three starter prompts shown only before the first message.

- Given I ask a question the agent has read tools for, when it answers, then the
  answer names the portal screens the answer came from.
  - AI: the agent produces the natural-language answer; the source list is derived
    deterministically from which read tools actually fired — application code must NOT
    let the model author or edit the citation list.
  - UI: sources rendered as a distinct block beneath the answer.

- Given I ask something outside the retailer scope, when the agent responds, then it
  states what it cannot do rather than inventing an answer.
  - AI: the agent's stated limits come from `get_capabilities`; application code must
    NOT substitute a fallback answer for a refusal.
  - UI: refusal rendered as an ordinary message.

- Given a conversation is running, when the agent works through a question, then its
  tool-calling is bounded rather than open-ended.
  - AI: the agent loop is capped at a fixed number of steps; application code must NOT
    allow an unbounded loop to continue on a stalled answer.
  - UI: panel shows a working indicator while steps run.

- Given I prefer an external assistant, when I read the panel header, then a link
  points me to connecting via MCP instead.
  - UI: header link reading "Prefer Claude.ai or ChatGPT? Connect via MCP →".

**Anti-criteria**

- Given the eight baseline core attributes are always populated by construction, when
  the agent answers a compliance question, then it must NOT report any of them as a gap.
- Given source citations are derived from tool calls, when an answer is rendered, then
  a screen the agent did not actually read must NOT be cited.
- Given the connection is scoped to this tenant, when I ask about another retailer's
  data, then the agent must NOT return it.

---

**Screen / Flow:** Compliance Agent panel — propose and confirm
**Story ID:** RET-17

**User story**
As a retailer category manager, I want every change the agent suggests rendered as a
confirm card I have to apply, so that no requirement changes because a model decided
it should.

**Acceptance criteria**

- Given the agent calls a write tool, when the tool returns, then it produces a
  proposal describing the change and its consequence, and nothing has been mutated.
  - AI: the agent chooses the tool and arguments; the tool validates and returns a
    proposal — application code must NOT treat a returned proposal as an applied change.
  - UI: proposal rendered as a card with summary, arguments and a consequence line.

- Given a proposal is additive, when its card renders, then it is styled distinctly
  from a destructive one.
  - UI: amber card for additive changes; red card with a shield icon for destructive
    ones.

- Given a card is shown, when I click Apply, then the change is made through the same
  functions the profile screens use and the card resolves to an applied state.
  - UI: card resolves to "✓ Applied" with a result note.

- Given a card is shown, when I click Cancel, then nothing changes and the card
  resolves to a cancelled state.
  - UI: card resolves to "Cancelled"; no toast implying a change.

- Given applying a change fails, when the error returns, then the card shows the error
  rather than a success state.
  - UI: card resolves to an error state carrying the message.

- Given a change has real consequences, when the card renders, then the consequence
  line is always shown, including where the consequence is that compliance improves
  without any supplier supplying anything.
  - AI: consequence text is authored by the tool layer, not the model — application
    code must NOT render a model-generated consequence string.
  - UI: consequence line is not collapsible or hidden behind a disclosure.

- Given the agent has a narrower surface than the connector, when I ask it to grant a
  vendor exception, simulate a requirement change, or read the access log, then it
  states that it cannot and points at the connector.
  - UI: refusal message rather than a proposal card.

**Anti-criteria**

- Given a proposal card is on screen, when I have not clicked Apply, then the
  underlying data must NOT have changed.
- Given the agent's write tools are proposal-only, when a write tool executes, then it
  must NOT mutate anything server-side.
- Given the consequence line explains the real effect, when a card renders, then it
  must NOT be omitted for brevity on any write proposal.

---

**Screen / Flow:** Compliance Agent panel — destructive confirmation
**Story ID:** RET-18

**User story**
As a retailer category manager, I want deleting a profile through the agent to
require me to retype its exact name, so that the one action that removes every rule
beneath a category cannot be a single misplaced click.

**Acceptance criteria**

- Given the agent proposes deleting a profile, when the card renders, then it is
  styled destructive and requires me to type the exact profile name.
  - UI: red card with shield icon plus a text input showing the expected name.

- Given the typed name does not match, when I look at the Apply control, then it is
  disabled.
  - UI: Apply disabled until the input matches exactly.

- Given the typed name matches, when I click Apply, then the match is re-verified
  before the deletion runs.
  - UI: verification happens in the apply handler, not only via the disabled state.

- Given a deletion is applied, when it completes, then the card states what was
  removed, including the rules beneath the profile.
  - UI: result note names the profile and its removed requirement set.

- Given I cancel a destructive card, when it resolves, then the profile and every rule
  beneath it are untouched.
  - UI: card resolves to Cancelled.

**Anti-criteria**

- Given the confirm-text gate exists, when the Apply control is enabled by any means
  other than a matching input, then the deletion must NOT proceed.
- Given deletion removes every rule beneath a profile, when it is proposed, then it
  must NOT be presented on an additive-styled card.

---

# AI Assistant Access and the MCP connector

---

**Screen / Flow:** AI Assistant Access — Connect tab
**Story ID:** RET-19

**User story**
As a retailer hub administrator, I want to connect an external AI assistant by
pasting one URL and signing in with my work account, so that my team can query the
catalogue conversationally with no key handling and no tenant selection.

**Acceptance criteria**

- Given I open the Connect tab, when it renders, then a single endpoint URL is shown
  with a copy control and step-by-step client instructions.
  - UI: one "Copy URL" button; instructions cover Claude.ai, Claude Desktop and
    ChatGPT developer mode.

- Given I add the connector in a client, when the client first calls the endpoint,
  then discovery completes without me configuring an API key or any credential.
  - UI: instructions state that there is nothing to configure beyond signing in.

- Given I sign in on the consent screen, when my organisation is determined, then it
  is derived from my email realm and I am never asked to pick a tenant.
  - UI: no tenant selector rendered anywhere in the flow.

- Given the tab shows what is available, when I switch between the two views, then I
  see everything I can consent to, and separately what a read-only connection sees.
  - UI: the read-only view is filtered by exactly the same rule the server uses; the
    caption explains that unpermitted tools are absent from the tool list, not
    disabled within it.

- Given the same endpoint serves both sides of the network, when I read the Connect
  tab, then supplier-side tools are shown greyed as not available to me.
  - UI: a third table labelled as retailer-unavailable.

- Given the tool list must reflect reality, when the Connect tab renders the retailer
  tool table, then it matches the connector's manifest.
  - UI: table is generated from the manifest rather than maintained by hand.

**Anti-criteria**

- Given the organisation is resolved from the authenticated identity, when a client
  asserts a tenant, then the server must NOT accept the asserted value.
- Given I am connected as a retailer tenant, when I call a supplier-side tool, then it
  must NOT be served.

> **Known drift to fix as part of this story:** the hand-maintained retailer tool
> table in `components/portal/screen-ai-access.tsx` omits `get_compliance_trend` and
> `diagnose_gap_pattern`, both live in `lib/mcp/manifest.ts`. The manifest is the
> source of truth.

---

**Screen / Flow:** OAuth consent — scopes
**Story ID:** RET-20

**User story**
As a retailer hub administrator, I want to grant scopes individually at consent, so
that a connection cannot quietly acquire the authorities that change compliance
numbers.

**Acceptance criteria**

- Given I reach the consent screen, when the scope list renders, then each scope is
  described in plain language rather than by its identifier alone.
  - UI: reading, authoring, exceptions, activation and removal each carry a
    one-line explanation of what it permits.

- Given reading and authoring are the ordinary case, when the consent screen renders,
  then those scopes are pre-ticked.
  - UI: read and requirements-write checkboxes default to ticked.

- Given activation and removal change enforcement and delete rules, when the consent
  screen renders, then they are never pre-ticked regardless of what the client
  requested.
  - UI: both checkboxes render unticked even when the client's request asked for them.

- Given I untick every scope, when I consent, then the connection falls back to
  read-only rather than to the consent defaults.
  - UI: resulting connection exposes only read tools.

- Given removal sits on top of a write authority, when I grant it, then it applies in
  addition to the relevant write scope rather than replacing it.
  - UI: consent copy states the dependency.

- Given a caller lacks a scope, when they ask for an action that needs it, then the
  server tells them which scope is missing.
  - UI: server-supplied instructions direct the assistant to name the missing scope.

**Anti-criteria**

- Given a client requests every scope a resource advertises, when the consent screen
  renders, then activation and removal must NOT be pre-ticked.
- Given a connection holds only read scope, when it lists tools, then write tools must
  NOT appear in the list.

---

**Screen / Flow:** MCP connector — two-phase confirmation
**Story ID:** RET-21

**User story**
As a retailer hub administrator, I want no mutating connector tool to act on its first
call, so that an external client with no user interface of ours still puts the change
in front of a human before it happens.

**Acceptance criteria**

- Given a mutating tool is called, when it runs the first time, then it returns a
  preview of the change and its effects instead of reaching its handler.
  - UI: response carries a confirmation-required status, a summary, effect bullets, a
    destructive flag, a token, an expiry and a next-step instruction.
  - AI: the assistant relays the preview to the user; application code must NOT let
    the assistant redeem the token without an explicit human approval turn.

- Given a change is impossible or would be a no-op, when the preview runs, then it
  refuses outright and no token is issued.
  - UI: refusal response with the reason (profile does not exist, nothing to change,
    the named attribute matches nothing).

- Given I approve a previewed change, when the confirm tool is called with the token,
  then the change is applied.
  - UI: separate confirm tool is the only path that reaches a mutating handler.

- Given a token has already been redeemed, when it is presented again, then it is
  refused.
  - UI: single-use enforcement, independent of expiry.

- Given a token has aged past its window, when it is presented, then it is refused as
  expired.
  - UI: short fixed lifetime, stated back to the caller at issue time.

- Given a token was issued to another tenant, when it is presented, then the refusal
  is indistinguishable from an unknown token.
  - UI: identical message for cross-tenant and unknown tokens, so nothing is disclosed.

- Given a token carries no authority of its own, when it is redeemed, then the
  confirming caller's tenant and scopes are re-derived and re-checked.
  - UI: a caller who has since lost the scope cannot redeem.

- Given proposal and approval are separate acts, when a change completes, then two
  distinct audit lines exist for it.
  - UI: both lines visible in the Access log.

**Refinement note:** this story spans preview refusal, token issue, single-use, TTL,
tenant binding, re-authorization on redemption, and audit pairing. It is an epic
candidate — expect it to split at refinement.

**Anti-criteria**

- Given a mutating tool is called for the first time, when it returns, then it must
  NOT have changed any data.
- Given a preview refuses a change, when the response is returned, then a confirmation
  token must NOT be issued.
- Given a token is presented by a caller from another tenant, when it is refused, then
  the refusal must NOT reveal that the token exists.

---

**Screen / Flow:** MCP connector — pending changes
**Story ID:** RET-22

**User story**
As a retailer hub administrator, I want to see and clear the changes waiting on my
approval, so that an un-approved proposal never lingers and surprises me later.

**Acceptance criteria**

- Given proposals are outstanding, when I list pending changes, then each is returned
  with its summary, effects and expiry.
  - UI: list is scoped to my tenant only.

- Given nothing is outstanding, when I list pending changes, then an explicit empty
  result is returned rather than a bare empty array.
  - UI: response includes a note explaining the empty state.

- Given a pending change I do not want, when I discard it, then its token can no
  longer be redeemed.
  - UI: discard is available without the write scope the change itself would need.

- Given a pending change expires, when I list pending changes afterwards, then it is
  no longer offered as redeemable.
  - UI: expired entries drop out of the list.

**Anti-criteria**

- Given pending changes are tenant-scoped, when I list them, then another tenant's
  outstanding proposals must NOT appear.
- Given a change has been discarded, when its token is presented, then the change must
  NOT be applied.

---

**Screen / Flow:** AI Assistant Access — Access log
**Story ID:** RET-23

**User story**
As a retailer hub administrator, I want a log of every AI tool call against my
organisation, so that I can answer a security question with a record rather than an
assurance.

**Acceptance criteria**

- Given I am an administrator, when I open the Access log tab, then I see time,
  acting-as identity, agent, tool, scope and outcome for each call.
  - UI: outcome renders as an allowed/denied/error pill with the refusal reason
    beneath denied rows.

- Given I am a standard user, when I open the Access log tab, then access is refused
  with an explanation rather than an empty table.
  - UI: locked panel explaining why the tab is administrator-only.

- Given a call was made by a workload identity rather than a person, when its row
  renders, then it is badged as a service identity.
  - UI: distinct service-identity badge in the acting-as cell.

- Given some calls are refused before identity is established, when the log renders,
  then they are shown in their own band and attributed to no organisation.
  - UI: separate "Refused before sign-in (N)" section.

- Given the log updates as calls arrive, when I leave the tab open, then new entries
  appear without a manual reload, and I can also refresh or clear on demand.
  - UI: live polling plus explicit Refresh and Clear controls.

- Given a client connects but only lists tools, when the log renders, then that
  connection is itself recorded.
  - UI: connection events recorded and deduplicated over a short window.

- Given I want support to retrieve a specific call, when I read any tool response,
  then it carries its own audit identifier.
  - UI: identifier quotable back to support.

**Anti-criteria**

- Given a standard user opens the tab, when the panel renders, then log entries must
  NOT be returned to the client.
- Given calls refused before sign-in cannot be attributed, when they are logged, then
  they must NOT be attributed to any organisation.
- Given the audit log is per instance in this prototype, when it appears empty, then
  it must NOT be presented as proof that nothing happened.

---

# Connector-only capabilities

---

**Screen / Flow:** MCP connector — simulate a requirement change
**Story ID:** RET-24

**User story**
As a retailer category manager, I want to ask what requiring or dropping an attribute
would do to my vendor base, so that I can price a requirement change before any
supplier feels it.

**Acceptance criteria**

- Given I simulate adding a requirement, when the result returns, then it projects the
  effect on the vendor base without changing anything.
  - UI: response is explicitly labelled as a simulation.

- Given a projection rests on an assumption, when the result returns, then the
  assumption is stated alongside the numbers.
  - AI: the assumption string is authored by the tool; the assistant relays it —
    application code must NOT let the model paraphrase it away.
  - UI: assumption rendered with the figures, e.g. that no supplier already carries
    the attribute, making it a worst case.

- Given I simulate removing a requirement, when the result returns, then it warns that
  removal lowers the bar rather than closing a gap.
  - UI: warning returned as part of the result, not as an optional note.

- Given simulation is read-only, when it runs, then no confirmation token is issued
  and nothing is queued for approval.
  - UI: no pending change is created.

**Anti-criteria**

- Given simulation is read-only, when it runs, then a requirement must NOT be created,
  altered or removed.
- Given a removal simulation shows compliance improving, when the result is presented,
  then the improvement must NOT be shown without the lowering-the-bar warning.

---

**Screen / Flow:** MCP connector — diagnose gap patterns
**Story ID:** RET-25

**User story**
As a retailer category manager, I want to find attributes that many different vendors
fail at once, so that I can fix an ambiguous requirement instead of chasing every
vendor individually.

**Acceptance criteria**

- Given gaps exist across vendors, when I diagnose gap patterns, then attributes are
  returned ranked by how many distinct vendors fail them.
  - UI: vendor counts, not gap counts, drive the ranking.

- Given I authored guidance for an attribute, when it appears in the diagnosis, then
  my own guidance text is returned with it.
  - UI: guidance shown alongside the attribute so I can judge whether it is clear.

- Given this count differs from the report's missing-attribute count, when the result
  returns, then the difference is explained.
  - AI: the explanation is authored by the tool; the assistant must relay it rather
    than reconcile the two numbers itself.
  - UI: explanation returned with the result.

- Given no attribute fails across multiple vendors, when I diagnose, then the result
  says so rather than returning a bare empty list.
  - UI: self-explaining empty result.

**Anti-criteria**

- Given the two figures measure different things, when both are shown, then the
  diagnosis count must NOT be presented as equivalent to the report's
  missing-attribute count.
- Given baseline core attributes are always populated, when the diagnosis returns,
  then they must NOT appear as a systemic gap.

---

**Screen / Flow:** MCP connector — draft vendor outreach
**Story ID:** RET-26

**User story**
As a retailer category manager, I want a remediation email drafted from a supplier's
actual open gaps, so that what I ask for is accurate rather than generic.

**Acceptance criteria**

- Given a supplier has open gaps, when I request outreach, then a draft is returned
  built from their real gaps, ordered worst-first.
  - AI: the draft's prose is generated; the gap facts it cites come from the tool
    result — application code must NOT let the model introduce gaps not in the data.
  - UI: draft returned as text I can edit before sending.

- Given an attribute is already waived for that supplier, when the draft is produced,
  then it is excluded from the ask.
  - UI: waived attributes absent from the draft body.

- Given a supplier has nothing outstanding, when I request outreach, then the tool
  declines to draft and says why.
  - UI: explicit refusal rather than an empty or generic draft.

- Given a supplier is fully compliant versus supplying nothing under an Active
  profile, when the tool declines, then it distinguishes between the two cases.
  - UI: two distinct messages.

**Anti-criteria**

- Given an attribute is waived for a supplier, when the outreach draft is produced,
  then it must NOT be requested from them.
- Given there is nothing to chase, when I request outreach, then a generic
  placeholder email must NOT be produced.

---

**Screen / Flow:** MCP connector — vendor exceptions
**Story ID:** RET-27

**User story**
As a retailer category manager, I want to grant and revoke vendor exceptions scoped to
one category, so that relief is deliberate, bounded and still auditable afterwards.

**Acceptance criteria**

- Given I grant an exception, when I set it, then it names one vendor, one GS1
  category, a type of waiver, extended deadline or reduced scope, the attributes
  affected, and a valid-until date.
  - UI: category scope is required, not optional.

- Given granting an exception changes compliance numbers, when I call the tool, then
  it previews the change and requires confirmation before applying.
  - UI: same two-phase confirmation as every other mutating tool.

- Given granting exceptions is its own authority, when my connection lacks the
  exceptions scope, then the tool is absent from my tool list.
  - UI: absent rather than present-and-failing.

- Given I revoke an exception, when I expire it, then the record remains visible with
  an Expired status.
  - UI: expiry is the default revocation mode.

- Given I need the record gone entirely, when I delete rather than expire it, then the
  removal authority is required in addition to the exceptions authority.
  - UI: deletion refused without the removal scope.

- Given an exception is granted, when the affected supplier next looks, then they can
  see it on their side.
  - UI: same exception surfaces in the supplier's view (see `SUP-13`, `SUP-14`).

**Anti-criteria**

- Given the GS1 baseline is the floor every product is assessed against, when I grant
  an exception, then it must NOT waive a GS1 baseline requirement.
- Given an exception is scoped to one retailer, when it is granted, then it must NOT
  reduce that supplier's gaps against any other retailer.
- Given expiry preserves the audit trail, when I expire an exception, then its record
  must NOT be deleted.

---

## Out of scope — flagged, not silently dropped

- **Import from CSV** (profile list) is a placeholder pending a decided CSV format —
  no testable user-facing outcome, so no story.
- **Retailer Dashboard placeholder behaviours**, the perspective toggle, the role
  toggle, the welcome overlay and the coach mark are prototype scaffolding, not
  product.
- **`/api/demo/*` routes** (confused-deputy, proactive-check) exist to demonstrate
  refusal behaviour in a walkthrough; they are not user capabilities.
- **Vendor exception authoring in the UI** is deliberately absent — the screen is
  read-only and authoring happens through the connector (RET-27). Whether to wire the
  screen into navigation is an open product question, not a story.
