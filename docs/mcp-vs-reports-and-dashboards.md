# Can MCP replace the Compliance Report and the Dashboard?

> An analysis brief. Written for a PM audience with an engineering section at the
> end. Grounded in this prototype's actual code — every claim about what TGC does
> today cites the file it came from. All data referenced is mock, per the
> watermark.

## The question, and the short answer

TGC now answers "how compliant is this catalogue?" two ways: through the portal
screens (`components/portal/screen-compliance-reports.tsx`,
`components/portal/screen-compliance-dashboard.tsx`) and through the MCP
connector (`run_compliance_report` and ~30 sibling tools in
`lib/mcp/manifest.ts`). Nobody has written down where the boundary between them
sits. That question will be asked — TGC is the named first implementation behind
the TG Aviator MCP Gateway, and "which surfaces survive" is exactly what
leadership asks when a conversational interface starts overlapping a screen.

The honest answer is different for the two surfaces:

- **The Compliance Report is mostly replaceable.** Not because the model is
  clever, but because the report request wizard is a parameter-collection form,
  and natural language collects parameters better than a form does. What blocks
  full replacement is not intelligence — it is that a chat answer evaporates and
  a report is supposed to be an artifact.
- **The Dashboard is half replaceable.** MCP can take over the alerting half —
  and take it over decisively — but should not take the forensic half. The
  blocker here is not MCP at all: **TGC stores no compliance history**, so no
  tool can honestly answer "is this getting better."

The recommendation is therefore not replacement. It is an inversion: **the report
becomes the artifact the conversation produces and links to; the dashboard
becomes a subscription.** The rest of this doc argues that.

---

## 1. Stop arguing about "reports." Argue about jobs.

A report and a dashboard are each five or six jobs wearing one name. Score them
separately and the answer stops being a matter of taste.

### What a Compliance Report actually does

