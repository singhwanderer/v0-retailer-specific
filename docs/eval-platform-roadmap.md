# From prototype to production: a V1 plan for TGC's eval/observability, and a platform pattern for other Aviator agents
### A roadmap for Product Manager colleagues and leadership

**Companion docs:** [`eval-framework-pm-presentation.md`](./eval-framework-pm-presentation.md)
explains what exists today and how it works. [`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md)
§7 tracks OBS-01/OBS-02, the two data-protection requirements this roadmap
builds on. This document is forward-looking: what changes before this is safe
for real TGC customer data, and what of it becomes a reusable pattern once a
second Aviator domain agent needs the same thing.

---

## 1. Where this starts

Datasets, evaluators, tracing, and experimentation all exist in the TGC
prototype today. Every one of them is demo-grade in a specific, nameable way —
not a vague "needs hardening," but four concrete gaps:

- **Datasets.** Two CSVs — one hand-curated, one mechanically derived from GS1
  reference data — pushed by a one-off script
  (`scripts/upload-golden-dataset.mjs`) into a single LangSmith dataset
  (`tgc-compliance-eval`). No versioning: re-running the upload skips rows that
  already exist by exact text match, but nothing ties a past eval score to
  *which version* of the dataset produced it. The schema is
  `{question} → {answer}` only — there is no expected tool call anywhere in it.
- **Evaluators.** Bound in the LangSmith UI, but as text-answer scorers
  (Correctness, Hallucination, Conciseness) — and they only ever see the
  in-product panel's answers, never a connector call.
- **Tracing.** `wrapAISDK` + `traceable()` wrap the panel's `runCopilotAgent`
  only (`lib/copilot/agent.ts`). The external MCP connector — where every
  write, delete, and confirmation tool lives — produces no trace at all. Two
  more gaps, tracked as requirements rather than left implicit: nothing gates
  *who* can open a trace (OBS-01), and nothing redacts *what's* in one
  (OBS-02). Both are named in `mcp-enterprise-auth-trd.md` §7, not yet built.
- **Experimentation.** A trigger button hidden behind a `?tools=1` URL
  parameter and `localStorage`, gated by an `ENABLE_EVAL_TRIGGER` env var and a
  secret literally named `NEXT_PUBLIC_EVAL_TRIGGER_SECRET`
  (`app/api/admin/run-eval/route.ts`). Its own header comment calls it a
  personal/demo-grade tool. It is not a release gate, and was never meant to be.

None of this is a defect in the prototype — it's exactly the right amount of
investment for proving the concept before committing engineering time. The
point of this roadmap is naming what each of the four needs before real
customer conversations are behind it, the same discipline the auth track
already applied to the connector itself: **name the requirement before the
scope that needs it ships, not after.**

---

## 2. The V1 checklist

V1 means: **safe to run this agent against real TGC customer data.** Not a
platform, not multi-product — just TGC, for real.

| Concept | Prototype today | V1 requirement | Why it has to change | Owner |
|---|---|---|---|---|
| **Datasets** | Single unversioned dataset; text-only expected output | Versioned/tagged dataset per release. Schema extended with an expected tool-call trajectory, not just expected answer text. A defined, reviewed promotion path for turning a real (redacted) production trace into a permanent golden example. | A score is only meaningful if you know which dataset version produced it. An agent that calls tools has to be graded on *which* tools it called, not just what it said afterward. | PM owns dataset content; engineering owns the promotion pipeline and the tool-call schema. |
| **Evaluators** | Text-answer scorers, panel path only | A trajectory/tool-call-correctness evaluator. A confirmation-flow safety evaluator — never mutates without `confirm_pending_change`, never fabricates a token. At least one domain evaluator (GS1 brick/attribute validity) required, not optional. | Text-only scoring can't catch "called the wrong tool" or "skipped confirmation" — exactly the failure modes that matter most once an agent can write and delete. | PM owns rubric definition for standard scorers; engineering owns domain-specific and safety scorers. |
| **Tracing** | Panel only; no connector tracing; OBS-01/02 undone | Trace the MCP connector's tool-call path too — the natural hook is `runGuarded()` in `lib/mcp/guard.ts`, the same single choke point audit logging already uses. Tag every trace with the fields `CallerContext` already carries (tenant, tenantClass, subjectType, agentId) so traces are filterable the same way `/api/mcp-audit` already is. OBS-01 (tenant/role-gated access) and OBS-02 (redaction) built, not just named. | The connector is where the write/delete/confirm tools live — the surface where a bad turn costs the most, and today the one surface with zero observability. | Engineering. |
| **Experimentation** | Hidden button, secret in a public env var | CI-triggered runs on any change to the agent's prompt, tools, or model, with the experiment result posted back to the PR. A recorded go/no-go step — not CI-blocking yet (see the sequencing note below), but a checklist item with an owner, not tribal knowledge. | The current trigger is a demo shortcut; production needs an evaluation step someone is accountable for before shipping a change to the agent. | Engineering builds the trigger; PM owns the go/no-go. |

**On CI gating specifically:** not yet, deliberately — gating means committing
to a threshold, and a threshold set before scores are stable mostly teaches a
team to ignore a red build. The loop is useful the moment it catches a
regression in review; the gate is worth adding once scores are stable enough
that a failure means something. Same sequencing logic used to justify not
building eval coverage until the tool surface stopped moving.

---

## 3. When a customer won't accept tracing at all

Redaction (OBS-02) answers "make what's sent safe." It does not answer a
harder, entirely realistic customer position: **"we don't want our
conversations leaving our environment and reaching a third-party vendor's
dashboard — redacted or not."** That's not an edge case; it's the standard
posture of any customer whose data-processing agreement treats "sends data to
a subprocessor" as the trigger, independent of what's inside the payload. It
needs its own answer, separate from the redaction table:

- **A real per-tenant tracing switch, not just per-tenant redaction.** Tracing
  itself has to be disable-able for a given tenant — no run created at all for
  that tenant's calls, not merely a run whose content is hidden. LangSmith's
  `tracing_context` mechanism (already the tool for per-tenant *redaction*)
  extends one step further: skip emitting the trace entirely when the caller's
  tenant is flagged opted-out. This is a config decision keyed off the tenant
  registry that already exists (`lib/mcp/tenants.ts`) — not new architecture.
- **What's given up, stated plainly.** That tenant's traffic contributes
  nothing to observability — no "what did we tell this customer at 2pm"
  answer for their conversations — and nothing to the golden set via the
  real-trace-promotion path above. A customer who opts out of tracing is
  trading away the ability to have their own bad answer debugged after the
  fact. There is no version of this where they keep both.
- **The deeper version of the same ask.** Some customers won't accept *any*
  third-party subprocessor seeing their traffic at all, even with tracing
  disabled by default and redaction as a backstop — they want proof, not a
  toggle they have to trust stays off. That's what self-hosted/BYOC actually
  answers: data never reaches LangSmith's cloud in the first place, so there
  is no vendor to trust with an opt-out flag.
- **Sequencing.** Per-tenant opt-out is a V1-adjacent config decision, cheap
  once OBS-01/02 exist. Self-hosted/BYOC is a platform-level, Aviator-owned
  decision — not something each domain agent decides for itself, and not V1.

---

## 4. Beyond V1 — a platform pattern for other Aviator domain agents

TGC is the named first implementation behind the TG Aviator MCP Gateway. The
tool manifest (`lib/mcp/manifest.ts`, ENT-11) is already pitched as a
candidate *platform* registry schema for exactly that reason: it declares each
tool's authority — scope, tenant class, read/write kind, workload eligibility —
as data, not ad hoc per-tool code, so any other domain agent behind the same
Gateway can adopt the identical shape rather than reinvent it.

The same move applies to eval, once V1 has proven it works for one agent:

- **A shared evaluator library.** Platform-standard scorers — groundedness,
  refusal-on-ambiguity, tool-call correctness, confirmation-flow safety — that
  every Aviator domain agent inherits, plus a declared extension point for
  domain-specific scorers (GS1 validity for TGC, something else for the next
  agent). Declared as data, the same argument ENT-11 already makes for tool
  authority.
- **A shared trace-tagging schema.** `CallerContext`'s existing shape (tenant,
  tenantClass, subjectType, agentId) is already the right metadata schema.
  Standardizing it across every domain agent's traces is what lets a
  platform-level LangSmith view filter and aggregate across products, not just
  within TGC.
- **A reusable runner/trigger pattern.** `lib/copilot/run-eval.ts` and the
  admin trigger route are both small and mechanical — worth extracting into a
  shared template once a second domain agent needs the same thing, rather than
  each team reimplementing its own copy of both.
- **OBS-01/02 decided once, at the platform level.** Which LangSmith workspace
  strategy, which redaction defaults, which retention window — decided once by
  Aviator, not re-litigated by every domain agent that comes after TGC.
- **CI gating as an org-wide policy**, once scores are stable across more than
  one agent — not a per-team ad hoc call made in isolation.

This section is deliberately aspirational, not a commitment — the same posture
`mcp-pm-presentation.md`'s "Part 4B — Beyond the prototype" already takes on
the auth side. V1 proves the pattern once, safely, for TGC. The platform
version is the same shape, adopted a second time.

---

## Summary for the room

- **Four gaps, each nameable, none surprising.** Unversioned datasets,
  text-only evaluators, tracing that stops at the panel with no access control,
  and a demo-grade trigger. Every one has a concrete V1 fix, not a vague
  "harden it later."
- **A customer refusing tracing entirely is a real scenario with a real
  answer** — a per-tenant off switch first, self-hosted/BYOC as the escalation
  — not something to improvise if it comes up in a sales conversation.
  Bring it up before someone else does.
- **This is the same discipline as the auth track, applied a second time.**
  ENT-01–11 named every connector requirement before the connector shipped
  scope that needed it. This roadmap does the same for eval: name OBS-01/02
  and the V1 checklist now, build them before real customer data is in scope —
  not after.
- **V1 is TGC-only, on purpose.** Platform extraction is real and worth
  planning for, but it's a second phase, once the pattern has actually been
  proven once rather than designed twice from a blank page.
