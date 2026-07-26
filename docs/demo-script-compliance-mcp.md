# Demo script — TGC retailer-specific compliance + MCP connector

**Audience:** AI team, one peer PM, engineering
**Length:** 45 minutes — ~30 min walkthrough, ~15 min Q&A
**Structure:** one linear arc, with marked branch points you take only if the room pulls
**Outcome you are after:** the room leaves understanding (a) what agentic MCP access
actually requires to be enterprise-safe, and (b) why compliance is the TGC use case
that justifies it. This is *not* a go/no-go ask — no decision is requested.

**Standing language guardrail:** "directional investment preview," "where we're
investing," "the control landed before the capability." Never "available now,"
never "shipping." Every screen is watermarked mock data; say so once at the top and
then stop apologising for it.

**Data note:** the prototype uses real retailer and supplier names (Dillard's,
Belk, J.Renée, Levi Strauss & Co., Calvin Klein). That is acceptable for this
internal room. Swap to fictional names before any customer-facing or GS1 Connect
airing.

---

## The arc in one sentence

> A retailer's product-data requirements are unknowable at scale, a supplier is
> flying blind against six of them at once, and the same tool layer that fixes it
> in the portal is the tool layer an AI assistant calls — which is only safe
> because the identity, tenancy, scope and audit controls were built first.

Three acts. Act 1 earns the problem, Act 2 shows the capability, Act 3 is the real
subject of the session: what makes agentic access enterprise-grade rather than a
demo that dies in the first security review.

---

## Act 0 — Frame (2 min, no screens)

Say, roughly:

> "Two things I want you to take away. First, TGC compliance is the right first
> agentic use case for us — it's high-volume, rule-governed, bilateral, and the
> answer is genuinely hard to get by clicking. Second, I want to show you what
> 'enterprise-ready MCP' actually means as a checklist, because we've now built
> most of it and I can show you the boxes that are *not* ticked as clearly as the
> ones that are."

Then the honesty line, once, up front:

> "Everything behind this is mock and watermarked. The security model is not — that
> part is real code, and I'll let you try to break it at the end."

---

## Act 1 — The compliance problem (8 min)

### Screen 1 — Retailer: Attributes & Images requirements

