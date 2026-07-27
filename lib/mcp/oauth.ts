// Demo OAuth 2.1 authorization server for the TGC MCP connector.
//
// ⚠️ THIS IS A DEMO AUTHORIZATION SERVER. In the target architecture TGC does
// not run one: a customer signs in against their OWN corporate IdP (Entra ID,
// Okta, Ping), federated through the TG Aviator Gateway, and TGC is only a
// resource server that validates the resulting token. This file exists so the
// prototype can demonstrate the end-to-end flow without a real IdP — see
// docs/mcp-enterprise-auth-trd.md (ENT-01).
//
// What is faithful to the target design, and deliberately so:
//   - The tenant is DERIVED from the authenticated identity's realm, never
//     supplied by the caller. There is no tenant parameter and no tenant
//     picker anywhere in this flow.
//   - Tokens are audience-bound to this exact resource (RFC 8707), so a token
//     minted for another service cannot be replayed here.
//   - Workload (client-credentials) identities are provisioned per tenant, so
//     an autonomous agent cannot choose which tenant it acts for either.
//
// What is not: client registrations and issued codes live in process memory and
// reset on cold start (a client simply re-runs the flow). Signing keys used to
// as well, which broke tokens across serverless instances — set
// TGC_OAUTH_PRIVATE_JWK to pin one key across the whole deployment.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  importJWK,
  jwtVerify,
  type JWK,
} from "jose"
import { DEFAULT_SCOPES, isScope, type Scope } from "@/lib/mcp/context"
import type { TenantRole } from "@/lib/mcp/tenants"

export const JWT_ALG = "RS256"
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60
const AUTH_CODE_TTL_MS = 5 * 60 * 1000

/** Path of the MCP endpoint this authorization server protects. */
export const MCP_PATH = "/api/mcp"

// ── Origin / URL helpers ─────────────────────────────────────────────────────

/**
 * The canonical origin for this deployment, taken from the forwarding headers.
 * Every issuer/audience value is derived from this so the demo works on
 * localhost and on Vercel without configuration.
 */
export function originFromRequest(req: Request): string {
  const url = new URL(req.url)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : url.protocol.replace(":", ""))
  return `${proto}://${host}`
}

/**
 * The canonical resource identifier this server's tokens are bound to.
 * RFC 8707: a token whose audience is anything else must be rejected, which is
 * what stops a token stolen from another Aviator service being replayed here.
 */
export function resourceIdentifier(req: Request): string {
  return `${originFromRequest(req)}${MCP_PATH}`
}

// ── Signing keys ─────────────────────────────────────────────────────────────

interface KeyMaterial {
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicJwk: JWK
  kid: string
}

const globalScope = globalThis as typeof globalThis & {
  __tgcOAuthKeys?: Promise<KeyMaterial>
  __tgcOAuthState?: OAuthState
}

/**
 * A base64-encoded private JWK shared by every instance of this deployment.
 *
 * Without it each serverless instance generates its own key pair, so a token
 * minted by one instance fails signature verification on the next — surfacing
 * as a spurious "Refused before sign-in" line in the audit log and, for the
 * caller, a full re-authentication mid-session (there is no refresh token).
 * Generate a value with `pnpm gen:oauth-key`.
 */
const PRIVATE_JWK_ENV = "TGC_OAUTH_PRIVATE_JWK"

/** JWK members that carry the private half and must never leave this module. */
const PRIVATE_JWK_MEMBERS = ["d", "p", "q", "dp", "dq", "qi"] as const

function publicHalfOf(jwk: JWK): JWK {
  const pub: JWK = { ...jwk }
  for (const member of PRIVATE_JWK_MEMBERS) delete pub[member]
  delete pub.key_ops
  delete pub.ext
  return pub
}

