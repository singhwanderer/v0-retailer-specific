# TGC Demo MCP Server — Quickstart

The prototype now serves a live MCP endpoint at **`/api/mcp`** on every deployment. It exposes the retailer's requirement and compliance data (mock, in-memory) as MCP tools — see the README's "Requirement authoring model" and "Conversational access (MCP)" sections for the concept, and `app/api/[transport]/route.ts` for the implementation. This connector is built for the retailer side (e.g. Dillard's) — it answers questions about the retailer's own suppliers, not other retail partners.

## Endpoint URLs

- Branch preview (this feature branch): `https://v0-retailer-specific-git-1d56dd-geminicanadapro-8402s-projects.vercel.app/api/mcp`
- Production (after merge to main): `https://v0-retailer-specific.vercel.app/api/mcp`

## Connect from claude.ai

1. claude.ai → **Settings → Connectors → Add custom connector**
2. Paste the endpoint URL. Your client discovers the sign-in automatically — there is no API key or token to create.
3. **Sign in with one of the demo identities below** and choose how much access to grant (reading and authoring arrive ticked; activating and removing do not).
4. Start a chat and enable the "tgc" connector via the tools menu

## Connect from ChatGPT

1. **Settings → Apps & Connectors → Advanced → Developer mode** (requires Plus/Pro/Team)
2. **Create** a connector with the endpoint URL — sign-in is discovered automatically
3. Sign in, grant scopes, then enable it in a new chat via the tools menu

> **If the connector can't reach the URL (401/403):** the Vercel project's
> Deployment Protection or Bot Protection is blocking anonymous requests.
> In Vercel: Project → Settings → Deployment Protection → set Vercel
> Authentication to off (or "Only Production" and use the production URL),
> and check Firewall/Bot Protection isn't challenging non-browser clients.

## Demo sign-in identities

The connector requires OAuth sign-in — see
[`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md). **Your organisation
is derived from who you sign in as; there is no account picker anywhere in the
flow, by design.**

| Sign in as | Password | Organisation | Class | Role |
|---|---|---|---|---|
| `admin@dillards.demo` | `demo` | Dillard's | retailer | admin |
| `buyer@dillards.demo` | `demo` | Dillard's | retailer | member |
| `buyer@belk.demo` | `demo` | Belk | retailer (peer) | member |
| `admin@jrenee.demo` | `demo` | J.Renée | supplier | admin |
| `catalog@jrenee.demo` | `demo` | J.Renée | supplier | member |

Both your organisation **and** your role come from which identity you sign in
as. Neither is selectable.

Demo credentials for watermarked mock data — the demo authorization server
stands in for a customer's real IdP (Entra ID / Okta / Ping).

### The four things worth demoing

1. **One URL, two audiences.** Sign in as `buyer@dillards.demo` and ask "which
   of my suppliers is furthest behind?". Sign out, sign in as
   `catalog@jrenee.demo` and ask "which retail partner am I furthest behind
   for?". Same connector, different tools, different data — decided entirely by
   who signed in. The supplier is never even shown the retailer tools.
2. **Tenant isolation.** As Dillard's, grant J.Renée an exception. As Belk, look
   for it — it isn't there. As J.Renée, `list_my_exceptions` shows it labelled
   *granted by Dillard's* — and nothing else Dillard's holds.
3. **Progressive scopes.** Untick everything but read at sign-in: the write
   tools don't appear in the assistant's tool list at all, and are refused if
   called directly. Or accept the defaults and ask it to activate the profile it
   just created — `activate_profile` is absent until that box is ticked.
4. **The access log.** See the walkthrough below.

### Access log walkthrough (the security story in 5 steps)

The log lives at **Administration → AI Assistant Access → Access log** (also
reachable from the Compliance Agent panel on the retailer side). The modal has two
tabs, **Connect** and **Access log** — there is no Security tab, and deliberately so:
an administrator opening this screen is there to connect an assistant and review what
it did, not to run rehearsed attack demos. That material is presenter material and
lives in [`mcp-pm-presentation.md`](./mcp-pm-presentation.md).

1. Portal as **Dillard's / Standard user** — there is no AI Assistant Access
   item in the sidebar. Open it from the Compliance Agent link: **Connect**
   works, **Access log** is locked to administrators.
2. Switch the role toggle to **Admin** — the sidebar item appears and the log
   opens, empty.
3. Connect Claude and sign in as `buyer@dillards.demo`. A line appears as soon as
   the client attaches — before you have asked it anything — then ask a question
   and more follow: the person, the assistant, the tool, the scope it required.
4. Ask it to change something. Two lines appear, not one — the proposal and then the
   approval, because no mutating tool acts on its first call.
5. Flip the portal to the **supplier** persona (Admin) → the same screen shows
   **only J.Renée's** activity. Dillard's lines are gone.

For the full 45-minute walkthrough built around these beats, see
[`demo-script-compliance-mcp.md`](./demo-script-compliance-mcp.md).

Steps 1-2 show the role gate; step 5 shows the tenant gate. A refusal — for
example, a client that tries to connect without completing sign-in — appears in
a separate **Refused before sign-in** band rather than under any organisation,
because a rejected attempt isn't trustworthy evidence of who made it.

> **The log is per server instance in this prototype.** It lives in each
> instance's memory, so an empty table is not proof that nothing happened, a
> refresh may reach a different instance, and **Clear** only clears the one that
> serves the request. Production ships these lines to the platform log sink;
> see [`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md) ENT-10.

> The role and persona toggles are **demo persona switches**, not a login — the
> prototype portal has no authentication of its own. The connector's equivalents
> are genuinely enforced; see
> [`mcp-enterprise-auth-trd.md`](./mcp-enterprise-auth-trd.md) ENT-10.

## Ask anything — these are just examples

The prompts below are illustrations, **not** a fixed command list. The connected LLM interprets free language and picks the right tool, so ask in your own words about any requirement or supplier-compliance question. Not sure where to start? Ask **"What can you help me with?"** and the assistant calls the `get_capabilities` tool to list its actions and the data that actually exists in the demo. In claude.ai the connector also contributes clickable **starter prompts** (review compliance, set up a category, audit a supplier, explain a profile) in the prompt picker.

**As a retailer (Dillard's):**

1. **Query compliance:** "Which of my suppliers are furthest behind on compliance, and on what?"
2. **Understand requirements:** "What does my Footwear profile require, including image requirements?"
3. **Create a requirement:** "Create an attribute profile for Dresses, then require a lifestyle image, JPEG, 2000×2000 minimum, white background." Then: "List my profiles" — the new one appears.
4. **Audit a supplier:** "How is J.Renée doing on Footwear?"

**As a supplier (J.Renée):**

1. **Own position:** "How compliant am I overall, and which retail partner am I furthest behind for?"
2. **Outstanding work:** "What am I still missing for Dillard's?"
3. **Why the difference:** "Which retailers require the most attributes beyond the GS1 standard?"
4. **Relief granted:** "What has been waived for me, and by whom?"

All data is mock and watermarked; writes persist only in the demo server's memory and reset periodically.

## What is traced and graded, and what isn't

The prototype has two agent surfaces, and only one of them is under evaluation:

- **The in-product Compliance Agent panel** (retailer side, toggle in the top
  bar) is instrumented. Every turn is traced to LangSmith, and a golden set with
  scorers bound runs against the same agent function the panel uses.
- **This connector** is not. A question asked from claude.ai or ChatGPT produces
  no trace and is not covered by the golden set.

Worth knowing before you go looking for a connector call in LangSmith and
conclude tracing is broken. Extending the loop to the connector's tool layer is
planned, not done — see
[`eval-framework-pm-presentation.md`](./eval-framework-pm-presentation.md) §7.

## One more capability, built but not yet scheduled

The connector can run checks with nobody signed in at the time — for example,
scanning for suppliers falling behind. When it does, it acts under its own
restricted identity rather than borrowing a person's login: it can only look
things up, it's tied to one company's data, and it can never make a change,
because no person is present to approve one.

**Be precise about what "can" means here, because it splits in two:**

- **The identity and its limits are real and enforced.** `POST
  /api/demo/proactive-check` mints a workload token
  (`subject_type: workload`, no human subject), verifies it exactly as
  `/api/mcp` verifies any caller, and runs the report through the same
  `runGuarded()` choke point — so it produces audit lines like anyone else.
  Its provisioned scope set is `tgc.read` alone and it cannot be widened at the
  token endpoint; every write tool carries `allowWorkload: false` and is
  refused outright. That is ENT-04, and it holds.
- **Nothing calls it on a schedule.** There is no cron entry, no
  `vercel.json`, no scheduled function anywhere in this repo. The route runs
  when something POSTs to it, and today nothing does.

So describe it as *built and enforced, not yet scheduled*. Saying it "runs
automatically" is the one version that will not survive someone opening the
repo. Turning it on needs three things that are deliberately out of scope for a
prototype: a scheduler, somewhere for the alerts to go, and durable storage —
the audit trail is a 200-entry in-memory ring buffer that resets on cold start.
