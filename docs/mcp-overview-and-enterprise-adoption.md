# MCP, and why it is how Trading Grid Catalogue lands and expands

### A cold-start read. No technical background assumed.

Four questions, answered in order:

1. **What is MCP?** — Section 1. Nothing about our product required.
2. **What problem does it solve in retail and CPG?** — Section 2. This is a money
   argument before it is a technology argument.
3. **Why do we have two AI surfaces rather than one?** — Section 3. The in-product
   Compliance Agent and the external connector do different jobs, and the
   difference is not a matter of taste.
4. **Is this actually the future for enterprise products, and how far does it
   take us?** — Sections 4 and 5. The expansion case, then an honest verdict with
   the counter-evidence attached.

**On sourcing.** Everything about the outside world carries a source and a
verification status in Section 6. Several sources — including OpenText's own
public product pages and the retail deduction research — block automated
retrieval, so those figures are marked as needing a primary-source check before
they go in front of a customer or onto a slide. Read that section before quoting
a number from this one.

**There is also an annex at the end**, separate from the argument: the screens a
cross-product collaboration demo would need, for the other product teams. They are
unbuilt, and the annex is the brief for building them.

---
---

# Section 1 — What MCP is

## The problem it was invented for

To make an AI assistant useful against a company's real, live business data,
somebody has to build a bridge between the assistant and the systems. Before MCP,
that bridge was proprietary in both directions: each AI vendor defined its own
format, and each software company built to it. Supporting a second assistant meant
building a second integration — **including a second copy of the security and
permissions logic**, which is the expensive half and the half that gets it wrong.

Most software companies did the arithmetic and concluded it was not worth it. That
is why so few enterprise products had a working AI integration. Not because the
idea was unappealing — because it cost too much per assistant.

**MCP is the standard that turns that into one integration instead of one per
vendor.** The shorthand people use is "USB-C for AI assistants." It is an open
protocol, not a product, not a model, and — since December 2025 — not owned by any
single vendor.

## What a company publishes over MCP

Almost everything reduces to three kinds of thing a system can offer.

| | What it is | Example in our world |
| --- | --- | --- |
| **Capabilities** | Things the assistant can *do*, each with a strict list of what it needs | "Run a compliance report on this supplier"; "grant this vendor a 60-day extension" |
| **Documents** | Things that *exist and can be referred to again*, with an address | "The Belk scan from Tuesday"; a scorecard; a help article |
| **Starting points** | Suggested openers a customer's assistant can offer as buttons | "Review supplier compliance" |

We publish capabilities and starting points today. **We publish no documents**,
and that gap is worth understanding, because it is the difference between an
answer that happened once in somebody's chat window and an artifact you can name,
re-open, attach to an email, and hand to an auditor. Most of what a report screen
is actually for is the second thing.

## The part that is genuinely new

When an assistant connects, it asks what is available and gets back a strict
contract for every capability: which pieces of information are mandatory, and
where a field has fixed choices, exactly which choices are allowed.

Take adding an image requirement. The contract states that image format must be
one of JPEG, PNG, TIFF or WebP, that background must be one of pure white, light
grey, transparent or lifestyle, and that seven fields in total are mandatory. So
when a category manager types *"add a lifestyle image requirement to Footwear,"*
their assistant asks for the seven things it needs and offers only the four valid
formats — because it read our rules thirty seconds ago, not because anyone wrote
a script describing image formats.

**Change the rule on our side and every connected assistant asks the new question
immediately.** No retraining, no redeployment, no software update on their side.

One qualification that matters, because it is what separates a real system from a
demo: **the contract is not the enforcement.** It is the first of two. The contract
makes the assistant cooperative; our own systems checking the request again when
it arrives makes it irrelevant whether the assistant cooperated. Any argument that
rests only on the first layer is a bad argument, and we should never make it.

## Where the standard stands, as of August 2026

Four facts that change the risk of building on it.

- **It is vendor-neutral.** Anthropic donated MCP to the Agentic AI Foundation, a
  fund under the Linux Foundation, in December 2025. Co-founders are Anthropic,
  Block and OpenAI; supporters include Google, Microsoft, AWS, Cloudflare and
  Bloomberg. The Linux Foundation explicitly does not direct the technical
  roadmap. *(Verified.)*
- **It is large.** The two main developer kits have each passed a billion
  downloads, with close to half a billion downloads a month across the supported
  set. *(Verified.)*
- **It is built for scale now, not just for laptops.** The specification released
  on 28 July 2026 — six days before this document — removed the session handshake
  so requests can be spread across servers behind an ordinary load balancer, and
  added routing information that lets corporate gateways meter and rate-limit
  traffic without inspecting message contents. Anything being retired gets a
  twelve-month notice period. *(Verified.)*
- **Corporate single sign-on is shipped and stable.** Since 18 June 2026, an IT
  administrator can approve a system for the whole organisation once, and staff
  get access automatically, scoped to the groups and roles they already have — no
  individual sign-in per person per system. Okta was the first identity provider;
  Asana, Atlassian, Canva, Figma, Linear and Supabase are among the businesses
  already offering their systems this way. *(Verified.)*

## What MCP is *not*

This list is what earns the credibility that Section 5 spends.

- **Not a model.** It carries no intelligence of its own. A weak assistant
  connected over MCP is still a weak assistant.
- **Not a database connection.** What gets published is a short, named list of
  business capabilities. It does not expose tables, queries or raw records unless
  somebody deliberately builds a capability that does.
- **Not a security product.** MCP standardises *where* the permission checks go,
  not whether you did them. Section 5 has the incident record on what happens when
  companies skip that work.
- **Not an Anthropic product.** It was, for thirteen months. It is now a Linux
  Foundation project that OpenAI co-founded.
- **Not a replacement for our existing interfaces.** It is a second front door onto
  the same business logic, built for a different kind of caller.

---
---

# Section 2 — The problem this solves in retail and CPG

## Start with the money

The retailer–supplier relationship leaks cash through data disputes, and the
numbers are not small.

| | Figure |
| --- | --- |
| Manufacturer invoices to retailers that incur some chargeback | **5–15%** |
| Vendor chargebacks as a share of a manufacturer's total revenue | **2–10%** |
| Total retail deductions as a share of annual retail sales, for most brands | **3–8%** |
| Walmart on-time-in-full non-compliance | **~3% of cost of goods sold**, plus $50–500 per shipment-notice error and $25–200 per labelling violation |
| Target / Amazon | Target around 5%; Amazon runs 15+ chargeback types, from $2.60 per unit to $250 per incident |

For a supplier doing meaningful volume with a national retailer, this is not a
rounding error. It is one of the largest controllable costs in the relationship.

