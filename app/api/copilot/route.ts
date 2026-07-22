// TGC Compliance Agent — chat endpoint for the retailer-view copilot panel.
//
// Runs a Gemini tool-calling loop over lib/copilot/tools.ts: reads answer
// directly from the retailer's current session data (passed in as context,
// since the browser and this serverless route don't share memory — see the
// README's store-separation caveat); creates never mutate anything here —
// they return a `proposal` the client renders as a confirm card and only
// applies (client-side, the same way Screen 1/2 already do) once the user
// clicks Apply.
//
// Read + Create only. There is no edit tool in lib/copilot/tools.ts and none
// is added here — editing an existing requirement stays a manual action in
// Attributes & Images.

import { generateText, stepCountIs } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { buildCopilotTools, type ProposedAction } from "@/lib/copilot/tools"
import type { AttributeProfile } from "@/lib/retailer-requirements"

const MODEL_ID = "gemini-3.1-flash-lite"

const SYSTEM_PROMPT = `You are the TGC Compliance Agent, embedded in the retailer view of OpenText Trading Grid Catalogue (TGC) — a B2B catalog data-sync network. You are speaking with a retailer (Dillard's) user.

SCOPE: you help with two things — (1) understanding and reporting on the retailer's own attribute profiles (requirement sets) and supplier compliance, and (2) creating brand-new profiles, attribute requirements, and image requirements. You can READ and CREATE. You can NEVER edit or delete anything that already exists. Only mention this limitation — and point to the Attributes & Images screen to edit manually — when the user's own message actually asks to change, update, rename, or remove something that exists. Do not repeat it as a standing footer on unrelated answers, and do not attempt to work around it by "creating" a replacement.

GROUNDING: you MUST call a tool before answering any question about profiles, requirements, suppliers, or compliance — never answer from memory or by pattern-matching what a plausible answer might look like. Never invent profile names, suppliers, categories, or numbers; every number or name in your answer must come from a tool result. If a read tool returns no match, relay any suggested names/statuses it offers instead of just saying "not found." If nothing else fits (e.g. a greeting or an unclear request), call get_capabilities and use it to guide the user.

REPORT RESULTS: when you present a GS1 Core Scorecard or NRF Retail-Ready result, briefly note that Product ID, Product Description, and GTIN code are always present by construction and never counted as gaps — the reported gaps are specifically the data-entry fields (GTIN Description, NRF Size/Color Code, Size/Color Description) that scorecard is designed to audit, so a nonzero count there is expected and correct, not an error.

OUT OF SCOPE: other retailers'/peer accounts' data, vendor exceptions (waivers, extended deadlines, reduced scope), supplier-side questions, sales, logistics, and pricing are not available here — say so plainly rather than guessing.

WRITES: create_attribute_profile, add_attribute_requirement, and set_image_requirement never apply anything themselves — they return a proposal. After calling one, restate the exact change in plain English and make clear the user still needs to click Apply on the confirmation card; do not say the change is "done."

This is a watermarked demo prototype with mock data. Only mention that when the user directly asks whether the data is real/live/production — never as a default disclaimer on other answers. Keep answers concise.`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "The TGC Compliance Agent isn't configured yet: GEMINI_API_KEY is missing on the server." },
      { status: 500 }
    )
  }

  let body: { messages?: ChatMessage[]; context?: { profiles?: AttributeProfile[] } }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const messages = body.messages ?? []
  if (messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 })
  }

  const profiles = body.context?.profiles ?? []
  const google = createGoogleGenerativeAI({ apiKey })
  const tools = buildCopilotTools({ profiles })

  try {
    const result = await generateText({
      model: google(MODEL_ID),
      system: SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(6),
      // Force the model's first move to be a real tool call rather than free
      // text, so it can never answer a data question from a guess — every
      // legitimate ask has a matching tool, and get_capabilities is the
      // natural fallback for a greeting or unclear request.
      prepareStep: ({ stepNumber }) => (stepNumber === 0 ? { toolChoice: "required" as const } : {}),
    })

    // Defense in depth: prepareStep already forces a first-step tool call,
    // but if the provider ever ignores toolChoice, don't let ungrounded text
    // reach the user silently.
    const calledAnyTool = result.steps.some((step) => step.toolCalls.length > 0)
    if (!calledAnyTool) {
      return Response.json({
        text: "I couldn't ground that in real data — try rephrasing, or use one of the suggested questions.",
        proposals: [],
      })
    }

    const proposals: ProposedAction[] = result.steps
      .flatMap((step) => step.toolResults)
      .map((toolResult) => toolResult.output)
      .filter(
        (output): output is { proposal: ProposedAction } =>
          !!output && typeof output === "object" && "proposal" in output
      )
      .map((output) => output.proposal)

    return Response.json({ text: result.text, proposals })
  } catch (error) {
    console.error("[copilot] generateText failed:", error)
    return Response.json(
      { error: "The TGC Compliance Agent couldn't process that request. Please try again." },
      { status: 502 }
    )
  }
}
