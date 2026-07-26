# Demo script — TGC compliance + the MCP agent surface

**Audience:** AI team, one peer PM, engineering
**Length:** 45 minutes — ~30 min walkthrough, ~15 min Q&A
**Structure:** one arc, with marked branch points you take only if the room pulls

**What you want the room to leave with**

1. What agentic MCP access actually requires to be safe in an enterprise — as a
   checklist, not a vibe.
2. Why compliance is the TGC use case that earns that investment.

No decision is requested. This is not a go/no-go.

**Two rules for driving this demo**

- **Everything is a click.** No terminal, no code, no file names. If a claim
  cannot be shown on screen, either it is cut or it is stated as a claim and
  labelled as one.
- **Say "directional investment preview," never "available now."** Every screen
  is watermarked mock data. Say that once at the top and then stop apologising
  for it.

**Naming:** the prototype uses real retailer and supplier names (Dillard's, Belk,
J.Renée, Levi Strauss & Co., Calvin Klein). Fine for this internal room. Swap
them before any customer-facing or GS1 Connect airing.

---

## The arc in one sentence

> Product-data compliance is a bilateral, rule-governed problem that is genuinely
> expensive to answer by clicking — which makes it the right first agentic use
> case — and the connector that answers it is only safe to point at a customer
> because the identity, tenancy, scope, confirmation and audit controls were
> built before the capability that needs them.

**Time budget.** Act 1 is 7 minutes and is *support*. Acts 2 and 3 are 26 minutes
and are the session. If you are running late, cut into Act 1, never into Act 3.

---

## Act 0 — Frame (2 min, no screens)

> "Two things I want to leave you with. First — what 'enterprise-ready MCP'
> actually means. It's a documented checklist, about eleven rows, and I can show
> you most of it running and name the ones that aren't. Second — why compliance
> is the use case worth spending that on.
>
> Everything behind this is mock and watermarked. The security model is not —
> that part is real, and I'll let you try to break it at the end."

---

## Act 1 — Why compliance is hard (7 min)

### Beat 1 — What a retailer actually requires

**Click:** land on the portal → dismiss the overlay → **Attributes & Images**.

> "A retailer defining what suppliers must send. Footwear: 30 attributes and an
> image rule. Apparel: 59 attributes across two GS1 categories."

**Click:** open **Footwear** → the image requirement.

> "Hero Shot. JPEG, pure white, 2000 by 2000, no mannequin, no props."

Point at it deliberately — you will call back to this exact rule twice in Act 2.

> "And the part everyone gets wrong: requirements live at GS1 category level, not
> at the retailer's own category label. One profile can map several categories,
> and each keeps its own attribute set. Nothing merges."

### Beat 2 — The same world from the supplier side

**Click:** the **View as** toggle → **Supplier** → **Compliance Status**.

> "Same platform, one toggle. GS1 Standard sits as row zero — the baseline every
> product is measured against before any retailer relationship exists. Then each
> retailer as 'baseline plus N extras.' Dillard's is plus three. Nordstrom plus
> five. Saks plus six."

**Click:** a selection code → **B11442 Linen Shift Dress** → gap detail → fill one
attribute from the pick list.

> "Fill the gap once, and every retailer who required it is satisfied at once.
> That is the whole network effect, and it only works because the GS1 category is
> the pivot."

Point at **% ready** moving.

> "Now hold that thought — because none of what you just watched me click is how
> anyone would actually want to ask this question at scale."

> **Branch — peer PM.** If they engage, 2 minutes on uncategorised products.
> Categorisation is the gateway task; nothing works until a product has a GS1
> category, which is why uncategorised items are surfaced rather than silently
> dropped.

---

## Act 2 — What the agent surface can actually do (13 min)

### Beat 3 — The idea, in plain terms (2 min, no screens)

> "MCP is an open standard — think USB-C for AI assistants. We publish one server;
> any compatible assistant plugs into it. The user's own Claude or ChatGPT
> subscription does the reasoning. We wrote no conversational logic at all.
>
> The important bit is what the assistant reads when it connects. Not a prompt
> describing our rules — a strict machine-readable contract. Mandatory fields,
> and for anything with fixed choices, exactly which values are legal. Remember
> that image rule: format has to be one of JPEG, PNG, TIFF, WebP. The assistant
> reads that live, at connect time. Change it on our side and every connected AI
> obeys the new rule immediately, with no retraining and nobody redeploying a
> prompt."