## Then the finding that reframes it

A benchmark survey by Attain Consulting Group and the Credit Research Foundation
— 203 companies, most recently run in 2018, part of a study that has tracked this
since 1998 — found that the median company has **5–10% of its deduction dollars
invalid**: the retailer was wrong, the deduction should never have been taken,
and the supplier was entitled to that money. The same survey found something
sharper: even once a company *identifies* a deduction as invalid, it recovers
only 60% of it. **The other 40% goes uncollected because the paperwork, the
dispute window, or the internal capacity ran out before anyone could act.**

Read that in commercial terms. **A meaningful share of the money moving through
this relationship is moving wrongly, and a further share stays wrong even after
somebody notices** — not because the underlying facts are in dispute for long,
but because assembling the proof costs more time than the deadline allows. The
purchase order, the shipment notice, the invoice and the catalogue record do not
line up, and by the time somebody can show which one is right, the window has
often already closed.

## Why that work is so expensive today

Disputing a single deduction means assembling evidence across documents that live
in different places: what was ordered, what was notified as shipped, what was
invoiced, and what the item's data said it was in the first place. The question is

- **urgent** — deduction disputes have deadlines, often short ones, and the 40%
  that goes permanently uncollected is exactly what happens when the deadline
  wins that race;
- **one-off** — shaped by the specific claim, not by a reporting schedule;
- **cross-cutting** — it spans orders, shipments, invoices and item data, so no
  single screen was ever designed to answer exactly it.

So somebody opens four systems, exports from each, and reassembles by hand. **The
work is not the analysis. The work is the fetching** — and the fetching happens
because the answer lives somewhere the question isn't.

That is precisely the shape of question a connected assistant is good at, and
precisely the shape of question a dashboard is bad at. The value is not really in
proving more deductions are wrong — it is in proving it *fast enough that the
40% stops being permanent.*

## The instance of it we already solve

Trading Grid Catalogue solves one version of this problem today: **catalogue
compliance.** A category operations manager two weeks from a seasonal intake
freeze wants to know *"which of my suppliers will make the date, and what do I
chase first?"* Same properties — urgent, one-off, crossing suppliers and
categories and attributes. Same manual reassembly.

And the same person almost certainly already has Claude, ChatGPT or Microsoft
Copilot open on the other monitor: paid for, IT-approved, in daily use, and unable
to answer a single question about their actual catalogue, because it has no way to
reach it. **The assistant is not missing intelligence. It is missing access.**

Item data is also the *upstream* cause of a large share of downstream disputes.
Wrong pack details, missing dimensions, an item never properly set up — these
surface later as a labelling violation, a receiving discrepancy, or a deduction
nobody can explain. Fixing data quality at the catalogue is not a separate problem
from the deduction problem. It is the same problem, caught earlier.

---
---

# Section 3 — Why we have two AI surfaces

We run two, deliberately, and they are not competing versions of the same idea.

## Internal — the in-product Compliance Agent

A chat panel inside our own portal. The customer stays in our product.

- **It already knows the context.** Which retailer, which supplier, which
  category, which requirement set, what the user is currently looking at. The user
  does not have to reconstruct any of that in a prompt.
- **It shows its work.** Every answer points back to the screen where the user can
  verify it themselves — and that pointer is derived from what the agent actually
  looked up, not from the model's impression of our navigation.
- **It is the right place to act.** Creating a requirement, approving an
  exception, changing what suppliers are measured against — these need explicit
  confirmation, an impact preview, validation, audit history, and sometimes
  separation of duties. Before anything changes, the agent puts a confirmation
  card on screen stating exactly what will happen.
- **It protects where the value is.** The portal is where customers see evidence,
  configure obligations and complete remediation. The agent should make that
  better, not become a shortcut around it.

## External — the customer's own assistant

The customer pastes one address into the assistant they already pay for, signs in
with their own work account, and chooses how much access to grant.

- **Nothing to install, no key to manage.** Their entire setup is an address and a
  sign-in.
- **Which organisation's data they get is decided by who they are**, never chosen
  from a list. There is deliberately no account picker anywhere in the flow.
  Typing "show me a competitor's supplier gaps" does not work; natural language
  never overrides a permission check.
- **Read-only is a setting, not a different build.** A customer who grants only
  read access is never even shown the capabilities that change things.
- **Nothing changes on a first request.** Every capability that would alter
  something returns a preview of exactly what would change and what it does to the
  compliance numbers, and a separate confirmation step is the only thing that
  commits it. An abandoned conversation changes nothing.
- **One address, both sides of the network.** A retailer and a supplier paste the
  identical address and get different capabilities, because their identity decides
  which side of the relationship they are on. A supplier can see the waivers a
  retailer granted *them* — a shared fact they are party to — and nothing else
  that retailer holds.

## The relationship between them

This is the part usually got wrong. They are not two peer surfaces sharing a
back end.

> **The portal governs the connector.** An administrator inside our product sees
> which capabilities an outside assistant holds, and reads the log of every action
> it took — allowed or refused, who acted, which assistant, what it asked for.
> Access is granted, revoked and audited from inside the product.

That is the concrete answer to the question a security reviewer will ask: *what
stops the customer's AI workspace from becoming the control plane?* We do. On a
screen they own.

## The honest reason both exist

Some guarantees survive the trip to somebody else's assistant, and some do not.

| Property | In our portal | Through the customer's assistant |
| --- | --- | --- |
| Keeping each customer's data separate | Enforced | **Enforced** — re-checked on every request |
| What a given user is allowed to do | Enforced | **Enforced** — filtered per person |
| Nothing changes without confirmation | Enforced | **Enforced** — built into the protocol |
| Every answer cites a verifiable source | Enforced | **Requested only** |
| Saying that history is reconstructed, not recorded | Enforced | **Requested only** |
| Never restating a figure from memory | Enforced | **Requested only** |
| How it looks on screen | Ours | **Not ours** — the assistant's choice |

The three "requested only" rows are the entire argument for keeping the in-product
agent. It is not a lesser copy of the connector — it is the surface where those
guarantees are actually guarantees. Anywhere the column says "requested only," we
owe ourselves a measurement, because **a request that is never measured is an
assumption.**

## One assumption this whole comparison rests on

Everything above assumes the question can be answered from **one system's data** —
which is true of catalogue compliance today, and stops being true the moment the
expansion in Section 4 succeeds. A deduction dispute spans orders, shipments,
invoices and catalogue records at once.

That does not overturn the comparison, but it does add a third option that is
invisible from here, and it changes which surface wins for which question.
Section 4 picks that up directly, because it is the difference between an
expansion plan that works and one that quietly turns into four integrations.

---
---

# Section 4 — Land and expand

