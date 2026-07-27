# Demo script — TGC compliance + the MCP agent surface

**Audience:** AI team, one peer PM, engineering
**Length:** 45 minutes — ~30 min walkthrough, ~15 min Q&A
**Structure:** one arc, with marked branch points you take only if the room pulls

**What you want the room to leave with**

1. What agentic MCP access actually requires to be safe in an enterprise — as a
   checklist, not a vibe.
2. Why compliance is the TGC use case that earns that investment.
3. That behaviour is measured, not asserted — there is a traced, graded loop
   running behind the in-product agent, and you show it.

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

**Time budget.** Act 1 is 5 minutes and is *support*. Acts 2 and 3 are 29 minutes
and are the session. If you are running late, cut into Act 1, never into Act 3.

---

## Act 0 — Frame (2 min, no screens)

> "Three things I want to leave you with. First — what 'enterprise-ready MCP'
> actually means. It's a documented checklist, about eleven rows, and I can show
> you most of it running and name the ones that aren't. Second — why compliance
> is the use case worth spending that on. Third — how we know the thing behaves,
> because 'it seemed fine when I tried it' is not a quality bar and I'd rather
> show you the numbers than assert it.
>
> Everything behind this is mock and watermarked. The security model is not —
> that part is real, and I'll let you try to break it at the end. Neither is the
> measurement: those are real traces of real runs."

---

## Act 1 — Why compliance is hard (5 min)

This act is support, not the session. Move briskly — its whole job is to earn the
line at the end of Beat 2 ("none of this is how you'd want to ask at scale").

### Beat 1 — What a retailer actually requires

**Click:** land on the portal → dismiss the overlay → **Attributes & Images**.

> "A retailer defining what suppliers must send. Footwear: 30 attributes and an
> image rule. Apparel: 59 attributes across two GS1 categories."

**Click:** open **Footwear** → the image requirement.

> "Hero Shot. JPEG, pure white, 2000 by 2000, no mannequin, no props."

Say it once and move — don't dwell. You call this exact rule back twice in Act 2,
and it lands harder there than it does here.

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

> **Hold for Q&A — uncategorised products.** Categorisation is the gateway task;
> nothing works until a product has a GS1 category, which is why uncategorised
> items are surfaced rather than silently dropped. Worth 2 minutes if the peer PM
> asks, but don't spend Act 1's budget on it — Act 2 now has a beat that needs
> the time more.

---

## Act 2 — What the agent surface can actually do (16 min)

**Two surfaces, and the difference matters — read this before you drive it.**
There is an in-product **Compliance Agent panel** (retailer side, toggle in the
top bar) and there is the **external MCP connector** in claude.ai. They are not
the same thing:

| | In-product panel | claude.ai connector |
|---|---|---|
| Reads | Shared — both call the same functions | Shared — both call the same functions |
| Writes | Client-side confirm card | Protocol-level proposal + single-use token |
| Simulation | **Not available** | `simulate_requirement_change` |
| Access log lines | None | Every call |
| LangSmith traces | **Every turn** | None |

So Beat 4 and 4b run in the **panel**; Beats 5 and 6 run in **claude.ai**. The
script says when to switch. Don't improvise it — staying in the panel for Beat 5
loses the simulation, the confirmation token, and the log lines Beat 11 needs.

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
> ask you to trust it. And the read tools here are the same functions the
> external connector calls, so authoring in the UI and asking in chat can't drift
> apart into two implementations that disagree in a quarter."

Be precise on that second claim — the *reads* are shared. Writes from this panel
go through a UI confirm card, not the connector's protocol-level confirmation;
that's Beat 5's material and it belongs in claude.ai.

Then set up the next beat without moving yet:

> "Keep that answer on screen. In about ninety seconds I'm going to show you that
> exact question again, from the outside."

### Beat 4b — How we know it behaves (3 min) — **second browser tab**

**Click:** switch to the **LangSmith** tab, tracing project.

The turn you ran in Beat 4 is at the top of the list. Open it.

> "That's the question I asked ninety seconds ago. Not a screenshot — the run.
> Which tools it chose, what each one returned, how long it took, what it cost.
>
> The reason this matters isn't dashboards. It's that 'what did this thing tell a
> customer at two o'clock yesterday' is a question you will be asked, and for most
> LLM features the honest answer is *nobody knows*. Here it's a lookup."

**Click:** the dataset, then its most recent experiment.

> "And this is the other half. A golden set of questions with known-good answers,
> with scorers attached, run against the agent on demand.
>
> The design point that makes it worth anything: the eval calls the *same
> function* the live app calls. Not a copy, not a mock. So a score here is a
> statement about production, not about a test harness. Change the prompt, swap
> the model, and a regression shows up as a number before it ships instead of as
> a customer complaint."

Then the fixture — this is the part that reads as "this person has done this
before":

