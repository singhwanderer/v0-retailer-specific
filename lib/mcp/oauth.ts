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
// What is not: there is no revocation, and nothing here is stored, so a
// registration cannot be withdrawn once issued.
//
// ── Why nothing here is stored ──────────────────────────────────────────────
// It used to be. Client registrations and authorization codes lived in Maps in
// process memory, which is correct on one process and wrong on every
// serverless deployment: the client registers on one instance and is sent to
// /oauth/authorize on another, where the Map is empty and the flow dies with
// "Unknown client_id. Register the client first". Nothing about that message
// tells the operator the registration was fine and simply landed elsewhere.
//
// So client ids, authorization codes, and refresh tokens are now SELF-
// DESCRIBING: each one carries its own record, authenticated by an HMAC that
// only this deployment can produce. Verifying one is a signature check, not a
// lookup, so any instance can verify what any other instance issued and cold
// starts stop mattering. See signBlob/verifyBlob below.
//
// That secret is derived from TGC_OAUTH_PRIVATE_JWK, so the whole flow now
// hangs off ONE environment variable rather than three independent pieces of
// per-instance state. Leaving it unset on a multi-instance deployment breaks
// sign-in outright instead of intermittently, which is the better failure.

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
  /**
   * Symmetric secret for the self-describing blobs below (client ids,
   * authorization codes, refresh tokens).
   *
   * Derived from the private JWK rather than configured as its own variable so
   * a deployment has exactly one secret to set. A second variable would be a
   * second thing to forget, and forgetting it would reintroduce the same
   * cross-instance failure in a new place.
   *
   * Symmetric rather than RS256 because these values are only ever verified by
   * the server that minted them — nobody else needs to check them, and an
   * RSA signature would make a client id roughly 500 characters of query
   * string for no benefit.
   */
  blobSecret: Buffer
}

/** Domain-separated so a blob secret can never collide with another use of the key. */
function deriveBlobSecret(privateJwk: JWK): Buffer {
  return createHash("sha256").update(`tgc-oauth-blob/v1/${privateJwk.d ?? ""}`).digest()
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
    blobSecret: deriveBlobSecret(privateJwk),
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
    `[tgc/oauth] ${PRIVATE_JWK_ENV} is not set — generating a per-instance signing key. ` +
      `On a single process this is fine. On any multi-instance deployment (e.g. serverless), ` +
      `NOTHING this server issues will verify on another instance: sign-in fails with ` +
      `"Unknown client_id", the code exchange fails with "invalid_grant", and any token that ` +
      `does get minted is refused on the next call. ` +
      `Generate a value with \`pnpm gen:oauth-key\` and set ${PRIVATE_JWK_ENV} in the deploy environment.`
  )

  const { privateKey, publicKey } = await generateKeyPair(JWT_ALG, { extractable: true })
  const publicJwk = await exportJWK(publicKey)
  const kid = randomBytes(8).toString("hex")
  publicJwk.kid = kid
  publicJwk.alg = JWT_ALG
  publicJwk.use = "sig"
  return { privateKey, publicKey, publicJwk, kid, blobSecret: deriveBlobSecret(await exportJWK(privateKey)) }
}

export function getKeys(): Promise<KeyMaterial> {
  globalScope.__tgcOAuthKeys ??= createKeys()
  return globalScope.__tgcOAuthKeys
}

// ── Self-describing authenticated values ─────────────────────────────────────
//
// `body.mac`, where body is base64url JSON and mac is an HMAC over it. Not a
// JWT: nothing outside this file ever needs to read one, and the compact form
// keeps a client id short enough to sit comfortably in a query string.
//
// Field names are single letters purely to keep those values short — they are
// opaque to every caller, and the interfaces below are what anything else
// reads.