async function keysFromJwk(encoded: string): Promise<KeyMaterial> {
  let privateJwk: JWK
  try {
    privateJwk = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as JWK
  } catch {
    throw new Error(
      `${PRIVATE_JWK_ENV} is set but is not a base64-encoded JWK. Regenerate it with \`pnpm gen:oauth-key\`.`
    )
  }
  if (!privateJwk.d) {
    throw new Error(`${PRIVATE_JWK_ENV} contains a public key. It must be the PRIVATE JWK — the one with a "d" member.`)
  }

  const publicJwk = publicHalfOf(privateJwk)
  // RFC 7638 thumbprint, so every instance derives the same kid from the same
  // key with nothing to keep in sync.
  const kid = await calculateJwkThumbprint(publicJwk)
  publicJwk.kid = kid
  publicJwk.alg = JWT_ALG
  publicJwk.use = "sig"

  return {
    privateKey: (await importJWK(privateJwk, JWT_ALG)) as CryptoKey,
    publicKey: (await importJWK(publicJwk, JWT_ALG)) as CryptoKey,
    publicJwk,
    kid,
  }
}

async function createKeys(): Promise<KeyMaterial> {
  const configured = process.env[PRIVATE_JWK_ENV]?.trim()
  // A malformed value throws rather than falling back: silently reverting to a
  // per-instance key would reintroduce the exact bug this exists to prevent.
  if (configured) return keysFromJwk(configured)

  const { privateKey, publicKey } = await generateKeyPair(JWT_ALG, { extractable: true })
  const publicJwk = await exportJWK(publicKey)
  const kid = randomBytes(8).toString("hex")
  publicJwk.kid = kid
  publicJwk.alg = JWT_ALG
  publicJwk.use = "sig"
  return { privateKey, publicKey, publicJwk, kid }
}

export function getKeys(): Promise<KeyMaterial> {
  globalScope.__tgcOAuthKeys ??= createKeys()
  return globalScope.__tgcOAuthKeys
}

// ── In-memory authorization state ────────────────────────────────────────────

export interface RegisteredClient {
  client_id: string
  client_name?: string
  redirect_uris: string[]
  created_at: number
}

export interface AuthCode {
  code: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  scopes: Scope[]
  /** Derived at sign-in from the authenticated identity. Never caller-supplied. */
  tenantId: string
  subjectId: string
  /** Also derived from the identity — the caller never states its own role. */
  role: TenantRole
  expiresAt: number
}

interface OAuthState {
  clients: Map<string, RegisteredClient>
  codes: Map<string, AuthCode>
}

function state(): OAuthState {
  globalScope.__tgcOAuthState ??= { clients: new Map(), codes: new Map() }
  return globalScope.__tgcOAuthState
}

export function registerClient(input: {
  client_name?: string
  redirect_uris: string[]
}): RegisteredClient {
  const client: RegisteredClient = {
    client_id: `tgc-client-${randomBytes(12).toString("hex")}`,
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    created_at: Date.now(),
  }
  state().clients.set(client.client_id, client)
  return client
}

export function getClient(clientId: string): RegisteredClient | undefined {
  return state().clients.get(clientId)
}

export function issueAuthCode(input: Omit<AuthCode, "code" | "expiresAt">): AuthCode {
  const code: AuthCode = {
    ...input,
    code: randomBytes(24).toString("base64url"),
    expiresAt: Date.now() + AUTH_CODE_TTL_MS,
  }
  state().codes.set(code.code, code)
  return code
}

/** Authorization codes are single-use: consumed on first redemption. */
export function consumeAuthCode(code: string): AuthCode | undefined {
  const entry = state().codes.get(code)
  if (!entry) return undefined
  state().codes.delete(code)
  if (entry.expiresAt < Date.now()) return undefined
  return entry
}

// ── PKCE ─────────────────────────────────────────────────────────────────────

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url")
  const a = Buffer.from(computed)
  const b = Buffer.from(challenge)
  return a.length === b.length && timingSafeEqual(a, b)
}

// ── Workload (client-credentials) identities ─────────────────────────────────

/**
 * Pre-provisioned service identities for agent-initiated actions (§4A row 4).
 *
 * Each is bound to ONE tenant at provisioning time. That binding is the reason
 * a workload can't choose which tenant it acts for any more than a human can —
 * the same "tenant is derived, never asserted" rule, applied to a caller with
 * no human behind it.
 */
