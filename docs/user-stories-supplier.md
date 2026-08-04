# User Stories — Supplier (spoke) side

> Expanded user stories for the **supplier** surface of Trading Grid Catalogue (TGC).
> Companion file: `user-stories-retailer.md`. All data in the prototype is mock,
> watermarked "MOCK DATA FOR ILLUSTRATION ONLY."

## How to read this file

- **Source of truth** is the prototype itself, not a prior description of it: the
  `SupplierScreen` enum in `app/page.tsx`, the `components/portal/screen-supplier-*.tsx`
  components, the shared catalogue model in `lib/supplier-catalogue.ts`, the union gap
  engine in `lib/supplier-gaps.ts`, and the supplier tool layer
  `lib/mcp/tools-supplier.ts`. Background specs: `feature-supplier-compliance.md`,
  `feature-compliance-reports.md`.
- **Personas** are drawn from the fixed TGC persona list. The supplier side uses
  *supplier data manager* throughout, and *manual supplier* where the story is
  specifically about CSV/offline working.
- **Task-hints** are limited to **UI** — and **AI** on the criteria where LLM or model
  output is actually consumed by application code. Fetch / State / Persist lines are
  deliberately omitted from this set.
- **Anti-criteria** state what must *not* happen. They are as binding as the
  acceptance criteria.

The organising idea behind every story here: **the GS1 brick code is the pivot that
lets many retailers assess one product.** Fill a gap once, satisfy every retailer who
requires it.

---

## Screen / flow inventory

| Screen / surface | Component | Stories |
|---|---|---|
| Compliance Status (landing) | `screen-supplier-compliance.tsx` | SUP-01 |
| Requirements drawer | `requirements-drawer.tsx` | SUP-02 |
| Products Needing Enrichment | `screen-supplier-gaps.tsx` | SUP-03 |
| Catalogue / assign category | `screen-supplier-catalogue.tsx`, `assign-category-modal.tsx` | SUP-04 |
| AI enrichment hand-off | `enrich-handoff-modal.tsx` | SUP-05 |
| Selection Code List (account-wide) | `screen-supplier-all-selection-codes.tsx` | SUP-06 |
| Retailer Selection Codes | `screen-supplier-selection-codes.tsx` | SUP-07 |
| Product list (3 modes) | `screen-supplier-products.tsx` | SUP-08 |
| Gap Detail | `screen-supplier-gap-detail.tsx` | SUP-09, SUP-12 |
| Attribute fill control | `attribute-fill-control.tsx`, `confirm-fill-attribute-modal.tsx` | SUP-10 |
| All Attributes | `screen-supplier-product-attributes.tsx` | SUP-11 |
| Waived surfacing (cross-screen) | multiple | SUP-13 |
| Notification bell | `supplier-notifications.tsx` | SUP-14 |
| Compliance Reports | `screen-compliance-reports.tsx`, `report-request-modal.tsx`, `report-scorecard.tsx` | SUP-15, SUP-16 |
| Supplier MCP connector | `lib/mcp/tools-supplier.ts` | SUP-17 |
| AI Assistant Access (supplier) | `screen-ai-access.tsx` | SUP-18 |

---

# Compliance Status

---

**Screen / Flow:** Compliance Status (supplier landing screen)
**Story ID:** SUP-01

**User story**
As a supplier data manager, I want every compliance target I am measured against in
one table with a readiness figure, so that I can see where I stand across the whole
network on one screen.

**Acceptance criteria**

- Given I switch to the supplier perspective, when the portal loads, then Compliance
  Status is the screen I land on.
  - UI: default supplier screen; no navigation step required to reach it.

- Given the table renders, when I read it, then row zero is GS1 Standard (Baseline)
  and every subsequent row is one retail partner.
  - UI: GS1 row carries a "Baseline" badge; retailer rows carry a sub-label reading
    "GS1 + custom" or "GS1 baseline".

- Given a target has assessable products, when its % Ready cell renders, then it shows
  a headline percentage, a progress bar and a per-category breakdown.
  - UI: breakdown chips read e.g. "Clothing 80% · Footwear 60% · Accessories 50%".

- Given readiness is product-completion based, when it is computed for a target, then
  a product counts as complete only when it has zero open gaps for that target, and
  uncategorised products are excluded from the denominator.
  - UI: a target with nothing assessable reads "Not yet assessed" rather than 0%.