| Job | Verdict | Why |
|---|---|---|
| Pick a rule set (which retailer's filter? which System scorecard?) | **MCP-superior** | The 3-step wizard in `report-request-modal.tsx` exists to collect four parameters. "Run a GS1 Core scorecard on Levi's, all attributes" collects them in one sentence, with no dropdown to hunt for. |
| Evaluate the catalogue | **Neutral** | Same engine either way. `run_compliance_report` calls `runRetailerReport()` in `lib/compliance-report.ts` — the identical pure function the screen uses. |
| Rank the gaps | **Neutral, leaning MCP** | The ranked list is data. The model adds the "so what" the screen can't: which of these is worth your Tuesday. |
| Produce a citable artifact | **MCP-hostile today** | The screen produces a scorecard and a CSV with the parameters in its header block. The connector produces prose in someone's chat history. This is the real gap, and it is fixable (see L1). |
| Keep a provenance record | **MCP-hostile today** | Report queue rows carry requester, timestamp, duration, parameters popover, file name. The connector persists nothing — the tool is documented as a stateless read. |
| Drive an action | **MCP-superior** | This is the strongest case in the whole document. The screen ends at "here are your worst vendors." The connector already has `draft_vendor_outreach` and `set_vendor_exception` in the same session, behind confirmation. Finding the problem and acting on it stop being two different applications. |

### What a Dashboard actually does

| Job | Verdict | Why |
|---|---|---|
| Ambient "is anything on fire," with zero intent | **MCP-hostile — but see L3** | A dashboard is a pull you perform by presence: it's a tab, you glance, you close it. Chat requires you to *decide to ask*. You cannot fix this with a better tool description. You fix it by inverting the direction of travel. |
| Trend over time | **Blocked — not by MCP** | See §3. This is the single most important finding in the doc. |
| One canonical number a team argues from | **MCP-hostile, mitigable** | Two people asking differently get differently framed answers. Mitigation is an engineering rule, not a prompt (see §5). |
| Dense multi-vendor comparison | **MCP-hostile** | ~180 vendor rows × N attributes reads faster as a table your eye scans than as tokens that stream. This is a genuine, permanent property of the medium, not a limitation to engineer away. |
| Drill-down | **MCP-superior** | The screen's drill-down is a fixed hierarchy someone designed in advance. "Why is Belk at 61%?" doesn't have to match a path the designer anticipated. |

Read the two tables together and the pattern is clear: **MCP wins the beginning
and the end of the workflow — framing the question and acting on the answer —
and loses the middle, which is displaying a lot of numbers at once.**

---

## 2. Where we actually are: a five-rung ladder

### L0 — Today

`run_compliance_report` (`lib/mcp/manifest.ts`) is a read-only tool over the
deterministic engines in `lib/compliance-report.ts`. It takes a System filter id
or a profile name, an optional single-vendor scope, and `maxAttributes` (999 =
all, matching the legacy semantics). It returns overall %, ranked missing
attributes, per-category breakdown and per-vendor rows — and it correctly drops
attributes waived by an Active vendor exception, so the conversational number
agrees with the screen's number.

**This already replaces the ad hoc report.** If your reason for opening the
Compliance Reports screen was "I want to know X right now," the connector is a
better version of that. What it doesn't replace is the reason you opened it to
produce something for someone else.

### L1 — Artifact parity (the highest-leverage next step)

Today the MCP server registers **tools and prompts, and no resources at all** —
there is no `server.resource(...)` anywhere in `app/api/[transport]/route.ts`.
That's the missing primitive. Resources are how MCP represents *a thing that
exists and can be referred to again*, as opposed to an answer that happened once.

What closes the gap:

- Persist a report run with a `run_id`, its parameters, its timestamp and its
  requester — the same fields the queue row already shows.
- Expose it as a resource (`report://run/{id}`), with the CSV that
  `reportToCsv()` already generates attached as a blob.
- Add `list_report_runs` and `get_report_run`, and return a resource link from
  `run_compliance_report` rather than only prose.

The payoff is not technical elegance. It's that "the Belk scan from Tuesday"
becomes a thing you can name, re-open, attach to an email and hand to an
auditor — which is most of what the screen was for. This is already Open
Question #1 in [`feature-compliance-reports.md`](./feature-compliance-reports.md)
§8 ("should a completed report be persistable/shareable"). It was a UI question
when it was written. It is now the question that decides whether the connector
can stand in for the screen.

### L2 — Trend (the blocker, and it isn't MCP's fault)

**TGC has no compliance history.** `runRetailerReport()` computes from live
state; re-run it after a supplier fixes their data and the number moves, but
nothing anywhere records what the number *was*. The dashboard's six-month trend
line is not real data — `buildTrend()` in `screen-compliance-dashboard.tsx`
seeds it from a string hash of the supplier's name, deliberately, so the
prototype renders something stable.

The consequence is worth stating precisely, because it is easy to misdiagnose as
a model problem:

> No amount of MCP tooling, prompt engineering or model capability can answer
> "is Belk improving?" There is nothing to read. The correct behaviour for the
> connector today is to **say so and refuse**, not to infer a direction from a
> single snapshot.

Fixing it is a scheduled snapshot job plus a `get_compliance_trend(filter, from,
to, grain)` tool — a data-model change, not an AI change. Until it lands, the
dashboard's trend chart is the only surface claiming to show history, and in the
prototype it is claiming that falsely. **That is a finding about the dashboard,
not about MCP.**

### L3 — Proactive (where MCP stops matching and starts beating)

`app/api/demo/proactive-check/route.ts` already does the hard part. It runs a
compliance scan under a **workload identity** — no human in the session, its own
client-credentials token, read-only scope, tenant-pinned — through the same
`runGuarded()` choke point as any other caller, and flags vendors past a
`GAP_ALERT_THRESHOLD`. It lands in the audit trail with subject type `workload`
and no subject id.

Put a schedule and a delivery channel on that and you have replaced the actual
reason people open dashboards. Be honest about what that reason is: **most
dashboard visits end in nothing.** Someone checks that nothing is on fire and
closes the tab. A system that stays quiet and speaks only when something *is* on
fire is strictly better than one that requires you to remember to look — and it
removes the failure mode a dashboard can't fix, which is nobody looking on the
day it mattered.

This is the rung to fund. It's the only one where the conversational surface is
better than the screen rather than merely adequate.

### L4 — Rendered (directional)

Server-returned interactive UI — the emerging MCP Apps / `ui://` resource
pattern — would let the connector hand back the scorecard itself: the ranked
bars and per-category table already laid out in `report-scorecard.tsx`, rendered
inside the chat client. That closes most of the "dense comparison" gap in §1
without asking anyone to read a table as prose.

Directional, not a commitment. But it's the reason the §1 "MCP-hostile" verdicts
on display should be read as *today's* medium constraints, not laws.

---

## 3. What we should not try to replace

Each of these is real. Each has a mitigation, and none of the mitigations is
"write a better system prompt."

- **Zero-intent glance.** Chat is pull. Mitigate with L3 digests; do not claim to
  eliminate. Some people want a tab open, and that is a legitimate preference.
- **One canonical number.** If two colleagues ask differently and get differently
  framed answers, the number stops being something a team can argue from. The
  mitigation is an architectural rule, stated plainly: **the model never does
  arithmetic.** Every figure is quoted verbatim from the deterministic engine and
  carries the `run_id` it came from. `runRetailerReport` and `runSupplierReport`
  are pure functions with no randomness precisely so this is enforceable.
- **Audit-grade evidence.** A chat transcript is not an artifact with parameters,
  a timestamp and a named requester. This needs L1 plus the audit trail that
  already exists (`lib/mcp/audit.ts`, surfaced through `query_access_log`).
- **Dense comparison.** See above. Permanent until L4, and partly permanent after.
- **Cost and latency per view.** A cached dashboard render is close to free. Every
  conversational view costs tokens and seconds. At one steward asking a few
  questions a day this is noise; at every steward across ~180 retailer hubs
  refreshing all morning it is not. Bounded retrieval per call — already the
  stated discipline in the PM presentation's §4B — matters more as the tool
  surface grows.

---

## 4. The recommendation: inversion, not replacement

Stop framing this as "does the connector kill the screen." Frame it as which
layer each surface owns:

- **Chat is the entry point and the action layer.** Framing the question,
  interrogating the result off-script, and doing something about it —
  `draft_vendor_outreach`, `set_vendor_exception`, all behind the existing
  no-write-on-first-call confirmation.
- **The rendered scorecard is the evidence layer.** It stops being a destination
  you navigate to and becomes the artifact the conversation produces, links to,
  and hands onward.
- **The dashboard becomes a subscription.** Its alerting job moves to L3 push. Its
  forensic job stays on screen, for the days when someone genuinely needs to
  compare 180 vendors at once.

Two things follow directly:

1. **The trend chart should be fixed or removed, independent of any MCP work.**
   It currently displays hashed data. That's fine in a watermarked prototype and
   not fine the moment someone screenshots it into a deck.
2. **Supplier-side has no report tool.** The supplier connector today covers own
   status, partners, open gaps and exceptions — `run_compliance_report` is
   retailer-only (`RETAILER_ONLY` in the manifest), and
   [`feature-compliance-reports.md`](./feature-compliance-reports.md) §7 records
   supplier-side MCP as out of scope. That's now the clearest missing capability
   in the product, because the supplier's "am I ready for Retailer B before they
   pull my data?" scan is the most MCP-native workflow TGC has: it is proactive,
   it is per-partner, it is repeated across many partners, and its whole value
   is doing it *before* anyone asks you to. The engine already exists
   (`runSupplierReport`). The tool doesn't.

---

## 5. The bar, before we retire any screen (engineering section)

Replacement is a claim about reliability, so it needs a threshold, not an
impression. The harness exists — `lib/copilot/run-eval.ts` runs a golden set
through the agent, with exact-match, GS1-validity, evidence/abstention and
LLM-as-judge scores bound to the dataset (see
[`eval-framework-pm-presentation.md`](./eval-framework-pm-presentation.md)).

Proposed pass conditions:

| Check | Bar | Why this one |
|---|---|---|
| Figure fidelity | **100%** exact match against tool output | A restated-from-memory number is worse than no answer. Nothing below 100% justifies retiring a screen people trust. |
| Run-id citation | Present on every quoted figure | Makes the canonical-number problem in §3 auditable rather than hypothetical. |
| Trend abstention | Correct refusal on every history question while L2 is absent | Exactly what the existing abstention evaluator measures. The model must decline, not extrapolate from one snapshot. |
| Tenant isolation | Zero cross-tenant leakage | Enforced by `runGuarded()`, but assert it in evals too — enforcement and evidence of enforcement are different deliverables. |

And one product metric worth more than all four: **instrument what fraction of
report and dashboard sessions end in an action** (a fix, a waiver, an outreach)
versus ending in nothing. If most dashboard sessions end in nothing, L3 replaces
them and we should say so out loud. If they end in multi-vendor forensics, they
survive and we should stop debating it. That's a measurement we can take before
committing engineering time either way — which is the cheapest thing in this
document.

---

## Honest limits of this brief

- Everything above is grounded in the prototype, which uses mock data, an
  in-memory write store, and a demo authorization server standing in for a
  customer IdP. Conclusions about *experience* transfer; conclusions about
  *performance and cost at scale* do not.
- The L1–L4 ladder is a sequence of options, not a committed roadmap. Only L1 is
  scoped tightly enough to estimate today.
- The action-rate metric in §5 has not been instrumented. Until it is, §4's split
  between the alerting and forensic halves of the dashboard is a well-argued
  hypothesis, not a measured finding.