## The shape of the bet

Catalogue compliance is a good place to land: it is a real, funded pain, it is
where our differentiated data already sits, and it is narrow enough to get the
governance right. But it is not where the value stops, and the reason is
structural rather than aspirational.

**Every expansion after the first one adds a capability, not an integration.**

The expensive work — proving who the user is, deciding which organisation's data
they may touch, checking permissions on every single request, logging it, and
requiring a human confirmation before anything changes — is done once. It is not
specific to catalogue data. A purchase order, a shipment notice and an invoice go
through the same gate. Adding one is publishing a new capability inside a
connection the customer already approved, not negotiating a new integration and a
new security review.

That is why "land and expand" is a description of the architecture here, and not
just a go-to-market slogan.

## The stages

| Stage | What it covers | What is new | What is reused |
| --- | --- | --- | --- |
| **1. Land** | Catalogue compliance — requirements, supplier gaps, exceptions, reports, both sides of the network | Everything | — |
| **2. Deepen** | Proactive alerting instead of asking; citable report artifacts; telling a supplier which single fix unblocks the most retail partners | Alerting, stored artifacts | Identity, permissions, audit, confirm-before-change, the connection |
| **3. Expand across the network** | Orders, shipment notices and invoices; country-specific invoicing rules; EDI exception handling and the deduction-dispute workflow | Domain capabilities per document type | All of the above, plus the customer relationship and the approved connection |
| **4. Platform** | The same connection fronting other Trading Grid capabilities through the shared Aviator gateway | Gateway-level routing and metering | All of the above |

Stages 1 and 2 are a single product's data and are ready to sequence today. Stages
3 and 4 cross into other products' data, which opens a prerequisite that has not
been closed yet — named explicitly below rather than assumed away.

## The Trading Grid surface this expands into

Trading Grid is already a B2B trading-partner management and integration platform
spanning traditional EDI and modern APIs. Three parts of it are the obvious next
ground, and each maps onto a problem named in Section 2:

- **Active Orders** covers purchase orders, invoices, shipment notices, and order
  status across the procure-to-pay lifecycle including fulfilment, transportation
  and invoicing. **This is where the deduction dispute lives.** Every document
  needed to answer "was this claim valid?" is already on the network.
- **Trading Grid e-Invoicing** provides connectivity and formatting to meet local
  requirements in 60+ countries. Regulatory rules per country are exactly the kind
  of thing that is painful to look up and easy to publish as a strict contract —
  the same mechanism that makes an assistant offer only the four valid image
  formats makes it offer only the fields a given country actually requires.
- **Aviator** already analyses integrated data to find bottlenecks and predict
  errors, and **already offers natural-language querying over EDI payloads** so
  non-technical users can analyse transactions and explore patterns.

**That last point deserves emphasis, because it de-risks half of this document.**
The in-product agent pattern is not a novel bet we are asking anyone to take on
faith. It ships inside OpenText's own suite today. The Compliance Agent is that
same pattern applied to catalogue data, with a governed path to *change* something
added on top — and that governed write path is the part that is genuinely ours.

## Why the second land should be the deduction dispute

If Section 2's numbers are right, this is the highest-value cross-document
question on the network:

- The money is large and it is a line item somebody already owns.
- A meaningful share of claims are invalid, and a further share of the *known*-invalid
  ones go uncollected purely on time, so the work is *fast evidence assembly* —
  which is what this technology is unusually good at and what screens are
  unusually bad at.
- Trading Grid already carries every document the argument needs.
- The workflow ends in an action — file the dispute, accept the claim, correct the
  data — and finding the problem and acting on it stop being two different
  applications.
- Catalogue data quality is upstream of a meaningful share of those claims, so the
  first land and the second land reinforce each other rather than compete.

## The condition this depends on

Stated plainly, because it is what would make the expansion fail: **the reuse has
to be real.** If each new document type ends up needing its own permission model,
its own audit trail and its own confirmation flow, then this is not an expansion
strategy — it is four integrations wearing one name, and the economics collapse.

The discipline that keeps it honest is refusing to publish a capability until the
control it requires exists. We have held that line once already: supplier-side
access was gated on being able to prove that retailer and supplier organisations
are properly isolated from each other, and it shipped the day that was true, not
before.

## The named prerequisite for stages 3 and 4

Stated as plainly as the condition above, because this document loses credibility
the moment it treats an open question as settled: **reaching beyond a single
product's data depends on a company-level decision that has not been made yet,**
and it is currently being worked, not stalled.

Once a capability needs to reach across more than one product's data, a genuinely
different question shows up: whose identity system authenticates the request once
it crosses that boundary, and who owns the shared gate it crosses through. Two
things about this are settled and two are not.

Settled:

- **The identity pattern has a working precedent.** A shared gateway can
  authenticate a user once through the company's standard identity system and
  hand each product a verified identity to check against its own permissions —
  the same discipline argued for throughout this document, owned one level up
  rather than rebuilt per product. Another team inside the company added support
  for this in about a quarter, which is a real data point on cost, not a guess.
- **The alternative is worse, and everyone involved agrees on that.** Each
  product building and maintaining its own separate connection to a customer's
  assistant is exactly the "second copy of the security logic per integration"
  problem from Section 1 — just moved one level up instead of solved.

Not yet settled:

- **Who owns running the shared gate.** The proposal on the table is a central
  platform team rather than each product team building its own — consistent
  with the general guidance this technology's security practice gives, not
  something invented for this document — but it is not yet decided.
- **The specific concern raised by the architecture team, and it should be
  named rather than paraphrased into something softer: sensitive, multi-tenant
  customer data is a different risk class than the public-facing systems this
  technology was first built for, and that gap has to be closed with the same
  rigor as the identity work in Section 3 before a shared gateway is safe to
  build on** — not assumed closed because the pattern works elsewhere.

There is also a live fork on *how* two products would ever reach each other's
data even once the gate exists: whether one product's agent calls another's
directly, in natural language, with no customer assistant in the loop at all —
an internal pattern with at least one other team's capability already running
this way in production — or whether the connector model in Section 3 is the
only path even for internal, cross-product use. Which one wins changes what
stage 3 and 4 concretely look like, not whether they are worth pursuing.

**Read this as sequencing, not doubt.** The same discipline already applied once
— nothing ships across a boundary until the control for that boundary exists —
is being applied again, one level up, to a real and current conversation. That is
consistent with the rest of this document's argument, not an exception to it.

## When the answer spans systems, who owns the join?

Section 3 compared two surfaces on the assumption that one system holds the
answer. Stage 3 breaks that assumption on purpose. So the question has to be
asked again, and it resolves differently.

