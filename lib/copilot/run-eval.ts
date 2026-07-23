// Shared golden-set eval runner, used by both the CLI entry (evals/copilot.eval.ts)
// and the in-app trigger (app/api/admin/run-eval/route.ts), so there is one
// definition of "what an eval run does."

import { Eval, initDataset } from "braintrust"
import { runCopilotAgent } from "@/lib/copilot/agent"
import { ATTRIBUTE_PROFILES, type AttributeProfile } from "@/lib/retailer-requirements"

const PROJECT_NAME = process.env.BRAINTRUST_PROJECT ?? "tgc-copilot"
const DATASET_NAME = process.env.BRAINTRUST_DATASET ?? "tgc-compliance-eval"

type EvalInput = string | { question: string; profiles?: AttributeProfile[] }

export async function runGoldenEval() {
  return Eval<EvalInput, string, string>(PROJECT_NAME, {
    data: initDataset(PROJECT_NAME, { dataset: DATASET_NAME }),
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
    scores: [],
  })
}