**Path:** land on `/`, dismiss the welcome overlay, persona toggle on **Retailer
(Dillard's)** → **Attributes & Images**.

**Say:** "This is a retailer defining what suppliers must provide. Footwear:
30 attributes and one image requirement. Apparel: 59 attributes across two GS1
bricks."

**Point at:** the Category column vs. the GS1 category count. The free-text category
is what merchandisers think in; the GS1 brick is what the system enforces.

**The beat:** attributes are always defined at **brick level**, never at the
free-text category level. One profile can map to several bricks and each brick keeps
its *own* attribute set — nothing merges. That is the thing everyone assumes wrong.

### Screen 2 — Profile detail (Footwear)

**Path:** open **Footwear** → the Core (8) / Extended / Image tabs.

**Say:** "Eight baseline core attributes every product needs regardless of retailer.
Then the retailer's extras. Then image rules — Hero Shot, JPEG, pure white #FFFFFF,
2000 × 2000, no mannequin, no props."

**Point at:** the image spec. It is the most concrete "the AI must not invent this
rule" artifact in the demo, and you will call back to it in Act 3.

**Optional beat if the room is engaged:** click **Add GS1 Category**, pick a brick
from a different segment, and let the cross-segment confirm modal fire. It is a soft
override, not a hard block — a deliberate product decision worth one sentence.

### Screen 3 — Supplier: the same world from the other side

**Path:** flip the persona toggle to **Supplier (J.Renée)** → **Compliance Status**.

**Say:** "Same platform, one toggle. The supplier sees GS1 Standard as row zero —
the baseline they're assessed against before any retailer relationship exists — and
then each retailer framed as 'GS1 baseline plus N extras.' Dillard's is +3.
Nordstrom is +5. Saks is +6."

**Then drill:** selection code → product **B11442 Linen Shift Dress** (GS1 gaps 3,
Dillard's 5) → gap detail → fill one attribute from the GS1 pick list.

**The payoff line — deliver it deliberately, it is the emotional centre of the
demo:**

> "Fill the gap once, and every retailer who required it is satisfied at once. That
> is the network effect the catalogue exists to create, and it's only visible
> because the GS1 brick is the pivot."

**Point at:** the **% ready** figure moving. Positive framing, not just a gap count.

> **Branch point — peer PM.** If the PM engages here, spend 2 extra minutes on
> uncategorised products (B11446, B11451). Categorisation is the gateway task —
> nothing in the flow works until a product has a brick, which is why uncategorised
> items are surfaced rather than silently excluded.

---

## Act 2 — Compliance at scale, and the shared tool layer (7 min)

### Screen 4 — Compliance Reports

**Path:** back to Retailer → **Compliance Reports** → the 3-step wizard
(Filter → Options → Review & Run).

**Say:** "Two filter families. Account filters — this retailer's own profiles. And
**System filters** — GS1 Core Scorecard, GS1 Extended Scorecard, NRF Retail-Ready.
The System filters matter strategically: they let a supplier self-assess against a
standard before any retailer relationship exists."

**Run it.** Land on the scorecard: items assessed, open gaps, excluded, ranked
missing attributes, per-category and per-vendor tables. Export CSV.

**Point at:** the **Excluded** count, then open the exception story:

> "Vendor exceptions are honest here. An **Attribute Waiver** actually reduces the
> gap count. An **Extended Deadline** does not — it re-ranks blame but the
> requirement still exists. A deadline extension doesn't erase an obligation, and
> the number shouldn't pretend it did."

That distinction is your single strongest credibility artifact with engineering.
`describeExceptionEffect` returns `reduces` / `reassigns` / `none`, with strings the
user actually sees.

### Screen 5 — The in-portal Compliance Agent

**Path:** toggle the **TGC Compliance Agent** panel → ask *"which of my suppliers
are furthest behind, and on what?"*

**Say:** "Note what this is not. I did not write conversational logic. The panel and
the external MCP connector call the *same* functions in `lib/mcp/tools.ts`, and
`attribute-assembly.ts` is the one place that answers 'what does this brick
require.' Authoring in the UI and querying by agent go through identical logic
instead of two hand-synced copies that drift in a quarter."

**Point at:** the proposal cards require **Apply** — the agent proposes, the human
commits — and the source chips link back to the screen the number came from.

> **Branch point — AI team.** This is where they will want depth. Offer: the agent
> is Gemini via the AI SDK with LangSmith tracing, the system prompt is constrained
> to read+create (never edit, never delete), and there is a golden-set eval runner
> at `/api/admin/run-eval`. Mention the deliberate eval bait in the fixture —
> *Calvin Klein* vs *Calvin Klein Performance*, *Ralph Lauren* vs *Lauren Ralph
> Lauren*, and an uncapped `list_my_suppliers` over ~1000 generated suppliers, kept
> uncapped on purpose to test whether the model reports a large tool output
> accurately or hallucinates over it.

---

## Act 3 — What makes agentic access enterprise-ready (13 min)

**This is the act the session exists for. Slow down.**

### The framing (2 min, no screens)

> "MCP is a standard, not our invention — USB-C for AI assistants. One server, any
> compatible AI. The user's own Claude or ChatGPT subscription does the reasoning;
> we publish the tools and enforce the rules. That is the cheap part.
>
> The expensive part is that the moment real customer data sits behind that URL,
> you are held to a production checklist, not a demo checklist. Eleven rows.
> I'll show you seven of them running, and name the four that aren't."

Put the ENT table on screen if you have it — `docs/mcp-enterprise-auth-trd.md`.
Say the scope-limiting sentence early, because it halves the apparent problem:

> "TGC is a **resource server**. We don't authenticate people, we hold no user
> directory, we don't run an authorization server. The customer's Entra or Okta
> says 'is this a real employee.' Aviator's IdP federates and issues the token. Our
> job is only: what may this already-authenticated caller do *here*."

Then the consequence the room will like:

> "A Dillard's employee signs in with their Dillard's account. We never see a
> password. When Dillard's offboards someone, their TGC access dies at Dillard's —
> no ticket to us, no lag."

### The one rule (1 min)

> **"A caller can never assert its own tenant."**

Tenant is *derived* from the authenticated identity by home-realm discovery. Never a
parameter, never a header, never a picker. State plainly: **there is no account
picker anywhere in this prototype, not even as a demo shortcut**, because a tenant
selector is a privilege-escalation surface. Same for role.

### Live demo — six beats (8 min)

Run these in order. They are short; keep momentum.

**1. Unauthenticated → 401 with a discovery pointer.** `curl` the endpoint. A client
finds the sign-in unaided; no API key exists to leak. *(ENT-01)*

**2. One URL, two audiences.** Sign in as `buyer@dillards.demo`, ask *"which of my
suppliers is furthest behind?"* Sign out, sign in as `catalog@jrenee.demo`, ask
*"which retail partner am I furthest behind for?"* Same connector, different tools,
different data.

> "Nobody configured that. It falls out of who signed in. The supplier is never even
> *shown* the retailer tools — and would be refused if it somehow called one. TGC is
> bilateral, so a one-sided connector was always half a product." *(ENT-05)*

**3. The bilateral read — the nuance worth the whole act.** As Dillard's, grant
J.Renée a waiver. As Belk, look for it — gone. As J.Renée, `list_my_exceptions`
returns that one row labelled *granted by Dillard's*, and nothing else Dillard's
holds.

> "A waiver granted to J.Renée is as much J.Renée's record as it is Dillard's. What
> the supplier reads is not 'the retailer's data' — it's 'rows about me.' The vendor
> name comes from the authenticated tenant, never an argument, and there is no
> supplier-side write path. That distinction is structural in the query, not left to
> callers." *(ENT-05a)*

**4. Progressive scopes.** Connect read-only: the four write tools are absent from
`tools/list` entirely, and refused if called directly.

> "Discovery filtering is UX. The invocation check is the security boundary. Both,
> and neither substitutes for the other. And granting requirements-write does *not*
> grant exceptions-write — the tool that moves compliance numbers is separately
> consented." *(ENT-06)*

**5. Confused deputy.** AI Assistant Access → **Security** → mint a wrong-audience
token and replay it. Refused.

> "Validly signed, unexpired, issued for a different Aviator service. Without
> audience binding, anyone holding a token for *any* service on the platform can use
> TGC as their deputy." *(ENT-02, RFC 8707)*

**6. The access log — the beat that closes the act.** Administration → **AI
Assistant Access → Access log**.

- As a **Standard user**: no sidebar item; opened via the agent panel, the log is
  locked to administrators.
- Flip to **Admin**: it opens. Lines show the person, the assistant, the tool, the
  scope it required, the outcome.
- **Security → Run proactive check**: a line appears as a **service identity**, no
  person attached — an agent on a schedule with nobody in the session. *(ENT-04)*
- The refused token from beat 5 appears under **Refused before sign-in**,
  unattributed.

> "That band exists on purpose. A call rejected *before* authentication has no
> trustworthy tenant — the token names one, but the entire reason we refused it is
> that we don't believe it. Filing it under the named tenant would let anyone write
> into any customer's audit log with a forged token. We can't drop them either: a
> burst of rejected tokens is exactly what an administrator needs to see." *(ENT-10)*

- Flip the persona to **supplier (Admin)**: only J.Renée's lines. Dillard's activity
  is gone.

### The honesty slide (2 min) — do not skip this

Name the gaps before anyone finds them:

| Not demonstrated | Why | Owner |
|---|---|---|
| Container / process isolation per tenant | Cannot be shown inside a Next.js route | Aviator |
| Durable rate limiting | Process-memory counters are per-instance in serverless — it would demo a limit that doesn't exist | Aviator / shared |
| Outbound no-passthrough | No downstream service calls exist yet to forward a token to | TGC, designed in |
| Real federation | Local demo AS stands in for a customer IdP | Shared |
| Portal-side authz | The portal has no login; its persona and role toggles are demo switches. The **connector's** equivalents are genuinely enforced | — |

> "A working demo and a safe one are not the same claim. I'd rather the prototype
> tell you where the boundary really is than quietly simulate one — a demo that
> fakes container isolation gets caught in the first technical review."

---

## The close (1 min)

> "The discipline I want to leave you with is the sequencing. Supplier-side tools
> were blocked on two-tenant-class isolation — and shipped the moment that box was
> ticked. The proactive agent was blocked on workload identity, because an agent
> must not be able to waive a compliance requirement with nobody to approve it.
> Agent-to-agent access is blocked on identity plus audit.
>
> **We are not adding scope faster than we are adding the controls it requires.**
> That's the claim I'd defend, and compliance is the use case that makes it worth
> defending — it's bilateral, rule-governed, and the answer is genuinely expensive
> to get by clicking. If agentic access is right anywhere in TGC, it's right here
> first."

---

## Anticipated questions

**"Why MCP instead of building a chatbot?"**
One integration, every AI — including assistants we don't control. The user's own
subscription does the reasoning, so there's no conversational layer to build or
maintain. And the AI reads our rules from a strict machine-readable contract, live:
change the image-format rule on the server and every connected assistant obeys it
immediately, with no retraining and no prompt engineering. Point back to the Hero
Shot spec from Act 1.

**"How do we stop the AI inventing requirements?"**
Enforced twice. Once as the contract the assistant reads before acting, once by the
server when the tool is actually called — naming the exact bad field. An invalid
value cannot be written even if the model proposes it. Plus the system prompt is
constrained to read+create, and the portal agent's proposals require an explicit
Apply.

**"What happens when the backend is real instead of mock?"**
Invisible to the AI — it only ever sees the tool contract. Same connector, different
data source. The real work is persistence and closing the loop so a
requirement created in chat appears on-screen in the portal; today those are separate
in-memory stores in separate runtime processes.

**"Isn't the supplier seeing the retailer's exception a tenancy violation?"**
No, and it's the most interesting question in the deck — take beat 3 again. Bilateral
fact, filtered before return, vendor name from the authenticated tenant, read-only.

**"Where does Aviator end and TGC begin?"**
TGC is the named first implementation behind the TG Aviator MCP Gateway. Auth
federation, rate limiting, and runtime isolation are theirs. Scopes, per-call tenant
checks, tool registry and audit are ours. Our tool manifest — name, schema, required
scope, permitted tenant classes, read/write kind, workload eligibility, declared as
data — is a candidate **platform** registry schema, which is the direct answer to the
tool-sprawl gap Rick raised.

**"Is this shipping?"**
No. Directional investment preview, may not ship in V1. It exists to prove the
experience is real and compelling before we spend engineering time hardening it —
that is the cheapest possible way to validate whether "just ask" beats clicking.

---

## Pre-flight checklist

- [ ] Deployment Protection / Bot Protection off on the Vercel project, or use the
      production URL — otherwise the connector 401s for the wrong reason
- [ ] Connector already added in claude.ai; do not burn demo time on setup
- [ ] Both browser windows pre-signed-in (`buyer@dillards.demo`,
      `catalog@jrenee.demo`, password `demo`) — sign-out/sign-in is the slowest beat
- [ ] Access log **cleared** before you start, so the lines you generate are the only
      lines
- [ ] Welcome overlay dismissed; role toggle starting on **Standard user** so the
      role gate lands
- [ ] Terminal open with the unauthenticated `curl` ready to paste
- [ ] `docs/mcp-enterprise-auth-trd.md` open in a tab for the ENT table
- [ ] Writes reset on cold start — grant the J.Renée waiver *during* beat 3, don't
      rely on one made earlier

## Timing

| Act | Minutes | Cut first if you're behind |
|---|---|---|
| 0 — Frame | 2 | — |
| 1 — Compliance problem | 8 | The cross-segment brick modal |
| 2 — Scale + shared tool layer | 7 | The CSV export |
| 3 — Enterprise-ready | 13 | Beat 1 (curl) — describe it instead |
| Close | 1 | Never |
| Q&A | 14 | — |

Protect Act 3. If Act 1 overruns, drop straight from the Footwear profile to the
supplier gap-fill and skip the reports wizard — the payoff line and the six security
beats are the session.