The reframe that does most of the work: **spanning systems is a reading problem.
Acting is not.** Filing a dispute, granting a waiver, correcting an item — each
of those still belongs to exactly one system, no matter how many systems the
question had to touch to get there. So the two surfaces do not merge as data
spreads out. They specialise harder: **reads drift outward toward whoever can
reach everything, while writes stay pinned to the product that owns the record.**

Which gives a usable rule:

| When the question spans | The better surface is | Because |
| --- | --- | --- |
| One system, and an action follows | That product's in-product agent | Authority, workflow context and citation are all enforceable there |
| One system, insight only, asked somewhere else | The external connector | Portability is the entire value |
| Several systems, all of them ours | The insight layer | We can compute the join deterministically and stand behind it |
| Several systems, some of them the customer's | The customer's own assistant | It is the only thing that can physically reach both, and we cannot compete with that |

Two things about that last row deserve saying plainly.

**The customer's assistant has an advantage here we cannot ever close.** The
decisive evidence for a deduction may sit in their own receiving system, their
warehouse records, or their logistics provider's data — none of which we will
ever hold. That is not a gap to out-build. It is a reason to be an excellent
participant in someone else's assembly rather than to pretend we can own every
question.

**But it also acquires a failure mode that gets worse with every system added.**
With one system, the grounding rules mostly hold: a single engine computed the
number and the assistant relays it. With four, **the model itself is performing
the join** — and nothing guarantees that the item identifier in the catalogue is
the same identifier on the invoice line, or that a completeness score and an
on-time score can be sensibly related at all. It will produce a confident
narrative across that seam, because that is what it is good at. The three
"requested only" rows in Section 3 degrade fastest precisely here, because now
there is no deterministic answer it could have quoted even in principle.

## Expansion means participating, not absorbing

The obvious next move is the wrong one, and it is worth naming before it becomes
the default plan.

The instinct is to give the catalogue's own agent more reach — let it read
orders, let it read invoices. That fails for three reasons:

- It makes one product a client of data it has **no authority over and no
  workflow context for.** It cannot show a user the screen where they would
  verify an order, because it does not own that screen.
- It does not scale past two systems. Every product reaching into every other
  produces a quadratic number of trust relationships, each one a fresh place to
  get authorization wrong.
- It rebuilds the exact problem Section 1 opens on — a second copy of the
  security logic per pair of systems — just moved one level up and given a
  friendlier name.

**Expanding across the network does not mean expanding the catalogue's agent. It
means publishing capabilities clean and well-grounded enough that somebody else's
join is trustworthy.** The catalogue becomes an excellent participant rather than
the integrator, and that is a different roadmap from "add order tools to the
compliance agent" — cheaper, and the only one that survives the third system.

## The insight layer is the join owner — and therefore the upsell

Here the architectural answer and the commercial answer turn out to be the same
answer, which is the useful kind of coincidence.

**The join owner already exists as a shipping product.** Two parts of the network
already do this work:

- **Trading Grid Insights** (formerly Trading Grid Lens) gives a view across all
  transactions on the platform — partner and document metrics, historical
  analytics — and is **already integrated with Aviator for real-time, AI-driven
  querying.** So the in-product agent pattern over cross-transaction data is not
  something this document is proposing. It ships.
- **Trading Grid Command Center** is described as leveraging a common data
  platform to integrate data from various sources across order-to-cash and
  procure-to-pay, to find bottlenecks and predict disruptions. **That is the
  cross-product join, productised.**

So stage 3 is not "build an orchestrator." It is "feed one that already exists."
That is a materially cheaper story than it first appears, and it is already a
named direction — establishing the catalogue as the source of truth for buyer
networks through cross-product integration is on the roadmap as a
further-horizon bet. This is a mechanism for a bet we already hold, not a new one.

**Which reframes the commercial motion.** The upsell is not "here is another
product you could buy." It is:

> **Every product you add makes the answers better, and the answers appear in the
> insight layer.**

Each rung has standalone value and compounding value at the same time. A customer
who adds the supplier-facing portal gets that product's own worth, *and* every
cross-document question they can already ask gets sharper. That is a much
stronger motion than a bundle, because the value of what they already bought
visibly increases.

## Anchor and engine, not two halves

It is tempting to describe this as shared ownership — the catalogue holds item
vocabulary, the insight layer holds cross-document joins, everyone contributes.
That framing is comfortable and it is wrong, because it makes two things sound
like peers when one is a foundation the other stands on.

**The catalogue is the vocabulary anchor. The insight layer is the join engine.**

If the catalogue publishes canonical item identity as something any other product
can call, the insight layer stops resolving items altogether. It no longer needs
to know that this stock code and that one are the same product — it asks. Its job
narrows to the genuinely cross-document part: order references, document numbers,
the fields that only exist because two systems recorded the same event
differently. That is a smaller and more tractable problem than the one it would
otherwise own.

**Strategically this is the difference between being a dependency and being a
feed.** A product whose identity layer everything else calls is very hard to
remove. A product that merely contributes rows to somebody else's warehouse is
replaceable by any other source of the same rows.

Which names the real risk inside our own portfolio, and it is worth saying before
someone else does: **if the insight layer builds its own item resolution — because
ours is not reachable, not fast enough, or simply not published as something
callable — the catalogue gets bypassed and becomes just another feed.** That is
not a hostile act by anyone; it is what a team does when it needs an answer and
the anchor is not available. Whoever establishes canonical identity first holds
the anchor position, which is a strong argument for publishing identity
capabilities early rather than waiting until the mapping design is perfect.

One tension to hold rather than resolve prematurely: the more portable and
exportable a customer's mapping is, the less it locks them in — but the less
portable it is, the more they hesitate to invest in building it at all. The
resolution is probably readable and exportable by the customer, maintained in the
platform. Trust is what buys adoption, and adoption is what creates the switching
cost anyway.

## How this pays back to the catalogue

Worth being honest about, because somebody will ask it in the first meeting where
this is presented: **the catalogue earns on data events flowing through the
network, not on seats.** The insight products are a different revenue line. So on
its face, this upsell is good for the company and neutral for the number the
catalogue itself is accountable for.

It pays back through one specific chain, and the chain has to be stated or the
argument sounds like suite loyalty:

> Cross-document insight shows that catalogue data quality is driving deductions →
> the retailer now has a hard financial reason to mandate complete attributes from
> their suppliers → more suppliers submit and maintain more data → more events
> across the network.

That is a **stronger** version of the visibility argument the catalogue already
makes. A completeness score tells a retailer they have a data problem. A
deduction figure tells them what that problem costs, in money, this quarter. The
second one changes behaviour; the first one gets filed.

## What has to stay true

