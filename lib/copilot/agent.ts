// TGC Compliance Agent — core agent logic, shared by the live chat endpoint
// (app/api/copilot/route.ts) and the Braintrust eval (evals/copilot.eval.ts).
//
// This module owns everything model-related: the Gemini tool-calling loop,
// proposal extraction, and Braintrust observability. The route is now just
// HTTP glue (parse -> validate -> call runCopilotAgent -> respond).
//
// BRAINTRUST TRACING
// ------------------
// - initLogger() below registers a logger once at module load. Every wrapped
//   generateText call and the wrapTraced() span below are recorded to the
//   "tgc-copilot" project in Braintrust and show up under Logs.
// - wrapAISDK(ai) is the current (SDK v2+) way to instrument the Vercel AI
//   SDK — it wraps the whole module so generateText/streamText/etc. emit spans
//   with prompts, tool calls, token usage, and latency. (wrapAISDKModel is the
//   old, deprecated single-model helper — not used here.)
// - On Vercel, Braintrust auto-detects waitUntil, so traces flush after the
//   response is sent without any extra asyncFlush wiring.

import * as ai from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { initLogger, wrapAISDK, wrapTraced } from "braintrust"
import { buildCopilotTools, type ProposedAction } from "@/lib/copilot/tools"
import { SYSTEM_PROMPT } from "@/lib/copilot/system-prompt"
import type { AttributeProfile } from "@/lib/retailer-requirements"

const MODEL_ID = "gemini-3.1-flash-lite"

// The Braintrust API key. The SDK defaults to the BRAINTRUST_API_KEY env var;
// this project provisioned the key on Vercel under the name EvalTGC, so we
// accept either. When neither is set, initLogger is skipped and the agent
// still runs — spans simply become no-ops (useful for local dev without
// Braintrust access).
const BRAINTRUST_API_KEY = process.env.BRAINTRUST_API_KEY ?? process.env.EvalTGC
const BRAINTRUST_PROJECT = process.env.BRAINTRUST_PROJECT ?? "tgc-copilot"

if (BRAINTRUST_API_KEY) {
  initLogger({ projectName: BRAINTRUST_PROJECT, apiKey: BRAINTRUST_API_KEY })
}

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

// wrapTraced records one parent span per agent run ("tgc-compliance-agent"),
// with the child generateText spans (and their tool calls) nested underneath.
export const runCopilotAgent = wrapTraced(runCopilotAgentInner, {
  name: "tgc-compliance-agent",
})
