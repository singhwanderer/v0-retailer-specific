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
| Viewing production conversations / debugging a bad answer | **PM/anyone with LangSmith access** | LangSmith → **Tracing project** |
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

It does **not** include anything like a user ID, supplier ID, GTIN, product
image, or a reviewer's decision — those concepts don't exist in this feature.
The golden test dataset is uploaded into LangSmith directly (via the UI, or a
small one-off script); it never passes through our application code.

---

## 7. Current status

- ✅ Live production tracing is active — every chat turn is logged to
  LangSmith.
- ✅ Offline evaluation is wired — the in-app button runs the golden set
  through the real agent and produces a comparable Experiment.
- ⏳ Golden dataset needs to be (re-)uploaded to LangSmith — this was
  previously uploaded to Braintrust as part of an earlier evaluation of that
  vendor; moving to LangSmith means the same CSV needs pushing into a
  LangSmith dataset named `tgc-compliance-eval`.
- ⏳ Not yet configured: evaluators/scorers (so eval runs don't have a score
  attached until one is bound in the LangSmith UI), and prompt-library
  migration (the system prompt still lives in code).

---

## 8. What's intentionally *not* built yet (and why that's fine)

To keep the footprint minimal and reviewable, we did **not** add:

- Automated scoring/evaluators (by design — authored in the UI, when the team
  is ready to define "correct")
- CI gating on eval results
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
