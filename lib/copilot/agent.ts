// TGC Compliance Agent — core agent logic, shared by the live chat endpoint
// (app/api/copilot/route.ts) and the golden-set eval (lib/copilot/run-eval.ts).
//
// This module owns everything model-related: the Gemini tool-calling loop,
// proposal extraction, and LangSmith observability. The route is now just
// HTTP glue (parse -> validate -> call runCopilotAgent -> respond).
//
// LANGSMITH TRACING
// ------------------
// - wrapAISDK(ai) instruments the Vercel AI SDK so every generateText call
//   emits a trace with prompts, tool calls, token usage, and latency.
// - traceable() wraps the whole agent function as one parent span, with the
//   generateText spans (and their tool calls) nested underneath.
// - Both read config from environment variables only (LANGSMITH_API_KEY,
//   LANGSMITH_TRACING, LANGSMITH_PROJECT) — there is no explicit init call.
//   If LANGSMITH_TRACING isn't "true" or the API key is missing, LangSmith's
//   SDK makes these wrappers no-ops: the agent still runs and answers
//   normally, just without anything recorded.

import * as ai from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { wrapAISDK } from "langsmith/experimental/vercel"
import { traceable } from "langsmith/traceable"
import { buildCopilotTools, type ProposedAction } from "@/lib/copilot/tools"
import { SYSTEM_PROMPT } from "@/lib/copilot/system-prompt"
import type { AttributeProfile } from "@/lib/retailer-requirements"

const MODEL_ID = "gemini-2.0-flash-lite"

// Wrap the AI SDK once so every model call is traced.
const { generateText } = wrapAISDK(ai)

export interface CopilotChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface CopilotAgentInput {
  messages: CopilotChatMessage[]
  profiles: AttributeProfile[]
}

export interface CopilotAgentResult {
  text: string
  proposals: ProposedAction[]
}

/** Thrown when the server is missing the Gemini key needed to run the model. */
export class CopilotConfigError extends Error {}

async function runCopilotAgentInner({
  messages,
  profiles,
}: CopilotAgentInput): Promise<CopilotAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new CopilotConfigError("GEMINI_API_KEY is missing on the server.")
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const tools = buildCopilotTools({ profiles })

  const result = await generateText({
    model: google(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: ai.stepCountIs(6),
  })

  const proposals: ProposedAction[] = result.steps
    .flatMap((step) => step.toolResults)
    .map((toolResult) => toolResult.output)
    .filter(
      (output): output is { proposal: ProposedAction } =>
        !!output && typeof output === "object" && "proposal" in output
    )
    .map((output) => output.proposal)

  return { text: result.text, proposals }
}

// traceable() records one parent span per agent run ("tgc-compliance-agent"),
// with the child generateText spans (and their tool calls) nested underneath.
export const runCopilotAgent = traceable(runCopilotAgentInner, {
  name: "tgc-compliance-agent",
})