- Given some of my products have no category, when the GS1 row renders, then it flags
  how many cannot be assessed at all.
  - UI: red pill on row zero reading "N uncategorised — cannot be assessed".

- Given raw counts still matter, when a row renders, then the readiness percentage is
  shown alongside the gap/complete counts, not instead of them.
  - UI: status pill reads "N gaps across M codes" or "M of N codes complete".

- Given work spans every target, when the screen renders, then a callout above the
  table summarises products needing enrichment across all targets, counted once per
  product.
  - UI: callout states the counting rule explicitly.

- Given I want to act on a row, when I click it, then I drill into that target — the
  GS1 row into its product view, a retailer row into that retailer's selection codes.
  - UI: each row also carries a "View requirements" action opening the drawer.

**Anti-criteria**

- Given uncategorised products are account-wide facts, when a retailer row renders,
  then the uncategorised count must NOT be repeated on it as though it belonged to
  that retailer.
- Given uncategorised products cannot be assessed, when readiness is computed, then
  they must NOT be included in the denominator.
- Given a target has nothing assessable, when its readiness renders, then it must NOT
  display as 0% ready.

---

**Screen / Flow:** Requirements drawer
**Story ID:** SUP-02

**User story**
As a supplier data manager, I want to see exactly what a target requires per category,
so that I can prepare data for a retailer before I even own products in that category.

**Acceptance criteria**

- Given I open the drawer for a target, when it renders, then it lists one row per GS1
  category with a required-attribute summary and a readiness chip.
  - UI: right-side sheet; summary reads "N required (X GS1 + Y <Retailer>)"; rows
    sorted worst-readiness first.

- Given I do not yet supply a category, when its row renders, then it is still listed
  and marked as not yet supplied.
  - UI: readiness chip reads "Not supplied yet" rather than a percentage.

- Given I expand a category row, when the checklist renders, then required attributes
  are split into the retailer's extras and the GS1 baseline, each with a
  provided/required indicator.
  - UI: retailer extras carry an amber badge; each attribute has a provided/required
    dot.

- Given the retailer publishes no extras beyond GS1, when the drawer renders, then it
  says so and explains that meeting the GS1 baseline puts me in good shape for them.
  - UI: informational panel in place of an extras section.

- Given I want to work offline, when I use the download controls, then I can take a
  template for all categories or for one category.
  - UI: one drawer-level download plus a per-row download icon.

**Anti-criteria**

- Given the drawer describes requirements rather than my data, when I open it for a
  category I do not supply, then it must NOT be hidden or shown as empty.
- Given readiness is per target, when the drawer opens for one retailer, then another
  retailer's requirements must NOT be shown in it.

---

# Products Needing Enrichment

---

**Screen / Flow:** Products Needing Enrichment (cross-target worklist)
**Story ID:** SUP-03

**User story**
As a supplier data manager, I want one worklist of everything outstanding across my
whole catalogue, so that I fix a requirement once instead of once per customer.

**Acceptance criteria**

- Given I click through from the Compliance Status callout, when the worklist renders,
  then it shows one row per product with an outstanding requirement, irrespective of
  selection code.
  - UI: reached from the callout, not from a sidebar item of its own.

- Given a requirement is wanted by several targets, when gaps are counted, then it is
  counted once and cleared once.
  - UI: gaps unioned across the GS1 baseline and every retailer that assesses the
    product.

- Given the summary tiles render, when I read them, then they show products needing
  enrichment, products with no category, products with data gaps, and total open gaps
  across all targets.
  - UI: the open-gaps tile states that it counts distinct requirements across all
    targets.

- Given some attributes are missing on many products, when the ranked chart renders,
  then the most common missing attributes are shown with the framing that fixing them
  clears the attribute for every target that wants it.
  - UI: ranked bar chart of the top missing attributes above the table.

- Given a product row renders, when I read it, then it shows the product, its category
  or a "No category" pill, its gap counts split into attributes and images, and which
  targets require the work.
  - UI: target pills show the first three plus a "+N more" chip.

- Given the list is long, when I filter, then I can narrow by free text, by gap kind,
  by category, and by which target requires it, with pagination.
  - UI: gap-kind toggles are All / No category / Missing attributes / Missing images.

