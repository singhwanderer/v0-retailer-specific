// Resource-server authentication for the MCP endpoint (§4A rows 1, 2, 7).
//
// This is the layer that had no equivalent before: previously the MCP handler
// was exported straight as GET/POST/DELETE with nothing in front of it, so
// there was no point at which a caller's identity could be established.
//
// Three rules are enforced here, and the third is the one people skip:
//
//  1. The token must be signed by the authorization server we trust and be
//     unexpired.
//  2. Its audience must be THIS resource, exactly (RFC 8707). A token minted
//     for another service — even a valid, unexpired, correctly signed one from
//     the same issuer — is refused. That is what defeats the confused-deputy
//     replay pattern.
//  3. NO TOKEN PASSTHROUGH. We only ever accept a token issued to us, and when
//     tool handlers eventually call real TGC services they must use a
//     credential this server obtained for itself — never the inbound token
//     forwarded onward. There is deliberately no code path here that hands the
//     caller's token to anything downstream.
//
// The tenant CLASS is resolved from the tenant registry using the token's
// tenant id, not read from the token as its own claim. One less thing a forged
// or stale token can assert.

import { recordUnauthenticated } from "@/lib/mcp/audit"
import type { CallerContext } from "@/lib/mcp/context"
import { MCP_PATH, originFromRequest, resourceIdentifier, verifyAccessToken } from "@/lib/mcp/oauth"
import { getTenant } from "@/lib/mcp/tenants"

export type AuthResult =
  | { ok: true; ctx: CallerContext }
  | { ok: false; response: Response }

function bearerFrom(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization")
  if (!header) return null
  const [scheme, ...rest] = header.split(" ")
  if (scheme.toLowerCase() !== "bearer") return null
  const token = rest.join(" ").trim()
  return token.length > 0 ? token : null
}

/**
 * The 401 that starts the whole flow. The `resource_metadata` pointer is what
 * lets an MCP client discover the authorization server on its own, so a user
 * only ever has to paste the connector URL.
 */
function challenge(req: Request, error: string, description: string, status = 401): Response {
  const origin = originFromRequest(req)
  const params = [
    `Bearer realm="TGC"`,
    `error="${error}"`,
    `error_description="${description.replace(/"/g, "'")}"`,
    `resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  ].join(", ")

  return Response.json(
    {
      error,
      error_description: description,
      resource_metadata: `${origin}/.well-known/oauth-protected-resource`,
    },
    { status, headers: { "WWW-Authenticate": params, "Cache-Control": "no-store" } }
  )
}

export async function authenticateMcpRequest(req: Request): Promise<AuthResult> {
  const token = bearerFrom(req)
  if (!token) {
    recordUnauthenticated(
      "(connection)",
      "No bearer token presented — connection refused before any tool was reachable."
    )
    return {
      ok: false,
      response: challenge(
        req,
        "unauthorized",
        "This MCP server requires an access token. Connect through your AI client's OAuth flow."
      ),
    }
  }

  const verified = await verifyAccessToken(token, {
    issuer: originFromRequest(req),
    audience: resourceIdentifier(req),
  })

  if (!verified.ok) {
    const isAudience = verified.error.kind === "wrong_audience"
    recordUnauthenticated(
      "(connection)",
      isAudience
        ? `Token rejected: wrong audience. ${verified.error.detail}`
        : `Token rejected: ${verified.error.detail}`
    )
    return {
      ok: false,
      response: challenge(
        req,
        "invalid_token",
        isAudience
          ? `This token was issued for a different resource and is not accepted at ${MCP_PATH}.`
          : "The access token is invalid or expired."
      ),
    }
  }

  const tenant = getTenant(verified.value.tenantId)
  if (!tenant) {
    recordUnauthenticated("(connection)", `Token names an unknown tenant "${verified.value.tenantId}".`)
    return {
      ok: false,
      response: challenge(req, "invalid_token", "The token's tenant is not provisioned on this server.", 403),
    }
  }

  return {
    ok: true,
    ctx: {
      tenantId: tenant.id,
      // Resolved from the registry, not trusted from the token.
      tenantClass: tenant.tenantClass,
      subjectType: verified.value.subjectType,
      subjectId: verified.value.subjectType === "workload" ? null : verified.value.subjectId,
      // A workload has no role: it is not a person and holds no administrative
      // standing, however broad its scopes.
      role: verified.value.subjectType === "workload" ? null : verified.value.role,
      agentId: verified.value.agentId,
      scopes: new Set(verified.value.scopes),
    },
  }
}