Three conditions, in the same spirit as the reuse condition above. Each is a
place this could quietly fail.

**1. The insight layer must sell computation, not collation.** This is the risk
that runs in the opposite direction to everything above: the same standard
interface that lets us assemble a cross-product view lets the *customer's*
assistant assemble one too. Once every product publishes cleanly, "all your data
on one dashboard" is something their own assistant reproduces for free. What it
cannot reproduce is anything computed **across the network** — how this supplier
compares to the median for their category, what normal looks like across millions
of transactions, which partners fail this document type most often. Only the
network operator can calculate those. The catalogue's own plans already reach for
this, with supplier benchmarking and peer comparison. That instinct is the
defensible half, and it should be the pitch.

**2. The identifiers and the vocabulary have to line up — and the answer is a
declared mapping surface, not a clever agent.** Both multi-system paths depend on
the products agreeing on what an item, an order and a trading partner are. The
temptation is to let the assistant work it out and remember the answer. That is
the wrong instinct, and it is worth being precise about why, because the right
answer is both safer and simpler.

Four steps, in order of how much work each removes:

**Eliminate first.** Where a standard identifier already exists on both sides,
there is no mapping to make at all. A global trade item number is a global trade
item number. The mapping problem exists only for *non-standard* identifiers —
internal stock codes, purchase order references, custom fields somebody invented
in 2004. Which means **the catalogue's standards discipline is itself a
semantic-alignment asset**: the size of the remaining problem is a function of how
much standardisation already happened upstream, and the catalogue is the product
in the network that has done the most of it.

**Declare the residue.** What is left goes on an explicit mapping surface — a
visible, versioned declaration that this field corresponds to that one — rather
than living as an inference inside a model. Four reasons, strongest first:

- **Visibility is the mitigation.** An invisible corrupted mapping cannot exist
  when every mapping is a row somebody can read. This turns out to be a better
  defence than anything cryptographic, and it is free.
- **It moves the row from "requested only" to "enforced"** in Section 3's table.
  A declared mapping is applied deterministically. A remembered one is a hope
  with good intentions.
- **It is native to what this product already is.** A rule-authoring system where
  one party declares and the system enforces is not a new paradigm here — it is
  the existing one, pointed at vocabulary instead of attributes.
- **It is citable.** "Your administrator declared this mapping on this date"
  survives a counterparty challenge. "The assistant remembered it" does not.

**Let the assistant propose into it.** This is where AI earns its place, and it is
not a small role — it solves the two things a screen alone cannot. **Cold start:**
an empty mapping surface delivers nothing on day one, which is exactly why data
governance projects stall before they produce value. **The long tail:** nobody
hand-enters hundreds of idiosyncratic mappings, and those are precisely the ones a
central data model will never cover. An assistant watching real work happen can
propose candidates continuously and cheaply.

**And never let memory be load-bearing.** Unratified candidates suggest;
only declared mappings are used for anything that counts. That single rule is what
makes the rest of this safe.

**Where the candidates get proposed still matters, and it favours the embedded
surface.** The July 2026 specification removed the concept of a session entirely —
every call now carries its own context, and nothing about memory is part of the
protocol. Memory belongs to whoever runs the agent. In the customer's own AI
workspace it is typically scoped per user, and we cannot inspect it, correct it,
or share it across an account — so two people at the same retailer accumulate two
different sets of candidates. In the embedded agent it is tenant-scoped,
correctable, and shared. That is a real argument for the embedded surface on top
of the ones already made.

**On the attack this design defuses.** Security researchers now treat memory
poisoning as its own category — OWASP added it to the Agentic AI Top 10 in 2026 —
because unlike ordinary prompt injection it does not reset when the conversation
ends: plant a false belief once and the agent acts on it months later, with no
further contact from whoever planted it. The uncomfortable part, worth stating
rather than discovering in review, is that **our existing confirmation gate does
not catch this.** It approves *actions* — a human confirms "grant this waiver" —
but that human never sees that the term the waiver was granted on had been
resolved through a corrupted mapping upstream of the decision they thought they
were making. Confirmation checks whether an action looks reasonable, not whether
the belief behind it was already wrong.

The declared-mapping design is what answers that, and it answers it cleanly: if
nothing is used until it has been declared, then poisoning produces **a wrong row
on a screen for somebody to reject, rather than a wrong action taken quietly.**
The threat does not need detecting, because it cannot reach anything. That is why
this should be built as declare-then-use from the start rather than retrofitted
once an assistant's memory has already become something people rely on.

One more reason to build it regardless of the risk: a declared, customer-specific
mapping accumulates from that customer's real work and is worthless to anyone
else. It is the *computation, not collation* argument from condition 1, extended
from numbers to the vocabulary itself — and unlike a dashboard view, it is not
something a general-purpose assistant can reconstruct.

### Who ratifies a mapping — three classes, not one question

"Who has the authority to declare a mapping" looks unanswerable when the two
parties have opposed financial interests. It stops looking that way once the
three genuinely different things being conflated are separated.

**Self-descriptive mappings** — "our internal stock code is that standard item
number," "our department code is that product category." Only one party knows the
answer and the other has no standing to judge it. Declared unilaterally by
whoever owns the data. This is almost certainly the bulk of all mappings by
volume, and it carries no conflict at all.

**Relationship facts** — true of the trading relationship itself, with both
parties party to them. **This is the exact shape vendor exceptions already have**
in this product: one party declares, the other sees it, it is audited, and
neither can silently rewrite it. That governance model already exists and already
works, so it should be reused rather than reinvented.

**Instance correspondence** — "this invoice line is that order line is that
catalogue item." **Treating this as a mapping is a category error**, and an
expensive one. Mappings are schema-level: stable, reusable, true until changed.
Whether one invoice line matches one order line is a fact about a single
transaction, determined per dispute from the documents themselves and derived
deterministically wherever a shared identifier exists. Storing it as a durable
mapping is precisely how you would manufacture the poisoning risk described
above, by turning a per-case judgement into a permanent belief.

That leaves a genuine residue: schema mappings where the interpretation carries
money — where calling one weight field equivalent to another is the difference
between a chargeback standing and falling. For those, **the retailer ratifying is
the right default — not because retailers are more trustworthy, but because it
mirrors the exception model the network already runs on**, where one party decides
and the other has visibility and a route to contest.

With one refinement worth building in: **record the proposer and the ratifier
separately, and require that they differ.** A mapping proposed by a supplier and
ratified by a retailer is a materially stronger artifact than either party
asserting it alone, and the record shows exactly that. The counterparty's
protection is not a veto — it is visibility plus the right to dispute, which is
how exceptions already work.