### Beat 4 — Ask it something a screen can't answer (3 min)

**Click:** open the **TGC Compliance Agent** panel → *"Which of my suppliers are
furthest behind, and on what?"*

Let it answer. Point at the source chips.

> "Two things. The numbers link back to the screen they came from — this doesn't
> ask you to trust it. And the panel and the external connector call the same
> tool layer, so authoring in the UI and asking in chat can't drift apart into
> two implementations that disagree in a quarter."

### Beat 5 — The question no screen answers (4 min) — **the strongest beat**

Ask: *"If I start requiring Sustainable Materials on Apparel, what happens to my
vendor base?"*

The simulation returns real numbers:

> "Open gaps go from 5,848 to 11,700. Two hundred and seventy vendors affected.
> Sixteen of them are fully compliant today and would not be tomorrow.
>
> That is the question a merchandiser actually has, and today there is no way to
> answer it — you add the attribute, run a report, and find out afterwards. It
> changed nothing to tell me that. And notice it states its own assumption:
> it assumes nobody already holds the data, which is the worst case and the usual
> one for a brand-new requirement."

Then ask for the change: *"OK, add it."*

> "Watch what comes back. Not 'done' — a **proposal**. What will change, what it
> does to the numbers, and a confirmation token. The tool did not act."

Approve it.

> "That approval is a separate, audited act. And a proposal nobody confirms just
> expires — an abandoned conversation changes nothing."

Then ask it to remove something:

> "Ask it to drop a requirement and it tells you the number improves *without any
> supplier supplying anything* — that it is lowering the bar, not closing a gap.
> That is a product decision, not a safety rail. If the tool that makes the chart
> look better doesn't say what it costs, someone will use it to make the chart
> look better."

> **Branch — AI team.** If they push on how the agent behaves rather than what it
> can do, the honest answer is that evaluation comes *after* the surface is
> settled: golden sets and tracing are the next step once these tools stop moving,
> not something to show today. Worth saying the fixture is already built for it —
> there are deliberately confusable vendors in the data, Calvin Klein versus
> Calvin Klein Performance, Ralph Lauren versus Lauren Ralph Lauren, and one
> uncapped tool that returns about a thousand rows precisely to see whether a
> model reports a large result honestly. Ask the assistant about "Calvin Klein"
> and it refuses to guess which legal entity you meant.

### Beat 6 — One URL, two audiences (4 min)

**Click:** **AI Assistant Access → Connect**.

> "One URL. No API key — there is nothing to create, rotate, or leak."

Point at the two tables: what this side gets, and greyed below it, what it does
not.

> "A supplier pastes the identical address and gets a different set of tools. Not
> a different deployment, not a setting anyone can flip. The identity decides."

**Click:** the **View as** toggle → **Supplier** → reopen the modal.

> "Same screen, mirrored. And here's the bilateral nuance that's the interesting
> part of a two-sided network: a supplier *can* see a waiver a retailer granted
> **them** — they're a named party to that record — and can see nothing else that
> retailer holds. 'Rows about me' is a different thing from 'their data', and the
> server enforces the difference on every single call."

---

## Act 3 — Why it's only safe because of the controls (13 min)

**This is the act the session exists for. Slow down. Everything here is a click.**

### Beat 7 — Scope the problem (2 min, no screens)

> "TGC is a **resource server**. We do not authenticate people, we hold no user
> directory, we do not run an authorization server. The customer's Entra or Okta
> answers 'is this a real employee.' Aviator's identity provider federates to it
> and issues the token. Our job is only: what may this already-authenticated
> caller do *here*?
>
> Two consequences customers like. A Dillard's employee signs in with their
> Dillard's account — we never see a password. And when Dillard's offboards
> someone, their TGC access dies at Dillard's. No ticket to us, no lag."

Then the rule everything hangs off:

> "**A caller can never assert its own tenant.** It's derived from who
> authenticated. Never a parameter, never a header, never a picker. There is no
> account picker anywhere in this prototype — not even as a demo shortcut —
> because a tenant selector is a privilege-escalation surface. Same for role."

