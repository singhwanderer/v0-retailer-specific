// Token endpoint.
//
// Three grants — two kinds of caller (§4A rows 3-4), and a human session that
// outlives one access token:
//
//   authorization_code   A human delegated this action in a live session. The
//                        tenant rides along from the sign-in that produced the
//                        code — it is never re-read from the request.
//
//   refresh_token        That same session an hour later. Tenant, subject and
//                        role ride along from the original sign-in in exactly
//                        the same way; the request supplies none of them and
//                        cannot widen what was granted.
//
//   client_credentials   An autonomous workload with no human in the session,
//                        e.g. a scheduled compliance check. Its tenant comes
//                        from its provisioning record, so it cannot choose one
//                        either. Read-only by policy.
//
// All three mint audience-bound tokens (RFC 8707): the `aud` is this
// deployment's MCP endpoint and nothing else, so the token is useless against
// any other service — and any other service's token is useless here.

import { isScope, type Scope } from "@/lib/mcp/context"
import {
  consumeAuthCode,
  getWorkloadClient,
  issueAccessToken,
  issueRefreshToken,
  originFromRequest,
  resourceIdentifier,
  verifyPkceS256,
  verifyRefreshToken,
} from "@/lib/mcp/oauth"
import { getTenant } from "@/lib/mcp/tenants"

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(req: Request) {
  const form = await req.formData()
  const grantType = String(form.get("grant_type") ?? "")
  const issuer = originFromRequest(req)
  const audience = resourceIdentifier(req)

  // ── Human-delegated session ───────────────────────────────────────────────
  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "")
    const verifier = String(form.get("code_verifier") ?? "")
    const clientId = String(form.get("client_id") ?? "")
    const redirectUri = String(form.get("redirect_uri") ?? "")

    const entry = await consumeAuthCode(code)
    if (!entry) return oauthError("invalid_grant", "Authorization code is unknown, already used, or expired.")
    if (entry.clientId !== clientId) return oauthError("invalid_grant", "Authorization code was issued to a different client.")
    if (entry.redirectUri !== redirectUri) return oauthError("invalid_grant", "redirect_uri does not match the authorization request.")
    if (!verifier || !verifyPkceS256(verifier, entry.codeChallenge)) {
      return oauthError("invalid_grant", "PKCE verification failed.")
    }

    const tenant = getTenant(entry.tenantId)
    if (!tenant) return oauthError("invalid_grant", "The tenant this code was issued for no longer exists.")

    const { token, expiresIn } = await issueAccessToken({
      issuer,
      audience,
      subject: entry.subjectId,
      tenantId: tenant.id,
      agentId: entry.clientId,
      subjectType: "user",
      role: entry.role,
      scopes: entry.scopes,
    })

    return Response.json(
      {
        access_token: token,
        token_type: "Bearer",
        expires_in: expiresIn,
        refresh_token: await issueRefreshToken({
          clientId: entry.clientId,
          tenantId: tenant.id,
          subjectId: entry.subjectId,
          role: entry.role,
          scopes: entry.scopes,
        }),
        scope: entry.scopes.join(" "),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  // ── Renewal of a human-delegated session ──────────────────────────────────
  if (grantType === "refresh_token") {
    const presented = String(form.get("refresh_token") ?? "")
    const clientId = String(form.get("client_id") ?? "")

    const grant = await verifyRefreshToken(presented)
    if (!grant) return oauthError("invalid_grant", "Refresh token is unknown or expired. Sign in again.")
    // Bound to the client the original code was issued to, so one client's
    // refresh token is not usable by another that happens to obtain it.
    if (grant.clientId !== clientId) {
      return oauthError("invalid_grant", "Refresh token was issued to a different client.")
    }

    const tenant = getTenant(grant.tenantId)
    if (!tenant) return oauthError("invalid_grant", "The tenant this session belongs to no longer exists.")

    // Same rule as the workload grant below: a request may ask for less than it
    // holds, never more. Renewal is not a second consent screen.
    const requested = String(form.get("scope") ?? "")
      .split(/[\s+]+/)
      .filter(isScope) as Scope[]
    const granted = requested.length > 0 ? requested.filter((s) => grant.scopes.includes(s)) : grant.scopes

    if (granted.length === 0) {
      return oauthError("invalid_scope", `This session holds: ${grant.scopes.join(", ")}.`)
    }

    const { token, expiresIn } = await issueAccessToken({
      issuer,
      audience,
      subject: grant.subjectId,
      tenantId: tenant.id,
      agentId: grant.clientId,
      subjectType: "user",
      role: grant.role,
      scopes: granted,
    })

    return Response.json(
      {
        access_token: token,
        token_type: "Bearer",
        expires_in: expiresIn,
        // Rotated, so the token just presented should not be reused. Not
        // revocation — there is no store to revoke against — but it keeps a
        // long-lived credential from sitting unchanged in a client for a month.
        refresh_token: await issueRefreshToken({ ...grant, scopes: granted }),
        scope: granted.join(" "),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  // ── Autonomous workload ───────────────────────────────────────────────────
  if (grantType === "client_credentials") {
    const clientId = String(form.get("client_id") ?? "")
    const clientSecret = String(form.get("client_secret") ?? "")

    const workload = getWorkloadClient(clientId)
    if (!workload || workload.client_secret !== clientSecret) {
      return oauthError("invalid_client", "Unknown workload client or bad secret.", 401)
    }

    // A workload may narrow its provisioned scopes but never widen them.
    const requested = String(form.get("scope") ?? "")
      .split(/[\s+]+/)
      .filter(isScope) as Scope[]
    const granted = requested.length > 0 ? requested.filter((s) => workload.scopes.includes(s)) : workload.scopes

    if (granted.length === 0) {
      return oauthError("invalid_scope", `This workload identity is provisioned for: ${workload.scopes.join(", ")}.`)
    }

    const { token, expiresIn } = await issueAccessToken({
      issuer,
      audience,
      // No human subject — that absence is the whole point of this grant.
      subject: `workload:${workload.client_id}`,
      tenantId: workload.tenantId,
      agentId: workload.client_id,
      subjectType: "workload",
      scopes: granted,
    })

    return Response.json(
      { access_token: token, token_type: "Bearer", expires_in: expiresIn, scope: granted.join(" ") },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  return oauthError("unsupported_grant_type", `Unsupported grant_type "${grantType}".`)
}
