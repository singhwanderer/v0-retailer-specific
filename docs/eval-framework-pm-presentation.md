# Evaluation Framework for the TGC Compliance Agent
### A design & implementation walkthrough for Product Manager colleagues

---

## 1. The problem this solves

The TGC Compliance Agent is a chat assistant that answers supplier/retailer
compliance questions (e.g. "What does my footwear profile require?"). Like any
LLM feature, it can:

- give a subtly wrong answer (wrong attribute count, wrong supplier)
- regress silently when we change the prompt or swap models
- be impossible to debug after the fact, because "what did it actually say to
  the user at 2pm yesterday" is otherwise unanswerable

We needed a way to **see what the agent is doing in production** and **catch
regressions before they ship** — without building that tooling ourselves. We
adopted **LangSmith** (LangChain's LLM observability + evaluation platform) to
provide both — chosen over a comparable alternative (Braintrust) because we
already have LangSmith set up and in use internally for other projects, so
this reuses an existing vendor relationship rather than starting a new one.

---

## 2. The one-paragraph pitch

LangSmith gives us two connected feedback loops, built on the same underlying
data model:

1. **Observability (production)** — every real chat turn the agent handles is
   captured as a searchable trace: the question, the model's answer, which
   tools it called, how long it took.
2. **Evaluation (offline)** — we run the agent against a fixed set of "golden"
   test questions with known-good answers, and score how well it does, so we
   can compare before/after a change.

Because logs and evaluation datasets share the same underlying platform, a
real production conversation can be promoted into a permanent test case —
production and our test suite stay in sync over time.

---

## 3. How it actually works — plain-text architecture

```
                     ┌─────────────────────────────┐
                     │   User opens the app and     │
                     │ asks the Compliance Agent a  │
                     │        question              │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   POST /api/copilot          │
                     │   (our Next.js API route)    │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   runCopilotAgent()          │
                     │   - the Gemini tool-calling  │
                     │     loop                     │
                     │   - wrapped in a LangSmith   │
                     │     "trace" automatically    │
                     └──────────────┬───────────────┘
                                    │
                    (response sent to user immediately —
                     does not wait on LangSmith)
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   LangSmith cloud            │
                     │   → this trace appears in    │
                     │     your project within      │
                     │     seconds                  │
                     └─────────────────────────────┘


              ── separately, on demand, offline ──

     A discreet button on the supplier attributes screen
     (hidden unless you know to enable it — see status below)
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │  Pulls the golden dataset    │
                     │  BY NAME from LangSmith       │
                     │  ("tgc-compliance-eval")      │
                     │  Runs each question through   │
                     │  the SAME agent code as        │
                     │  production                    │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   LangSmith cloud            │
                     │   → a new Experiment, ready  │
                     │     to score and compare in   │
                     │     the LangSmith UI          │
                     └─────────────────────────────┘
```

**Key design point:** the eval path calls the exact same agent function the
live app uses. We are never testing a mock — an eval score is a direct
prediction of production behavior.

> **No PM ever needs to open a terminal or run a command.** Kicking off a
> fresh eval run is a single click on the button described above — there is
> no `npm run` step to ask engineering for. Everything else (adding test
> questions, defining scorers, comparing runs) happens directly in the
> LangSmith UI.

---

## 4. Design principles we followed

| Principle | What we did |
| --- | --- |
| **Never risk the user experience** | LangSmith tracing wraps the agent call, it doesn't gate it. If LangSmith is slow, unreachable, misconfigured, or the API key is missing, the wrapper becomes a no-op — the agent still runs and answers the user normally. |
| **Minimize engineering footprint** | The code-side integration is a handful of files: a tracing wrapper in the agent module, a shared eval-runner function, and the button's API route. Test data, scoring logic, dashboards, and human review are designed to live in the LangSmith UI. |
| **Reuse, don't rebuild** | We didn't write our own logging/eval harness, and we didn't onboard a new vendor — LangSmith is already used elsewhere internally. Its SDK provides the tracing wrapper (`wrapAISDK`) and the eval runner (`evaluate`) out of the box. |
| **Secrets stay server-side** | The LangSmith API key is read only in server code, never shipped to the browser, never hardcoded, never returned in any API response. |
| **PM/SME-editable test suite** | The golden dataset lives in LangSmith itself, not hardcoded in our codebase — so the team can add, edit, or grow test cases without an engineer or a deploy. |

---

## 5. What's code vs. what's UI — ownership map

This is the split we designed for, so that iteration doesn't bottleneck on engineering:

| Capability | Owned by | Where |
| --- | --- | --- |
| Instrumenting the agent to produce traces | Engineering | `lib/copilot/agent.ts` (one-time setup, done) |
| Viewing production conversations / debugging a bad answer | **PM/anyone with LangSmith access** — see §6a/OBS-01: this is today's demo-mock reality, not the production access model. Real customer traces need the same tenant + role gate the audit log already has | LangSmith → **Tracing project** |
| Adding/editing golden test questions | **PM** | LangSmith → **Datasets** (import from CSV, or add rows by hand) |
| Defining what counts as a "correct" answer (scorers) | **PM** (pre-built templates: Correctness, Hallucination, Conciseness — or a custom rubric) or Engineering (a domain-specific check like GS1 validity) | LangSmith → **Evaluators** |
| Kicking off a fresh eval run | **PM** | The button on the supplier attributes screen (no terminal) |
| Comparing two eval runs / deciding if a change is safe to ship | **PM** | LangSmith → **Experiments** |
| Human sign-off / manual grading of real conversations | **PM/SME** | LangSmith → **Annotation queue / Review** |
| Go/no-go release decision | **PM** | A judgment call informed by the above — not a system output |

The intent: engineers keep the plumbing thin, PMs own the judgment calls —
what "good" looks like, what test cases matter, and whether a change is safe
to release.

One honest caveat: a domain-specific check like "is this GTIN/brick-code
combination actually valid against our GS1 reference data" is not something
any generic platform template can express — that one requires a small piece
of engineer-written code regardless of vendor. Everything else in the table
above is genuinely UI-only.

---

## 6. What data is involved (and what isn't)

Every traced conversation includes: the user's question, the system prompt,
the model's answer, which internal tools the agent called and their
inputs/outputs, token counts, and response time.

**Correction to an earlier version of this doc:** that trace *does* include
supplier and vendor names, attribute profile names, and compliance numbers —
they're inside the free-text question/answer and inside tool-call arguments
and results (e.g. `get_supplier_compliance` returns exactly the numbers a
customer would consider their own compliance data). In this demo that's all
mock, so it's a non-issue today. Once real customer data is behind this
feature, that statement is no longer true, and nothing in the code redacts any
of it before it reaches LangSmith — see the next section.

It does **not** include a user ID, GTIN, product image, or a reviewer's
decision — those concepts genuinely don't exist in this feature. The golden
test dataset is uploaded into LangSmith directly (via the UI, or a small
one-off script); it never passes through our application code.

## 6a. Data protection for LangSmith tracing

**The honest framing first, because it's the actual finding here, not just
"redaction is missing":** the auth track (`mcp-enterprise-auth-trd.md`,
ENT-01–11) named every one of these problems for the MCP *connector* and built
the controls before shipping the scope that needed them — that's the whole
point of that document's closing line, "we are not adding scope faster than we
are adding the controls it requires." The observability track didn't follow
that discipline. Full-content tracing shipped with no tenant gating, no role
gating, and no redaction. That's the gap, tracked as **OBS-01** and **OBS-02**
in the TRD's new §7 — read that section for acceptance criteria and ownership;
this section is the trade-off table behind the recommendation.

**What's actually available**, verified against LangSmith's SDK (matches
`langsmith: ^0.8.6`, already pinned in this repo):

| Lever | Protects | Tracing value retained | Cost | Verdict |
|---|---|---|---|---|
| **Do nothing** (today) | Nothing | Everything | Zero | Fine for mock data only. Not acceptable once real customer data flows. |
| **Blanket hide** (`hideInputs`/`hideOutputs: true`, env or `Client` config) | All content | Tool names, call order, latency, tokens, pass/fail | ~Zero — one config line | Right default for **live production** traces. Wrong for the **golden-set eval** — you can't score an answer you can't see, and the eval only ever runs synthetic questions anyway, so there's nothing to protect there. |
| **Custom redaction function** (`hideInputs`/`hideOutputs` accept a function, not just a boolean) | Whatever the function strips | Structure + whatever's allow-listed as safe | Real — define what's sensitive across ~29 tools | The right long-term shape, but sequence it once the tool surface stops moving — same logic already used to sequence eval itself. Must be an allow-list (default-deny), not a deny-list: a deny-list ships a new field unredacted the day a tool adds one. |
| **Regex/NER anonymizer** (LangSmith's `create_anonymizer`, or Presidio/Comprehend) | PII-shaped text (emails, human names) | Almost everything | Moderate | Weak fit for *this* domain — compliance jargon, brick codes, vendor legal-entity names don't look like generic PII to an NER model. Better for stray human PII than for the compliance data itself. |
| **Per-tenant scoping** (`tracing_context`) | Lets one customer opt out of content tracing without changing the global default | Full for everyone else | Low, once a redaction function exists | The mechanism that makes this a per-customer contractual answer, not one global policy. |
| **Workspace separation + RBAC** (Enterprise plan) | *Who* can open a trace, not its content | Everything, for the people who should see it | Enterprise plan | **Highest leverage — do this first.** Mirrors the audit log's own ENT-10 property ("tenant-scoped, admin-gated"), which LangSmith tracing has neither of today: one shared project, no gate on who inside the org can open any trace. |
| **Retention window** | Exposure that accumulates over time | Unaffected | Config only | Do regardless of every other choice — independent, not a substitute. |
| **Self-hosted / BYOC** (Enterprise add-on) | Everything — data never reaches a third-party cloud | Everything | Highest — real infra to run | The fallback answer for a customer whose DPA forbids any third-party subprocessor touching their data at all. Not a default; the answer that has to exist. |

**Recommended default, stated as the answer to give:**

1. The golden-set eval keeps full visibility always — it's synthetic test
   data, not customer data, so there is nothing to protect there.
2. Live production tracing: workspace separation + RBAC first (parallels
   ENT-10 directly), content redaction (an allow-list function) before any
   real customer data is in scope — named now, built when that's imminent,
   same pattern as ENT-07's outbound-passthrough rule.
3. `tracing_context` gives a customer whose contract requires it a harder
   opt-out without changing the default for everyone else.
4. A retention window is set explicitly, independent of the above.
5. Self-hosted/BYOC is the named fallback for a DPA that won't allow any
   third-party subprocessor at all.

**One vendor-side fact worth re-checking on every LangSmith SDK upgrade rather
than assuming once:** JS SDK versions before 0.5.19 had `hideOutputs` not
covering *streaming token events* — content leaked through the trace's events
array even with output hiding turned on (CVE-2026-41182 / GHSA-rr7j-v2q5-chgv).
This repo's pinned version postdates the fix, but it's the kind of thing a
redaction control can silently stop doing its job on a routine dependency bump,
so it belongs in whatever checklist gates a `langsmith` version bump, not just
in this paragraph.

---

## 7. Current status

- ✅ Live production tracing is active — every chat turn is logged to
  LangSmith.
- ✅ Offline evaluation is wired — the in-app button runs the golden set
  through the real agent and produces a comparable Experiment.
- ✅ Golden dataset is uploaded to LangSmith (`tgc-compliance-eval`).
- ✅ Evaluators/scorers are bound to that dataset in the LangSmith UI, so an
  experiment comes back with scores attached rather than as an unscored run.
- ⏳ Coverage stops at the in-product agent. The golden set runs through
  `runCopilotAgent` — the same path `/api/copilot` uses — and does **not**
  exercise the external MCP connector's tool layer (`lib/mcp/tools.ts`). A
  question asked from claude.ai produces no trace and is not graded. Extending
  the loop to the connector path is the next piece of work.
- ⏳ Prompt-library migration — the system prompt still lives in code.
- ⏳ **Trace data protection (OBS-01, OBS-02 in the TRD).** No tenant/role gate
  on who can open a trace, and no content redaction. Harmless today because
  every trace is mock data; not harmless the day real customer conversations
  are traced. See §6a.

The loop is demonstrable end-to-end today: see Beat 4b of
[`demo-script-compliance-mcp.md`](./demo-script-compliance-mcp.md), which drives
it live from the panel into the LangSmith UI.

---

## 8. What's intentionally *not* built yet (and why that's fine)

To keep the footprint minimal and reviewable, we did **not** add:

- **Eval coverage of the MCP connector path.** The golden set grades the
  in-product agent only. This is the most substantive gap of the four and the
  next one to close — the connector is where the write, delete and confirmation
  tools live, so it is the surface where behaviour matters most.
- **CI gating on eval results.** A sequencing call: gating means committing to a
  threshold, and a threshold set before the tool surface has settled mostly
  teaches the team to ignore a red build. Worth adding once scores are stable
  enough that a failure means something.
- Any new hosting/infrastructure (AWS, a new Vercel route beyond the existing
  button, etc.) — everything runs on infrastructure we already have
- A prompt-library migration (the system prompt is still a code constant)

None of these block the current logging/eval loop from being useful today;
they're straightforward additions once the team decides they're worth the
engineering time — and each one would be flagged and scoped before being built.

---

## 9. Key talking points for the room

- **This is not "just logging."** The same underlying platform powers both
  live debugging and our regression-test suite — a bad production answer can
  become tomorrow's test case.
- **Most of the day-to-day surface is no-code.** Once the (small) engineering
  hook was built, growing the test set, defining what "correct" means, kicking
  off a run, and deciding whether to ship a change are all things a PM can do
  directly — no terminal, no deploy required.
- **It's safe by construction.** The agent's behavior for real users is
  completely unaffected by LangSmith being slow, down, or misconfigured.
- **It measures the real thing.** Because evals call the exact same function
  production uses, a good eval score is a direct signal about production
  quality — not a proxy.
- **This reused what we already had.** No new vendor relationship, no new
  billing plan, no new AWS/infra footprint — LangSmith was already part of
  our stack for other projects.
- **The data-protection question has an answer, and it's not built yet.** Named
  now as OBS-01/OBS-02 in the TRD rather than discovered under pressure later:
  workspace/RBAC gating on who can open a trace comes first, content redaction
  before real customer data is in scope, both before either is strictly needed
  today. Mock data means there's nothing to expose yet — that's a grace period,
  not a reason to skip naming the requirement.

**What comes next, and what it becomes for other Aviator agents:**
[`eval-platform-roadmap.md`](./eval-platform-roadmap.md) — the V1 checklist
for going from this prototype to something safe against real TGC customer
data, and the platform pattern once a second Aviator domain agent needs the
same thing.