### Beat 8 — Consent is real and visible (2 min)

**Click:** connect the connector from claude.ai and let the sign-in screen come up
on the projector. (Have this pre-staged — see the checklist.)

Point at the four checkboxes.

> "Read your catalogue. Author requirements. Grant vendor exceptions. Remove
> requirements and revoke exceptions. Read-only is the default; the last one is
> unchecked.
>
> Note that removal is its own permission, on top of the write permission.
> Consenting to 'author requirements' is not consenting to delete them — adding an
> attribute and deleting the profile that thousands of vendor items are assessed
> against are not the same authority, and the screen shouldn't pretend they are."

And the line at the bottom:

> "'Your organisation is determined by who you sign in as.' There is no dropdown
> under that sentence. That's the whole point."

### Beat 9 — Least privilege, shown on screen (2 min)

**Click:** back in the portal, **AI Assistant Access → Connect** → the toggle
**"What a read-only connection sees."**

> "The tools that write, remove, or confirm are not greyed out — they are *absent*
> from the list the assistant is given, and refused if called directly anyway.
>
> Filtering the list is the experience. The check at invocation is the boundary.
> You need both, and neither substitutes for the other."

### Beat 10 — The two refusals (4 min)

**Click:** the **Security** tab.

**First:** *Try without signing in.*

> "No credential at all. Refused — and the refusal hands back the discovery
> pointer the AI client follows to find the sign-in by itself. That is the entire
> setup a user does: paste one URL. There is no anonymous mode."

**Then:** *Mint a wrong-audience token* → *Replay it against the connector*.

> "This token is genuinely valid. Correct issuer, correct signing key, real
> organisation, full scopes. The one thing wrong with it is that it was issued for
> a *different service* on the same platform.
>
> Four-oh-one. Refused on the audience check alone, before any tool was reachable.
> Without that check, anyone who could get a token for *any* service on the
> platform could use TGC as their deputy."

### Beat 11 — The access log (3 min) — **the closer**

**Click:** the **Access log** tab.

> "Every AI action against this organisation: who, which assistant, which tool,
> which scope it required, allowed or refused."

Point at **Refused before sign-in**.

> "Both of those refusals are here, in their own band, unattributed. That band
> exists on purpose. A call rejected *before* authentication has no trustworthy
> tenant — the token names one, but the entire reason we refused it is that we
> don't believe it. File it under the named organisation and anyone can write into
> any customer's audit log with a forged token. We can't drop them either: a burst
> of rejected tokens is exactly what an administrator needs to see."

**Click:** *Run proactive check* on the Security tab, then back to the log.

> "A service identity. No person attached — an agent on a schedule with nobody in
> the session. Which is also why it is read-only, and why it can propose but never
> confirm. An agent must not be able to waive a compliance requirement with nobody
> to approve it."

**Click:** the **Role** toggle → **Standard**.

> "Administrators only. A category buyer can connect their own assistant; they
> don't get to read every AI action taken across the company."

**Click:** **View as → Supplier**, role **Admin**.

> "Only J.Renée's activity. Dillard's lines are gone."

### Beat 12 — What this deliberately does not show (2 min)

Do not skip this. Naming the gaps before engineering finds them is what buys the
rest.

| Not demonstrated | Why | Owner |
|---|---|---|
| Runtime isolation per tenant | Can't be shown inside one web app; it's a deployment property | Aviator |
| Durable rate limiting | Counters in process memory are per-instance — it would demo a limit that doesn't exist | Aviator / shared |
| Outbound token rules | No downstream services exist yet to forward a token to | TGC, designed in |
| Real federation | A local demo sign-in stands in for a customer's Entra or Okta | Shared |
| Portal-side authorization | The portal has no login; its persona and role toggles are demo switches. The **connector's** equivalents are genuinely enforced | — |

> "A working demo and a safe one are not the same claim. I would rather the
> prototype tell you where the boundary really is than quietly simulate one — a
> demo that fakes runtime isolation gets caught in the first technical review."

---

## The close (1 min)

