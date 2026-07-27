# Enterprise auth for the TGC MCP server — technical requirements

**Status:** requirements + working reference implementation in this prototype
**Companion doc:** [`mcp-pm-presentation.md`](./mcp-pm-presentation.md) §4A, which lists the eleven
things an enterprise-ready, external-facing MCP server needs. This document turns
that list into numbered, testable requirements and records which of them are
demonstrable here.

---

## 1. Scope and non-goals

**State this first, because it halves the apparent scope:** TGC is a **resource
server**. It does not authenticate people, it does not hold a customer user
directory, and it does not run an authorization server in production.

| Role | Who owns it | What they decide |
| --- | --- | --- |
| **Identity provider** | The customer's own Entra ID / Okta / Ping | Is this a real, current employee of this customer? Their SSO, their MFA, their conditional access, their offboarding. |
| **Authorization server** | TG Aviator's IdP, federated to the customer's | Issues the token. Owns the OAuth endpoints. |
| **Resource server** | **TGC — this is our job** | What may this already-authenticated caller do here? Scopes, per-call tenant checks, audit. |

Three consequences worth being explicit about with customers:

- A Dillard's employee signs in with their **Dillard's work account**. TGC never
  sees a password.
- When Dillard's offboards someone, their TGC access dies at Dillard's — no
  ticket to us, no lag.
- "May our staff use this connector at all" is an **admin consent decision on
  the customer's side** (the enterprise-managed authorization pattern; see the
  MCP blog post in the presentation's source list). SCIM covers group-level
  provisioning where a customer wants finer control.

**Non-goals for TGC:** running an IdP, federating to customer directories,
per-tenant runtime isolation, and platform-wide rate limiting. Those belong to
the TG Aviator MCP Gateway, for which TGC is the named first implementation.

### 1.1 The rule everything else hangs off

> **A caller can never assert its own tenant.**

Tenant is *derived* from the authenticated identity — home-realm discovery on
the federated issuer — and never read from a parameter, a form field, a header,
or a picker. This holds for autonomous agents too: a workload identity is
provisioned against exactly one tenant, so it cannot choose either.

A tenant selector is a privilege-escalation surface. **This prototype therefore
does not have one, not even as a demo shortcut** — see §5.1.

The same rule governs **role**. A user's role within their tenant (`admin` or
`member`) is set from their identity at sign-in and travels as a token claim.
It is never read from a request. Role and scope are deliberately different
concepts and are not allowed to blur:

| | Governs | Granted by |
| --- | --- | --- |
| **Scope** | What the AI assistant may *do* | The user, at the consent screen |
| **Role** | What the person may *see* in the portal | Their organisation, at provisioning |

Concretely: role gates the audit log. `set_vendor_exception` stays
scope-governed, not admin-gated — otherwise there are two competing authority
models and neither is trustworthy.

---

## 2. Requirements

Traceability: **§4A row** is the row in the presentation's checklist.
**Owner** is TGC / Aviator / shared. **Demo** is the status in this prototype.

