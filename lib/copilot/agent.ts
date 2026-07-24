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

const MODEL_ID = "gemini-3.5-flash-lite"

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

/** Points the retailer user to an in-app screen where they can verify an
 *  answer themselves — deterministically derived from which tools fired,
 *  never guessed by the model (see TOOL_SOURCE_SCREENS below). */
export interface CopilotSource {
  screen: "dashboard" | "attribute-profiles" | "compliance-reports"
  label: string
}

export interface CopilotAgentResult {
  text: string
  proposals: ProposedAction[]
  sources: CopilotSource[]
}

/** Thrown when the server is missing the Gemini key needed to run the model. */
export class CopilotConfigError extends Error {}

// Deterministic tool -> screen mapping for CopilotSource. This is fixed code,
// not something the model decides — the system prompt is never told to
// "cite a screen," since an LLM guessing at UI structure would be exactly
// the kind of hallucination this feature is meant to avoid. get_capabilities
// is deliberately absent: it's a meta answer, not something any one screen
// verifies.
const TOOL_SOURCE_SCREENS: Record<string, CopilotSource> = {
  get_profile_detail: { screen: "attribute-profiles", label: "Attributes & Images" },
  list_attribute_profiles: { screen: "attribute-profiles", label: "Attributes & Images" },
  search_gs1_bricks: { screen: "attribute-profiles", label: "Attributes & Images" },
  create_attribute_profile: { screen: "attribute-profiles", label: "Attributes & Images" },
  add_attribute_requirement: { screen: "attribute-profiles", label: "Attributes & Images" },
  set_image_requirement: { screen: "attribute-profiles", label: "Attributes & Images" },
  run_compliance_report: { screen: "compliance-reports", label: "Compliance Reports" },
  list_system_filters: { screen: "compliance-reports", label: "Compliance Reports" },
  list_my_suppliers: { screen: "dashboard", label: "Dashboard" },
  get_supplier_compliance: { screen: "dashboard", label: "Dashboard" },
}

function sourcesFromSteps(steps: { toolCalls: readonly { toolName: string }[] }[]): CopilotSource[] {
  const seenScreens = new Set<CopilotSource["screen"]>()
  const sources: CopilotSource[] = []
  for (const step of steps) {
    for (const call of step.toolCalls) {
      const source = TOOL_SOURCE_SCREENS[call.toolName]
      if (source && !seenScreens.has(source.screen)) {
        seenScreens.add(source.screen)
        sources.push(source)
      }
    }
  }
  return sources.slice(0, 2)
}

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

  const sources = sourcesFromSteps(result.steps)

  return { text: result.text, proposals, sources }
}

// traceable() records one parent span per agent run ("tgc-compliance-agent"),
// with the child generateText spans (and their tool calls) nested underneath.
export const runCopilotAgent = traceable(runCopilotAgentInner, {
  name: "tgc-compliance-agent",
})