> "The data is built to be hostile on purpose. There are deliberately confusable
> vendors in there — Calvin Klein versus Calvin Klein Performance, Ralph Lauren
> versus Lauren Ralph Lauren — because the failure mode I actually care about
> isn't a wrong number, it's a confident guess about which legal entity you meant.
> Ask it about 'Calvin Klein' and it refuses to guess. And there's one uncapped
> tool that returns about a thousand rows, sitting there to see whether a model
> reports a large result honestly or quietly summarises it away."

**Say the boundary before anyone finds it.** This is the credibility move, not a
concession:

> "One thing this does *not* yet cover. What's traced and graded is the
> in-product agent — the panel I just used. The external connector path isn't in
> the golden set yet. I know exactly what that costs me and it's next; I'd rather
> tell you than have you find it."

Two claims to stay away from: that the MCP tool surface is evaluated (it isn't
yet), and that any of this says something about the Act 3 controls. Eval measures
whether the agent answers well. It says nothing about whether it's safe — that's
the next act, and conflating them is the mistake this session exists to avoid.

**Click:** back to the portal tab before starting Beat 5.

### Beat 5 — The question no screen answers (4 min) — **the strongest beat**

**Click:** switch to the **claude.ai** tab. Say why out loud — it's a real point,
not a stage direction:

> "I'm moving out of our own UI now, into Claude with the connector attached.
> Everything from here is an outside assistant we don't control, talking to us
> over the protocol."

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

One thing to note while you're here, because it's the cleanest illustration of
the two-surface split: the proposal-and-token you just approved is a *protocol*
mechanism. The in-product panel's equivalent is a card in our own UI. An outside
assistant has no UI of ours to render a card in — which is exactly why the
confirmation had to live in the protocol. See ENT-06a in the TRD if it comes up.

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

**This is the act the session exists for. Slow down.**

Three of the five beats are live on screen — the consent screen, the read-only tool
list, and the access log. Beat 10 is you talking, because the product has no
attack-demo surface and shouldn't grow one.

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

### Beat 10 — The two refusals (4 min) — **spoken, not clicked**

There is no Security tab in the product, deliberately: staged attack demos are
presenter material, not an admin feature. So this beat is you talking, with the
building-pass framing below to carry it. It sits between two beats that *are*
live — the consent screen you just showed, and the log you are about to.

**The framing to open with** (this is the whole reason the beat lands):

> "Think of what an assistant carries on every request as a building pass. It says
> who printed it, which building it's for, which doors it opens, and whose floor
> the holder may stand on. Three ways someone could try that door."

**First — no pass at all.**

> "There's no guest mode. No shared key sitting in a config file for someone to
> leak, because there is no key. And what comes back with the refusal is
> *directions to reception* — that's how an assistant configures itself knowing
> nothing but the address, and why the entire setup is pasting one URL."

**Second — a real pass, for the building next door.**

> "This is the one people find hardest to picture, so take it slowly. Imagine a
> pass that is completely genuine: printed by the right security desk, signed
> correctly, real employee, every door ticked. Its only flaw is that it was issued
> for a *different service* on our platform.
>
> We refuse it. On the audience check alone, before it reaches a single piece of
> catalogue data. Without that, anyone who can get a pass to *any* Aviator service
> could walk into TGC on it and have us act on their behalf. That's the confused
> deputy, and it's why tokens are bound to one resource."

**Third — a pass belonging to a robot rather than a person.** That is the
service-identity line you are about to point at in the log, so don't spend it
here; just set it up: *"and the third is an agent with its own pass, which is the
next thing on screen."*

> **If someone asks to see the refusals rather than hear about them:** the
> endpoints that stage them still exist, but nothing in the UI reaches them any
> more. Say that plainly — "I can show you the code path, not a button" — and
> offer the Access log instead, where real refusals from a real assistant appear
> the same way.

### Beat 11 — The access log (3 min) — **the closer**

**Click:** the **Access log** tab.

> "Every AI action against this organisation: who, which assistant, which tool,
> which scope it required, allowed or refused."

The first line is the attachment itself — the assistant authenticating, logged
before it asked for anything:

> "We don't only log what it did. We log that it showed up. A connector that
> authenticates and reads the tool catalogue and stops there still leaves a
> line, because 'nothing in the log' has to mean nothing happened."

If the Compliance Agent panel was used earlier in the demo, its calls are in the
same table under the agent `tgc-compliance-agent`. Point at both:

> "Two different assistants — the one in this product, and Claude out there
> through the connector — one log. If we only logged the external one, the
> answer to 'what has our AI been doing?' would be quietly wrong."

Be straight about the difference if asked: the connector's identity is proved by
a token this server validated, while the in-app agent's comes from the portal
persona, because the prototype portal has no login. The note under the table
says so.

Point at the **Refused before sign-in** band — if it is empty, say what would land
there rather than pretending; a refused connection from any client populates it.

> "Refusals sit in their own band, filed under nobody. That's on purpose. A call
> rejected *before* authentication has no trustworthy tenant — the token names one,
> but the entire reason we refused it is that we don't believe it. File it under
> the named organisation and anyone can write junk into any customer's audit log
> with a forged token. We can't drop them either: a burst of rejected tokens is
> exactly what an administrator needs to see."