| ID | §4A row | Requirement | Owner | Demo |
| --- | --- | --- | --- | --- |
| ENT-01 | 1 | The MCP endpoint is an OAuth 2.1 protected resource. Unauthenticated calls are refused with a discovery pointer. Users authenticate against their own organisation's IdP. | Shared | ✅ Demoed (with a local demo AS standing in for the customer IdP) |
| ENT-02 | 2 | Access tokens are audience-bound to this exact resource (RFC 8707). A token minted for any other service is refused even if otherwise valid. | TGC | ✅ Demoed |
| ENT-03 | 3 | Every call carries tenant and agent as **separate, independently checkable claims** — no shared service account. | TGC | ✅ Demoed |
| ENT-04 | 4 | Agent-initiated actions run under their own scoped, short-lived workload identity, not a borrowed user token. | TGC | ✅ Demoed |
| ENT-05 | 5 | Tenant is re-checked **on every tool call**, across both tenant classes — retailer↔supplier and peer↔peer. | TGC | ✅ Demoed |
| ENT-06 | 6 | Least privilege: connections start read-only; write scopes are granted separately and enforced at discovery **and** invocation. | TGC | ✅ Demoed |
| ENT-07 | 7 | No token passthrough: never accept a token issued to another service, never forward an inbound token downstream. | TGC | ⚠️ Half demoed (inbound refusal is real; outbound rule is a constraint on code that doesn't exist yet) |
| ENT-08 | 8 | Rate limits and bounded retrieval per call. | Shared | ⚠️ Partial (bounded retrieval only) |
| ENT-09 | 9 | Container / process isolation per tenant or session. | Aviator | ❌ Not demoable here — see §6 |
| ENT-10 | 10 | Full audit logging: who, which agent, which tenant, which tool, which scope, what outcome. | TGC | ✅ Demoed |
| ENT-11 | 11 | A curated tool registry — vetted catalog with declared authority per tool, not ad-hoc tool sprawl. | Shared | ✅ Demoed |

### ENT-01 — OAuth 2.1 protected resource

**Requirement.** No anonymous access to any tool. An unauthenticated request
returns `401` with `WWW-Authenticate: Bearer …, resource_metadata="…"` so a
client can discover the authorization server unaided. Tokens are validated for
signature, issuer, and expiry on every request.

**Acceptance criteria**
1. `POST /api/mcp` with no token → `401` carrying a resolvable
   `resource_metadata` URL.
2. `/.well-known/oauth-protected-resource` and
   `/.well-known/oauth-authorization-server` fetch and parse.
3. A real MCP client (claude.ai) completes registration → consent → token with
   no manual configuration beyond pasting the connector URL.
4. A garbage or expired token → `401`, never a partial success.

**Production delta.** The demo AS in `lib/mcp/oauth.ts` and `app/oauth/*` is
replaced by Aviator's IdP federated to the customer's. TGC keeps only the
verification half (`lib/mcp/auth.ts`) and the metadata documents.

### ENT-02 — Resource Indicators (RFC 8707)

**Requirement.** Tokens carry `aud` equal to this deployment's MCP endpoint.
Verification requires an exact match. A validly signed, unexpired token issued
for a different Aviator service is refused.

**Acceptance criteria**
1. A token with `aud` = another resource → `401`, with an error that names
   audience as the reason.
2. The refusal is recorded in the audit trail (an unauthenticated refusal still
   produces a log line — that is the case you most need during an incident).

**Why it matters in one sentence.** Without it, anyone who can obtain a token
for *any* service on the platform can use TGC as their deputy.

### ENT-03 — Delegated identity, not a shared account

**Requirement.** Every action carries, as separate claims: the tenant, the
acting subject, the agent/client, and the subject type. No bucket credential.

**Acceptance criteria**
1. Two different users of the same tenant produce distinguishable audit lines.
2. The same user through two different AI clients produces different `agent_id`
   values.
3. Tenant **class** is resolved server-side from the tenant registry, not read
   from the token — one less thing a forged token can assert.

### ENT-04 — Workload identity for agent-initiated actions

**Requirement.** An agent acting with no human in the session authenticates as
itself via client credentials. Its identity is provisioned against one tenant
and a restricted scope set. It cannot call tools marked human-delegated.

**Acceptance criteria**
1. A client-credentials token is issued with `subject_type: workload` and no
   human subject.
2. It may narrow its provisioned scopes but never widen them.
3. Write tools are unavailable to it — both absent from discovery and refused on
   direct invocation.
4. Its activity is auditable and visually distinguishable from human activity.

**Why this row exists.** §4B's proactive agent is not safe to build until this
one is checked. An agent must not be able to waive a compliance requirement with
nobody to approve it.

### ENT-05 — Per-call tenant enforcement, both tenant classes

**Requirement.** A valid token is not proof the caller may see *this* tenant's
data. The check runs again at every individual tool invocation. Retailer and
supplier tenants are isolated from each other, and peers within a class are
isolated from each other.

**Acceptance criteria**
1. Tenant A's token never returns tenant B's stored data.
2. A supplier-class token is refused from retailer-only tools, and sees none of
   them in discovery.
3. Revoking or downgrading mid-session takes effect on the **next** call, not at
   the next reconnect.
4. No code path derives a tenant from user input.

**This is the largest change and the load-bearing one.** It is why every
function in `lib/mcp/tools.ts` takes a `CallerContext` first parameter rather
than resolving identity once at the edge.

#### ENT-05a — Bilateral facts: the one legitimate cross-tenant read

A supplier must be able to see **exceptions granted to them**. Those rows live
in the granting retailer's tenant, so at first glance this is precisely the
cross-tenant read this requirement forbids.

It is not, and the distinction has to be stated rather than assumed:

> An exception is a **bilateral fact**. The supplier is a named party to it. A
> waiver granted to J.Renée is as much J.Renée's record as it is Dillard's.
> What the supplier reads is not "Dillard's data" — it is "rows about me".

That holds only while the read stays narrow, so three constraints are
structural in `exceptionsGrantedToVendor()` (`lib/mcp/store.ts`) rather than
left to callers:

1. **Filter before returning.** It never returns a store, never a retailer's
   other rows, never a row naming a different vendor.
2. **The vendor name comes from the authenticated tenant**, never a tool
   argument — a supplier cannot ask about anyone else's exceptions.
3. **Read-only.** No supplier-side path creates or amends an exception; only
   the granting retailer can.

Acceptance criterion, and the load-bearing test of the supplier surface: grant
an exception to vendor A and another to vendor B as the same retailer; vendor
A's connection returns exactly one row, labelled with the granting retailer,
and cannot see vendor B's.

### ENT-06 — Least privilege / progressive scopes

**Requirement.** Four scopes: `tgc.read`, `tgc.requirements.write`,
`tgc.exceptions.write`, `tgc.destructive`. Consent defaults to read-only.
Enforced at discovery (a read-only connection is not shown write tools) **and**
at invocation.

**Acceptance criteria**
1. A read-only connection's `tools/list` contains zero write tools.
2. Calling a write tool directly with a read-only token is refused.
3. Granting requirements-write does not grant exceptions-write — the tool that
   changes compliance numbers is separately consented.
4. Granting either write scope does not grant `tgc.destructive`. A tool that
   removes something requires it **in addition to** the relevant write scope,
   and a connection without it does not see the removal tools at all.

**Note.** Discovery filtering is UX. The invocation check is the security
boundary. Both are required; neither substitutes for the other.

**Why removal is its own scope.** Adding an attribute to a profile and deleting
the profile that thousands of vendor items are assessed against are not the same
authority, and a single "write" bucket asks the user to consent to both at once.
The consent screen carries a fourth checkbox, unchecked by default: *Remove
requirements and revoke exceptions.*

**"Unchecked by default" is forced, not merely a default.** The authorize
endpoint pre-ticks the boxes a client asked for, and MCP clients routinely
request every scope a resource advertises — which for a while meant
`tgc.destructive` arrived pre-consented, exactly inverting this row. `readParams`
in `app/oauth/authorize/route.ts` now strips that scope from the pre-checked set
regardless of the request. The checkbox still renders and can still be ticked;
it just cannot be granted by a user who never looked at it.

### ENT-06a — Two-phase confirmation for every mutation

**Requirement.** No mutating tool acts on its first call. It validates, computes
the effect, and returns a preview plus a short-lived single-use
`confirmation_token`. A separate tool, `confirm_pending_change`, is the only code
path that mutates.

**Why it exists.** The in-portal agent gets a human in the loop for free — it
renders a proposal card with Apply and Cancel. An external Claude or ChatGPT
session has no such card. If the only safeguard there is "the assistant will
probably describe what it is about to do first", the safeguard is a hope. So the
confirmation lives in the protocol instead of the UI.

**Acceptance criteria**
1. Calling any mutating tool returns `status: confirmation_required` and leaves
   state unchanged.
2. Confirming executes exactly once; replaying the token is refused.
3. A token minted in one tenant is not redeemable by another, and the refusal is
   worded identically to an unknown token — confirming that another tenant's
   token exists is itself a cross-tenant disclosure.
4. An unconfirmed token expires (10 minutes) without mutating anything.
5. The proposal and the approval each emit their own audit line.
6. A workload identity may propose but never confirm.

**The token carries no authority.** On confirm, tenant, tenant class and every
required scope are re-checked against the *confirming* caller's context, exactly
as on a direct call. The token records which change was described, never that the
caller may make it — anything else would make it a bearer credential we minted to
bypass our own guard.

### ENT-07 — No token passthrough

**Requirement.** TGC never accepts a token it wasn't issued, and never forwards
an inbound token to a downstream service. When tool handlers eventually call
real TGC services, they use a credential this server obtained for itself.

**Acceptance criteria**
1. Inbound: issuer and audience are both checked (covered by ENT-01/02).
2. Outbound: no code path passes the caller's raw token to any downstream call.
   Enforced in a service-client layer, not per call site.

**Honest status.** The inbound half is real and demonstrated. The outbound half
is currently a constraint on code that does not exist yet, because every tool
still reads mock data. It is listed so it is designed in rather than
retrofitted.

### ENT-08 — Rate limits and bounded retrieval

**Requirement.** Caps on how much one call can fetch and how often a tenant or
agent can call. Without this, tool-surface growth means unpredictable cost and
blast radius, not only a security gap.

**Acceptance criteria**
1. Every list-returning tool has an explicit cap and marks truncation.
2. Per-tenant and per-agent call quotas exist with a visible refusal.
3. Counters are durable — **not** process memory, which is per-instance in a
   serverless deployment and therefore not a limit at all.

**Honest status.** Bounded retrieval exists in part (`maxAttributes` on
`run_compliance_report`). Quotas belong at the gateway; implementing them in
this prototype's process memory would demo something that isn't true.

One deliberate exception: `list_my_suppliers` is uncapped on purpose. It is the
fixture for testing whether an agent reports a large tool output accurately
rather than hallucinating over it. That is a product decision, recorded here so
it is not "fixed" as an oversight.

### ENT-09 — Container / process isolation per tenant

**Requirement.** One tenant's — or one compromised agent's — blast radius must
not reach another tenant's runtime, not just their data.

**Owner: Aviator.** This cannot be solved inside a single Next.js route, and
this prototype makes no claim to it. TGC's obligation is narrower and *is* met:
hold no cross-tenant state in module scope, which ENT-05 delivers.

### ENT-10 — Full audit logging

**Requirement.** Every tool call — allowed, denied, or errored — produces
exactly one log line recording timestamp, tenant, tenant class, subject type,
subject, agent, tool, required scope, outcome, reason, and latency.
Authentication refusals that never reach a tool are logged too, and so is a
successful attachment: a client that authenticates and only reads the tool
catalogue must not be indistinguishable from one that never connected.

**Acceptance criteria**
1. Every call in every other requirement's tests produces exactly one line.
2. Refusals are logged with the reason, not silently dropped.
3. There is a single emit point, so a new tool cannot skip auditing.
4. Authenticating produces one attributed `(connection)` line per identity per
   window — enough to evidence the attachment without every `tools/list` poll
   burying the tool calls beneath it.

#### Who may read it

An audit log is an administrative artifact, and it is subject to the same
isolation it exists to evidence. Two gates:

- **Tenant.** `/api/mcp-audit` requires `?tenant=<id>` and returns only that
  tenant's lines. **Omitting the parameter returns nothing, not everything** —
  an unscoped audit read must never be the easy path. A Dillard's administrator
  cannot see J.Renée's or Belk's activity.
- **Role.** Only an `admin` sees the log at all. A `member` gets an explicit
  "administrators only" state rather than a hidden feature.

#### Refusals cannot be attributed

A call rejected *before* authentication succeeded has no trustworthy tenant:
the token may name one, but the entire reason it was refused is that we do not
believe it. Filing such lines under the named tenant would let anyone write
into any tenant's log simply by presenting a forged token.

They cannot be dropped either — a burst of rejected tokens is exactly what an
administrator needs to see. So they are returned in a separate **unattributed**
band and rendered separately, labelled as refused before identity was
established.

**Production delta, and three named demo gaps:**

1. Ship to the platform log sink; the demo's ring buffer is per instance and
   resets on cold start.
2. The tenant arrives as a **query parameter** — which is the "caller asserts
   its own tenant" pattern banned everywhere else. It is tolerable only because
   the prototype portal has no login to derive a tenant from and everything
   behind it is mock data. In production the endpoint takes a bearer token:
   tenant from the token, `role === "admin"` required.
3. The portal's **role toggle is a demo persona switch, not a login**, for the
   same reason. The real enforcement point is the token's `role` claim, which
   is implemented and carried for every MCP caller.

These are recorded here rather than fixed-looking in the UI, because a demo
that quietly simulates an authorization boundary is worse than one that says
where the boundary really is.

### ENT-11 — Curated tool registry

**Requirement.** Tools are declared as data — name, schema, required scope,
permitted tenant classes, read/write kind, workload eligibility — in one vetted
catalog, rather than each being wired up ad hoc.

**Acceptance criteria**
1. Adding a tool without declaring its required scope and tenant classes is a
   type error.
2. Discovery filtering and audit are derived from the manifest, not repeated
   per tool.

**Strategic note.** Because TGC is the named first implementation behind the TG
Aviator MCP Gateway, this manifest shape is a candidate **platform** registry
schema. A gateway needs exactly this metadata to publish a vetted catalog. Rick
raised tool sprawl as a current gap; this is the artifact that answers it.

---

## 3. Architecture

Five pieces, each solving one thing:

| File | Role |
| --- | --- |
| `lib/mcp/tenants.ts` | Tenant registry + **home-realm resolution**. The only place a tenant is ever derived. |
| `lib/mcp/context.ts` | `CallerContext` — tenant, tenant class, subject type, subject, agent, scopes. Threaded as the first parameter of every tool. |
| `lib/mcp/auth.ts` | Resource-server verification: signature, issuer, expiry, **audience**. Builds the `CallerContext`. |
| `lib/mcp/manifest.ts` | The curated registry: schema **and declared authority** per tool. |
| `lib/mcp/tools-supplier.ts` | The supplier-side tool inventory — the mirror of `tools.ts`, reachable only by supplier tenants. |
| `lib/mcp/guard.ts` | `runGuarded()` — the single choke point. Re-checks tenant class and scope per call, emits the audit line. |

Request path:

```
  request → auth.ts (401 + discovery pointer if unauthenticated)
          → CallerContext (tenant DERIVED from token, class from registry)
          → manifest filtered by scope + tenant class   ← what the AI can see
          → runGuarded() re-checks scope + tenant class ← the security boundary
          → tool handler, scoped by ctx.tenantId
          → audit line (always, including refusals)
```

Two design points worth defending in review:

- **Why `ctx` on every tool function** rather than resolving tenancy at the
  edge. Per-call enforcement is only meaningful if the data access itself is
  tenant-scoped. Resolving once at the edge is exactly the failure mode §4A
  names as the most common one.
- **Why one guard wrapper** rather than checks inside each tool. Thirteen copies
  of a security check is thirteen chances to omit one. The guard also makes
  auditing unskippable, which is the property that matters in an incident.

### 3.1 Storage

`lib/mcp/store.ts` is keyed by tenant rather than being a process-wide
singleton, because per-call tenant checks are not meaningfully testable against
shared state.

Two honest caveats:

- Every tenant seeds from the **same mock fixture**, so two retailer tenants
  start out looking alike. Isolation is proven by **divergence**: a write made
  as one tenant is absent for the other. Production tenants hold genuinely
  distinct data.
- The supplier list (`RETAILER_SUPPLIERS`) is a shared fixture and is *not*
  tenant-partitioned. Isolation is real for everything **stored** — profiles,
  profile extras, vendor exceptions — which is where every write lands.
- Likewise the supplier catalogue (`SUPPLIER_PRODUCTS_SEED`) is a single
  fixture, because J.Renée is the only supplier tenant. A real multi-supplier
  deployment keys it per tenant exactly as the retailer store already is.

---

## 4. Sequencing

1. **Tool manifest** (ENT-11) — the spine; everything else hangs off it.
2. **`CallerContext` + `runGuarded` + audit** (ENT-03, ENT-10).
3. **Tenant-keyed storage**, then a real datastore with tenant column + RLS
   (ENT-05).
4. **OAuth resource server**: metadata, 401 challenge, JWKS, audience check
   (ENT-01, ENT-02).
5. **Scopes and discovery filtering** (ENT-06); **workload tokens** (ENT-04).
6. **Bounded retrieval everywhere + durable quotas** (ENT-08).
7. **Gateway integration**; no-passthrough service-client layer (ENT-07,
   ENT-09).

### 4.1 What §4B is gated on

| §4B capability | Blocked until |
| --- | --- |
| Supplier-side tools | ENT-05 (two-tenant-class isolation) |
| Proactive / event-triggered agents | ENT-04 (workload identity) |
| Agent-to-agent (A2A) access | ENT-03 + ENT-04 + ENT-10 |
| Real TGC service integration | ENT-07 (no passthrough) |
| Larger tool catalog | ENT-08 + ENT-11 |

We are not adding scope faster than we are adding the controls it requires.

---

## 5. What is demonstrable in this prototype

Run it: see [`mcp-demo-quickstart.md`](./mcp-demo-quickstart.md).

| Demo | Shows | How |
| --- | --- | --- |
| Connect claude.ai with no token | ENT-01 | Point a client at the endpoint with nothing signed in: refused, with a pointer to where to sign in |
| Sign in as two different people | ENT-01, ENT-05 | Same URL, same tool, different data |
| Peer isolation | ENT-05 | Write as Dillard's; absent for Belk |
| **Two audiences, one URL** | ENT-05 | Sign in as J.Renée → four *supplier* tools and none of the retailer set; sign in as Dillard's → the reverse |
| Bilateral read | ENT-05a | Grant J.Renée an exception as Dillard's; J.Renée sees that row labelled `grantedBy`, and nothing else Dillard's holds |
| Read-only consent | ENT-06 | Write tools absent from the tool list; refused if called. The Connect tab's "what a read-only connection sees" toggle shows the same filtering |
| Destructive scope separated | ENT-06 | Consent to requirements-write only: the removal tools are still absent |
| Two-phase confirmation | ENT-06a | Call any mutating tool: it returns a preview and a token and changes nothing. Confirm as another tenant → refused. Confirm as the right one → applied, exactly once |
| Wrong-audience token | ENT-02 | A validly-signed token issued for a different resource is rejected on the audience check alone, before reaching any tool. No UI trigger exists for this today — see §5.2 |
| Proactive agent | ENT-04 | Runs with no human present, under a read-only identity scoped to one tenant. No UI trigger exists for this today — see §5.2 |
| Access log, tenant-scoped | ENT-10 | Dillard's admin sees only Dillard's lines; flip to J.Renée and Dillard's activity is gone |
| Role gate | ENT-10 | As a Standard user the log is locked; switch to Admin and it opens |

### 5.2 Two demonstrations with no UI trigger today

An earlier build had a "Security" tab in the AI Assistant Access screen with
buttons for the two rows above. It was removed: an administrator opening that
screen is there to connect an assistant and review its activity, and a staged
attack demo dressed up as an admin feature wasn't that. Both behaviors are still
real and enforced — they simply aren't reachable by clicking anything right now.
An engineer who wants to trigger either one directly can find the two routes
under `app/api/demo/` in the codebase.

### 5.1 The one structural divergence

The demo authorization server is **local**, standing in for a real Entra/Okta
tenant federated through Aviator. That is unavoidable in a prototype.

It is the *only* structural divergence in the **connector**. In particular, the
demo does **not** take the shortcut of letting the operator pick a tenant. The
provisioned identities are:

| Identity | Organisation | Class | Role |
| --- | --- | --- | --- |
| `admin@dillards.demo` | Dillard's | retailer | admin |
| `buyer@dillards.demo` | Dillard's | retailer | member |
| `buyer@belk.demo` | Belk | retailer | member |
| `admin@jrenee.demo` | J.Renée | supplier | admin |
| `catalog@jrenee.demo` | J.Renée | supplier | member |

Password `demo` throughout. Both tenant and role are derived from whichever
identity signs in — to act as another organisation, or as an administrator, you
must authenticate as someone who is one.

Other demo-only compromises, none of which change the connector's security
model:

- Client registrations and audit lines live in process memory and reset on cold
  start. Signing keys did too, which broke tokens across serverless instances —
  set `TGC_OAUTH_PRIVATE_JWK` (see `pnpm gen:oauth-key`) to pin one key across
  the deployment. Because the audit buffer is still per instance, the portal
  shows one instance's view: an empty table is not proof that nothing happened,
  and **Clear** only clears the instance that serves the request.
- The audit **read** endpoint takes its tenant from a query parameter, and the
  portal's role comes from a toggle — both because the prototype portal has no
  login of its own. See ENT-10; this is the one place the *portal* simulates a
  boundary the *connector* genuinely enforces.
- Demo passwords are documented in the quickstart. Obviously.

---

## 6. What this prototype deliberately does not demonstrate

Stated plainly, because a demo that fakes these teaches the room the wrong
thing and gets caught in the first technical review:

- **ENT-09, container/process isolation per tenant.** Cannot be shown inside a
  Next.js route. It is a deployment property owned by Aviator.
- **ENT-08, durable rate limiting.** Process-memory counters are per instance in
  a serverless deployment, so implementing them here would demonstrate a limit
  that does not exist.
- **ENT-07 outbound half.** No downstream service calls exist yet to forward a
  token to.
- **Real federation.** No customer IdP is connected; see §5.1.
- **Portal-side authorization.** The portal has no login, so its tenant and role
  are persona switches rather than session-derived. The connector's equivalents
  are real; the portal's are not, and ENT-10 says so rather than letting the
  screen imply otherwise.
- **Multi-supplier data.** J.Renée is the only supplier tenant, so the supplier
  catalogue is a single fixture rather than per-tenant storage.

The common thread with §4A's own closing line: a working demo and a safe one
are not the same claim. Everything above is a known, scoped gap — not a
surprise.
