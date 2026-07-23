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

import { runGoldenEval } from "@/lib/copilot/run-eval"

// The eval logic itself lives in lib/copilot/run-eval.ts, shared with the
// in-app trigger at app/api/admin/run-eval/route.ts, so there is one
// definition of what an eval run does.
runGoldenEval()
