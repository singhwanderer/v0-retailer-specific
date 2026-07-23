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
adopted **Braintrust**, a third-party LLM observability + evaluation platform,
to provide both.

---

## 2. The one-paragraph pitch

Braintrust gives us two connected feedback loops, built on the same underlying
data model:

1. **Observability (production)** — every real chat turn the agent handles is
   captured as a searchable trace: the question, the model's answer, which
   tools it called, how long it took.
2. **Evaluation (offline)** — we run the agent against a fixed set of "golden"
   test questions with known-good answers, and score how well it does, so we
   can compare before/after a change.

Because logs and eval results share the same format, a real production
conversation can later be promoted into a permanent test case with a couple of
clicks — production and our test suite stay in sync over time.

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
                     │   - wrapped in a Braintrust  │
                     │     "trace" automatically    │
                     └──────────────┬───────────────┘
                                    │
                    (response sent to user immediately —
                     does not wait on Braintrust)
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   Braintrust cloud           │
                     │   Project: "tgc-copilot"     │
                     │   → Logs tab: this trace     │
                     │     appears within seconds   │
                     └─────────────────────────────┘


              ── separately, on demand, offline ──

     Engineering runs one command: npm run eval
     (PMs never touch this — see callout below)
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │  Pulls the golden dataset    │
                     │  BY NAME from Braintrust      │
                     │  ("tgc-compliance-eval")      │
                     │  Runs each question through   │
                     │  the SAME agent code as        │
                     │  production                    │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   Braintrust cloud           │
                     │   → Experiments tab: one new │
                     │     comparable run, ready to │
                     │     score and diff            │
                     └─────────────────────────────┘
```

**Key design point:** the eval path calls the exact same agent function the
live app uses. We are never testing a mock — an eval score is a direct
prediction of production behavior.

> **Important for this room: no PM ever needs to open a terminal or run a
> command.** `npm run eval` is a one-line engineering task — think of it like
> "kick off a build." As a PM you: add/edit test questions in the Datasets UI,
> define what "correct" means in the Scorers UI, and review results in the
> Experiments UI. When you want a fresh eval run (e.g. after adding new golden
> questions), you ask engineering to trigger it — the same way you'd ask for
> any other build/deploy. A natural next step (not yet built, optional) is to
> automate this entirely — e.g. a scheduled or PR-triggered run — so it
> happens without anyone asking. Flagging that as a future ask, not something
> in place today.

---

## 4. Design principles we followed

| Principle | What we did |
| --- | --- |
| **Never risk the user experience** | Braintrust logging is wrapped around the agent call, not gating it. If Braintrust is slow, unreachable, misconfigured, or the API key is missing, the agent still runs and answers the user normally — logging silently no-ops. |
| **Minimize engineering footprint** | The entire code-side integration is ~3 files: one wrapper in the agent module, one eval entry-point script, one config line. Everything else (test data, scoring logic, dashboards, human review) is designed to live in the Braintrust UI, ownable by non-engineers. |
| **Reuse, don't rebuild** | We didn't write our own logging/eval harness. Braintrust's SDK provides the tracing wrapper and the eval runner out of the box. |
| **Secrets stay server-side** | The Braintrust API key is read only in server code, never shipped to the browser, never hardcoded, never returned in any API response. |
| **PM/SME-editable test suite** | The golden dataset lives in Braintrust itself (uploaded via the UI), not hardcoded in our codebase — so the team can add, edit, or grow test cases without an engineer or a deploy. |

---

## 5. What's code vs. what's UI — ownership map

This is the split we designed for, so that iteration doesn't bottleneck on engineering:

| Capability | Owned by | Where |
| --- | --- | --- |
| Instrumenting the agent to produce traces | Engineering | `lib/copilot/agent.ts` (one-time setup, done) |
| Viewing production conversations / debugging a bad answer | **PM/anyone with Braintrust access** | Braintrust → **Logs** |
| Adding/editing golden test questions | **PM** | Braintrust → **Datasets** |
| Defining what counts as a "correct" answer (scorers) | **PM** (no-code templates) or Engineering (custom logic) | Braintrust → **Scorers** |
| Trying a different system prompt | **PM**, without a deploy (optional, not yet wired) | Braintrust → **Prompts** |
| Running the agent against the golden set | Engineering (one command, or CI) | `npm run eval` |
| Comparing two eval runs / deciding if a change is safe to ship | **PM** | Braintrust → **Experiments** |
| Human sign-off / manual grading of real conversations | **PM/SME** | Braintrust → **Review** |
| Go/no-go release decision | **PM** | A judgment call informed by the above — not a system output |

The intent: engineers keep the plumbing thin, PMs own the judgment calls —
what "good" looks like, what test cases matter, and whether a change is safe
to release.

---

## 6. What data is involved (and what isn't)

Every traced conversation includes: the user's question, the system prompt,
the model's answer, which internal tools the agent called and their
inputs/outputs, token counts, and response time.

It does **not** include anything like a user ID, supplier ID, GTIN, product
image, or a reviewer's decision — those concepts don't exist in this feature.
The golden test dataset itself is uploaded directly into Braintrust by a PM
(via the Datasets UI or a small one-off script); it never passes through our
application code.

---

## 7. Current status

- ✅ Live production tracing is active — every chat turn is logged to
  Braintrust under project `tgc-copilot`.
- ✅ Offline evaluation is wired — `npm run eval` runs the golden set through
  the real agent and produces a comparable Experiment.
- ✅ Golden dataset (**6 seed questions** covering footwear/apparel attribute
  requirements, mandatory-attribute logic, and category-specific gap
  questions) is live in Braintrust as dataset `tgc-compliance-eval`.
- ⏳ Not yet configured: scorers (so eval runs don't have a score attached
  until one is added in the Scorers tab), and prompt-library migration (the
  system prompt still lives in code, not Braintrust's Prompts UI).

---

## 8. What's intentionally *not* built yet (and why that's fine)

To keep the initial footprint minimal and reviewable, we did **not** add:

- Automated scoring/scorers (by design — authored in the UI, when the team
  is ready to define "correct")
- CI gating on eval results (can be added later as a PR check)
- Dashboards beyond Braintrust's built-in Monitor tab
- A prompt-library migration (the system prompt is still a code constant)

None of these block the current logging/eval loop from being useful today;
they're straightforward additions once the team decides they're worth the
engineering time.

---

## 9. Key talking points for the room

- **This is not "just logging."** The same underlying data model powers both
  live debugging and our regression-test suite — a bad production answer can
  become tomorrow's test case in a couple of clicks.
- **Most of the day-to-day surface is no-code.** Once the (small) engineering
  hook was built, growing the test set, defining what "correct" means, and
  deciding whether to ship a change are all things a PM can do directly in
  Braintrust — no deploy required.
- **It's safe by construction.** The agent's behavior for real users is
  completely unaffected by Braintrust being slow, down, or misconfigured.
- **It measures the real thing.** Because evals call the exact same function
  production uses, a good eval score is a direct signal about production
  quality — not a proxy.
