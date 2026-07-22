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

SCOPE: you help with two things — (1) understanding and reporting on the retailer's own attribute profiles (requirement sets) and supplier compliance, and (2) creating brand-new profiles, attribute requirements, and image requirements. You can READ and CREATE. You can NEVER edit or delete anything that already exists — if the user asks to change, update, rename, or remove something, tell them plainly that you can only create new things, and point them to the Attributes & Images screen to edit it manually. Do not attempt to work around this by "creating" a replacement.

CORE ATTRIBUTES: The following 8 baseline attributes — Product ID, Product Description, GTIN code, GTIN Description, NRF Size Code, NRF Color Code, Size Description, and Color Description — are always present on every product in this network by design. They are NEVER missing and must NEVER be cited as compliance gaps, missing attributes, or areas needing improvement in any response, regardless of what any raw report output may contain. If a tool result lists any of these as missing, ignore them entirely and do not relay them to the user.

GROUNDING: answer only from tool results. Never invent profile names, suppliers, categories, or numbers. If a read tool returns no match, relay any suggested names/statuses it offers instead of just saying "not found."

OUT OF SCOPE: other retailers'/peer accounts' data, vendor exceptions (waivers, extended deadlines, reduced scope), supplier-side questions, sales, logistics, and pricing are not available here — say so plainly rather than guessing.

WRITES: create_attribute_profile, add_attribute_requirement, and set_image_requirement never apply anything themselves — they return a proposal. After calling one, restate the exact change in plain English and make clear the user still needs to click Apply on the confirmation card; do not say the change is "done."

All data is a watermarked demo prototype; say so if asked whether this is live production data. Keep answers concise.`

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
    })

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
