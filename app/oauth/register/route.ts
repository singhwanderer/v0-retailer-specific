// Dynamic Client Registration (RFC 7591).
//
// claude.ai and other MCP clients register themselves here before starting the
// authorization flow — it is what lets a user connect by pasting one URL,
// with no client ID to obtain by hand.
//
// Public clients only: no client secret is issued, because a desktop or
// browser-based MCP client cannot keep one. PKCE is what protects the code
// exchange instead, and the token endpoint requires it.

import { registerClient } from "@/lib/mcp/oauth"

export async function POST(req: Request) {
  let body: { client_name?: string; redirect_uris?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "Body must be JSON." },
      { status: 400 }
    )
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : []

  if (redirectUris.length === 0) {
    return Response.json(
      {
        error: "invalid_redirect_uri",
        error_description: "At least one redirect_uri is required.",
      },
      { status: 400 }
    )
  }

  const client = registerClient({ client_name: body.client_name, redirect_uris: redirectUris })

  return Response.json(
    {
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      client_id_issued_at: Math.floor(client.created_at / 1000),
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  )
}
