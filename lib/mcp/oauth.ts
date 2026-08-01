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
// What is not: this is a demo IdP with hard-coded users and passwords.
//
// ── Why nothing in the flow is stored in memory ──────────────────────────────
// Client registrations and authorization codes USED to live in a Map pinned to
// globalThis. On a single long-lived process that reads as a reasonable
// shortcut. On serverless it is a defect with a delayed fuse, because an MCP
// client PERSISTS the client_id it got from dynamic registration and re-sends
// it on every later connection, while the server forgets the whole Map on
// every cold start and every redeploy. So the connector works when first added
// and then fails days later with "Unknown client_id" — and the flow can fail
// even within one sign-in, when register/authorize/token land on three
// different instances.
//
// Client ids and authorization codes are therefore SELF-CONTAINED and signed:
// the registration travels inside the client_id, the grant travels inside the
// code, and any instance can verify either with the shared key. There is no
// server-side registry to lose. See signEnvelope/openEnvelope below.
//
// Everything now hangs off one deployment-wide key, so TGC_OAUTH_PRIVATE_JWK
// goes from "fixes an intermittent re-auth" to load-bearing: unset, each
// instance derives its own secret and the same class of failure returns.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
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

const JWT_ALG = "RS256"
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
  /**
   * Symmetric secret for the two things that are NOT access tokens: client ids
   * and authorization codes.
   *
   * Derived from the same private key so that pinning TGC_OAUTH_PRIVATE_JWK
   * pins the entire flow — one variable, not three, and no way to configure a
   * deployment that verifies tokens consistently but forgets its clients.
   *
   * Deliberately a *different* algorithm from token signing (HMAC vs RS256)
   * rather than reusing the RSA key directly: an authorization code and an
   * access token are then not merely distinguished by a claim someone has to
   * remember to check — a code presented as a bearer token fails at the key
   * type, before any claim is read.
   */
  symmetricSecret: Buffer
}

/**
 * Domain-separated derivation, so the symmetric secret cannot be confused with
 * the signing key it comes from even if one of them leaks into a log.
 */
function deriveSymmetricSecret(privateJwk: JWK): Buffer {
  return createHash("sha256").update(`tgc-oauth-envelope-v1|${privateJwk.d ?? ""}`).digest()
}

const globalScope = globalThis as typeof globalThis & {
  __tgcOAuthKeys?: Promise<KeyMaterial>
  /** Code fingerprint → expiry. Best-effort replay guard; see consumeAuthCode. */
  __tgcRedeemedCodes?: Map<string, number>
}

