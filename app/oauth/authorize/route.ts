// Authorization endpoint — sign-in and scope consent.
//
// ── The rule this file is built around ──────────────────────────────────────
// There is NO tenant picker. The person signs in, and the tenant is derived
// from their identity's home realm (lib/mcp/tenants.ts). A screen that let the
// operator choose "Dillard's or J.Renée" would be a privilege-escalation
// surface and would teach the wrong model, so the demo doesn't have one even
// as a shortcut. To act as a different tenant you must authenticate as someone
// who belongs to it — which is exactly what the cross-tenant test does.
//
// Scope, by contrast, IS consented: that is the user legitimately deciding how
// much authority to delegate to the AI client, and it defaults to read-only
// (§4A row 6, progressive scopes).

import { DEFAULT_SCOPES, SCOPES, isScope, type Scope } from "@/lib/mcp/context"
import { getClient, issueAuthCode } from "@/lib/mcp/oauth"
import { findDemoUser, getTenant, resolveTenantByRealm } from "@/lib/mcp/tenants"

interface AuthorizeParams {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  codeChallengeMethod: string
  scopes: Scope[]
}

function readParams(params: URLSearchParams): AuthorizeParams {
  const requested = (params.get("scope") ?? "").split(/[\s+]+/).filter(isScope)
  return {
    clientId: params.get("client_id") ?? "",
    redirectUri: params.get("redirect_uri") ?? "",
    state: params.get("state") ?? "",
    codeChallenge: params.get("code_challenge") ?? "",
    codeChallengeMethod: params.get("code_challenge_method") ?? "",
    scopes: requested.length > 0 ? requested : DEFAULT_SCOPES,
  }
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function errorPage(message: string, status = 400): Response {
  return new Response(
    page(`<div class="card"><h1>Cannot continue</h1><p class="err">${esc(message)}</p></div>`),
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

function page(inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in — Trading Grid Catalogue</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#F9FAFB; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; color:#111827; padding:24px; }
  .card { background:#fff; border:1px solid #E0E4E8; border-radius:12px; padding:28px; width:100%; max-width:460px;
          box-shadow:0 1px 3px rgba(0,0,0,.06); }
  .banner { background:#FEF3C7; color:#92400E; border-radius:6px; padding:8px 12px; font-size:12px; margin-bottom:20px; }
  h1 { font-size:18px; margin:0 0 4px; }
  .sub { font-size:13px; color:#6B7280; margin:0 0 20px; font-weight:300; }
  label { display:block; font-size:12px; font-weight:600; margin:14px 0 6px; }
  input[type=email], input[type=password] { width:100%; padding:9px 11px; border:1px solid #E0E4E8; border-radius:6px; font-size:14px; }
  fieldset { border:1px solid #E0E4E8; border-radius:8px; padding:12px 14px; margin:20px 0 0; }
  legend { font-size:12px; font-weight:600; padding:0 6px; }
  .scope { display:flex; gap:9px; align-items:flex-start; margin:9px 0; font-size:13px; font-weight:300; }
  .scope input { margin-top:2px; }
  .scope b { font-weight:600; display:block; font-size:12px; }
  .scope code { font-size:11px; color:#6B7280; }
  button { width:100%; margin-top:20px; padding:10px; background:#0168B3; color:#fff; border:0; border-radius:6px;
           font-size:14px; font-weight:500; cursor:pointer; }
  button:hover { opacity:.9; }
  .err { color:#B91C1C; font-size:13px; }
  .note { font-size:11px; color:#6B7280; margin-top:16px; line-height:1.5; font-weight:300; }
  .creds { font-size:11px; color:#6B7280; background:#F9FAFB; border:1px solid #E0E4E8; border-radius:6px;
           padding:8px 10px; margin-top:14px; font-family:ui-monospace,monospace; line-height:1.6; }
</style></head><body>${inner}</body></html>`
}

function consentForm(p: AuthorizeParams, clientName: string, error?: string): string {
  const hidden = [
    ["client_id", p.clientId],
    ["redirect_uri", p.redirectUri],
    ["state", p.state],
    ["code_challenge", p.codeChallenge],
    ["code_challenge_method", p.codeChallengeMethod],
  ]
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
    .join("")

  const scopeRow = (scope: Scope, title: string, detail: string, checked: boolean) => `
    <div class="scope">
      <input type="checkbox" id="${scope}" name="scope" value="${scope}" ${checked ? "checked" : ""}>
      <label for="${scope}" style="margin:0;font-weight:400">
        <b>${esc(title)}</b>${esc(detail)}<br><code>${scope}</code>
      </label>
    </div>`

  return page(`<form class="card" method="post">
  <div class="banner">⚠️ Demo authorization server. In production this is your own corporate IdP (Entra&nbsp;ID, Okta, Ping), federated through the TG Aviator Gateway.</div>
  <h1>Sign in to Trading Grid Catalogue</h1>
  <p class="sub"><b>${esc(clientName)}</b> is requesting access to your catalogue data.</p>
  ${error ? `<p class="err">${esc(error)}</p>` : ""}
  ${hidden}
  <label for="email">Work email</label>
  <input id="email" name="email" type="email" required autocomplete="username" placeholder="you@yourcompany.demo">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required autocomplete="current-password">

  <fieldset>
    <legend>Grant access to</legend>
    ${scopeRow(SCOPES.read, "Read your catalogue", " — profiles, suppliers, compliance reports, exceptions.", p.scopes.includes(SCOPES.read))}
    ${scopeRow(SCOPES.requirementsWrite, "Author requirements", " — create profiles, add attributes and image rules.", p.scopes.includes(SCOPES.requirementsWrite))}
    ${scopeRow(SCOPES.exceptionsWrite, "Grant vendor exceptions", " — waivers and deadline extensions that change compliance numbers.", p.scopes.includes(SCOPES.exceptionsWrite))}
    ${scopeRow(SCOPES.destructive, "Remove requirements and revoke exceptions", " — delete profiles, drop attributes and image rules, revoke waivers. Required in addition to the write permissions above.", p.scopes.includes(SCOPES.destructive))}
  </fieldset>

  <button type="submit">Sign in and allow</button>
  <p class="note">Your organisation is determined by who you sign in as — it is not something you or the AI client can choose.</p>
  <div class="creds">admin@dillards.demo &nbsp;/&nbsp; demo &nbsp;<span style="color:#9CA3AF">(admin)</span><br>buyer@dillards.demo &nbsp;/&nbsp; demo<br>buyer@belk.demo &nbsp;/&nbsp; demo<br>admin@jrenee.demo &nbsp;/&nbsp; demo &nbsp;<span style="color:#9CA3AF">(admin)</span><br>catalog@jrenee.demo &nbsp;/&nbsp; demo</div>
</form>`)
}

function validate(p: AuthorizeParams, params: URLSearchParams): string | null {
  if (params.get("response_type") !== "code") return "Only response_type=code is supported."
  if (!p.clientId) return "Missing client_id."
  if (!p.redirectUri) return "Missing redirect_uri."
  if (!p.codeChallenge) return "Missing code_challenge — PKCE is required."
  if (p.codeChallengeMethod !== "S256") return "Only code_challenge_method=S256 is supported."
  const client = getClient(p.clientId)
  if (!client) return "Unknown client_id. Register the client first (dynamic client registration)."
  if (!client.redirect_uris.includes(p.redirectUri)) {
    return "redirect_uri does not match this client's registration."
  }
  return null
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const p = readParams(params)
  const problem = validate(p, params)
  if (problem) return errorPage(problem)
  return new Response(consentForm(p, getClient(p.clientId)?.client_name ?? "An MCP client"), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export async function POST(req: Request) {
  const form = await req.formData()
  const params = new URLSearchParams()
  for (const [k, v] of form.entries()) if (typeof v === "string") params.append(k, v)
  // response_type isn't round-tripped through the form; the GET already checked it.
  params.set("response_type", "code")

  const p = readParams(params)
  // Checkboxes arrive as repeated `scope` fields rather than a space-delimited
  // string, so re-read them here.
  const checked = form.getAll("scope").filter((v): v is string => typeof v === "string").filter(isScope)
  p.scopes = checked.length > 0 ? checked : DEFAULT_SCOPES

  const problem = validate(p, params)
  if (problem) return errorPage(problem)

  const clientName = getClient(p.clientId)?.client_name ?? "An MCP client"
  const email = String(form.get("email") ?? "").trim()
  const password = String(form.get("password") ?? "")

  const user = findDemoUser(email)
  if (!user || user.password !== password) {
    return new Response(consentForm(p, clientName, "That email and password combination isn't recognised."), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  // ── Tenant derivation ─────────────────────────────────────────────────────
  // The one place a tenant is ever decided, and it reads only the
  // authenticated identity. Nothing from the query string, the form, or the
  // client's registration can influence it.
  const tenant = resolveTenantByRealm(user.email)
  if (!tenant || !getTenant(tenant.id)) {
    return errorPage(
      `No TGC tenant is provisioned for the realm "${user.email.split("@")[1]}". Access is denied rather than defaulted.`,
      403
    )
  }

  const code = issueAuthCode({
    clientId: p.clientId,
    redirectUri: p.redirectUri,
    codeChallenge: p.codeChallenge,
    scopes: p.scopes,
    tenantId: tenant.id,
    subjectId: user.email,
    // Role travels with the identity for the same reason the tenant does: it
    // is a property of who signed in, not something the client may state.
    role: user.role,
  })

  const redirect = new URL(p.redirectUri)
  redirect.searchParams.set("code", code.code)
  if (p.state) redirect.searchParams.set("state", p.state)
  return Response.redirect(redirect.toString(), 302)
}