Point at any line whose actor is a **service identity** — the robot's pass from
Beat 10.

> "No person attached. An agent on a schedule with nobody in the session. Which is
> also why its pass is read-only, and why it can propose a change but never approve
> one. An agent must not be able to waive a compliance requirement with nobody
> there to approve it."

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
| Connector path under evaluation | The golden set exercises the in-product agent; the MCP tools aren't covered by it yet | TGC, next |

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
> Measurement is on that list too, not next to it. Tracing and a graded golden
> set are a control in the same sense the others are — they're what stops
> 'it seemed fine' from being the release criterion. That's why I showed you the
> traces in the same session as the consent screen and the audit log, and why I
> told you which surface isn't covered yet.
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
Shown in Beat 4b, so this should be a follow-up rather than a first ask. Two
loops on one platform: every in-product agent turn is traced, and a golden set
with scorers bound runs against the same agent function production uses, so a
prompt or model change is graded before it ships. Because both live in the same
place, a bad production answer can be promoted into a permanent test case. The
boundary, unprompted: the golden set covers the in-product agent, not the
connector path — that's next. Detail in
[`eval-framework-pm-presentation.md`](./eval-framework-pm-presentation.md).

**"Who owns the evals — is this an engineering thing?"**
Deliberately not. The engineering hook is small and done: a tracing wrapper and a
shared runner. Growing the test set, defining what "correct" means, running an
experiment and deciding whether a change is safe to ship are all PM/SME work in
the platform UI. The one genuine exception is a domain check like "is this
brick-code combination valid against GS1 reference data" — that needs
engineer-written code on any vendor.

**"Why not gate CI on eval scores?"**
Not yet, and it's a sequencing call rather than an oversight. Gating means
committing to a threshold, and a threshold you set before the tool surface has
settled mostly teaches the team to ignore a red build. The loop is useful the
moment it catches a regression in review; the gate is worth adding when the
scores are stable enough that a failure means something.

---

## Pre-flight checklist

- [ ] Connector already added in claude.ai — do not burn demo time on setup
- [ ] **Compliance Agent toggle ON** in the top bar. It is off by default and the
      setting is per-browser, so a fresh profile or a cleared cache turns it back
      off. Beats 4 and 4b both depend on it
- [ ] **LangSmith signed in, in a second tab**, on the right tracing project,
      zoomed enough to read from the back of the room. Have the dataset's latest
      experiment open in a third tab so Beat 4b is two clicks, not a search
- [ ] **`LANGSMITH_API_KEY` set on the deployment you are demoing.** Without it
      tracing degrades to a silent no-op — the agent answers normally and no trace
      ever appears, which is the worst possible way to discover this. Verify by
      asking the panel one question in rehearsal and watching it land
- [ ] Rehearse the panel → LangSmith → panel tab switch. Beat 4b is the one beat
      that leaves the product, and fumbling the tabs undercuts the point of it
- [ ] Know which surface produces traces: **panel yes, claude.ai no.** If someone
      asks to see a trace of the Beat 5 simulation, say plainly that the connector
      path isn't in the loop yet — you already flagged it in 4b
- [ ] Signed **out** of the connector, so Beat 8 can show the consent screen live.
      Practise this once: it only appears mid-flow, so you need a real reconnect
- [ ] A second browser profile signed in as the supplier for Beat 6
- [ ] Access log **cleared** before you start, so the lines you generate are the
      only lines. Then make a couple of real calls from the assistant during Act 2
      so Beat 11 has something to point at — the log is now your only live security
      evidence, and an empty table is a weak closer
- [ ] Rehearse Beat 10 out loud. It is the one beat with no screen carrying you,
      and the confused-deputy idea does not survive being improvised
- [ ] Role toggle starting on **Admin** for Act 3, but plan to flip to Standard at
      Beat 11
- [ ] Welcome overlay dismissed
- [ ] Deployment protection off on the hosting project, or use the production URL
- [ ] Writes reset on cold start — grant the J.Renée waiver *during* Beat 6, don't
      rely on one made earlier. The supplier side polls for it every 15 seconds,
      so keep talking after you grant it rather than switching personas instantly
      and finding nothing there
- [ ] Have the simulation question typed and ready to paste; it's the beat you
      least want to fumble

## Timing

| Act | Minutes | Cut first if behind |
|---|---|---|
| 0 — Frame | 2 | — |
| 1 — Why compliance is hard | 5 | The image-rule detail; go straight to the supplier gap-fill |
| 2 — Agent surface | 16 | Beat 4's answer, not Beat 4b — ask the question, skip the source-chip commentary, and let the trace in 4b carry it |
| 3 — The controls | 13 | Nothing. Protect this |
| Close | 1 | Never |
| Q&A | ~8 | — |

Act 2's 16 minutes break down as: Beat 3 — 2, Beat 4 — 3, Beat 4b — 3,
Beat 5 — 4, Beat 6 — 4. If Beat 4b overruns, cut the fixture paragraph rather
than the boundary statement; naming what isn't covered is worth more to this room
than the confusable-vendor detail.
