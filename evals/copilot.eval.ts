// Braintrust eval entry point for the TGC Compliance Agent.
//
// Run with:  npm run eval        (wraps `braintrust eval evals/`)
//
// WHAT THIS DOES
// --------------
// - Pulls a dataset BY NAME from the Braintrust project (initDataset). The
//   dataset is authored/uploaded in the Braintrust UI (Datasets tab) — this
//   file never hardcodes eval cases, so the team can grow the test set without
//   touching code. The dense, easy-to-confuse RETAILER_SUPPLIERS rows in
//   lib/retailer-requirements.ts are the raw material those cases probe.
// - Runs each case through the SAME agent the live route uses (runCopilotAgent
//   from lib/copilot/agent.ts), so the eval measures shipped behavior.
//
// SCORERS ARE INTENTIONALLY NOT DEFINED HERE (yet).
// Per the rollout plan, scorers are authored in the Braintrust UI (Scorers
// tab) — e.g. a Factuality judge for attribute/number accuracy and a
// Closed-Q&A judge for grounding — and applied to this experiment there. To
// add a code scorer later, drop it into the `scores` array below. NOTE: the
// Braintrust SDK requires at least one scorer to EXECUTE an eval, so
// `npm run eval` will not score until a scorer exists (UI-applied online
// scoring works on the logged experiment regardless).
//
// DATASET RECORD SHAPE (authored in the UI)
//   input:    string question, OR { question: string; profiles?: AttributeProfile[] }
//   expected: (optional) the reference answer the UI scorers compare against
//
// ENV: needs GEMINI_API_KEY (model) and the Braintrust API key
// (BRAINTRUST_API_KEY, or EvalTGC as provisioned on Vercel) available in the
// shell when running the eval.

import { Eval, initDataset } from "braintrust"
import { runCopilotAgent } from "@/lib/copilot/agent"
import { ATTRIBUTE_PROFILES, type AttributeProfile } from "@/lib/retailer-requirements"

const PROJECT_NAME = process.env.BRAINTRUST_PROJECT ?? "tgc-copilot"
const DATASET_NAME = process.env.BRAINTRUST_DATASET ?? "tgc-compliance-eval"

type EvalInput = string | { question: string; profiles?: AttributeProfile[] }

Eval<EvalInput, string, string>(PROJECT_NAME, {
  // Pull cases by name from the Braintrust dataset.
  data: initDataset(PROJECT_NAME, { dataset: DATASET_NAME }),

  // Task: run the case through the real agent and return its text answer.
  task: async (input) => {
    const question = typeof input === "string" ? input : input.question
    const profiles =
      typeof input === "object" && input.profiles ? input.profiles : ATTRIBUTE_PROFILES

    const { text } = await runCopilotAgent({
      messages: [{ role: "user", content: question }],
      profiles,
    })
    return text
  },

  // Scorers authored in the Braintrust UI (Scorers tab). Add code scorers here
  // when ready — see the header note above.
  scores: [],
})
