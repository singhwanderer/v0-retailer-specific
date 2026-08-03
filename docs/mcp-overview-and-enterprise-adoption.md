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

Research from the Retail Value Chain Federation indicates that **65–80% of retail
shortage claims are invalid** — driven by clerical errors, EDI mismatches, and
receiving delays rather than by any real failure to deliver.

Read that again in commercial terms. **The majority of the money in dispute is
disputed because two systems disagree about data, not because anything went wrong
in the physical world.** The supplier did ship it. The retailer did receive it.
The purchase order, the shipment notice, the invoice and the catalogue record do
not line up, and somebody has to prove which one is right.

## Why that work is so expensive today

Disputing a single deduction means assembling evidence across documents that live
in different places: what was ordered, what was notified as shipped, what was
invoiced, and what the item's data said it was in the first place. The question is

- **urgent** — deduction disputes have deadlines, often short ones;
- **one-off** — shaped by the specific claim, not by a reporting schedule;
- **cross-cutting** — it spans orders, shipments, invoices and item data, so no
  single screen was ever designed to answer exactly it.

So somebody opens four systems, exports from each, and reassembles by hand. **The
work is not the analysis. The work is the fetching** — and the fetching happens
because the answer lives somewhere the question isn't.

That is precisely the shape of question a connected assistant is good at, and
precisely the shape of question a dashboard is bad at.

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
- The majority of claims are invalid, so the work is *evidence assembly* — which
  is what this technology is unusually good at and what screens are unusually bad
  at.
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
| **External connectors will not make the embedded agent redundant** | **True** | **Medium** | The three "requested only" rows in Section 3. Citation, provenance and honest framing are guarantees only where we own the rendering | Assistants proving reliable enough at citation and provenance that the distinction is academic. **This is the row most likely to be argued with, and it should be** |

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
- The Retail Value Chain Federation finding that **65–80% of retail shortage
  claims are invalid** — this is the single most load-bearing number in the
  document, and it should be traced to the RVCF's own publication before it is
  quoted anywhere externally

*OpenText product descriptions — all of Section 4's Trading Grid material:*

- [Trading Grid](https://www.opentext.com/products/trading-grid), [Supply Chain Automation](https://www.opentext.com/products/supply-chain-automation), and the [Trading Grid with Aviator overview](https://www.opentext.com/media/product-overview/opentext-trading-grid-with-aviator-po-en.pdf) — the Active Orders scope, the 60+ country e-Invoicing coverage, and Aviator's natural-language-over-EDI capability all come from **public marketing pages, not internal roadmap**. Confirm the module boundaries and current capability with the product owners before presenting the expansion sequence as a plan

*Analyst and security material:*

- [Gartner — Hype Cycle for Agentic AI, 2026](https://www.gartner.com/en/articles/hype-cycle-for-agentic-ai) — the 17% figure, the >40% cancellation forecast, the trough placement. **Paywalled; these come from secondary coverage**
- [OWASP — the tool-poisoning attack class](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning), [Invariant Labs' cross-system demonstration](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks), [Microsoft's warning](https://thehackernews.com/2026/06/microsoft-warns-poisoned-mcp-tool.html), and the [NSA guidance of June 2026](https://media.defense.gov/2026/Jun/02/2003943289/-1/-1/0/CSI_MCP_SECURITY.PDF)
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
