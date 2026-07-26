// Protected Resource Metadata (RFC 9728) — the document an MCP client fetches
// after it gets a 401 with a `WWW-Authenticate: Bearer resource_metadata="…"`
// challenge. It tells the client which authorization server to go to, so the
// whole flow starts from nothing but the connector URL.
//
// Catch-all path segment because clients probe both the bare well-known path
// and the resource-path-suffixed variant (…/oauth-protected-resource/api/mcp).
// Both describe the same resource here.

import { ALL_SCOPES } from "@/lib/mcp/context"
import { MCP_PATH, originFromRequest } from "@/lib/mcp/oauth"

export async function GET(req: Request) {
  const origin = originFromRequest(req)
  return Response.json(
    {
      resource: `${origin}${MCP_PATH}`,
      authorization_servers: [origin],
      scopes_supported: ALL_SCOPES,
      bearer_methods_supported: ["header"],
      resource_documentation: `${origin}/docs/mcp-enterprise-auth-trd.md`,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