**3. One insight surface per kind of question.** The catalogue has its own
compliance dashboard coming. If that grows into a cross-document view, it will
disagree with the insight layer in front of a customer, and two confident
disagreeing answers is worse than one. Deciding now — the catalogue's dashboard
answers catalogue questions, the insight layer answers cross-document ones — is
nearly free today and expensive once both have shipped and both have users.

## The same architecture, described from outside

This is not only our reading. Supply-chain analysts describe the identical
pattern: separate agents for transportation exceptions, supplier risk, demand
planning and procurement, sitting over shared services that publish approved
capabilities — where **once standardised, the same capabilities serve procurement,
planning, logistics and customer-service agents alike.** That is the land-and-
expand thesis, stated by a third party with no interest in our roadmap.

---
---

# Section 5 — Is this actually the future for enterprise products?

Below, each claim carries a verdict, a confidence level, the basis for it, and —
the part that makes this a ledger rather than a pitch — **what would prove it
wrong.** Disagree with a row without discarding the document.

## External access: customers' own assistants

| Claim | Verdict | Confidence | Basis | What would falsify it |
| --- | --- | --- | --- | --- |
| Build it once and every major assistant can use it | **True** | **High** | OpenAI, Google, Microsoft and AWS all support the standard; OpenAI co-founded the foundation that governs it | A major assistant shipping a rival proprietary format *and* refusing this one. No current signal |
| The standard is durable enough to build a product on | **True** | **High** | Linux Foundation stewardship since December 2025, an open standards process, and a twelve-month notice period on anything retired | Governance stalling, or a breaking change with no migration window |
| Serious enterprise software vendors are shipping this to customers, not just experimenting | **True** | **Medium-high** | Asana, Atlassian, Canva, Figma, Linear and Supabase are named adopters of the corporate single-sign-on extension | These proving to be pilots that quietly lapse. Worth re-checking in two quarters |
| Customers will permit a third-party assistant against their data | **Partly — and it is a procurement question, not a technical one** | **Medium** | Corporate single sign-on exists precisely because enterprises demanded central control. The customer's own IT department is the gatekeeper; we never hold their staff directory | Regulated customers standardising on "internal assistants only." Entirely plausible in some sectors |
| A governed connector is safer than what customers already accept | **True, and under-used as an argument** | **Medium-high** | The realistic alternative is a file export or bulk feed, which copies data outside our control permanently — no revocation, no record of what was read | A customer demonstrating equivalent per-request policy enforcement on their existing feed. Rare in practice |

## Internal access: the in-product Compliance Agent

| Claim | Verdict | Confidence | Basis | What would falsify it |
| --- | --- | --- | --- | --- |
| Embedded AI assistants are becoming standard in enterprise software | **True** | **High** | Aviator ships one today over EDI data; every major enterprise suite has shipped or announced one | Customers actively switching them off. The opposite is happening |
| The embedded agent is the right surface for actions that change things | **True** | **High** | Confirmation, impact preview, audit trail and separation of duties are all things we can *enforce* only where we own the screen | Confirmation moving into the protocol so completely that the distinction stops mattering. Partly happening — see the weaknesses below |
| Embedded first, external selectively, is the right sequence | **True** | **Medium-high** | The hard work is shared; the embedded surface has the smaller blast radius and no third-party procurement conversation attached | A customer signing for external access before the embedded work lands. A good problem, and it would reorder the plan |
| **External connectors will not make the embedded agent redundant** | **True** | **Medium-high** | The three "requested only" rows in Section 3, plus a fourth reason that hardens the case: memory. The vocabulary and identifier mapping that makes cross-system questions answerable has to live somewhere tenant-scoped, correctable and shared across an account — which a customer's own AI workspace structurally cannot offer, since it is typically scoped per user and outside our ability to inspect or fix | Assistants proving reliable enough at citation and provenance that the distinction is academic, or memory becoming a genuinely shared, auditable, tenant-level primitive inside third-party assistants rather than a per-user convenience. Neither is true today |

## Retail and CPG specifically

| Claim | Verdict | Confidence | Basis | What would falsify it |
| --- | --- | --- | --- | --- |
| Retail and CPG are adopting this, not waiting | **True** | **Medium-high** | Retailers name supply chain and pricing as their top intended uses; Walmart's supplier-facing agent is connected this way; Microsoft ships a commerce version | Adoption concentrating purely in consumer-facing shopping assistants, with nothing on the supply side |
| Data quality is the constraint the agents are hitting | **True, and it is our strongest positioning** | **Medium** | Retail research reports that adoption is *exposing* data quality and availability concerns rather than solving them | Buyers treating data quality as solved. Section 2's deduction figures say otherwise |
| **Retailer↔supplier catalogue compliance specifically has no direct precedent** | **True** | **Medium** | Extensive search finds commerce platforms, PIM vendors and individual retailers' own agents — not this | Somebody shipping it. Then we are late, and we would want to know quickly |

## Where the thesis is weakest

Four things, stated plainly, because a document that only argues one direction is
worth less to whoever reads it.

**1. The whole category is heading into a trough.** Gartner's 2026 assessment
places agentic AI at the peak of inflated expectations, reports only 17% of
organisations having deployed agents, and predicts **more than 40% of agentic AI
projects will be cancelled by the end of 2027** on cost, unclear value, or
inadequate risk controls. Publishing capabilities does not make anyone use them.
The useful nuance in the same analysis: the results that *are* materialising come
from well-scoped agents in constrained workflows with human oversight — which
describes a narrow, permission-checked capability set with confirmation before
every change, and does not describe most of what is currently being funded.

**2. The security record is genuinely bad, and it is the best argument against
naive adoption.** Hiding instructions inside a capability's description, so that
the assistant reads them and the user never sees them, is now a catalogued attack
class. Microsoft has published warnings about it. Researchers demonstrated using
one compromised system to make an assistant misuse a second, legitimate,
high-privilege one. Scans of publicly available systems find double-digit
percentages with serious flaws, and hundreds reachable on the internet with no
sign-in at all. The US National Security Agency published guidance on this in
June 2026.

The right conclusion is not "therefore don't." It is that **the governance is the
product.** Every one of those failures is an implementation failure, and each has
a specific answer in how we built ours: no anonymous access, the organisation
derived from identity rather than chosen, permissions split so that reading,
authoring, enforcing and deleting are four separate grants, nothing changing
without a confirmation, and every action logged including the refusals. That is a
defensible position — but it must always be stated as *"we did the work,"* never
as *"this technology is secure."*

