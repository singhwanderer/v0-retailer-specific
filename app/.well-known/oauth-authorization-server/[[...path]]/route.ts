// Authorization Server Metadata (RFC 8414).
//
// In production this document belongs to TG Aviator's IdP, not to TGC — see
// docs/mcp-enterprise-auth-trd.md (ENT-01). It is served here so the prototype
// can complete a real OAuth flow with a real MCP client.
//
// `client_credentials` appears alongside `authorization_code` because the two
// caller kinds are genuinely different: a human-delegated session, and an
// autonomous workload acting under its own provisioned identity (§4A row 4).

import { ALL_SCOPES } from "@/lib/mcp/context"
import { originFromRequest } from "@/lib/mcp/oauth"

export async function GET(req: Request) {
  const origin = originFromRequest(req)
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      registration_endpoint: `${origin}/oauth/register`,
      jwks_uri: `${origin}/oauth/jwks`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "client_credentials"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      scopes_supported: ALL_SCOPES,
      service_documentation: `${origin}/docs/mcp-enterprise-auth-trd.md`,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