function signBlob(payload: object, secret: Buffer): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const mac = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${mac}`
}

/**
 * Returns undefined for anything not minted by this deployment: wrong shape,
 * bad MAC, or unparseable body. A caller cannot tell those cases apart, which
 * is deliberate — the distinction is only useful to someone probing.
 */
function verifyBlob<T>(blob: string, secret: Buffer): T | undefined {
  const split = blob.lastIndexOf(".")
  if (split <= 0) return undefined
  const body = blob.slice(0, split)
  const presented = Buffer.from(blob.slice(split + 1))
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("base64url"))
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) return undefined
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T
  } catch {
    return undefined
  }
}

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

/**
 * The one thing still held in memory: authorization codes already redeemed on
 * THIS instance.
 *
 * A self-describing code cannot be marked spent in shared storage there isn't
 * any of, so single use is now best-effort rather than guaranteed. What still
 * holds unconditionally is the part that carries the security: the code lives
 * five minutes, is bound to one client and one redirect_uri, and is worthless
 * without the PKCE verifier that only the client that started the flow holds.
 * The exposure this trades away is a replay by someone who already has the
 * verifier — i.e. the client itself.
 *
 * That is an acceptable trade for a demo authorization server and would not be
 * for a real one. Production does not face the choice: the customer's own IdP
 * has a session store.
 */
interface OAuthState {
  spentCodes: Map<string, number>
}

function state(): OAuthState {
  globalScope.__tgcOAuthState ??= { spentCodes: new Map() }
  return globalScope.__tgcOAuthState
}

/** Keeps the replay guard from growing without bound; expired codes fail anyway. */
function pruneSpentCodes(now: number) {
  const spent = state().spentCodes
  for (const [code, expiresAt] of spent) if (expiresAt < now) spent.delete(code)
}

// ── Client registration ──────────────────────────────────────────────────────

/**
 * Marks a client id as ours before the MAC is even checked, so a caller that
 * pasted something else entirely gets a clean "not one of ours" rather than a
 * signature failure.
 */
const CLIENT_ID_PREFIX = "tgc-client."

interface ClientBlob {
  n?: string
  r: string[]
  t: number
}

export async function registerClient(input: {
  client_name?: string
  redirect_uris: string[]
}): Promise<RegisteredClient> {
  const { blobSecret } = await getKeys()
  const created_at = Date.now()
  const blob: ClientBlob = { n: input.client_name, r: input.redirect_uris, t: created_at }
  return {
    client_id: CLIENT_ID_PREFIX + signBlob(blob, blobSecret),
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    created_at,
  }
}

/**
 * Resolve a client id back to its registration.
 *
 * There is no lookup here — the id *is* the registration, so this succeeds on
 * any instance for any id this deployment issued, however long ago and however
 * many cold starts have happened since.
 */
export async function getClient(clientId: string): Promise<RegisteredClient | undefined> {
  if (!clientId.startsWith(CLIENT_ID_PREFIX)) return undefined
  const { blobSecret } = await getKeys()
  const blob = verifyBlob<ClientBlob>(clientId.slice(CLIENT_ID_PREFIX.length), blobSecret)
  if (!blob || !Array.isArray(blob.r) || blob.r.length === 0) return undefined
  return {
    client_id: clientId,
    client_name: typeof blob.n === "string" ? blob.n : undefined,
    redirect_uris: blob.r.filter((u): u is string => typeof u === "string"),
    created_at: typeof blob.t === "number" ? blob.t : 0,
  }
}

// ── Authorization codes ──────────────────────────────────────────────────────

interface AuthCodeBlob {
  c: string
  u: string
  h: string
  s: Scope[]
  t: string
  b: string
  o: TenantRole
  x: number
  /** Random, so two codes issued in the same millisecond are still distinct. */
  n: string
}

export async function issueAuthCode(input: Omit<AuthCode, "code" | "expiresAt">): Promise<AuthCode> {
  const { blobSecret } = await getKeys()
  const expiresAt = Date.now() + AUTH_CODE_TTL_MS
  const blob: AuthCodeBlob = {
    c: input.clientId,
    u: input.redirectUri,
    h: input.codeChallenge,
    s: input.scopes,
    t: input.tenantId,
    b: input.subjectId,
    o: input.role,
    x: expiresAt,
    n: randomBytes(9).toString("base64url"),
  }
  return { ...input, code: signBlob(blob, blobSecret), expiresAt }
}

/** Single-use on this instance, expiry-bound everywhere. */
export async function consumeAuthCode(code: string): Promise<AuthCode | undefined> {
  const { blobSecret } = await getKeys()
  const blob = verifyBlob<AuthCodeBlob>(code, blobSecret)
  if (!blob) return undefined

  const now = Date.now()
  pruneSpentCodes(now)
  if (blob.x < now) return undefined
  if (state().spentCodes.has(code)) return undefined
  state().spentCodes.set(code, blob.x)

  return {
    code,
    clientId: blob.c,
    redirectUri: blob.u,
    codeChallenge: blob.h,
    scopes: blob.s,
    tenantId: blob.t,
    subjectId: blob.b,
    role: blob.o,
    expiresAt: blob.x,
  }
}

// ── Refresh tokens ───────────────────────────────────────────────────────────
//
// Access tokens last an hour and there was previously nothing to renew them
// with, so a demo that ran long enough simply stopped working: the client's
// next call 401s, and an MCP client with a dead token presents as a connector
// with no tools rather than as an expired session. A refresh token is the
// difference between "sign in once" and "sign in once an hour".
//
// Rotated on every use: the response carries a new refresh token and the old
// one is not tracked, so a client must always use the most recent. Same
// self-describing shape as everything else here, so renewal works on whichever
// instance answers.

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface RefreshGrant {
  clientId: string
  tenantId: string
  subjectId: string
  role: TenantRole
  scopes: Scope[]
}

interface RefreshBlob {
  c: string
  t: string
  b: string
  o: TenantRole
  s: Scope[]
  x: number
  n: string
}

export async function issueRefreshToken(grant: RefreshGrant): Promise<string> {
  const { blobSecret } = await getKeys()
  const blob: RefreshBlob = {
    c: grant.clientId,
    t: grant.tenantId,
    b: grant.subjectId,
    o: grant.role,
    s: grant.scopes,
    x: Date.now() + REFRESH_TOKEN_TTL_MS,
    n: randomBytes(9).toString("base64url"),
  }
  return signBlob(blob, blobSecret)
}

export async function verifyRefreshToken(token: string): Promise<RefreshGrant | undefined> {
  const { blobSecret } = await getKeys()
  const blob = verifyBlob<RefreshBlob>(token, blobSecret)
  if (!blob || blob.x < Date.now()) return undefined
  return {
    clientId: blob.c,
    tenantId: blob.t,
    subjectId: blob.b,
    role: blob.o,
    scopes: Array.isArray(blob.s) ? blob.s.filter(isScope) : [],
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