- Given I expand a categorised row, when the panel opens, then each missing attribute
  can be filled in place and each missing image shows its spec with an upload action.
  - UI: shared attribute fill control, identical to the gap-detail screen's.

- Given I expand an uncategorised row, when the panel opens, then it explains the
  product cannot be assessed and offers to assign a category.
  - UI: red explainer plus a single-row Assign Category action.

- Given some requirements are waived for me, when a row expands, then the waived ones
  are named rather than simply absent.
  - UI: an "Also waived for you: …" line within the expanded panel.

**Anti-criteria**

- Given a requirement is wanted by three retailers, when the union is computed, then
  it must NOT be counted three times.
- Given every figure routes through the shared gap engine, when a worklist count is
  shown, then it must NOT disagree with the same product's gap-detail screen.
- Given the gap engine is deterministic, when the worklist renders, then it must NOT
  depend on a model inference to produce the list.

---

# Categorisation

---

**Screen / Flow:** Catalogue / Assign Category
**Story ID:** SUP-04

**User story**
As a supplier data manager, I want to assign a GS1 category to products in bulk, so
that they can be assessed at all — against the baseline and every retailer at once.

**Acceptance criteria**

- Given I open the Catalogue screen, when it renders, then it is explicitly framed as
  retailer-agnostic and shows how many of my products are categorised.
  - UI: caption "Your products, independent of any retailer"; progress counter reading
    "X of Y products categorised".

- Given products lack a category, when the table renders, then each is flagged and I
  can select all uncategorised in one action.
  - UI: red "No category" pill per row; a "Select all uncategorised (N)" control.

- Given I have selected products, when I open Assign Category, then I choose a GS1
  brick from a searchable picker filterable by segment.
  - UI: modal titled with the selection count; explains that the brick's standard
    attributes become the GS1 baseline requirements.

- Given I assign a category, when it is applied, then compliance recalculates against
  the GS1 baseline and every retailer, and the change is confirmed.
  - UI: toast reading that N products were categorised and compliance recalculated.

- Given I am working in the enrichment worklist instead, when every selected product
  is uncategorised, then the bulk Assign Category action is available there too.
  - UI: same modal, same outcome.

- Given my selection mixes categorised and uncategorised products, when I look at the
  bulk assign action, then it is disabled with an explanation.
  - UI: hint text explaining why, so the guard does not read as a bug.

**Anti-criteria**

- Given a categorised product already carries a brick, when a bulk assignment runs
  over a mixed selection, then it must NOT silently reclassify the categorised ones.
- Given categorisation is the gateway task, when a product has no brick, then it must
  NOT be reported as compliant or complete for any target.

---

**Screen / Flow:** AI Attributes Enrichment hand-off
**Story ID:** SUP-05

**User story**
As a supplier data manager, I want to hand a batch of products to AI Attributes
Enrichment, so that I can offload category and baseline-attribute suggestion instead
of filling every field by hand.

**Acceptance criteria**

- Given I have selected products, when I choose Send to AI Attributes Enrichment, then
  a modal lists exactly which products would be handed off.
  - UI: same modal shared by the Catalogue screen and the enrichment worklist.

- Given the enrichment screen is out of scope in this build, when the modal renders,
  then it says what enrichment would do and that the destination is not shown here.
  - AI: the modal describes enrichment as suggesting categories and filling GS1
    baseline attribute values **for review** — application code must NOT present
    enrichment output as applied or confirmed.
  - UI: explanatory note plus a mention of bulk file upload as the other entry point.

- Given I continue from the modal, when it closes, then no product data has changed
  and a message says so.
  - UI: toast stating that this is a hand-off signpost and nothing was modified.

- Given I cancel, when the modal closes, then my selection is preserved.
  - UI: checkboxes remain as they were.

**Anti-criteria**

- Given the enrichment destination is out of scope, when I continue from the modal,
  then any product's category or attribute values must NOT change.
- Given enrichment produces suggestions for review, when it is described, then its
  output must NOT be characterised as automatically applied.

---

# Catalogue navigation

---

**Screen / Flow:** Selection Code List (account-wide)
**Story ID:** SUP-06

**User story**
As a supplier data manager, I want a retailer-agnostic list of the selection codes my
products sit under, so that I can navigate my own catalogue structure without a
compliance lens on it.

