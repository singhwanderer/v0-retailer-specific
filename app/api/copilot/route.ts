// TGC Compliance Agent — chat endpoint for the retailer-view copilot panel.
//
// This route is now just HTTP glue: it parses and validates the request, then
// hands off to runCopilotAgent (lib/copilot/agent.ts), which owns the Gemini
// tool-calling loop, proposal extraction, and LangSmith tracing.
//
// Reads answer directly from the retailer's current session data (passed in as
// context, since the browser and this serverless route don't share memory —
// see the README's store-separation caveat). Creates never mutate anything
// here — they return a `proposal` the client renders as a confirm card and
// only applies (client-side, the same way Screen 1/2 already do) once the user
// clicks Apply. Read + Create only; there is no edit tool.

import {
  runCopilotAgent,
  CopilotConfigError,
  type CopilotChatMessage,
} from "@/lib/copilot/agent"
import type { AttributeProfile } from "@/lib/retailer-requirements"

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "The TGC Compliance Agent isn't configured yet: GEMINI_API_KEY is missing on the server." },
      { status: 500 }
    )
  }

  let body: { messages?: CopilotChatMessage[]; context?: { profiles?: AttributeProfile[] } }
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

  try {
    const { text, proposals } = await runCopilotAgent({ messages, profiles })
    return Response.json({ text, proposals })
  } catch (error) {
    if (error instanceof CopilotConfigError) {
      return Response.json(
        { error: `The TGC Compliance Agent isn't configured yet: ${error.message}` },
        { status: 500 }
      )
    }
    console.error("[copilot] runCopilotAgent failed:", error)
    return Response.json(
      { error: "The TGC Compliance Agent couldn't process that request. Please try again." },
      { status: 502 }
    )
  }
}
