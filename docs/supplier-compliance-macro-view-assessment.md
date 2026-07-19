# The macro supplier-compliance view — internal decision memo

**Status:** Decision memo — for team discussion, not committed roadmap
**Persona in scope:** Retailer (hub) only. Retailer's own agent is the delivery surface.
**Explicitly out of scope:** Supplier-side surfacing, supplier agents, auto-fix/resubmit (later phase)

---

## 1. TL;DR

A colleague proposed a next-release feature: a macro view of **how many suppliers
comply with a retailer's required attributes**, built by merging two existing
reporting engines — the **Compliance Report** (per-vendor rules engine) and the
**Attributes Analytics Report** (monthly multi-vendor snapshot) — with CSV export.

The reuse instinct is right. The **artifact is wrong.** A monthly
compliant/non-compliant *count* measures the problem without moving it.

**Recommendation:** reframe from a batch scorecard to a retailer-facing,
**ranked, actionable** compliance view delivered **live through the retailer's
agent**. Keep a plain count only as an interim leadership/QBR metric. Retailer
side only; surfacing to suppliers and any agentic remediation are a deliberate
later phase, not part of this decision.

---

## 2. What the proposal gets right (keep)

- **Reuse over rebuild.** The two engines genuinely are the two halves of the
  problem — one validates a catalogue against a rule set, one aggregates across
  all vendors. That is the correct starting instinct.
- **The Attribute Filter is the right rules primitive.** The retailer's
  predefined required-attribute set is exactly what "compliant" should be
  measured against. In this prototype that maps cleanly to an attribute profile
  (`getProfileDetail` / `listAttributeProfiles` in `lib/mcp/tools.ts`).
- **A macro/portfolio roll-up is a real gap.** Today a retailer gets either a
  one-vendor deep-dive or raw population counts — never a "who across my supplier
  base is actually compliant" view. The demand is real.

---

## 3. Where it optimizes the wrong thing

- **Report, not a loop.** "37 of 180 suppliers comply" is stale on arrival and
  un-actionable. The retailer cannot *do* anything with a count. The job-to-be-done
  is to *move* compliance and to know *which* laggards matter — not to tally.
- **Binary pass/fail discards the asset.** Collapsing the granular per-attribute
  view into a single flag throws away precisely what is actionable: *which*
  attribute, on *how many* GTINs, for *which* suppliers. A supplier missing one
  attribute on one SKU and one missing it across their whole catalogue both read
  as "non-compliant" — that is noise, not signal.
- **Monthly cadence is a liability.** Compliance moves daily as suppliers fix
  data. A monthly batch snapshot institutionalizes staleness and runs directly
  opposite to the live, queryable direction the retailer's agent makes possible.
- **Output disconnected from the retailer's workflow.** Routing results to a
  static CSV / BI tool leaves them detached from where the retailer actually acts
  — authoring requirements, prioritizing outreach, granting exceptions. The data
  lands in a spreadsheet, not in a decision.
- **"Feed one engine into the other" hides the hard part.** The rules engine
  operates per-GTIN; the analytics engine aggregates per-vendor. Different data
  models, cadences, and tenancy scopes. "Detach the single-vendor constraint" is
  doing enormous work in one sentence — running validation across the entire
  supplier base against 200+ attributes is *the* engineering problem, not a
  footnote.

---

## 4. Steelman (so we don't over-correct)

A plain count is **not** worthless. For one audience — leadership / QBRs wanting
a single trend line ("supplier compliance +12% QoQ") — it is legitimately useful.
And the colleague's reuse instinct is sound. The error is in **output design and
cadence**, not in reusing the engines. We keep the engines; we change what they
produce and how often.

Worth naming plainly: "merge two existing reports" is attractive largely because
it is *cheap and shippable* — it looks like leverage because it reuses code. That
is a reason to like it as an interim step, not a reason to let it define the
feature.

---

## 5. The reframe: scoreboard → retailer compliance control tower

Same engines, three shifts — all retailer-facing:

- **Count → ranked, impact-weighted worklist.** Not "37 comply," but "these N
  suppliers are *one attribute* from compliance — here is the attribute,"
  ordered by GTIN volume (and, if available, revenue/velocity). A to-do list, not
  a scoreboard.
- **Batch → live / queryable via the retailer's agent.** "How many of my
  suppliers meet the Footwear requirements right now? Who is closest?" — answered
  on demand against current data, not a month-old snapshot.
- **Static CSV → actionable.** From the same view the retailer drills to the
  specific gaps and acts through existing levers (prioritize outreach, grant an
  exception). Export stays supported for QBR/BI, but as a byproduct — not the
  point of the feature.

---

## 6. Explicitly out of scope now (later phase)

Surfacing the same evaluation to **suppliers**, **supplier-side agents**, and any
**auto-fix / resubmit** loop are deliberately parked. They are the natural
extension once the retailer-side loop proves out, and they carry their own
dependencies (data-sharing terms, supplier adoption). Naming them here so the
decision stays clean: **this memo is about the retailer view and the retailer's
agent only.**

---

## 7. Decision & recommendation

**Pursue the Reframe — a retailer compliance control tower, retailer-agent-first.**

- It preserves the colleague's reuse instinct (we don't waste the engines),
  rejects the batch-count trap, and compounds with the live/queryable direction
  the retailer agent already enables.
- **Conservative fallback:** if leadership needs a QBR number on a hard deadline,
  ship the plain count first as an *explicitly scoped* interim metric — and treat
  the control tower as the next increment, not a replacement to be renegotiated.

No build this session; this memo is the direction, not the spec.

---

## 8. Risks & dependencies

- **Impact-weighting data.** Ranking by GTIN volume / revenue / velocity assumes
  we hold that data at the right grain. If we don't, the ranked worklist degrades
  to an (unordered) gap list — still useful, less sharp.
- **Data-model unification.** Marrying the per-GTIN rules engine to the
  per-vendor aggregator is the real build cost, and the reason "just merge them"
  understates the work.
- **Scale.** Validating the full supplier base against 200+ attributes on demand
  (rather than monthly) has a performance and cost profile we need to size.

---

## 9. Open questions for the team

- Is the primary driver a **leadership metric** or a **workflow tool**? This sets
  Conservative vs. Reframe.
- Do we hold **GTIN-level revenue / velocity** to weight the worklist?
- What is the **cadence expectation** — live/on-demand vs. periodic?
- What is the **delivery surface** — the retailer's agent, a portal screen, or
  both?

---

## 10. Prototype note (non-binding)

If/when we build, the Reframe is a natural next MCP read tool for this prototype
— e.g. `get_supplier_compliance_scorecard(profile)` — layered on the existing
`getProfileDetail` rules read plus a small multi-supplier data addition. Flagged
for continuity only; it is a future session, not this one.