export interface WorkloadClient {
  client_id: string
  client_secret: string
  tenantId: string
  scopes: Scope[]
  description: string
}

export const WORKLOAD_CLIENTS: WorkloadClient[] = [
  {
    client_id: "tgc-compliance-watch",
    client_secret: "demo-workload-secret",
    tenantId: "dillards",
    scopes: ["tgc.read"],
    description:
      "Proactive compliance watch for Dillard's — runs on a schedule with no human in the session, read-only.",
  },
]

export function getWorkloadClient(clientId: string): WorkloadClient | undefined {
  return WORKLOAD_CLIENTS.find((c) => c.client_id === clientId)
}

// ── Token issuance / verification ────────────────────────────────────────────

export interface TgcTokenClaims {
  /** Tenant, derived at authentication time. */
  tenant: string
  /** Which agent/client is calling — a separate claim from tenant, by design. */
  agent_id: string
  subject_type: "user" | "workload"
  /** Absent for workloads — a service identity is not a person. */
  role?: TenantRole
  scope: string
}

export async function issueAccessToken(input: {
  issuer: string
  audience: string
  subject: string
  tenantId: string
  agentId: string
  subjectType: "user" | "workload"
  role?: TenantRole
  scopes: Scope[]
}): Promise<{ token: string; expiresIn: number }> {
  const { privateKey, kid } = await getKeys()
  const token = await new SignJWT({
    tenant: input.tenantId,
    agent_id: input.agentId,
    subject_type: input.subjectType,
    ...(input.role ? { role: input.role } : {}),
    scope: input.scopes.join(" "),
  })
    .setProtectedHeader({ alg: JWT_ALG, kid })
    .setIssuedAt()
    .setIssuer(input.issuer)
    // Audience-bound to this exact resource (RFC 8707).
    .setAudience(input.audience)
    .setSubject(input.subject)
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(privateKey)
  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
}

export interface VerifiedToken {
  tenantId: string
  agentId: string
  subjectType: "user" | "workload"
  subjectId: string
  role: TenantRole | null
  scopes: Scope[]
}

export type TokenError =
  | { kind: "invalid_token"; detail: string }
  | { kind: "wrong_audience"; detail: string }

/**
 * Validate a bearer token as a RESOURCE SERVER would.
 *
 * Signature, issuer, and expiry are table stakes. The audience check is the
 * one that matters most here: it is what makes a token minted for another
 * service useless against TGC, and it is reported separately so the demo can
 * show the confused-deputy refusal explicitly rather than as a generic 401.
 */
export async function verifyAccessToken(
  token: string,
  opts: { issuer: string; audience: string }
): Promise<{ ok: true; value: VerifiedToken } | { ok: false; error: TokenError }> {
  const { publicKey } = await getKeys()
  try {
    const { payload } = await jwtVerify(token, publicKey, { issuer: opts.issuer })

    const aud = payload.aud
    const audiences = Array.isArray(aud) ? aud : aud ? [aud] : []
    if (!audiences.includes(opts.audience)) {
      return {
        ok: false,
        error: {
          kind: "wrong_audience",
          detail: `Token audience ${JSON.stringify(audiences)} does not match this resource (${opts.audience}). A token issued for another service is not accepted here (RFC 8707).`,
        },
      }
    }

    const claims = payload as unknown as TgcTokenClaims
    if (!claims.tenant) {
      return { ok: false, error: { kind: "invalid_token", detail: "Token carries no tenant claim." } }
    }

    const scopes = (claims.scope ?? "").split(" ").filter(isScope)
    return {
      ok: true,
      value: {
        tenantId: claims.tenant,
        agentId: claims.agent_id ?? "unknown-agent",
        subjectType: claims.subject_type === "workload" ? "workload" : "user",
        subjectId: String(payload.sub ?? "unknown"),
        role: claims.role === "admin" ? "admin" : claims.role === "member" ? "member" : null,
        scopes: scopes.length > 0 ? scopes : DEFAULT_SCOPES,
      },
    }
  } catch (err) {
    return {
      ok: false,
      error: { kind: "invalid_token", detail: err instanceof Error ? err.message : String(err) },
    }
  }
}