**One category this list does not yet cover: memory poisoning**, now serious
enough that it has its own place in OWASP's Agentic AI Top 10 as of 2026 — an
attacker plants a false fact in an agent's persistent memory once, and the agent
acts on it correctly-looking but wrongly, months later, with no further
interaction from the attacker required. This matters here specifically because
Section 4 proposes agent memory as the practical fix for cross-system vocabulary,
and our own confirmation gate does not catch it: confirmation approves an
*action*, not the belief that produced it, so a human confirming "grant this
waiver" never sees that the term it was granted on was resolved through a
corrupted mapping upstream. The mitigation is the same discipline as every other
control in this document — nothing gets authority until a human has ratified it
once — and it has to be designed in from the first memory feature, not added
after memory is already something people rely on.

**3. The standard is still moving, and it moves our own boundaries.** The
specification released six days before this document changes the deployment model
and adds a native way for a system to pause mid-request and ask the user a
question — which is an alternative to the confirmation mechanism we built
ourselves. Similarly, if assistants gain the ability to render our screens rather
than describe them in words, the "dense comparison belongs on a screen" argument
weakens. Section 3's table is a snapshot of a moving line, not a permanent
property.

**4. Consolidation risk.** If corporate gateways become where the control and the
value sit, an individual product's connector becomes commodity plumbing — a
checkbox, not a differentiator. Our answer has to be the thing a gateway cannot
supply. **The moat is the requirement model, the compliance engine, and the
network of trading relationships — not the connector.** Better that we say this
first than hear it in a review.

## What we should not claim

- **Not** "this technology is inherently secure." It standardises where the
  permission checks go, not whether you did them.
- **Not** "Claude or Copilot can safely reach our data by default." They must be
  explicitly authorised and constrained.
- **Not** "read-only means zero risk." Reading discloses data; entitlement checks
  and minimal responses are mandatory.
- **Not** "the assistant decides access." It does not. Our platform does.
- **Not** "everyone is adopting it, therefore it works." Adoption of a standard is
  not evidence of value from what is built on it, and the cancellation forecast is
  the counterweight.
- **Not** "we are ahead." We have a prototype on illustrative data.

## The verdict

**Yes, with two qualifications.**

MCP as the standard way AI systems reach enterprise software is about as settled
as an eighteen-month-old standard can be: neutral governance, every major
assistant, corporate single sign-on shipped and stable, and a specification that
has already made the jump from laptop tool to distributed infrastructure. Betting
*against* it now requires believing something specific and unlikely.

The two qualifications are what the ledger is for.

**One — the standard is settled; the value is not.** Nothing above demonstrates
that these integrations produce outcomes, and the most credible analyst view
expects most agentic projects to be cancelled. So treat "this is the future" as a
claim about *plumbing*, and keep the *value* claim tied to something measurable.
The cheapest available measurement, and the one worth taking before committing
serious engineering: **what fraction of report and dashboard sessions end in an
action — a fix, a waiver, an outreach — rather than ending in nothing?** If most
end in nothing, a system that speaks up when something is wrong beats a screen
somebody has to remember to check, and we should say so. If they end in
multi-supplier forensics, the screens survive and the debate is over.

**Two — embedded first, external selectively, expansion continuously.** The
in-product agent is where the guarantees are real and where actions belong. The
external connector is where the reach is, and it should follow the governed
surface rather than race it. And the expansion across orders, shipments and
invoices is the part that turns a well-received feature into a network position —
because each step reuses the permission model, the audit trail and the customer
relationship that the first one paid for.

**Land on catalogue compliance. Expand on the disputes it is upstream of.**

---
---

# Section 6 — Sources and verification status

Several sources block automated retrieval, so status is stated per source rather
than implied. This convention is used across our other documents and is worth
keeping — it is the reason a reader can trust the numbers that *are* marked
verified.

## Verified — retrieved and read directly

All from the MCP project's own publications:

- [MCP joins the Agentic AI Foundation](https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/) — Linux Foundation stewardship, co-founders, governance independence
- [The 2026-07-28 specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/) — stateless operation, gateway routing headers, the mid-request question mechanism, authorization hardening, twelve-month deprecation window, download figures
- [Enterprise-Managed Authorization: zero-touch OAuth](https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/) — stable 18 June 2026, and the identity-provider, assistant and business adopter lists
- [The official registry](https://registry.modelcontextprotocol.io/) — live, but **publishes no server count**, so any "N thousand systems" figure in circulation is not sourced from there

## Not verified — search summaries only, because the source blocked retrieval

**Check against the primary source before any of these goes to a customer or on a
slide.**

*Retail and CPG economics — every figure in Section 2:*

- Chargeback and deduction ranges (5–15% of invoices, 2–10% of revenue, 3–8% of
  retail sales), and the Walmart, Target and Amazon penalty structures — drawn
  from several vendor and industry analyses, none independently confirmed
- The [Attain Consulting Group / Credit Research Foundation Customer Deductions
  Benchmark Survey](https://www.prnewswire.com/news-releases/attain-consulting-group-releases-report-on-customer-deductions-300200008.html)
  (203 companies, 2018) — the source for the 5–10%-invalid and 60%-recovered
  figures. Reached via secondary citation rather than the original survey
  report, so it is **not verified** in the strict sense used here, but it is a
  named, dated study with a stated sample size, which is more than the figure
  it replaced. **Worth stating plainly, because it is the kind of correction
  this section exists to catch:** an earlier draft of this document used a more
  dramatic figure — "65–80% of retail shortage claims are invalid," attributed
  to the Retail Value Chain Federation. That figure could not be traced to any
  RVCF publication. Every public repetition of it leads back to deduction-recovery
  service providers, who have a direct commercial interest in citing the highest
  plausible number, and RVCF's own research is membership-gated, so the claim
  could not be checked against a primary source at all. It was replaced with the
  Attain/CRF figure above for that reason. **Confirm the Attain/CRF figures
  against the original survey report before using either number externally**

*OpenText product descriptions — all of Section 4's Trading Grid material:*

- [Trading Grid](https://www.opentext.com/products/trading-grid), [Supply Chain Automation](https://www.opentext.com/products/supply-chain-automation), and the [Trading Grid with Aviator overview](https://www.opentext.com/media/product-overview/opentext-trading-grid-with-aviator-po-en.pdf) — the Active Orders scope, the 60+ country e-Invoicing coverage, and Aviator's natural-language-over-EDI capability all come from **public marketing pages, not internal roadmap**. Confirm the module boundaries and current capability with the product owners before presenting the expansion sequence as a plan
- [Trading Grid Insights / Lens](https://www.softwareadvice.co.uk/software/393359/lens)
  and [Trading Grid Command Center](https://www.opentext.com/en-gb/products/trading-grid-command-center)
  — the transaction-wide view, the existing Aviator integration for AI-driven
  querying, and Command Center's "common data platform integrating data from
  various sources" all come from public product pages. **The claim that Command
  Center is the natural owner of the cross-product join is this document's
  argument, not the product's stated positioning** — validate with those product
  owners before presenting it as a joint plan, since it has implications for
  their roadmap as well as ours
- **One inference, flagged rather than buried.** An internal working session
  referred to scoping assistant access to catalogue tools only, "not Lens or CC
  tools." Reading that shorthand as these two products is an inference drawn
  while writing this document — it is not stated in any source. It is a
  well-supported reading, and it is still a reading. Confirm it before relying on
  it, for the same reason the deduction figure below was replaced

*Analyst and security material:*

- [Gartner — Hype Cycle for Agentic AI, 2026](https://www.gartner.com/en/articles/hype-cycle-for-agentic-ai) — the 17% figure, the >40% cancellation forecast, the trough placement. **Paywalled; these come from secondary coverage**
- [OWASP — the tool-poisoning attack class](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning), [Invariant Labs' cross-system demonstration](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks), [Microsoft's warning](https://thehackernews.com/2026/06/microsoft-warns-poisoned-mcp-tool.html), and the [NSA guidance of June 2026](https://media.defense.gov/2026/Jun/02/2003943289/-1/-1/0/CSI_MCP_SECURITY.PDF)
- Memory poisoning specifically — OWASP's 2026 Agentic AI Top 10 addition, and the general research finding that published attack success rates against unprotected agent memory run very high in controlled settings. Individual percentages are research-setting figures, not production incident rates, and should be treated that way if quoted
- Supply-chain analyst framing on shared capabilities across agents — [ARC Advisory Group](https://www.arcweb.com/blog/ai-supply-chain-part-3-mcp-model-context-protocol-shared-reasoning-across-agents) and [Logistics Viewpoints](http://logisticsviewpoints.com/2026/07/29/model-context-protocol-and-the-future-of-agentic-supply-chains/)
- [Stacklok — State of MCP in Retail 2026](https://stacklok.com/resources/state-of-mcp-in-retail-2026/) — the >40%-of-retailers-in-production figure and the data-quality finding

## Do not use

- Circulating enterprise-adoption percentages such as "41% in production" or "78%
  of enterprise AI teams" — **no primary source located for either.**
- Any specific vulnerability-prevalence percentage. The claim *"the security
  record is bad"* is well supported; the individual percentages are not.

## Already documented elsewhere

The retail landscape sources — Walmart's supplier-facing agent, the PIM vendors,
Microsoft's and SAP's commerce systems, the network operators, and the EU Digital
Product Passport material — are catalogued in our MCP presentation deck with their
own verification caveats, which still apply.

---
---

# Annex — screens a cross-product demo would need

**This is a build brief, not part of the argument above.** Everything in it is
currently unbuilt.

The working prototype behind this document covers the catalogue only: retailers
authoring requirements, suppliers seeing and meeting them, compliance reporting on
both sides, and an assistant connected to all of it. That is enough to demonstrate
Sections 1 through 3 convincingly, and it is *not* enough to demonstrate Section 4,
because every interesting claim in Section 4 is about what happens between
products.

The screens below are what a demo for the other product teams would need. They
would live outside the catalogue prototype — the point is precisely that they are
not one product's screens — and they are described here at product level so a
later session can build them without re-deriving the reasoning.

## The screens

**1. Mapping Console.** The declared surface from Section 4's second condition.
Every mapping as a visible row: which field in which system corresponds to which
field in which other system, its scope, its version, who proposed it, who ratified
it, and when. Filterable by which pair of systems it bridges.
*Proves: semantics are enforced rather than remembered. This is the screen that
makes the poisoning answer concrete instead of theoretical.*

**2. Candidate Review.** The inbox of assistant-proposed mappings waiting for a
human. Each candidate shows the evidence behind the proposal — what the assistant
saw that made it suggest this — which party's session it came from, and which
automatic corroboration checks it passed or failed before a person ever saw it.
Accept, reject, or amend.
*Proves: propose, confirm, enforce. And it makes the security argument visible —
a poisoned candidate is a row somebody rejects, not a silent belief acted on.*

**3. Dispute Evidence Workbench.** The payoff screen, and the one to lead a demo
with. A single deduction claim, with the order, the shipment notice, the invoice
and the catalogue record assembled beside each other — and **every join between
them labelled** as either derived directly from a shared standard identifier or
resolved through a specific named mapping, with that mapping's provenance one
click away. Ends in an action: contest, accept, or correct the underlying data.
*Proves the whole of Section 2 end to end, and it is the screen most likely to
land with a customer-facing audience, because the money is visible in it.*

**4. Identity Anchor.** Give it an internal stock code, a document reference, or a
partner's own item number, and it resolves to the canonical item — showing which
standard did the work and where the residual mapping was needed.
*Proves the anchor-and-engine claim. This is the screen aimed squarely at the
insight-layer team, because it is the concrete version of "we will make items
resolvable so you do not have to."*

**5. Bilateral Mapping Agreement.** The relationship-class view: one mapping, both
parties looking at the same record, who ratified it, when, and the route the other
party takes to contest it.
*Proves that cross-party governance reuses the vendor-exception model already in
the product rather than inventing new machinery.*

**6. Capability Registry.** What each product publishes, what authority each
capability requires, which kinds of tenant may call it, and what a given
connection can therefore actually see.
*Proves "participation, not absorption" is an architecture rather than a slogan —
and it is the screen a platform or security audience will ask for by name.*

**7. Memory Inspector.** Side by side: what the assistant currently believes,
versus what has actually been ratified. Anything in the first column that is not
in the second is explicitly marked as unusable for anything that counts.
*Proves visibility-as-mitigation. Aimed at a security or architecture reviewer,
and the fastest way to close the memory-poisoning conversation.*

## Sequencing, if the demo has to be built in stages

**Screen 3 sells the story** — it is the one where a viewer sees money and
recognises their own week. Build it first if only one screen gets built.

**Screens 1 and 2 are what make screen 3 honest.** Without them the workbench is
just a nice layout, and the obvious question — *how do you know these two records
refer to the same thing?* — has no answer to point at.

**Screen 4 is what the insight-layer conversation turns on.** If that team is in
the room, this is the screen that determines whether the discussion is about
partnership or about territory.

**Screens 5, 6 and 7 are for specific audiences** — trading-partner governance,
platform and security respectively — and are worth building when those audiences
are actually scheduled, not before.

One caution for whoever builds this: the point of the demo is that these screens
belong to *no single product*. If it is built inside the catalogue prototype and
styled as a catalogue feature, it will be read as the catalogue trying to absorb
everyone else's data — which is the exact conclusion Section 4 argues against.