**Acceptance criteria**

- Given the screen renders, when I read the table, then it shows selection code,
  description and product count.
  - UI: no compliance column — this screen is catalogue organisation, not monitoring.

- Given I have uncategorised products, when the list renders, then a row zero states
  how many need a GPC classification.
  - UI: red row reading "Uncategorised — assign a GPC classification" with the count.

- Given I click a selection code, when it opens, then I see the products under that
  code across my whole account.
  - UI: navigates to the account-wide product list mode.

- Given I click the uncategorised row, when it opens, then I land on the Catalogue
  screen with those products already selected.
  - UI: selection pre-applied so the assign action is one click away.

**Anti-criteria**

- Given this screen is retailer-agnostic, when it renders, then per-retailer gap
  counts must NOT be shown on it.

---

**Screen / Flow:** Retailer Selection Codes
**Story ID:** SUP-07

**User story**
As a manual supplier, I want a retailer's selection codes with their gap counts and a
downloadable attribute template, so that I can see where the work is for that customer
and work offline where I need to.

**Acceptance criteria**

- Given I open a retailer from Compliance Status, when the codes render, then each
  row shows code, description, product count and that retailer's compliance state.
  - UI: gaps/complete badge per code, scoped to this partner only.

- Given the retailer has waived requirements under a code, when the row renders, then
  a badge states how many.
  - UI: blue "N waived" badge alongside the compliance badge.

- Given I download a code's template, when the file is produced, then it carries
  Product ID, Description, Category and GS1 brick code columns plus the attribute
  columns, with one row per product under that code.
  - UI: per-code "Download attribute template CSV" action.

- Given the template is meant to be filled and returned, when I download it, then a
  caption tells me to complete it and upload it on the supplier portal.
  - UI: caption beneath the download action.

- Given uncategorised products are an account-wide fact, when this screen renders,
  then it carries no uncategorised messaging of its own.
  - UI: screen is scoped entirely to categorised products under this retailer.

**Anti-criteria**

- Given a gap count drops because of a waiver, when the codes render, then the change
  must NOT appear without the waived badge explaining it.
- Given uncategorised products belong to no retailer, when this screen renders, then
  they must NOT be attributed to this retailer.

---

**Screen / Flow:** Product list — retailer / GS1 / account-wide modes
**Story ID:** SUP-08

**User story**
As a supplier data manager, I want to reach the same product from whichever question I
started with, so that a per-retailer, a baseline and a catalogue-wide investigation all
end in the same place.

**Acceptance criteria**

- Given I arrive from a retailer's selection code, when the list renders, then it is
  filtered to that code's brick and shows that partner's gap count only.
  - UI: filters are free-text search plus All / Has gaps / Complete toggles.

- Given I arrive from the GS1 row, when the list renders, then I can filter by category
  and each product shows its baseline state.
  - UI: states read "GS1 complete", "N GS1 gaps" or "Cannot be assessed"; a chip panel
    shows the selected category's GS1 standard attributes.

- Given products in the GS1 view have no category, when the list renders, then a banner
  states how many and routes me to the Catalogue screen.
  - UI: red banner with an "Assign categories in Catalogue" action, plus a per-row
    assign link.

- Given I arrive from an account-wide selection code, when a product row renders, then
  its compliance cell stacks one pill per target.
  - UI: GS1 pill, one amber pill per retailer with gaps, and a collapsed green
    "N retailers complete" pill.

- Given any pill represents open gaps, when I click it, then I open that product's gap
  detail for that specific target.
  - UI: every gap-bearing pill is a link; complete pills are not.

- Given I want the whole picture for a product, when I use the per-row Attributes
  action, then I open its full attribute list.
  - UI: separate action from the gap pills.

**Anti-criteria**

- Given the retailer mode is scoped to one partner, when the compliance column renders,
  then another retailer's gaps must NOT be included in the count.
- Given a product has no category, when it appears in any mode, then it must NOT be
  shown as complete for any target.

---

# Remediation

---

**Screen / Flow:** Gap Detail (one product × one target)
**Story ID:** SUP-09

**User story**
As a supplier data manager, I want to see exactly what one product is missing for one
customer, with that customer's own guidance, so that I know precisely what to supply
and in what form.