/**
 * A base64-encoded private JWK shared by every instance of this deployment.
 *
 * Without it each serverless instance generates its own key pair, so a token
 * minted by one instance fails signature verification on the next — surfacing
 * as a spurious "Refused before sign-in" line in the audit log and, for the
 * caller, a full re-authentication mid-session that even the refresh grant
 * cannot rescue, since the refresh token is signed with the same material.
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
    symmetricSecret: deriveSymmetricSecret(privateJwk),
  }
}

async function createKeys(): Promise<KeyMaterial> {
  const configured = process.env[PRIVATE_JWK_ENV]?.trim()
  // A malformed value throws rather than falling back: silently reverting to a
  // per-instance key would reintroduce the exact bug this exists to prevent.
  if (configured) return keysFromJwk(configured)

  // An unset value can't throw — local development has no reason to pin a key,
  // and refusing to boot would be worse than the failure it prevents. But on a
  // multi-instance deployment this is the single most likely way a live demo
  // breaks, and it breaks *intermittently*, which is the hardest kind of fault
  // to diagnose from the symptom ("it asked me to sign in again"). So it is
  // logged loudly, once per instance, naming the fix.
  console.warn(
    `[tgc/oauth] ${PRIVATE_JWK_ENV} is not set — generating a per-instance key. ` +
      `On a single process this is fine. On any multi-instance deployment (e.g. serverless), ` +
      `every instance derives DIFFERENT key material, so: a token minted by one instance FAILS ` +
      `verification on another (forced re-authentication mid-session), and a client_id issued by ` +
      `one instance is rejected by another as "Unknown client_id" — including on every reconnect ` +
      `after a redeploy, because MCP clients persist their registration and the server does not. ` +
      `Generate a value with \`pnpm gen:oauth-key\` and set ${PRIVATE_JWK_ENV} in the deploy environment.`
  )

  const { privateKey, publicKey } = await generateKeyPair(JWT_ALG, { extractable: true })
  const publicJwk = await exportJWK(publicKey)
  const kid = randomBytes(8).toString("hex")
  publicJwk.kid = kid
  publicJwk.alg = JWT_ALG
  publicJwk.use = "sig"
  return {
    privateKey,
    publicKey,
    publicJwk,
    kid,
    symmetricSecret: deriveSymmetricSecret(await exportJWK(privateKey)),
  }
}

export function getKeys(): Promise<KeyMaterial> {
  globalScope.__tgcOAuthKeys ??= createKeys()
  return globalScope.__tgcOAuthKeys
}

// ── Signed envelopes ─────────────────────────────────────────────────────────
//
// `<base64url(payload)>.<base64url(HMAC-SHA256(payload))>` — the minimum needed
// to hand a caller a value it cannot forge or tamper with and that any instance
// can verify without shared storage. Neither half can contain a "." so the
// split is unambiguous.

async function signEnvelope(payload: unknown): Promise<string> {
  const { symmetricSecret } = await getKeys()
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const mac = createHmac("sha256", symmetricSecret).update(body).digest("base64url")
  return `${body}.${mac}`
}

async function openEnvelope<T>(envelope: string): Promise<T | undefined> {
  const [body, mac] = envelope.split(".")
  if (!body || !mac) return undefined

  const { symmetricSecret } = await getKeys()
  const expected = createHmac("sha256", symmetricSecret).update(body).digest("base64url")
  const presented = Buffer.from(mac)
  const computed = Buffer.from(expected)
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and the length of a MAC is not a secret.
  if (presented.length !== computed.length || !timingSafeEqual(presented, computed)) return undefined

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T
  } catch {
    return undefined
  }
}

// ── Client registration (stateless) ──────────────────────────────────────────

export interface RegisteredClient {
  client_id: string
  client_name?: string
  redirect_uris: string[]
  created_at: number
}

/** The registration as it travels inside the client_id. Short keys: this ends up in a URL. */
interface ClientIdPayload {
  /** client_name */
  n?: string
  /** redirect_uris — the field that must be tamper-proof, since it gates the redirect. */
  r: string[]
  /** issued-at, seconds */
  t: number
}

const CLIENT_ID_PREFIX = "tgc-client-"

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

/**
 * Register a public client. There is nothing to store: the registration IS the
 * client_id, signed, so it stays valid across cold starts, redeploys, and every
 * other instance of this deployment.
 */
export async function registerClient(input: {
  client_name?: string
  redirect_uris: string[]
}): Promise<RegisteredClient> {
  const created_at = Date.now()
  const payload: ClientIdPayload = {
    ...(input.client_name ? { n: input.client_name } : {}),
    r: input.redirect_uris,
    t: Math.floor(created_at / 1000),
  }
  return {
    client_id: `${CLIENT_ID_PREFIX}${await signEnvelope(payload)}`,
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    created_at,
  }
}

/**
 * Recover a registration from its client_id, or undefined if the value was not
 * issued by this deployment.
 *
 * Registrations do not expire. A client that registered months ago and kept its
 * client_id is exactly the case that used to break, and it is the normal case:
 * MCP clients register once and reuse the id for the life of the connector.
 */
export async function getClient(clientId: string): Promise<RegisteredClient | undefined> {
  if (!clientId.startsWith(CLIENT_ID_PREFIX)) return undefined

  const payload = await openEnvelope<ClientIdPayload>(clientId.slice(CLIENT_ID_PREFIX.length))
  if (!payload || !Array.isArray(payload.r)) return undefined
  const redirectUris = payload.r.filter((u): u is string => typeof u === "string")
  if (redirectUris.length === 0) return undefined

  return {
    client_id: clientId,
    client_name: typeof payload.n === "string" ? payload.n : undefined,
    redirect_uris: redirectUris,
    created_at: (payload.t ?? 0) * 1000,
  }
}

// ── Authorization codes (stateless) ──────────────────────────────────────────

/** The grant as it travels inside the code. Short keys keep the redirect URL small. */
interface AuthCodePayload {
  c: string
  u: string
  h: string
  s: Scope[]
  tn: string
  sub: string
  r: TenantRole
  /** expiry, ms since epoch */
  x: number
  /** salt — makes two identical grants produce different codes, so the replay guard keys are distinct */
  z: string
}

