// Confused-deputy demonstration (§4A rows 2 and 7).
//
// The scenario people find hardest to picture: a token that is completely
// valid — correctly signed by the authorization server we trust, unexpired,
// carrying a real tenant and real scopes — but minted for a DIFFERENT service
// on the same platform. If TGC accepted it, anyone who could obtain a token
// for any Aviator service could turn TGC into their deputy and read catalogue
// data with it.
//
// This route mints exactly that token: same issuer, same signing key, same
// claims, `aud` pointing at a different resource. Replay it against /api/mcp
// and it is refused on the audience check alone (RFC 8707 Resource
// Indicators), and the refusal lands in the audit log.
//
// The mirror-image rule is enforced in lib/mcp/auth.ts: TGC never forwards an
// inbound token to a downstream service either. Not accepting other services'
// tokens and not replaying ours are the same discipline from opposite ends.

import { SCOPES } from "@/lib/mcp/context"
import { issueAccessToken, originFromRequest, resourceIdentifier } from "@/lib/mcp/oauth"

export async function POST(req: Request) {
  const issuer = originFromRequest(req)
  const otherResource = `${issuer}/api/some-other-aviator-service`

  const { token } = await issueAccessToken({
    issuer,
    // The only thing wrong with this token.
    audience: otherResource,
    subject: "buyer@dillards.demo",
    tenantId: "dillards",
    agentId: "demo-confused-deputy",
    subjectType: "user",
    scopes: [SCOPES.read, SCOPES.requirementsWrite, SCOPES.exceptionsWrite],
  })

  return Response.json(
    {
      explanation:
        "This is a genuinely valid token — right issuer, right signing key, real tenant, full scopes — issued for a different resource. Replay it at the MCP endpoint and it will be refused on the audience check alone.",
      issued_for: otherResource,
      this_resource: resourceIdentifier(req),
      access_token: token,
      try_it: `curl -i -X POST ${resourceIdentifier(req)} -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'`,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