> "The discipline I want to leave you with is the sequencing.
>
> Supplier-side tools were blocked on isolating retailer tenants from supplier
> tenants — and shipped the day that box was ticked. The proactive agent was
> blocked on workload identity. Delete and edit were blocked on having a real
> confirmation step, because an assistant that can delete a requirement in a chat
> window with no human approval is not a feature, it's an incident.
>
> **We are not adding scope faster than we are adding the controls it requires.**
>
> And compliance is the use case that makes that worth doing. It's bilateral,
> it's rule-governed, the rules change constantly, and the answers are genuinely
> expensive to get by clicking — you watched me click for seven minutes to answer
> one question about one product. If agentic access is right anywhere in TGC, it
> is right here first."

---

## Anticipated questions

**"Why MCP instead of building a chatbot?"**
One integration, every assistant — including ones we don't control. The user's own
subscription does the reasoning, so there's no conversational layer to build or
maintain. And the assistant reads our rules from a strict contract, live: change
the image format rule and every connected AI obeys immediately. Point back to the
Hero Shot rule.

**"What stops the AI inventing a requirement or wrecking something?"**
Four layers, and they're independent. The contract the assistant reads before
acting. The server re-validating on the call, naming the exact bad field. Scopes,
with removal separated from writing. And the confirmation step — no mutating tool
acts on its first call; it returns a preview and a token, and a separate approval
executes it. An assistant cannot delete anything without a human reading what it
would do first.

**"Isn't the confirmation token just a bearer credential you invented?"**
No, and it's the right question. The token carries no authority. On confirm, the
tenant, the scopes and the tenant class are all re-checked against the confirming
caller — a token minted while a scope was held is worthless once it isn't, and a
token from one organisation is not redeemable by another. It says "this is the
change that was described," never "this caller may make it."

**"Isn't a supplier seeing the retailer's waiver a tenancy violation?"**
No — take Beat 6 again. It's a bilateral fact and the supplier is a named party.
The read is filtered before returning, the vendor name comes from the
authenticated identity rather than an argument, and there's no supplier-side write
path.

**"What happens when the backend is real instead of mock?"**
Invisible to the AI — it only ever sees the tool contract. The real work is
persistence and closing the loop so a requirement created in chat shows up in the
portal immediately.

**"Where does Aviator end and TGC begin?"**
TGC is the named first implementation behind the TG Aviator MCP Gateway. Auth
federation, rate limiting and runtime isolation are theirs. Scopes, per-call tenant
checks, the tool registry and audit are ours. Our registry declares each tool's
required scope, permitted tenant classes, read/write/destructive kind and whether an
autonomous agent may call it — as data, so adding a tool without declaring its
authority doesn't compile. That is a candidate *platform* registry schema, and the
direct answer to the tool-sprawl gap Rick raised.

**"Is this shipping?"**
No. Directional investment preview, may not ship in V1. It exists to prove the
experience is real before we spend engineering time hardening it.

**"How do you know the agent behaves?"**
Not yet measured, deliberately. Evaluation comes once the tool surface stops
moving — a golden set and tracing are the next step, not this week's. The fixture
is already built for it.

---

## Pre-flight checklist

- [ ] Connector already added in claude.ai — do not burn demo time on setup
- [ ] Signed **out** of the connector, so Beat 8 can show the consent screen live.
      Practise this once: it only appears mid-flow, so you need a real reconnect
- [ ] A second browser profile signed in as the supplier for Beat 6
- [ ] Access log **cleared** before you start, so the lines you generate are the
      only lines
- [ ] Role toggle starting on **Admin** for Act 3, but plan to flip to Standard at
      Beat 11
- [ ] Welcome overlay dismissed
- [ ] Deployment protection off on the hosting project, or use the production URL
- [ ] Writes reset on cold start — grant the J.Renée waiver *during* Beat 6, don't
      rely on one made earlier
- [ ] Have the simulation question typed and ready to paste; it's the beat you
      least want to fumble

## Timing

| Act | Minutes | Cut first if behind |
|---|---|---|
| 0 — Frame | 2 | — |
| 1 — Why compliance is hard | 7 | The image-rule detail; go straight to the supplier gap-fill |
| 2 — Agent surface | 13 | Beat 4 — the simulation in Beat 5 makes the same point harder |
| 3 — The controls | 13 | Nothing. Protect this |
| Close | 1 | Never |
| Q&A | ~9 | — |