**Acceptance criteria**

- Given I open gap detail, when it renders, then the header names the target and the
  summary strip reads how many attributes and images of how many are provided.
  - UI: GS1 target carries a Baseline badge; summary strip links to the full attribute
    list.

- Given the retailer wrote guidance for an attribute, when the missing-attribute list
  renders, then that guidance is shown against the attribute.
  - UI: guidance rendered beneath the attribute name.

- Given I reached this screen from one of several places, when the breadcrumb renders,
  then it reflects the route I actually took.
  - UI: breadcrumbs differ for the partner flow, the GS1 view, the account-wide code
    list and the enrichment worklist.

- Given the target has waived requirements for me, when the screen renders, then a
  panel names them and notes that other trading partners may still require them.
  - UI: distinct exception panel above the missing-attribute list.

- Given the product is complete for this target, when the screen renders, then it says
  so rather than showing an empty gap list.
  - UI: complete state in the summary strip.

- Given counts and lists must agree, when the summary strip shows N gaps, then the
  listed missing attributes and images total exactly N.
  - UI: both derived from the same gap records.

**Anti-criteria**

- Given a requirement is waived for me by this target, when the missing list renders,
  then it must NOT appear as an open gap.
- Given the summary strip states a gap count, when the lists render, then they must
  NOT total a different number.

---

**Screen / Flow:** Attribute fill control + confirmation
**Story ID:** SUP-10

**User story**
As a supplier data manager, I want to fill a missing attribute in place and be told how
far the value reaches, so that one correct value clears the gap for every target that
wanted it — knowingly.

**Acceptance criteria**

- Given an attribute has a GS1 allowed-value list, when I open the fill control, then I
  choose from that list rather than typing free text.
  - UI: dropdown of allowed values; free text only where no allowed-value list exists.

- Given I choose a value, when I submit, then a confirmation states the attribute, the
  value, and that it will apply to all of my GTINs within that product.
  - UI: amber warning in the confirm modal; Cancel and "Apply to product" actions.

- Given I want to inspect the GTINs first, when I read the confirmation, then it offers
  a route to do so.
  - UI: inline link within the warning text.

- Given I confirm the fill, when it is applied, then the attribute stops counting as a
  gap for every target that required it.
  - UI: gap counts on the originating screen update accordingly.

- Given I cancel the confirmation, when it closes, then no value is written.
  - UI: the attribute remains in the missing list.

- Given the same control is used in three places, when I fill from gap detail, from the
  all-attributes screen or from the enrichment worklist, then the behaviour and the
  confirmation are identical.
  - UI: one shared fill control and one shared confirm modal.

**Anti-criteria**

- Given a fill is a product-level fact, when I apply one, then it must NOT be applied
  without the confirmation stating that it reaches every GTIN in the product.
- Given a fill clears a requirement, when it is applied, then it must NOT clear that
  requirement for a target that never required it.

---

**Screen / Flow:** All Attributes
**Story ID:** SUP-11

**User story**
As a supplier data manager, I want the full attribute set for a product against a
target, so that I can fix a wrong value, not only supply a missing one.

**Acceptance criteria**

- Given I open the all-attributes screen, when it renders, then every attribute in the
  category's pool is shown as provided, missing or waived.
  - UI: green / amber / grey indicators; summary counts of provided, missing, waived
    and missing image requirements.

- Given an attribute is already provided, when I click its edit control, then I can
  change the value through the same editor and the same confirmation used for a fill.
  - UI: pencil affordance on provided rows; identical confirm modal.

- Given an attribute is waived by this target, when its row renders, then it is
  labelled as waived and is not editable.
  - UI: grey row reading "Waived by <target>".

- Given an image requirement is unmet, when the screen renders, then an upload shortcut
  is offered from here as well.
  - UI: upload action alongside the missing image count.

- Given I arrived from gap detail, when I go back, then I return to the screen I came
  from.
  - UI: explicit back action.

**Anti-criteria**

- Given an attribute is waived, when its row renders, then it must NOT be editable or
  counted as a gap.
- Given fill and edit share one path, when I edit a provided value, then it must NOT
  bypass the confirmation that a fill requires.

---

**Screen / Flow:** Image requirements and upload
**Story ID:** SUP-12