/**
 * Best-effort single-use enforcement.
 *
 * Being honest about what this is: with no shared store, a code redeemed on
 * instance A cannot be marked used on instance B, so single-use holds per
 * instance rather than globally. Three things carry the weight instead — the
 * five-minute expiry, the PKCE binding (a stolen code is useless without the
 * verifier), and the redirect_uri check. Replacing this with a real guarantee
 * means a shared store (Redis, Postgres), which is the production answer and is
 * recorded as such in docs/mcp-prototype-status.md rather than pretended away
 * here.
 */
function redeemedCodes(): Map<string, number> {
  globalScope.__tgcRedeemedCodes ??= new Map()
  return globalScope.__tgcRedeemedCodes
}

export async function issueAuthCode(input: Omit<AuthCode, "code" | "expiresAt">): Promise<AuthCode> {
  const expiresAt = Date.now() + AUTH_CODE_TTL_MS
  const payload: AuthCodePayload = {
    c: input.clientId,
    u: input.redirectUri,
    h: input.codeChallenge,
    s: input.scopes,
    tn: input.tenantId,
    sub: input.subjectId,
    r: input.role,
    x: expiresAt,
    z: randomBytes(9).toString("base64url"),
  }
  return { ...input, code: await signEnvelope(payload), expiresAt }
}

/** Verify and redeem a code. Returns undefined if forged, expired, or already redeemed here. */
export async function consumeAuthCode(code: string): Promise<AuthCode | undefined> {
  const payload = await openEnvelope<AuthCodePayload>(code)
  if (!payload) return undefined
  if (typeof payload.x !== "number" || payload.x < Date.now()) return undefined

  const seen = redeemedCodes()
  // Prune on the way in — entries are only useful until the code expires anyway,
  // so the map stays the size of one expiry window's traffic.
  const now = Date.now()
  for (const [key, expiry] of seen) if (expiry < now) seen.delete(key)

  const fingerprint = createHash("sha256").update(code).digest("base64url")
  if (seen.has(fingerprint)) return undefined
  seen.set(fingerprint, payload.x)

  return {
    code,
    clientId: payload.c,
    redirectUri: payload.u,
    codeChallenge: payload.h,
    scopes: payload.s,
    tenantId: payload.tn,
    subjectId: payload.sub,
    role: payload.r,
    expiresAt: payload.x,
  }
}

// ── Refresh tokens (stateless) ───────────────────────────────────────────────
//
// Access tokens last an hour and there was previously nothing to renew them
// with. That is not a cosmetic gap: when the token expires the next MCP call
// gets a 401 before buildHandler is ever reached, and a client with no tool
// catalogue to show renders the connector as EMPTY rather than as an expired
// session. "It lost all its tools" and "you need to sign in again" look
// identical from the outside, and only one of them is true.
//
// Same signed-envelope shape as everything else here, so renewal works on
// whichever instance answers — the whole point of this file.

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface RefreshGrant {
  clientId: string
  tenantId: string
  subjectId: string
  role: TenantRole
  scopes: Scope[]
}

/** The grant as it travels inside the refresh token. Short keys, as above. */
interface RefreshPayload {
  c: string
  tn: string
  sub: string
  r: TenantRole
  s: Scope[]
  /** expiry, ms since epoch */
  x: number
  /** salt, so a rotation always yields a different token */
  z: string
}

export async function issueRefreshToken(grant: RefreshGrant): Promise<string> {
  const payload: RefreshPayload = {
    c: grant.clientId,
    tn: grant.tenantId,
    sub: grant.subjectId,
    r: grant.role,
    s: grant.scopes,
    x: Date.now() + REFRESH_TOKEN_TTL_MS,
    z: randomBytes(9).toString("base64url"),
  }
  return signEnvelope(payload)
}

/**
 * Verify a refresh token and recover the grant it carries.
 *
 * Note what is NOT re-read from the request at renewal time: tenant, subject
 * and role all travel inside the token, exactly as they travel inside an
 * authorization code. Renewal is the same session an hour later, not a second
 * consent screen and not an opportunity to become someone else.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshGrant | undefined> {
  const payload = await openEnvelope<RefreshPayload>(token)
  if (!payload) return undefined
  if (typeof payload.x !== "number" || payload.x < Date.now()) return undefined
  return {
    clientId: payload.c,
    tenantId: payload.tn,
    subjectId: payload.sub,
    role: payload.r,
    scopes: Array.isArray(payload.s) ? payload.s.filter(isScope) : [],
  }
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
