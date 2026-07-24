// Shared golden-set eval runner, used by the in-app trigger
// (app/api/admin/run-eval/route.ts) so there is one definition of "what an
// eval run does."
//
// Dataset examples are expected in the shape written by
// scripts/upload-golden-dataset.mjs: inputs: { question }, outputs: { answer }.
//
// No evaluators are attached here on purpose — per the LangSmith setup, score
// definitions (exact-match, GS1 validity, evidence/abstention, LLM-as-judge)
// are authored and bound to this dataset directly in the LangSmith UI, so a
// resulting experiment picks up those scores without any code change here.

import { evaluate } from "langsmith/evaluation"
import { Client } from "langsmith"
import { runCopilotAgent } from "@/lib/copilot/agent"
import { ATTRIBUTE_PROFILES } from "@/lib/retailer-requirements"

const DATASET_NAME = process.env.LANGSMITH_DATASET ?? "tgc-compliance-eval"

export async function runGoldenEval() {
  const results = await evaluate(
    async (input: { question: string }) => {
      const { text } = await runCopilotAgent({
        messages: [{ role: "user", content: input.question }],
        profiles: ATTRIBUTE_PROFILES,
      })
      return { answer: text }
    },
    {
      data: DATASET_NAME,
      experimentPrefix: "tgc-compliance-eval",
    }
  )

  // evaluate() resolves before every row necessarily finishes streaming in —
  // consume the iterator fully so callers get an accurate row count.
  const rows = []
  for await (const row of results) {
    rows.push(row)
  }

  // This route is manually triggered and already expects a short wait, so
  // flush synchronously (unlike the chat route's after()) — better to be
  // sure the experiment fully lands in LangSmith before reporting "done".
  await new Client().awaitPendingTraceBatches()

  return { experimentName: results.experimentName, resultCount: rows.length }
}