**User story**
As a supplier data manager, I want each image requirement shown with its spec and an
honest statement of what is checked, so that I know what to shoot and what the platform
will and will not verify.

**Acceptance criteria**

- Given a target has image requirements, when gap detail renders, then each is listed
  with its name, the target's spec text and whether it has been provided.
  - UI: spec text rendered per requirement, e.g. background, dimensions and framing.

- Given the platform checks presence rather than content, when the requirements render,
  then that limit is stated against them.
  - UI: note reading that this is guidance only and not verified by the system.

- Given I choose to upload against a requirement, when the upload screen opens, then it
  names the product, the category and the requirement being fulfilled.
  - UI: context header above the upload area.

- Given upload is not built in this prototype, when the upload screen renders, then it
  says so plainly and the controls are disabled.
  - UI: banner stating uploading does not function here; drop zone inert and the browse
    control disabled.

- Given I leave the upload screen, when I go back, then I return to the requirements
  status I came from.
  - UI: explicit back action.

**Anti-criteria**

- Given image content is not verified, when a requirement is marked provided, then the
  system must NOT claim the image meets the stated dimensions, format or framing.
- Given upload is not implemented, when the screen renders, then it must NOT present an
  apparently working upload control.

---

# Exceptions

---

**Screen / Flow:** Waived requirement visibility (cross-screen)
**Story ID:** SUP-13

**User story**
As a supplier data manager, I want waived requirements named wherever they affect my
numbers, so that a requirement one retailer waived never silently vanishes while others
still want it.

**Acceptance criteria**

- Given a retailer has waived attributes on a product, when I open gap detail for that
  target, then a panel names each waived attribute and notes other partners may still
  require them.
  - UI: distinct exception panel, visually separate from the missing list.

- Given a retailer has waived attributes under a selection code, when the code list
  renders, then the code carries a waived count.
  - UI: "N waived" badge on the code row.

- Given a requirement is waived for one target but wanted by another, when I expand the
  product in the enrichment worklist, then both facts are shown.
  - UI: each gap lists the targets that require it and the targets that waived it.

- Given I look at the full attribute set, when a waived attribute renders, then it is
  shown as waived rather than omitted.
  - UI: grey waived row within the all-attributes list.

- Given a waiver applies to one retailer only, when my compliance is computed, then it
  reduces gaps for that retailer alone.
  - UI: other targets' counts are unchanged by the waiver.

**Anti-criteria**

- Given a waiver is scoped to one retailer, when it is applied, then it must NOT reduce
  my GS1 baseline gaps or any other retailer's gaps.
- Given a waived requirement still matters to other partners, when it is waived, then
  it must NOT disappear from every surface without being named somewhere.

---

**Screen / Flow:** Notification bell
**Story ID:** SUP-14

**User story**
As a supplier data manager, I want to be told when a trading partner grants me an
exception, so that my compliance numbers never move for reasons I cannot trace.

**Acceptance criteria**

- Given a partner has granted me an Active exception, when I open the bell, then I see
  it described by what it means for me.
  - UI: entries read e.g. that named attributes no longer count as a gap against me,
    that I have extra time, or that scope has been narrowed for me.

- Given an exception has a validity window, when its entry renders, then the
  valid-until date is shown.
  - UI: "Valid until <date>" on each entry.

- Given there are unread notifications, when the bell renders, then a count badge is
  shown, and opening the feed clears it.
  - UI: read state persists across sessions.

- Given nothing has been granted, when I open the bell, then an empty state explains
  what would appear here.
  - UI: message stating that exceptions partners grant will appear here.

- Given I click a notification, when it resolves, then I land on the selection code the
  exception applies to.
  - UI: resolves the exception's GS1 brick to a live selection code; falls back to the
    code list when no match exists.

**Anti-criteria**

- Given exceptions are granted by retailers, when I use any supplier surface, then it
  must NOT be possible for me to create, amend or request an exception.
- Given an exception changes my numbers, when it takes effect, then my gap count must
  NOT change with no notification of any kind.

---

# Compliance Reports

---

**Screen / Flow:** Compliance Reports — proactive scan
**Story ID:** SUP-15

**User story**
As a supplier data manager, I want to audit my catalogue against any retailer's filter
before they pull my data, so that I find and fix that customer's exceptions proactively
rather than after a rejection.

