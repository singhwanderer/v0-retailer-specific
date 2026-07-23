# Braintrust integration — AI evals for the TGC Compliance Agent

## Context

The retailer portal has exactly one real LLM-in-the-loop component: the "TGC Compliance Agent" chat panel, served by `app/api/copilot/route.ts` (Gemini `gemini-3.1-flash-lite` via the Vercel AI SDK, tool-calling loop over `lib/copilot/tools.ts`). There is no test framework, no eval tooling, and no observability anywhere in the repo today — confirmed by exploring `package.json` (no vitest/jest), the repo root (no `.github/workflows`), and the route/tool files (no logging, no tracing).

You want to use this project as a live demonstration to your team of how to set up AI evals with Braintrust, and to become fluent with the workflow yourself: instrument the live agent with Braintrust tracing now (using your existing `BRAINTRUST_API_KEY` and `GEMINI_API_KEY`), then socialize the prototype so real conversations accumulate as trace data, and separately run offline evals against a golden dataset you already have on your machine and will upload to Braintrust yourself.

Decisions made with you:
- **Scope**: copilot chat agent only (not the deterministic MCP tool functions — those aren't LLM behavior). Task-based/autonomous agents are explicitly out of scope for this round — different trust model and eval design (trajectory, not single-turn); a natural fast-follow once this eval muscle exists.
- **CI**: local/manual only for now (`npm run eval`) — no `.github/workflows` added.
- **Tracing**: yes, wire up live Braintrust logging on the production route, not just offline evals.
- **Dataset**: you already have a golden set locally and will upload it to Braintrust yourself. I will not invent one — the eval script pulls a Braintrust `Dataset` by name, and I'll document the row schema the scorers expect so you can align your upload to it.
- **Data-quality precondition**: while exploring, I found a real (not hypothetical) staleness bug where Screen 1's summary text can drift from Screen 2's live counts — see §0 below. Fixing this first matters for the demo: without it, the agent could report figures grounded in a stale UI string.
- **Hallucination-surface seed data**: add a few adversarial rows to the mock dataset (near-duplicate names, an orphan profile, a supplier/exception mismatch) so the demo can show the eval suite actually catching something, not just passing a suite of easy questions.
- **System prompt**: moves to its own file (`lib/copilot/system-prompt.ts`) so you can swap/version it independently of the agent logic, and gets a redundancy pass — same six rules, ~40% shorter. See §1.

## What gets built

### 0. Fix: Screen 1's requirement summary can go stale vs. Screen 2's live counts

**Verified, not hypothetical.** `AttributeProfile.attributes` (the "Requirements" column text on the landing screen, e.g. `"34 attributes · 1 image requirement"`) is a display string computed by `describeProfileAttributes()` in `lib/mcp/attribute-assembly.ts:86-100`. It's correctly recomputed and written back via `onUpdateProfile` in exactly one place: `commitAddBrick()` in `components/portal/screen2-profile-detail.tsx:1079-1090` (adding a new GS1 category to a profile).

It is **not** recomputed in two other places that also change the underlying attribute/image count for a brick:
- `handleAddAttr()` (`screen2-profile-detail.tsx:1036-1042`) — adding a custom core/extended attribute calls `addAttributeRequirement()` then only `refresh()` (local state) + a toast. `onUpdateProfile` is never called.
- `applyProposal()` in `components/portal/compliance-agent-panel.tsx:109-144` — when the copilot's `add_attribute_requirement` or `set_image_requirement` proposal is applied, it calls the real mutating functions from `lib/mcp/tools.ts` but never touches the profile's `attributes` string at all. Worse, this component doesn't even receive `onUpdateProfile` as a prop today (`compliance-agent-panel.tsx:24-27` only takes `onCreateProfile`).

Net effect: add a custom attribute or image requirement — via Screen 2's "+ Add Attribute" or via the copilot chat — and Screen 1's landing count silently falls behind what Screen 2 (the "level 2" detail view) actually shows. For the demo this is exactly the wrong kind of bug to have live: someone could ask the agent "how many attributes does Footwear require" and get the *correct* live number, then check the landing screen and see a different, stale one, and wrongly conclude the agent hallucinated.

**Fix** (small, contained to the two call sites above plus one prop thread):
1. In `screen2-profile-detail.tsx`, `handleAddAttr()` and `handleAddImage()` (`:1051-1057`) both call `onUpdateProfile?.(profileKey, { attributes: describeProfileAttributes(bricks), lastUpdated: today() })` after `refresh()`, mirroring exactly what `commitAddBrick()` already does correctly.
2. Thread `onUpdateProfile: (name: string, updates: Partial<AttributeProfile>) => void` into `ComplianceAgentPanelProps` (`compliance-agent-panel.tsx:24-27`), passed down from `app/page.tsx` (which already owns and passes `onUpdateProfile` to Screen 1/2).
3. In `applyProposal()`'s `add_attribute_requirement` and `set_image_requirement` branches, after a successful result, resolve the owning profile with `findProfileForBrick(profiles, brickCode)` (already imported pattern, from `lib/mcp/attribute-assembly.ts`), then call `onUpdateProfile(profile.name, { attributes: describeProfileAttributes(getProfileBricks(profile)), lastUpdated: today() })`.

This ships *before* the eval work below — it's a precondition for the demo being credible, not part of the eval tooling itself.

### 1. Extract the system prompt into its own file — `lib/copilot/system-prompt.ts`

You asked for the prompt to live in its own file, referenced by code, so you can swap/test versions without touching logic. Simplest form that still type-checks and needs no runtime file I/O (works identically in a Vercel serverless/edge function and in the eval script):

```ts
// lib/copilot/system-prompt.ts
export const SYSTEM_PROMPT = `...`
```

`app/api/copilot/route.ts` and (after §2) `lib/copilot/agent.ts`/`evals/copilot.eval.ts` all import `SYSTEM_PROMPT` from this one file — one source of truth, no drift between what runs live and what's evaluated. To A/B two prompt versions, you'd duplicate this file (e.g. `system-prompt.v2.ts`) and switch the import — trivial diff, no logic touched. If you'd rather edit the prompt as plain text without touching a `.ts` file at all, the alternative is a `.md`/`.txt` file read via `fs.readFileSync` at module load — flag if you want that instead; the `.ts` constant is the lower-friction default since it needs no filesystem access in serverless and gets type-checked.

**Content — redundancy pass.** I read the current inline prompt (`app/api/copilot/route.ts:22-34`) line by line. Redundant patches, all preserving the same constraints: the opening SCOPE paragraph re-explains "can't edit or delete" in two sentences that say the same thing; CORE ATTRIBUTES and GROUNDING are really one rule ("don't fabricate or misreport data") split across two headed paragraphs; and WRITES states "returns a proposal, not applied" three separate times (in the tool list, in "make clear... still needs to click Apply," and again in "do not say... done"). Tightened version, same rules, nothing dropped:

```
You are the TGC Compliance Agent, embedded in the retailer view of OpenText Trading Grid Catalogue (TGC), a B2B catalog data-sync network. You are speaking with a retailer (Dillard's) user.

SCOPE: read and report on the retailer's attribute profiles and supplier compliance; create new profiles, attribute requirements, and image requirements. You cannot edit or delete anything that exists — redirect such requests to the Attributes & Images screen, and never simulate an edit by creating a replacement.

GROUNDING: answer only from tool results — never invent profile names, suppliers, categories, or numbers. The 8 baseline attributes (Product ID, Product Description, GTIN code, GTIN Description, NRF Size Code, NRF Color Code, Size Description, Color Description) are always present by design — never report them as missing or as gaps, even if a tool result lists one. If a read tool finds no match, relay any suggested names/statuses it offers instead of just saying "not found."

OUT OF SCOPE: other retailers' data, vendor exceptions (waivers, extended deadlines, reduced scope), supplier-side questions, sales, logistics, pricing — say so plainly rather than guessing.

WRITES: create_attribute_profile, add_attribute_requirement, and set_image_requirement only draft a proposal — nothing is applied until the user clicks Apply. State the proposed change plainly and never say it's done.

This is a watermarked demo; say so if asked whether the data is live. Keep answers concise.
```

~40% shorter, same six rules (scope, no edit/delete, grounding, core-attribute exclusion, out-of-scope list, write-is-proposal-only). **This changes live agent behavior, not just refactors code** — wording changes can shift how a model follows instructions even when the rules are logically identical. Treat this as a real prompt edit: keep the original inline text as a comment or a `system-prompt.v1.ts` alongside it for a quick rollback, and run the eval suite (once built, §5) against both versions before trusting the shorter one in production — that's a natural first real experiment to show the team, since a functioning eval suite is exactly what makes swapping prompt versions safe to do at all.

### 2. Extract shared agent logic — `lib/copilot/agent.ts`

Currently `app/api/copilot/route.ts` inlines the whole agent call (`buildCopilotTools`, `generateText`, proposal extraction). Both the live route and the eval task need to run the *exact same* logic, so pull it into one function:

```ts
// lib/copilot/agent.ts
import { SYSTEM_PROMPT } from "@/lib/copilot/system-prompt"

export async function runCopilotAgent(
  { messages, profiles }: { messages: ChatMessage[]; profiles: AttributeProfile[] },
  apiKey: string
): Promise<{ text: string; proposals: ProposedAction[]; toolCalls: {name: string; args: unknown}[] }>
```

This moves (not rewrites) `MODEL_ID`, the `generateText` call, and the proposal-flattening logic verbatim out of `route.ts`, and imports `SYSTEM_PROMPT` from the new file in §1 rather than inlining it. It also captures `toolCalls` from `result.steps` (name + input) alongside the existing `proposals` extraction, since eval scorers need to check *which* tools the model chose, not just final text. `route.ts` becomes a thin HTTP wrapper: parse body → call `runCopilotAgent` → `Response.json(...)`. No behavior change to the live endpoint beyond the prompt-wording change in §1.

### 3. Braintrust tracing on the live route

Inside `lib/copilot/agent.ts`:
- `initLogger({ projectName: "tgc-copilot", apiKey: process.env.BRAINTRUST_API_KEY })` once at module scope, only when `BRAINTRUST_API_KEY` is set (falsy-key guard, same pattern the file already uses for `GEMINI_API_KEY` in `route.ts`) — so the endpoint keeps working with tracing simply off if the key is ever absent (useful to show the team as a resilience pattern, not just for you).
- Wrap the Gemini model passed into `generateText` with Braintrust's Vercel AI SDK integration (`wrapAISDKModel` from the `braintrust` package) so every `generateText` call — including intermediate tool-calling steps — is captured as a trace automatically, with no manual span bookkeeping.
- Every real conversation through the copilot panel (`components/portal/compliance-agent-panel.tsx` → `/api/copilot`) now shows up in the Braintrust UI's Logs view for that project. This is the data source you'll later curate into eval datasets as you socialize the prototype.

### 4. Eval script — `evals/copilot.eval.ts`

Uses Braintrust's `Eval()` runner:

```ts
import { Eval, initDataset } from "braintrust"
import { runCopilotAgent } from "@/lib/copilot/agent"
import { toolCallCorrectness, proposalCorrectness, scopeAndGroundingJudge } from "./scorers"

Eval("tgc-copilot", {
  data: initDataset({ project: "tgc-copilot", dataset: process.env.BRAINTRUST_DATASET ?? "copilot-golden" }),
  task: async (input) => runCopilotAgent(input, process.env.GEMINI_API_KEY!),
  scores: [toolCallCorrectness, proposalCorrectness, scopeAndGroundingJudge],
})
```

`initDataset` pulls **your** uploaded dataset by name/project — nothing is fabricated in-repo. Because I don't have your dataset's actual rows, the scorers below are written against a documented row contract (see docs file, §"Dataset schema") rather than against real examples; flag this to the team as the one part of the setup that may need a quick alignment pass once your data is uploaded, and adjust the scorer field names then if your schema differs.

### 5. Scorers — `evals/scorers.ts`

Three scorers, each demonstrating a different Braintrust pattern (deliberately, since this is a teaching example):

- **`toolCallCorrectness`** — deterministic/programmatic scorer. Compares `output.toolCalls` (names + key args) against `expected.toolCalls` from the dataset row. Set-based match (right tools called, regardless of order) — the kind of check that doesn't need an LLM judge.
- **`proposalCorrectness`** — deterministic scorer for write-intent prompts. Compares `output.proposals` against `expected.proposal` (tool name + args), for rows exercising `create_attribute_profile` / `add_attribute_requirement` / `set_image_requirement`.
- **`scopeAndGroundingJudge`** — LLM-as-judge scorer (Braintrust `LLMClassifierFromSpec` or a custom judge prompt) that checks `output.text` against the actual rules in `lib/copilot/system-prompt.ts` (§1): never cites the 8 core attributes as gaps, refuses out-of-scope topics (vendor exceptions, other retailers, sales/logistics/pricing) instead of guessing, and never claims a proposal was "applied." This is the scorer type worth walking the team through, since it's judging instruction-following rather than an exact match. Because the judge criteria are sourced from the same file the prompt lives in, swapping prompt versions (§1) and re-running the eval is a clean before/after comparison — exactly the workflow worth demoing.

**Determinism note**: neither tool selection nor judge scoring is perfectly deterministic run-to-run. `runCopilotAgent` should pass `temperature: 0` to `generateText` when invoked from the eval task (not necessarily live, where some variation is fine) to reduce flakiness, and the eval config should note that a single flaky row is expected occasionally — don't chase 100% pass rate as the demo's success criterion, trend-over-time is the more honest story.

**SDK verification note**: the exact call shapes for `initLogger`, `wrapAISDKModel`, `initDataset`, and `Eval` (import paths, option field names) should be checked against the current `braintrust` package docs at implementation time, not assumed from this plan — SDKs move fast and I have not run this code yet.

### 6. `package.json`

- Add `braintrust` as a dependency (covers both the `Eval()` runner and `initLogger`/`wrapAISDKModel`).
- Add script: `"eval": "braintrust eval evals/copilot.eval.ts"`.

### 7. `.env.example` (new file — none exists today)

Documents all four env vars the app now uses, since there's currently no committed reference for any of them:
```
GEMINI_API_KEY=
BRAINTRUST_API_KEY=
BRAINTRUST_PROJECT=tgc-copilot
BRAINTRUST_DATASET=copilot-golden
```

**Note**: `GEMINI_API_KEY` and `BRAINTRUST_API_KEY` are already stored in Vercel project settings, so the deployed instance has live tracing and Gemini API access. The `.env.example` file serves as documentation for local development and team reference.

### 8. Hallucination-surface seed data — `lib/retailer-requirements.ts`

A handful of new rows added to existing arrays (not a schema change), specifically so the golden dataset has real edge cases to probe rather than only happy-path questions:
- A near-duplicate supplier name in `RETAILER_SUPPLIERS`, e.g. `"J.Renée Wide"` alongside the existing `"J.Renée"` — exercises `get_supplier_compliance`'s substring match (`lib/copilot/tools.ts:119-131`), which can currently return either or both depending on query phrasing.
- A profile in `ATTRIBUTE_PROFILES` with an empty `bricks: []` (the Screen-1 "skip" path already supported by the type, per `screen1-attribute-profiles.tsx:642-658`) — tests whether the agent says "no GS1 mapping / baseline only" instead of inventing an attribute count for it.
- A `VENDOR_EXCEPTIONS` row for a vendor name not present in `RETAILER_SUPPLIERS` — since exceptions are explicitly out-of-scope for this agent (`SYSTEM_PROMPT`'s OUT OF SCOPE line), this checks the agent doesn't accidentally surface exception data when asked about that vendor's compliance.

Each addition gets a matching golden-dataset row (documented in `docs/braintrust-evals.md`) so these are actually exercised in `npm run eval`, not just latent in the seed data.

### 9. `docs/braintrust-evals.md`

Team-facing walkthrough, matching the style of the existing `docs/mcp-getting-started.md` / `docs/feature-compliance-reports.md`:
- What's traced (live copilot conversations) vs. what's evaluated (offline `Eval()` run against a Dataset).
- **Dataset schema** each eval row is expected to follow: `input: {messages: ChatMessage[], profiles: AttributeProfile[]}`, `expected: {toolCalls?: {name, args}[], proposal?: ProposedAction, mustAvoid?: string[]}` — spelled out so you can align your local golden set before uploading, and so teammates know the shape when they add new rows via the Braintrust UI later.
- How to run: `npm run eval`, where results appear (Braintrust UI → Experiments), how tracing shows up (Braintrust UI → Logs) once the panel is used with `BRAINTRUST_API_KEY` set.
- How to grow the dataset from real usage: Braintrust's log-to-dataset curation flow (select good/bad logged traces in the UI, promote to the `copilot-golden` dataset) — this is the mechanism that makes "socialize the prototype, then eval on real interactions" concrete.

## Files touched

| File | Change |
|---|---|
| `components/portal/screen2-profile-detail.tsx` | Fix: `handleAddAttr`/`handleAddImage` now call `onUpdateProfile` with a recomputed `describeProfileAttributes`. |
| `components/portal/compliance-agent-panel.tsx` | Fix: accepts `onUpdateProfile` prop; `applyProposal`'s attribute/image branches recompute and persist the summary string. |
| `app/page.tsx` | Pass `onUpdateProfile` down to `ComplianceAgentPanel`. |
| `lib/retailer-requirements.ts` | Add a few hallucination-surface seed rows (see §8). |
| `lib/copilot/system-prompt.ts` | **New.** `SYSTEM_PROMPT` moved out of `route.ts`, redundancy-trimmed (see §1). |
| `lib/copilot/agent.ts` | **New.** Extracted agent-invocation logic + Braintrust tracing wrapper; imports the prompt from the file above. |
| `app/api/copilot/route.ts` | Trimmed to HTTP glue calling `runCopilotAgent`. |
| `evals/copilot.eval.ts` | **New.** Braintrust `Eval()` entry point. |
| `evals/scorers.ts` | **New.** Three scorer functions. |
| `package.json` | Add `braintrust` dep + `eval` script. |
| `.env.example` | **New.** |
| `docs/braintrust-evals.md` | **New.** |

No changes to `lib/mcp/*`, the MCP server route, or the chat panel's request/response contract (`{text, proposals}`).

## Verification

1. **Screen 1/2 consistency fix**: in the browser, open a profile, add a custom attribute via "+ Add Attribute" on Screen 2, go back to Screen 1 → the "Requirements" column count should now reflect the addition immediately. Repeat via the copilot chat (ask it to add a custom attribute, click Apply on the proposal card) → same check.
2. `npm install` — pulls in `braintrust`.
3. Set `GEMINI_API_KEY` and `BRAINTRUST_API_KEY` in your local env (or Vercel project settings for the deployed instance).
4. `npm run dev`, use the Compliance Agent panel for a few turns (including one out-of-scope question, one create-profile request, and one query that hits a hallucination-surface row like the near-duplicate supplier name) → confirm traces appear in the Braintrust UI under the `tgc-copilot` project's Logs.
5. Confirm `app/api/copilot/route.ts` still returns the same `{text, proposals}` shape and the panel's Apply-card flow still works unchanged.
6. Upload your local golden dataset to Braintrust as `copilot-golden` (or set `BRAINTRUST_DATASET` to whatever name you use), aligned to the schema in `docs/braintrust-evals.md` — including rows for the new hallucination-surface seed data.
7. `npm run eval` → confirm an Experiment appears in the Braintrust UI with per-row scores from all three scorers; spot-check a couple of rows against your real data, and adjust field names in `evals/scorers.ts` if your dataset's actual shape differs from the documented contract.
