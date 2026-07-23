# Braintrust for the TGC Compliance Agent — Team Guide

> Owner: (you). Purpose: explain how Braintrust is set up for the TGC Compliance
> Agent, what lives in the Braintrust **UI** vs. what lives in **code**, and how
> the team can use each surface. Everything here is grounded in the official
> Braintrust docs (linked inline), not assumptions.

---

## 1. The one-paragraph pitch

Braintrust gives us two connected feedback loops for the Compliance Agent:

1. **Observability (production)** — every call the agent makes to the model is
   captured as a searchable **trace** (input, output, tool calls, latency, cost).
2. **Evaluation (offline)** — we run the agent against a fixed **dataset** of
   test questions and **score** the answers, so we can catch regressions before
   they ship.

The important design fact: logs and experiments in Braintrust use the **same
data structure**, so a real production trace can be pulled directly into a
dataset and become a permanent test case. That is the whole reason to adopt it —
production behavior and our test suite stay in sync.
(Source: [Observe your application](https://www.braintrust.dev/docs/guides/logs).)

---

## 2. Our specific setup

| Item | Value |
| --- | --- |
| Braintrust project | `My Project` (rename to `tgc-copilot` recommended) |
| App surface being traced | `app/api/copilot/route.ts` (the agent endpoint) |
| Model provider | Google Gemini (`GEMINI_API_KEY`) |
| Braintrust API key | stored in Vercel as **`EvalTGC`** (Sensitive, Production + Preview) |
| Extraction mode flag | `NEXT_PUBLIC_EXTRACTION_MODE` |

**Env var note (important):** the Braintrust SDK looks for `BRAINTRUST_API_KEY`
by default. Our key is named `EvalTGC`, so in code we pass it explicitly:

```ts
initLogger({
  projectName: "tgc-copilot",
  apiKey: process.env.EvalTGC, // our key is named EvalTGC, not BRAINTRUST_API_KEY
})
```

Both `EvalTGC` and `GEMINI_API_KEY` are currently set for **Production and
Preview only**. If you run traces or evals **locally**, add them to your local
env (or a `.env.development.local`) as well — otherwise the SDK falls back to
un-authenticated and silently skips logging.

---

## 3. UI vs. Code — the decision matrix

This is the section the team asks about most. Each row is a left-nav item in the
Braintrust project view.

| Nav item | What it is | UI-only? | Code needed? | How we use it |
| --- | --- | --- | --- | --- |
| **Overview** | Project landing / onboarding + instrumentation snippets | UI | — | Read-only starting point |
| **Logs** | Every production trace, searchable & filterable | UI | Code writes them (`initLogger` + wrapping) | Debug real agent answers; source of new test cases |
| **Monitor** | Custom dashboards (latency, cost, tokens, scores over time) | **UI only** — charts built point-and-click or via Loop | — | Track agent latency/cost trends; no code |
| **Topics** | Auto-clusters logs into intents/sentiment/issues | **UI only** | — | Discover what users actually ask the agent |
| **Review** | Human graders score traces (thumbs, categories, corrections) | **UI only** (Pro/Enterprise) | — | SME sign-off; build ground-truth datasets |
| **Playgrounds** | No-code prompt/model/scorer iteration in the browser | **UI only** | — | Rapidly test prompt tweaks before touching code |
| **Experiments** | Immutable, comparable eval runs | Can run from **UI or code** | Code (`Eval()`) is our path for CI | The record of each eval run |
| **Datasets** | Versioned test cases (input / expected / metadata) | Can create in **UI (CSV upload)** or code | Either | We upload our seed dataset here via UI |
| **Prompts** | Versioned prompts callable from code (`invoke`/`loadPrompt`) | Can author in **UI or code** | Optional | Optional — lets us change prompts without redeploy |
| **Scorers** | Functions that grade output (0–1) or classify | **UI templates + LLM judge**, OR code | Mixed (see §4) | Grounding/factuality in UI; tool-call check in code |
| **Parameters** | Config schemas for evals (runtime values) | UI + code | Optional | Not needed for our initial setup |
| **Tools** | Code the LLM can call, deployed to Braintrust serverless | Author in **code**, push via `bt` CLI; view/test in UI | Code to author | Not needed — our tools live in our own app |
| **SQL sandbox** | Query your logs/experiments with SQL | **UI only** | — | Ad-hoc analysis of trace data |
| **Settings** | Org/project config: members, API keys, AI providers, env vars, environments | **UI only** | — | Admin: invite team, manage keys |

Sources: [Logs](https://www.braintrust.dev/docs/guides/logs),
[Monitor](https://www.braintrust.dev/docs/guides/monitor),
[Playgrounds](https://www.braintrust.dev/docs/guides/playground),
[Evals/Experiments](https://www.braintrust.dev/docs/guides/evals),
[Datasets](https://www.braintrust.dev/docs/guides/datasets),
[Prompts](https://www.braintrust.dev/docs/guides/prompts),
[Functions/Tools/Scorers](https://www.braintrust.dev/docs/guides/functions),
[Human review](https://www.braintrust.dev/docs/guides/human-review),
[Organizations/Settings](https://www.braintrust.dev/docs/reference/organizations).

---

## 4. Scorers: exactly what we do in UI vs. code

The team saw the Scorers page offering **LLM judge scorer**, **Code scorer**, and
templates (Factuality, Closed Q&A, Security, Possible, Summary, ExactMatch).
Here is our split — chosen to keep the code footprint tiny:

**Create in the Braintrust UI (no code, no deploy):**

- **Factuality** (template) — is the agent's attribute/count answer factually
  consistent with the expected answer?
- **Closed Q&A** (template) — did the agent answer the question *from the
  provided context* rather than inventing? This is our grounding check.
- Optionally an **LLM judge scorer** for "stayed in scope" (didn't answer
  out-of-scope questions about other retailers, pricing, logistics).

**Keep in code (one small deterministic scorer):**

- A **tool-call scorer** that inspects the structured output and asserts the
  agent called the correct tool (e.g. `run_compliance_report` for gap
  questions). This can't be done from a UI template because it reads structured
  tool-call data, not text. It's ~10 lines.

Why this split: UI scorers are editable by non-engineers, versioned by
Braintrust, and require no redeploy. Only the deterministic structural check
needs to live with our code.
(Source: [Write scorers / Functions](https://www.braintrust.dev/docs/guides/functions).)

---

## 5. What lives in our repo (minimal)

We deliberately keep the code surface small and push everything configurable to
the UI:

```
lib/copilot/agent.ts     # agent logic + Braintrust tracing (initLogger + wrapAISDK)
next.config.ts           # wrapNextjsConfigWithBraintrust (Next.js auto-instrumentation)
evals/copilot.eval.ts    # Eval() entry — pulls the dataset by name from Braintrust
evals/scorers.ts         # the single deterministic tool-call scorer
```

Everything else — the dataset rows, the Factuality/Closed-Q&A scorers, the
dashboards, human review — is configured in the Braintrust UI and needs no
deploy to change.

**Tracing approach (per the official Vercel/Next.js integration):** we wrap the
`ai` module once with `wrapAISDK` and wrap the Next.js config with
`wrapNextjsConfigWithBraintrust`. Braintrust auto-detects Vercel's `waitUntil`,
so no special serverless flush config is required.
(Source: [Braintrust × Vercel SDK integration](https://www.braintrust.dev/docs/integrations/sdk-integrations/vercel).)

---

## 6. The seed dataset (dense, realistic — not corrupt)

Our test cases are intentionally *dense and easy to confuse*, not broken. Hard,
realistic cases surface real agent weaknesses; obviously-wrong data doesn't.

| Case | What it stresses |
| --- | --- |
| Two near-identical supplier names (e.g. "Nike Apparel Inc." vs "Nike Apparel LLC") | Does the agent resolve the *right* supplier? |
| A dense category (Footwear, 18+ attributes) half-compliant | Does it report a *precise* gap count, not a vague answer? |
| A supplier compliant in one category, non-compliant in another | Does it scope the answer to the correct category? |
| "Is GTIN Description missing?" (a core attribute) | Does it correctly say core attrs are *always present*? |
| Dillard's requirement for a brick with no account profile | Does it handle out-of-scope gracefully? |
| A cross-vendor summary question | Does it aggregate without inventing vendor names? |

These rows are uploaded to **Datasets** in the UI (CSV/JSON upload) so anyone on
the team can extend them without a code change.

---

## 7. How to demo / run

1. **See live traces:** open the agent in the app, ask a few questions, then open
   **Logs** in Braintrust — every call appears with its tool calls and latency.
2. **Run the eval:** `npm run eval` (runs `evals/copilot.eval.ts` against the
   dataset). Results land in **Experiments** as an immutable, comparable run.
3. **Compare over time:** in **Experiments**, diff two runs to see if a prompt
   change improved or regressed scores.
4. **Watch trends:** **Monitor** dashboards show latency/cost/score over time.

---

## 8. Talking points for the team

- Braintrust is **not just logging** — the same data structure powers logging
  *and* evaluation, so production traces become test cases for free.
- **Most of the surface is no-code**: dashboards, topics, playgrounds, human
  review, most scorers, and the dataset are all managed in the UI. Engineers
  only own the thin tracing hook and one deterministic scorer.
- **Non-engineers can contribute**: PMs/SMEs can add dataset rows, tweak the
  Factuality/Closed-Q&A scorers, and grade traces in Review — no deploy needed.
- **CI-ready**: `npm run eval` can run on every PR to block regressions.