**Acceptance criteria**

- Given I open the request wizard, when Step 1 renders, then I can scan against a
  retail partner's account filter or a global System filter.
  - UI: two-option radio; partner options labelled "GS1 baseline + N extras".

- Given I am not restricted to my own rules, when I open the partner dropdown, then
  every retail partner is offered, not only ones I already trade heavily with.
  - UI: full partner roster in the dropdown.

- Given I choose a System filter, when the dropdown opens, then GS1 Core Scorecard,
  GS1 Extended Scorecard and NRF Retail-Ready are offered with descriptions.
  - UI: descriptions rendered inline.

- Given I am on Step 2, when options render, then I can set maximum attributes to
  report, an exclude-before date, and whether to ignore discontinued items.
  - UI: 999 means all; ignore-discontinued defaults to on.

- Given a report is scoped to a retailer, when it runs, then the number of items it
  assesses matches that retailer's row on the Compliance Status screen.
  - UI: same assessability rules as the compliance screen.

- Given I fix a gap and re-run the same report, when the new scorecard renders, then
  the figures move.
  - UI: reports compute from live catalogue state at request time.

- Given the same catalogue state, when I run the same report twice, then the results
  are identical.
  - UI: no randomised element in the engine.

- Given I abandon the wizard part-way, when I reopen it, then it starts at Step 1 and
  nothing was queued.
  - UI: queue unchanged.

**Anti-criteria**

- Given retailer requirement content is not disclosed to suppliers beyond what a
  partner publishes, when I scan against a partner's filter, then the report must NOT
  expose another retailer's private requirement definitions.
- Given the engine is deterministic, when an unchanged catalogue is re-scanned, then
  the scorecard must NOT differ between runs.

---

**Screen / Flow:** Compliance Reports — queue and scorecard
**Story ID:** SUP-16

**User story**
As a supplier data manager, I want each scan's parameters to travel with its results,
so that flipping between two customers' rules never leaves me acting on the wrong
scorecard.

**Acceptance criteria**

- Given reports have been requested, when the queue renders, then each row shows the
  report, its filter with a System/Account pill, status, requester, timestamp, duration
  and a CSV download.
  - UI: an info control opens the full run parameters for that row.

- Given a report is running, when its row renders, then it shows an in-progress state
  that resolves to Complete.
  - UI: animated status pill, then a static one.

- Given I open a completed report, when the scorecard renders, then it shows overall
  compliance %, items assessed, open gaps and items excluded.
  - UI: excluded tile breaks down into uncategorised, discontinued and before-cutoff.

- Given the scorecard ranks what is missing, when the list renders and is truncated,
  then the truncation is stated.
  - UI: ranked bar list plus a "top N of M" footer.

- Given I need to act on the results, when the products table renders, then each row
  shows the product, category, gap count and the named missing attributes.
  - UI: rows with a missing image offer an upload action inline.

- Given I download the CSV, when the file is produced, then the run parameters are
  repeated in its header block.
  - UI: download available from both the queue row and the scorecard.

- Given the per-category table renders, when I read it, then it shows items, complete,
  percentage and gaps per category.
  - UI: matches the category framing used on Compliance Status.

**Anti-criteria**

- Given two reports were run under different filters, when a scorecard is displayed or
  exported, then it must NOT appear without the filter and parameters that produced it.
- Given the ranked attribute list is truncated, when I read the headline gap total,
  then the truncated list's sum must NOT be presented as the total.

---

# Conversational access

---

**Screen / Flow:** Supplier MCP connector
**Story ID:** SUP-17

**User story**
As a supplier data manager, I want to ask about my own compliance conversationally, so
that I can check my position without navigating the portal — and without ever reaching
anyone else's data.

**Acceptance criteria**

- Given I connect as a supplier tenant, when the tool list is built, then it contains
  read tools only.
  - UI: no create, amend or delete tool is offered on the supplier side.

- Given every tool acts on my own catalogue, when a tool runs, then my vendor identity
  comes from my authenticated tenant.
  - UI: vendor is never accepted as a tool argument.

- Given I ask what I can do, when capabilities are returned, then I get a plain-language
  catalogue plus a live snapshot of my own data.
  - AI: the assistant phrases the answer; the capability list and snapshot come from
    the tool result — application code must NOT let the model advertise a capability the
    server did not return.
  - UI: snapshot covers catalogue size, GS1 completion and partner roster.

- Given I ask how compliant I am, when the status is returned, then it is broken down
  by GS1 baseline and by each retail partner, ranked worst-first.
  - UI: no single global compliance score is returned.

- Given I ask what I am missing for one target, when the gaps are returned, then they
  are bounded in size and waived requirements are returned separately from gaps.
  - UI: default and maximum result sizes applied; waived items in their own field.

- Given I ask what has been waived for me, when exceptions are returned, then each names
  the granting retailer, its category scope, the attributes, the validity date and a
  plain-English effect.
  - UI: exceptions that reduce no gap count are flagged as such.

- Given a retailer's custom requirement names are its own, when partner information is
  returned, then only the count of extras beyond GS1 is disclosed.
  - UI: extras count without the attribute names.

- Given I ask for something outside the supplier scope, when the server responds, then
  it refuses rather than the assistant declining on its own.
  - AI: the refusal originates server-side; application code must NOT let the model
    simulate access it does not have.

**Anti-criteria**

- Given supplier tools are read-only, when any of them runs, then it must NOT create or
  amend an exception, a requirement or a product value.
- Given the vendor is resolved from the token, when a caller passes a vendor argument,
  then another supplier's data must NOT be returned.
- Given the GS1 baseline is the floor, when compliance is returned, then a retailer must
  NOT be shown as having waived a baseline requirement.

---

**Screen / Flow:** AI Assistant Access (supplier variant)
**Story ID:** SUP-18

**User story**
As a supplier data manager, I want to see exactly what my AI connection can and cannot
do, so that I can trust the boundary between the two sides of the same endpoint.

**Acceptance criteria**

- Given I open the access modal, when it renders, then it shows the supplier tools my
  tenant may call and the identities that may call them.
  - UI: tool table scoped to the supplier side.

- Given the same endpoint serves retailers, when the modal renders, then retailer-side
  tools are shown explicitly as not available to me.
  - UI: separate, greyed section labelled as unavailable.

- Given a connection may be narrowed further, when I view the read-only case, then the
  tool list is filtered by the same rule the server applies.
  - UI: caption explains that unavailable tools are absent from the list, not disabled
    within it.

- Given AI calls are made against my account, when I open the audit tab, then I see each
  call's tenant, subject, tool, scope, outcome and latency.
  - UI: table refreshes as calls arrive.

- Given the tab is administrator-scoped, when a standard user opens it, then access is
  refused with an explanation.
  - UI: locked panel rather than an empty table.

**Anti-criteria**

- Given I am a supplier tenant, when I attempt a retailer-side tool, then it must NOT be
  served merely because the endpoint URL is shared.
- Given the audit log is per instance in this prototype, when it appears empty, then it
  must NOT be presented as proof that nothing happened.

---

## Out of scope — flagged, not silently dropped

- **Image upload** (SUP-12) is a signpost: the drop zone and browse control are
  deliberately inert. The story covers the spec display and the honest limitation, not a
  working upload.
- **AI Attributes Enrichment** (SUP-05) is a hand-off only. The enrichment screen
  itself, and bulk file upload, are out of scope for this build.
- **CSV re-upload** — templates can be downloaded (SUP-02, SUP-07) but the return path
  is not built.
- **Compliance Checks** is intentionally inert and is a different concept: per-file
  validation at upload time, not an on-demand catalogue-wide report.
- **The GTIN list** is an existing, out-of-scope screen; the confirm-fill modal's "see
  the GTINs first" link routes to the Catalogue screen as the nearest in-scope
  destination.
- **Inert sidebar leaves** (Advanced Search, Download Basket, Error Processing, EDI
  Management Console, Text File Upload/Download, Color Codes, Size Codes, Profile,
  Users, Guides & Templates, Settings) reproduce the live TGC navigation for realism.
- **There is no supplier-side in-portal chat agent.** The agent panel is retailer-only,
  by design: the gap engine is deterministic, so this worklist needs no agent to produce
  it. A supplier-side agent would be a convenience over this data, not the only way to
  reach it.
- **Prototype scaffolding, not product:** the perspective toggle, the role toggle, the
  welcome overlay, the coach mark and the hidden `?tools=1` eval trigger.
