# Cross-product screens — problem, opportunity, and information flow

> A working brief for the screens that demonstrate what happens **between** Trading
> Grid products, not inside any one of them. Written for peer product managers and a
> VP. Everything described here is **unbuilt**. Nothing in it is a decision already
> taken — the open questions are addressed to the people who own the answers, by name
> of product, in Part 8.

---

# Part 0 — How to read this

## The arc in one sentence

> Retailers and suppliers lose real money to data disputes they are *entitled to win*
> and lose anyway on the clock, because the evidence lives in four systems and nobody
> owns the join — and the join is now cheap to build, because the expensive part of
> connecting systems to an AI assistant has already been paid for once.

## Who each part is for

| If you are | Read | Skip |
| --- | --- | --- |
| The VP | Parts 1 and 2, then the table in 2.5 | Everything else on first pass |
| A peer PM (Active Orders, Insights, Command Center, Aviator) | Part 3, your screens in Part 5, and your row in Part 8 | Part 7 |
| Whoever builds the demo | Parts 4 through 7 | Part 2 |
| A security or architecture reviewer | 1.6, 3.3, Part 4 (D2, D4, D5), screens 6 and 7 | Part 2 |

## Three things to hold while reading

1. **Everything here is unbuilt.** The working prototype behind this brief covers the
   catalogue only — retailers authoring product-data requirements, suppliers meeting
   them, compliance reporting on both sides, and an assistant connected to all of it.
   That prototype proves the mechanism. It cannot prove anything that happens between
   products, which is exactly what this brief is about.
2. **These screens belong to no single product.** If they get built inside the
   catalogue and styled as catalogue features, they will be read as one product trying
   to absorb everyone else's data — which is the specific outcome Part 2.4 argues
   against. Build them as a separate surface or the argument defeats itself.
3. **Numbers carry a status.** Figures in Part 1 come from industry sources that could
   not all be verified against a primary document, and the Trading Grid product
   capabilities in Part 3 come from public product pages rather than internal roadmap.
   Part 9 states the status of each. Check it before any of this goes on a slide that
   leaves the building.

---
---

# Part 1 — The problem

## 1.1 Start with the money

The retailer–supplier relationship leaks cash through data disputes, and the leak is
not a rounding error.

| | Figure |
| --- | --- |
| Manufacturer invoices to retailers that incur some chargeback | **5–15%** |
| Vendor chargebacks as a share of a manufacturer's total revenue | **2–10%** |
| Total retail deductions as a share of annual retail sales, for most brands | **3–8%** |
| Walmart on-time-in-full non-compliance | **~3% of cost of goods sold**, plus $50–500 per shipment-notice error and $25–200 per labelling violation |
| Target / Amazon | Target around 5%; Amazon runs 15+ chargeback types, from $2.60 per unit to $250 per incident |

For a supplier doing meaningful volume with a national retailer, this is one of the
largest controllable costs in the relationship — and it is a line item somebody
already owns, already reports on, and is already measured against.

### The finding that reframes it

A benchmark survey by Attain Consulting Group and the Credit Research Foundation —
203 companies, most recently run in 2018, part of a study tracking this since 1998 —
found that the median company has **5–10% of its deduction dollars invalid**: the
retailer was wrong, the deduction should never have been taken, the supplier was
entitled to that money.

The sharper finding is the second one. Even once a company has *identified* a
deduction as invalid, it recovers only **60% of it**.

> **The other 40% goes uncollected because the paperwork, the dispute window, or the
> internal capacity ran out before anyone could act.**

Read that in commercial terms. This is not money lost to a disagreement about facts.
It is money lost to the *cost of assembling proof* against a deadline. The facts were
on the supplier's side and stayed there. Nobody could show it fast enough.

**That 40% is the number this whole brief is aimed at.** It is the rare kind of
opportunity where nothing has to be persuaded, invented, or sold — the entitlement
already exists and the clock is the only thing defeating it.

## 1.2 Why the work is so expensive today

Disputing a single deduction means assembling evidence that lives in four different
places:

- **what was ordered** — the purchase order;
- **what was notified as shipped** — the shipment notice;
- **what was billed** — the invoice;
- **what the item's data said it was in the first place** — the catalogue record.

So somebody opens four systems, exports from each, and reassembles by hand in a
spreadsheet. Then they do it again for the next claim, from scratch, because nothing
about the first assembly was retained in a form the second one could reuse.

> **The work is not the analysis. The work is the fetching** — and the fetching happens
> because the answer lives somewhere the question isn't.

The analysis, once the four documents are side by side, usually takes minutes and is
frequently obvious. That is what makes the 40% figure so uncomfortable: it is not
money lost to hard problems.

## 1.3 The four properties that make this the wrong shape for a dashboard

| Property | What it means here | Why a screen struggles |
| --- | --- | --- |
| **Urgent** | Dispute windows are short and hard | A report you have to remember to run is a report that runs after the deadline |
| **One-off** | Shaped by the specific claim, not by a reporting schedule | You cannot pre-build a view per claim shape |
| **Cross-cutting** | Spans orders, shipments, invoices and item data | No single product ever designed a screen to answer exactly this |
| **Ends in an action** | Contest, accept, or fix the underlying data | Finding the problem and acting on it are two different applications today |

Every one of those properties is a strength for assembly-on-demand and a weakness for
a fixed view. That is the actual technical argument for doing this now, underneath the
commercial one.

## 1.4 Why no existing screen answers it

Each product's screens answer that product's questions, correctly and thoroughly.
Active Orders can tell you everything about a purchase order. The catalogue can tell
you everything about an item's data. Neither was ever supposed to answer a question
that starts in one and ends in the other, and neither is wrong for not doing so.

The question is nobody's, which is a different problem from the question being hard.

## 1.5 The problem underneath: nothing guarantees these records are about the same thing

Here is where the obvious plan — "put the four documents on one screen" — quietly
fails, and it is worth being blunt about it because it determines which screens are
load-bearing.

**Nothing today guarantees that the item on the invoice line is the item in the
catalogue.** Where both sides carry a global trade item number, the join is free and
certain. Where one side carries a vendor's internal stock code, a purchase order
reference somebody's ERP invented in 2004, or a custom field with a name only its
author understood, the join is an inference — and an inference presented as evidence
is worse than no evidence at all, because it will be challenged by exactly the
counterparty it was assembled against.

So the workbench in Part 5 is only as good as its answer to one question a
counterparty will ask immediately:

> *"How do you know these two records refer to the same product?"*

If the answer is "the system worked it out," the dispute is lost and the demo is a
mockup. If the answer is "your administrator declared this mapping on this date, and
here it is," the dispute is winnable and the screen is evidence.

**That is why the mapping screens are not supporting cast.** They are what makes the
payoff screen honest.

## 1.6 The problem underneath that: a join living in a model's memory cannot be audited

The tempting shortcut is to let the assistant work out the correspondences and
remember them. It is the wrong instinct, for a reason that is both a safety argument
and a simplicity argument.

An assistant's memory is not inspectable, not correctable, and not shared. In a
customer's own AI workspace it is typically scoped per user — so two people at the
same retailer accumulate two different sets of beliefs about what maps to what, and
neither can be reviewed. Nothing about memory is part of the connection protocol at
all; memory belongs to whoever runs the agent.

Security researchers now treat **memory poisoning** as its own attack class — OWASP
added it to its Agentic AI Top 10 in 2026 — because unlike ordinary prompt injection
it does not reset when the conversation ends. Plant a false belief once and the agent
acts on it months later, with no further contact from whoever planted it.

**The uncomfortable part, worth stating here rather than discovering in a review: a
confirmation step does not catch this.** Confirmation approves an *action* — a human
confirms "file this dispute," "grant this waiver" — but that human never sees that
the term the action rested on was resolved through a corrupted correspondence
upstream of the decision they thought they were making. Confirmation checks whether
an action looks reasonable, not whether the belief behind it was already wrong.

The answer, developed in Part 4's D4, is a **declared mapping surface**: nothing is
used for anything that counts until a human has ratified it once. Then a poisoned
proposal is **a wrong row on a screen for somebody to reject, rather than a wrong
action taken quietly.** The threat does not need detecting, because it cannot reach
anything.

This has to be designed in from the first version rather than retrofitted once
people already rely on an assistant's memory. That timing argument is the reason
screens 1 and 2 exist at all.

---
---

# Part 2 — The opportunity

## 2.1 What becomes possible

**Directly: collect the 40%.** Not by proving more deductions invalid — by proving
the already-known-invalid ones fast enough that the dispute window stops being the
binding constraint. Evidence assembly that takes an afternoon per claim today becomes
a screen that assembles on demand, with every join labelled and defensible.

**Indirectly, and this is the bigger one: catalogue data quality acquires a price
tag.** Item data is the *upstream* cause of a meaningful share of downstream disputes
— wrong pack details, missing dimensions, an item never properly set up, all of which
surface later as a labelling violation, a receiving discrepancy, or a deduction nobody
can explain. Today the only available argument for fixing item data is a completeness
score. After this, the argument is a number in currency.

> A completeness score tells a retailer they have a data problem.
> A deduction figure tells them what that problem costs, in money, this quarter.
>
> **The second one changes behaviour. The first one gets filed.**

## 2.2 Why now — the expensive half is already paid for

The reason this is worth proposing in 2026 and was not in 2024 is not that the idea
improved. It is that the cost structure changed.

Connecting a system to an AI assistant used to mean building a proprietary bridge per
assistant vendor — **including a second copy of the security and permissions logic**,
which is the expensive half and the half that gets it wrong. An open standard
(Model Context Protocol, now under Linux Foundation stewardship with OpenAI, Anthropic
and Block as co-founders) collapsed that to one integration instead of one per vendor.

What that means for this proposal specifically:

| The expensive work | Status | Reused by |
| --- | --- | --- |
| Proving who the user is | Built and shipping | Every capability, forever |
| Deciding which organisation's data they may touch | Built and shipping | Every capability |
| Checking permissions on every single request | Built and shipping | Every capability |
| Logging every action, including the refusals | Built and shipping | Every capability |
| Requiring human confirmation before anything changes | Built and shipping | Every capability |
| Reaching a *new* document type | **This is all that is new** | — |

> **Every expansion after the first adds a capability, not an integration.**

A purchase order, a shipment notice and an invoice go through the same gate the
catalogue already goes through. Adding one is publishing a new capability inside a
connection the customer already approved — not negotiating a new integration and a new
security review.

That is why "land and expand" is a description of the architecture here rather than a
go-to-market slogan. It is also the claim most worth attacking in review, so it is
stated as a condition rather than a fact in Part 3.3.

## 2.3 The commercial motion this creates

The upsell is not "here is another product you could buy." It is:

> **Every product you add makes the answers better, and the answers appear in the
> insight layer.**

Each rung has standalone value and compounding value at the same time. A customer who
adds the supplier-facing catalogue gets that product's own worth, *and* every
cross-document question they can already ask gets sharper. That is a materially
stronger motion than a bundle, because **the value of what they already bought
visibly increases** — which is a thing a customer can verify rather than a thing a
salesperson asserts.

There is a chain worth stating explicitly, because without it this sounds like suite
loyalty:

```
  cross-document insight shows catalogue data quality is driving deductions
                              |
                              v
     the retailer now has a hard financial reason to mandate complete
              attributes from their suppliers
                              |
                              v
        more suppliers submit and maintain more product data
                              |
                              v
              more data events flowing across the network
```

## 2.4 What we are NOT proposing — stated early, on purpose

The obvious next move is the wrong one, and naming it before it becomes the default
plan is the single most useful thing this brief does for a room of peer PMs.

**We are not proposing that the catalogue's agent read orders and invoices.**

It fails three ways:

1. **No authority, no workflow context.** It would make one product a client of data
   it has no authority over. It cannot show a user the screen where they would verify
   an order, because it does not own that screen.
2. **It does not scale past two systems.** Every product reaching into every other
   produces a quadratic number of trust relationships, each one a fresh place to get
   authorization wrong.
3. **It rebuilds the exact problem the open standard solved** — a second copy of the
   security logic per pair of systems, moved one level up and given a friendlier name.

> **Expanding across the network does not mean expanding any one product's agent. It
> means publishing capabilities clean and well-grounded enough that somebody else's
> join is trustworthy.**

Each product becomes an excellent participant rather than the integrator. That is a
different roadmap from "add order tools to the compliance agent" — cheaper, and the
only one that survives the third system.

## 2.5 Who wins what

One row per product, so nobody has to infer their own stake.

| Product | What it gets | What it gives |
| --- | --- | --- |
| **Active Orders** | Its documents become the evidence in a workflow that ends in a filed dispute — the procure-to-pay lifecycle gains a monetised outcome rather than a status view. The dispute action stays in Active Orders; it is never taken elsewhere | Publishes order, shipment-notice, invoice and claim reads as capabilities |
| **Trading Grid Insights / Command Center** | Stops having to solve item resolution. Asks the catalogue instead, and narrows its own job to the genuinely cross-document part — order references, document numbers, the fields that exist only because two systems recorded the same event differently | Owns the join and the network-wide computation; is the surface the answers appear in |
| **Aviator Gateway** | Becomes the place identity and metering are actually exercised across products, with a concrete first workload rather than a hypothetical one | One authentication, verified identity handed to each product, routing and rate limiting |
| **Trading Grid Catalogue** | Becomes the vocabulary anchor other products call, rather than a feed other products copy. Gains the financial argument for data quality it has never had | Publishes canonical item identity, requirement rules and compliance evidence as capabilities anyone can call |
| **The customer** | Recovers money they were already entitled to, and finds out what bad item data costs them | — |

### The one strategic point in this table

**A product whose identity layer everything else calls is very hard to remove. A
product that merely contributes rows to somebody else's warehouse is replaceable by
any other source of the same rows.**

That cuts in a direction worth saying out loud before someone else does: *if the
insight layer builds its own item resolution — because the catalogue's is not
reachable, not fast enough, or simply not published as something callable — the
catalogue gets bypassed and becomes just another feed.* That would not be a hostile
act by anyone. It is what a team does when it needs an answer and the anchor is not
available.

Which is an argument for publishing identity capabilities **early**, rather than
waiting until the mapping design is perfect. Screen 4 exists for exactly this
conversation.

---
---

# Part 3 — The products involved

## 3.1 The four actors

Four products, and what each **owns**, **publishes** and **consumes**. Nothing else
in this brief is coherent without this table.

| | Trading Grid Catalogue | Active Orders | Insights / Command Center | Aviator Gateway |
| --- | --- | --- | --- | --- |
| **Role** | Vocabulary anchor | Document system of record | Join engine | Front door |
| **Owns** | Canonical item identity, GS1 classification, requirement rules, compliance evidence, vendor exceptions | Purchase orders, shipment notices, invoices, order status across procure-to-pay including fulfilment, transportation and invoicing | Cross-document joins, network-wide norms and benchmarks, historical trend | Authentication, verified identity, routing, metering |
| **Publishes** | `resolve_item`, `get_requirements`, `get_compliance`, `list_exceptions` | `get_order`, `get_shipment_notice`, `get_invoice`, `get_claim` | Computed cross-document answers | Nothing of its own |
| **Consumes** | Nothing from other products | Nothing from other products | Everything the others publish | Every request |
| **Writes** | Item data corrections, exceptions, requirement changes | File / accept / withdraw a deduction dispute | **Nothing.** It is a reading surface | Nothing |

Capability names above are illustrative, chosen for readability — not a proposed API.
Naming is a Part 8 question for the products that would publish them.

### D1 — Topology

```
   caller (a product screen, or a customer's own assistant)
        |
        v
  +-------------------------------+
  |      AVIATOR GATEWAY          |   authenticate once against the
  |  one sign-in --> verified     |   customer's own identity system;
  |  identity + routing + meter   |   route and meter; never inspects
  +---------------+---------------+   payloads; holds no data of its own
                  |
                  |   verified identity, fanned out unchanged
                  |
   +--------------+--------------+------------------------+
   |                             |                        |
   v                             v                        v
+--------------+        +-----------------+     +---------------------+
|     TGC      |        |  ACTIVE ORDERS  |     | INSIGHTS / COMMAND  |
|  catalogue   |        |    documents    |     |  CENTER   the join  |
+--------------+        +-----------------+     +---------------------+
 item identity           PO / ASN / invoice       cross-document joins
 requirement rules       order status             network-wide norms
 compliance evidence     procure-to-pay           trend history
 vendor exceptions       claims
       |                        |                          ^
       |  publishes             |  publishes               |
       +------------------------+--------------------------+
                        reads flow this way

  WRITES DO NOT.  Correcting item data happens in TGC.  Filing a dispute
  happens in Active Orders.  The join engine writes nothing, anywhere.
```

Two products named elsewhere in this brief are deliberately **not** boxes above.
Trading Grid e-Invoicing (country-specific invoicing rules across 60+ countries) is a
strong second expansion candidate but not part of the deduction story, so it stays in
prose. The customer's own assistant is the unlabelled caller at the top: it enters
through the same gateway as anything else and gets exactly what its identity permits,
which is the entire point of drawing it that way.

## 3.2 The ownership rule that settles most territory arguments

One sentence does most of the work here:

> **Spanning systems is a reading problem. Acting is not.**

Filing a dispute, granting a waiver, correcting an item — each of those belongs to
exactly one system, no matter how many systems the *question* had to touch to get
there. So the surfaces do not merge as data spreads out. They specialise harder:

**Reads drift outward toward whoever can reach everything. Writes stay pinned to the
product that owns the record.**

Which gives a usable rule for deciding where any future capability belongs:

| When the question spans | The right surface is | Because |
| --- | --- | --- |
| One system, and an action follows | That product's own in-product agent | Authority, workflow context and citation are all enforceable there |
| One system, insight only, asked somewhere else | The external connector | Portability is the entire value |
| Several systems, all of them ours | The insight layer | We can compute the join deterministically and stand behind it |
| Several systems, some of them the customer's | The customer's own assistant | It is the only thing that can physically reach both |

**On that last row, plainly: the customer's assistant has an advantage here we cannot
ever close.** The decisive evidence for a deduction may sit in their own receiving
system, their warehouse records, or their logistics provider's data — none of which we
will ever hold. That is not a gap to out-build. It is a reason to be an excellent
participant in someone else's assembly rather than to pretend we can own every
question.

**And it acquires a failure mode that gets worse with every system added.** With one
system, a single engine computed the number and the assistant relays it. With four,
**the model itself is performing the join** — and nothing guarantees that the item
identifier in the catalogue is the same identifier on the invoice line, or that a
completeness score and an on-time score can be sensibly related at all. It will
produce a confident narrative across that seam, because that is what it is good at.

Which is, once again, the argument for D4's declared mapping surface. Every road in
this brief leads back to it.

## 3.3 What is genuinely open — named, not assumed closed

This brief loses its credibility the moment it treats an open question as settled.
Three are open. Two of them are somebody else's to close.

**Open 1 — Who owns running the shared gate.** The proposal on the table is a central
platform team rather than each product team building its own, which is consistent
with the general guidance this technology's security practice gives. It is not yet
decided. What *is* settled: the identity pattern has a working precedent inside the
company — a shared gateway that authenticates once and hands each product a verified
identity to check against its own permissions — and another team added support for it
in about a quarter, which is a real data point on cost rather than a guess. Also
settled, with everyone agreeing: the alternative, where each product builds its own
separate connection to a customer's assistant, is exactly the "second copy of the
security logic per integration" problem moved one level up rather than solved.

**Open 2 — The architecture team's concern, stated rather than softened.** Sensitive,
multi-tenant customer data is a different risk class than the public-facing systems
this technology was first built for, and that gap has to be closed with real rigour
before a shared gateway is safe to build on — not assumed closed because the pattern
works elsewhere. This brief does not claim it is closed.

**Open 3 — How two products would ever reach each other's data.** There is a live
fork: whether one product's agent calls another's directly, in natural language, with
no customer assistant in the loop at all — an internal pattern with at least one other
team's capability already running this way — or whether the external connector model
is the only path even for internal, cross-product use. Which one wins changes what
these screens concretely look like. It does not change whether they are worth
building.

**Read this as sequencing, not doubt.** The discipline that keeps the whole thing
honest is refusing to publish a capability until the control it requires exists. That
line has been held once already: supplier-side access to the catalogue was gated on
being able to prove retailer and supplier organisations are properly isolated from
each other, and it shipped the day that was true, not before.

## 3.4 Sourcing caveat — read this before quoting Part 3 at anyone

Every Trading Grid product capability described above comes from **public product
pages, not internal roadmap.** The Active Orders scope, the e-Invoicing country
coverage, the Insights transaction-wide view and its existing Aviator integration,
and Command Center's "common data platform integrating data from various sources" are
all public marketing descriptions.

One claim in particular is **this brief's argument, not any product's stated
positioning**:

> That Insights / Command Center is the natural owner of the cross-product join.

It has implications for their roadmap as well as ours, which is precisely why it
appears in Part 8 as a question addressed to that PM rather than anywhere in this
document as an assertion. If it survives that conversation it becomes a joint plan.
If it does not, the screens still stand — the join owner changes, the argument does
not.

---
---

# Part 4 — How information moves

Six diagrams, D1 to D6. **D1 — Topology** appeared in 3.1, because the four actors had
to be named before anything could move between them; the other five are here. One
legend, used by all of them.

```
  LEGEND
    +----+   a product, or a screen
    -->      a read: data flowing to whoever asked
    ==>      a write: a change committed in the system that owns the record
    [ ]      a named join, with a provenance label
    (!)      a gate: something that refuses, or asks a human first
```

## D2 — What one request actually does

The point of this diagram is that **the whole of it already exists** for the
catalogue. Adding a document type reuses every box.

```
  a question is asked -- in a product screen, or in the customer's
  own assistant, it makes no difference at this layer
        |
        v
  +---------------------------------------------+
  |            AVIATOR GATEWAY                  |
  |                                             |
  |  1. authenticate once, against the           |
  |     customer's own identity system      (!)  |
  |  2. attach verified identity + tenant        |
  |  3. route and meter                          |
  |     -- never inspects payload contents       |
  +----------------------+----------------------+
                         |
        the same verified identity, unchanged, to each product
                         |
      +------------------+------------------+
      v                  v                  v
  +-------+        +-----------+     +--------------+
  |  TGC  |        | ACTIVE    |     | INSIGHTS /   |
  |       |        | ORDERS    |     | CMD CENTER   |
  +---+---+        +-----+-----+     +------+-------+
      |                  |                  |
      |   each product re-checks, in its own permission model:
      |                                                          (!)
      |     - is this tenant allowed to see this record at all?
      |     - does this identity hold the scope this capability needs?
      |     - is this a change?  then preview it and stop.  A separate
      |       confirmation is the only thing that commits it.
      |
      v                  v                  v
  audit row          audit row          audit row
      \                  |                  /
       +-----------------+-----------------+
                         |
                         v
              every action logged, INCLUDING
              the refusals -- readable by the
              customer's own administrator
```

**Which organisation's data a caller gets is decided by who they are, never chosen
from a list.** There is deliberately no account picker anywhere in this flow. Asking
in natural language for another company's data does not work, because natural language
never reaches the permission check — the check happened before the words were read.

**Nothing changes on a first request.** Any capability that would alter something
returns a preview of exactly what would change, and what that does to the numbers. A
separate confirmation is the only path that commits. An abandoned conversation changes
nothing.

## D3 — Evidence assembly for one deduction

The payoff diagram, and the one to put on a slide. Every join is labelled with **how**
it was made, not just that it was made.

```
  DEDUCTION CLAIM  #C-88431
  "shortage -- 12 units short against PO 4501-99"     retailer says 108 of 120
        |
        v
  +--------------------------------------------------------------------+
  |                      EVIDENCE ASSEMBLY                             |
  +--------------------------------------------------------------------+
     |                  |                  |                    |
     v                  v                  v                    v
  PURCHASE          SHIPMENT            INVOICE             CATALOGUE
   ORDER             NOTICE                                  RECORD
  (Active           (Active             (Active               (TGC)
   Orders)           Orders)             Orders)
     |                  |                  |                    |
     +------[ J1 ]------+------[ J2 ]------+------[ J3 ]--------+
                               |
                               v
                    +----------------------+
                    |   JOIN PROVENANCE    |
                    +----------------------+

  [ J1 ]  order line  -> shipment line    DERIVED
          shared PO number + line number.  No mapping involved.

  [ J2 ]  shipment line -> invoice line   DERIVED
          shared global trade item number.  No mapping involved.

  [ J3 ]  invoice line -> catalogue item  MAPPED
          vendor SKU  "JR-4471-BLK"  ->  GTIN 00887...
          mapping M-118 -- proposed by the supplier, ratified by
          the retailer, 2026-03-14, version 2.  One click to the
          full record.

  (!)  Any join with no shared identifier and no ratified mapping is
       shown as UNRESOLVED, in the interface, at full size -- and it
       BLOCKS the contest action.  An unresolved join is not a small
       gap in a screen.  It is the reason a dispute would be lost.
```

**Read the labels, not the boxes.** Two of these three joins cost nothing because a
standard identifier already existed on both sides — which makes standards discipline
itself an asset here: the size of the remaining problem is a function of how much
standardisation already happened upstream. The mapping problem exists only for
*non-standard* identifiers.

## D4 — The mapping lifecycle, and the one rule that makes it safe

```
   OBSERVE            PROPOSE               RATIFY              USE
   real work        no authority          authority          evidence
       |                 |                     |                 |
       v                 v                     v                 v
  +----------+    +---------------+    +---------------+   +-------------+
  | an agent |    |   CANDIDATE   |    |    MAPPING    |   |   DISPUTE   |
  | watching |--> |    REVIEW     |--> |    CONSOLE    |-->|  WORKBENCH  |
  | real     |    |  (screen 2)   |    |  (screen 1)   |   | (screen 3)  |
  | work     |    +-------+-------+    +-------+-------+   +-------------+
  +----------+            |                    ^
                          | reject             | amend / version / revoke
                          v                    |
                    +-----------+              |
                    |  DROPPED  |         (!)  proposer and ratifier
                    +-----------+              recorded SEPARATELY,
                                               and required to differ

  THE RULE, and everything else depends on it:

    Nothing to the left of RATIFY is ever used for anything that counts.
    Unratified candidates suggest.  Only declared mappings are applied.

  WHICH MEANS:  a poisoned candidate is a row somebody rejects.
                It is not a belief acted on quietly, months later.
                The threat does not need detecting -- it cannot reach
                anything.
```

### Why a declared surface beats a clever agent, in four reasons

| | Reason |
| --- | --- |
| **1** | **Visibility is the mitigation.** An invisible corrupted mapping cannot exist when every mapping is a row somebody can read. This is a better defence than anything cryptographic, and it is free |
| **2** | **It is deterministic.** A declared mapping is applied the same way every time. A remembered one is a hope with good intentions |
| **3** | **It is native to what these products already are.** A rule-authoring system where one party declares and the system enforces is not a new paradigm here — it is the existing one, pointed at vocabulary instead of attributes |
| **4** | **It is citable.** "Your administrator declared this mapping on this date" survives a counterparty challenge. "The assistant remembered it" does not |

### Where AI genuinely earns its place here

Not a small role, and worth stating precisely, because the design above could be
misread as "no AI, just forms." The assistant solves the two things a screen alone
cannot:

- **Cold start.** An empty mapping surface delivers nothing on day one, which is
  exactly why data governance projects stall before they produce value.
- **The long tail.** Nobody hand-enters hundreds of idiosyncratic mappings — and those
  are precisely the ones a central data model will never cover.

An assistant watching real work happen can propose candidates continuously and
cheaply. It simply never gets to *decide*.

## D5 — Who ratifies a mapping: three classes, not one question

"Who has the authority to declare a mapping" looks unanswerable when the two parties
have opposed financial interests. It stops looking that way once the three genuinely
different things being conflated are separated.

```
   a proposed correspondence arrives
        |
        v
   what kind of statement is it?
        |
        +--> "our internal code X is standard identifier Y"
        |
        |      SELF-DESCRIPTIVE
        |      Only one party knows the answer.  The other has no
        |      standing to judge it.
        |      -> declared unilaterally by whoever owns the data
        |      -> almost certainly the bulk of all mappings by volume
        |      -> carries no conflict at all
        |
        +--> "for this relationship, our field A means your field B"
        |
        |      RELATIONSHIP FACT
        |      Both parties are party to it.  Money can ride on it --
        |      calling one weight field equivalent to another is the
        |      difference between a chargeback standing and falling.
        |      -> reuses the vendor-exception model already shipping
        |         in the catalogue: one party declares, the other sees
        |         it, it is audited, neither can silently rewrite it,
        |         and a contest route exists
        |      -> retailer ratifies by default -- not because retailers
        |         are more trustworthy, but because it mirrors the model
        |         the network already runs on
        |      -> proposer recorded separately, and must differ    (!)
        |
        +--> "this invoice line is that order line"

               INSTANCE CORRESPONDENCE  --  NOT A MAPPING
               Treating this as a mapping is a category error, and an
               expensive one.  Mappings are schema-level: stable,
               reusable, true until changed.  Whether one invoice line
               matches one order line is a fact about a single
               transaction.
               -> determined per dispute, from the documents themselves
               -> derived deterministically wherever a shared identifier
                  exists (that is [ J1 ] and [ J2 ] in D3)
               -> NEVER stored as a durable belief.  Storing it is
                  precisely how you would manufacture the poisoning
                  risk from 1.6, by turning a per-case judgement into
                  a permanent one.
```

**The middle lane already exists in shipping code**, which is the strongest available
argument for reusing it rather than inventing new machinery. In the catalogue today, a
vendor exception is scoped to a classification, names specific attributes, carries a
status and an expiry, is visible to both parties, and its effect on the reported
numbers is computed by *the same matcher the compliance engines use* — so the
explanation of what an exception does can never drift from what it actually does. That
is the governance pattern a bilateral mapping needs, already built and already
understood by customers. See `lib/vendor-exceptions.ts` and `VendorException` in
`lib/mcp/store.ts`.

**A note on why the proposer/ratifier split is worth the extra column.** A mapping
proposed by a supplier and ratified by a retailer is a materially stronger artifact
than either party asserting it alone, and the record shows exactly that. The
counterparty's protection is not a veto — it is visibility plus the right to dispute,
which is how exceptions already work.

## D6 — Which screen renders which arrow

```
 SCREEN                   READS FROM            WRITES TO        FLOW
 --------------------------------------------------------------------------
 3  Dispute Workbench     AO + TGC + Insights   AO (dispute)     D3, all
 1  Mapping Console       mapping surface       mapping surface  D4 RATIFY
 2  Candidate Review      agent proposals       mapping surface  D4 PROPOSE
 4  Identity Anchor       TGC                   nothing          D3 [ J3 ]
 5  Bilateral Agreement   mapping surface       mapping surface  D5 lane 2
 6  Capability Registry   gateway + products    nothing          D2, all
 7  Memory Inspector      agent memory + maps   nothing          D4 THE RULE
```

### The one architectural question this diagram exposes

**Where does "the mapping surface" live?** It is referenced by four of the seven
screens and owned by none of the four products in D1.

The proposal in this brief is that it is a **platform-level service behind the
gateway**, not a feature of any single product — for the same reason the gateway
itself is: the moment one product owns the vocabulary that other products depend on,
every other product has a dependency it did not choose, and the absorption objection
in 2.4 becomes true rather than merely feared.

This is decision #1 for the room, and it is in Part 8 as such.

---
---

# Part 5 — The seven screens

Presented in **narrative order** — the payoff first, then the machinery that makes it
honest, then the screens built for specific audiences. The original numbering from the
source annex is kept, so a reference to "screen 4" means the same thing in both
documents.

Each screen follows the same nine-part template, so a PM can read only their own and a
builder can read only sections 5 to 7.

---

## Screen 3 — Dispute Evidence Workbench

*Lead with this one. It is where a viewer sees money and recognises their own week.*

### What it is

A single deduction claim, opened as a working surface. The purchase order, the
shipment notice, the invoice and the catalogue record are assembled beside each other,
**every join between them labelled** with how it was made, and the screen ends in an
action: contest, accept, or correct the underlying data.

It is not a dashboard of disputes. It is one dispute, with everything needed to win or
concede it, on one screen, assembled on demand.

### The problem it answers

Sections 1.1 to 1.4 in full — most directly the 40% of known-invalid deductions that
go uncollected because assembling the proof costs more time than the window allows.
This is the screen where that 40% is either recovered or it is not.

### Who it is for

- **Primary: the supplier's deductions analyst.** Owns the recovery number, has a
  queue of claims with deadlines, and today does this in a spreadsheet from four
  exports.
- **Secondary: the retailer's vendor compliance manager**, from the opposite side —
  reviewing a contest that has arrived and deciding whether it stands.
- **In the room:** the customer-facing audience. This is the screen that lands with
  people who have never heard of a mapping surface and never need to.

### Products it reads from and writes to

| | |
| --- | --- |
| **Reads** | Active Orders — the claim, purchase order, shipment notice, invoice. TGC — the catalogue record, its requirement history, any vendor exception in force. Insights / Command Center — how this claim compares to the norm for this partner and document type |
| **Writes** | Active Orders only, and only the dispute: contest, accept, withdraw. A data correction hands off to TGC and is committed there, in TGC's own confirmation flow — this screen never writes catalogue data itself |

That split *is* the ownership rule from 3.2, made visible in a single screen. Worth
pointing at explicitly during a demo.

### Features

- **Claim header** — claim reference, type, amount, the retailer's stated reason, and
  **the dispute deadline as a countdown**, because the deadline is the antagonist of
  this entire story and should be visible at all times.
- **Four evidence panes**, side by side, each showing the fields that matter for this
  claim type rather than the whole document. A shortage claim shows quantities; a
  labelling violation shows the label attributes and the image requirement in force.
- **Join ribbons between the panes**, each carrying a provenance chip:
  - `DERIVED` — a shared standard identifier did the work. Hovering names it.
  - `MAPPED` — resolved through a specific declared mapping. The chip carries the
    mapping reference, who proposed it, who ratified it, and when. One click opens
    screen 1 filtered to that mapping.
  - `UNRESOLVED` — no shared identifier, no ratified mapping. Rendered at full size
    and in the alert style, not tucked away.
- **The discrepancy summary** — the computed difference that the claim turns on
  ("ordered 120, notified 120, invoiced 120, retailer received 108"), with each figure
  attributed to the document it came from.
- **Network context strip** — from Insights: how often this partner raises this claim
  type, and what the norm is. This is the part a customer's own assistant cannot
  reproduce, and it should be visibly present for that reason.
- **Three actions, each with different consequences:**
  - **Contest** — files the dispute in Active Orders. Requires every join to be
    `DERIVED` or `MAPPED`. **Blocked while any join is `UNRESOLVED`**, with the block
    explaining itself and linking to screen 4.
  - **Accept** — closes the claim as valid. Always available. Accepting is never
    blocked by evidence quality.
  - **Correct the data** — hands off to TGC with the item and the offending attribute
    pre-selected, because a claim that is valid *this time* is a claim worth
    preventing next time.
- **Empty and degraded states, specified rather than assumed:** a document that has
  not arrived yet, a claim whose catalogue item was never set up at all (which is
  itself the finding), and a claim raised against a period before the current
  requirement version — all three are real and all three are more interesting than
  the happy path.
- **Export the assembled evidence** as a citable artifact, with the provenance labels
  intact. Half the value of this screen is being able to attach it to an email.

### Information flow

D3, entirely. This screen *is* D3 rendered.

```
  Active Orders --> [ claim, PO, ASN, invoice ] -+
                                                 |
  TGC ----------> [ catalogue record, rules ] ---+--> WORKBENCH
                                                 |        |
  Insights -----> [ norm for this partner ] -----+        |
                                                 |        ==> dispute, filed
  mapping surface -> [ provenance per join ] ----+           in Active Orders
                                                          (never written here)
```

### User flow

1. Analyst opens a claim from their queue — or is brought here by an alert, which is
   the better version and a Part 7 question.
2. The four documents assemble. Time to assemble is a metric worth instrumenting from
   day one; it is the entire value proposition in one number.
3. Analyst reads the discrepancy summary first, not the documents. The documents are
   there to be checked, not read.
4. **Decision point — are all joins resolved?**
   - **Yes** → step 5.
   - **No** → the contest action is blocked. Analyst clicks the `UNRESOLVED` ribbon,
     lands on screen 4 with the unresolved identifier pre-filled, resolves it or
     proposes a mapping, and returns. *This detour is not a failure of the design —
     it is the design. It is the moment the demo earns its credibility.*
5. **Decision point — does the evidence support the claim?**
   - **Claim is wrong** → Contest. Dispute is filed in Active Orders with the
     assembled evidence attached. Confirmation states exactly what will be filed.
   - **Claim is right, and the cause is our data** → Correct the data. Hands off to
     TGC. The claim is accepted in the same step, because pretending otherwise
     invents a workflow nobody has.
   - **Claim is right, and the cause is operational** → Accept, with the reason
     recorded.
6. Whatever was chosen, the assembled evidence is exportable and the action is in the
   audit log.

### What it proves

The whole of Part 1, end to end, in the one currency the room already cares about.
And — because of the blocked contest action — it proves that the mapping screens are
load-bearing rather than governance theatre, without anyone having to argue it.

### Open questions for the Active Orders PM

- Does the dispute action already exist in Active Orders, or is this screen proposing
  a new write? If it exists, this screen should launch it rather than reimplement it.
- What does a claim actually look like on the network today — is there a claim object,
  or is a deduction visible only as a short-paid invoice?
- Which claim types are worth supporting first? Shortage and labelling are the ones
  this brief assumes, on the strength of the penalty structures in 1.1.

---

## Screen 1 — Mapping Console

### What it is

Every declared mapping as a visible row: which field in which system corresponds to
which field in which other system, its scope, its version, who proposed it, who
ratified it, and when. Filterable by which pair of systems it bridges.

This is the "declared surface" from 1.5 and D4, made literal. It is deliberately
boring, and its boringness is the argument.

### The problem it answers

1.5 and 1.6. A join that cannot be pointed at is a join a counterparty can dismiss,
and a belief that lives in a model's memory cannot be pointed at.

### Who it is for

- **Primary: the data steward** on either side of the relationship — the person who
  already owns "what our codes mean."
- **Secondary: a security or architecture reviewer**, for whom this screen is the
  answer to "how do you know the assistant did not make this up."

### Products it reads from and writes to

Reads and writes **the mapping surface only** — which, per D6, is proposed as a
platform-level service rather than any one product's feature. It reads product
metadata (which systems and fields exist) from the products themselves, so a mapping
cannot be declared against a field that does not exist.

### Features

- **One row per mapping**, columns: source system · source field · target system ·
  target field · scope · class · status · version · proposed by · ratified by ·
  ratified on.
- **Class** is the D5 classification — self-descriptive or relationship fact. Instance
  correspondences never appear here, by design, and the screen should say so somewhere
  a curious reviewer will find it.
- **Scope** — a mapping is not global. It is scoped to a trading relationship, a
  classification, or a document type, and the column shows which.
- **Filter by system pair**, which is how anyone actually arrives: "show me everything
  bridging Active Orders and the catalogue."
- **Version history per mapping**, with the previous value, who changed it, and when.
  A mapping that changed last Tuesday explains a dispute that started failing on
  Wednesday — that is a real support call, and this column answers it.
- **Provenance detail** on click: the candidate it originated from, the evidence
  behind that candidate, the corroboration checks it passed, and the ratification.
- **Actions:** amend (creates a new version, never overwrites), revoke (with the
  effect stated — *what stops working if this goes away*), and add manually for the
  cases nobody proposed.
- **Effect preview on every action**, following the pattern the catalogue already uses
  for vendor exceptions: state what this change does to the numbers before committing
  it, computed by the same logic that applies the mapping, so the explanation cannot
  drift from the behaviour.
- **Empty state that does the cold-start work:** an empty console is the normal state
  on day one, and it should route directly to screen 2 rather than sit blank.

### Information flow

D4, the `RATIFY` box. Everything to its left proposes; this screen is where authority
is conferred; everything to its right consumes.

### User flow

1. Steward arrives — from a `MAPPED` chip on screen 3, from an accepted candidate on
   screen 2, or directly to audit.
2. Filters to the system pair or relationship in question.
3. **Decision point — is this mapping still right?**
   - Yes → nothing to do. Most visits end here, and that is a healthy screen.
   - No → amend, which creates version *n+1*, shows the effect preview, and requires
     confirmation. The old version stays readable.
   - Should never have existed → revoke, with the effect stated. Anything that
     depended on it now shows `UNRESOLVED` on screen 3 rather than silently changing
     its answer.
4. Any change is audited with proposer and ratifier recorded separately.

### What it proves

That semantics are **enforced rather than remembered**. This is the screen that makes
the answer to memory poisoning concrete instead of theoretical, and it does it by
existing rather than by explaining.

### Open questions for the platform / gateway PM

- Does the mapping surface live at platform level, as D6 proposes? If it lives inside
  one product, which one, and how is the absorption objection in 2.4 answered?
- Is a mapping versioned or immutable-plus-supersede? This brief assumes versioned.
- Who can read the console — both parties to a mapping, or only its owner? This brief
  assumes both, for relationship-class mappings, following the exception model.

---

## Screen 2 — Candidate Review

### What it is

The inbox of assistant-proposed mappings waiting for a human. Each candidate shows the
evidence behind the proposal — what the assistant saw that made it suggest this —
which party's session it came from, and which automatic corroboration checks it passed
or failed before a person ever saw it. Accept, reject, or amend.

### The problem it answers

The cold-start and long-tail problem named at the end of D4: an empty mapping surface
delivers nothing on day one, and nobody hand-enters hundreds of idiosyncratic
mappings. And 1.6 — this is the screen where a poisoned proposal becomes a rejected
row rather than a silent belief.

### Who it is for

- **Primary: the data steward**, same person as screen 1, different mode of work.
  Screen 1 is audit; this is a queue.
- **Secondary: the security reviewer**, who wants to see what happens to a bad
  proposal.

### Products it reads from and writes to

Reads candidates produced by agents observing real work across products. Writes to the
mapping surface — but **only** on accept, and what it writes is a declared mapping
with both proposer and ratifier recorded.

### Features

- **One row per candidate**, sorted by how much is riding on it — a candidate blocking
  an open dispute with a deadline outranks a speculative one.
- **The evidence panel**, which is the whole point of the screen: *what did the
  assistant see?* Concretely — "this vendor SKU and this GTIN appeared on the same
  invoice line in 47 documents over 6 months, and never contradicted each other."
- **Corroboration checks**, run automatically before a human sees anything, each shown
  as passed or failed with the reason:
  - Does a standard identifier already exist for this pair? *(If so the candidate is
    unnecessary — eliminate before declaring.)*
  - Does it contradict an existing declared mapping?
  - Is it consistent across multiple documents, or supported by exactly one?
  - Did it originate from a party with standing to assert it, per D5's classes?
- **Origin** — which party's session produced this, which is a security-relevant fact
  and should never be hidden.
- **Actions:** accept (declares it, records ratifier), reject (with a reason, and the
  candidate does not silently return), amend-then-accept (which is the common case in
  practice and should not be a second-class path).
- **Bulk accept, deliberately constrained** — available for self-descriptive
  candidates that passed every check, never for relationship-class ones. Money rides
  on those and a human should look at each.
- **A visible standing rule** somewhere on the screen: *nothing in this queue is in
  use.* Reviewers ask, and answering it on the screen is stronger than answering it in
  a meeting.

### Information flow

D4, the `PROPOSE` box, plus the rejection path.

```
  agents observing real work
        |
        v
  CANDIDATE REVIEW  --(accept)--> mapping surface --> everything downstream
        |
        +--(reject)--> dropped, with reason, and it does not come back
```

### User flow

1. Steward opens the queue. Highest-consequence candidates first.
2. Reads the evidence panel and the corroboration results before the proposal itself.
3. **Decision point:**
   - Evidence is strong, checks passed, class is self-descriptive → accept. Declared.
   - Evidence is strong but the class is a relationship fact → accept routes it to
     screen 5 for the counterparty's visibility rather than declaring it silently.
   - Evidence is thin, or a check failed → reject with a reason, or amend and accept
     the corrected version.
   - **A check failed *because it contradicts an existing declared mapping*** → this
     is the interesting case and the one to demo. Neither the candidate nor the
     existing mapping is trusted automatically; the steward is shown both and decides.
4. Accepted candidates appear immediately on screen 1 and become usable on screen 3.

### What it proves

Propose, confirm, enforce — the same three-step discipline the catalogue already
applies to requirement changes, applied to vocabulary. And it makes the security
argument *visible*: a poisoned candidate is a row somebody rejects, not a belief acted
on quietly.

### Open questions for whoever owns the agent layer

- What actually watches real work and proposes? An agent in each product, or one
  observer at platform level? This changes the origin column and the trust model.
- What is the corroboration threshold before a candidate is even shown? Too low and
  the queue is noise; too high and cold start returns.
- Does a rejected candidate teach anything, or is rejection terminal? This brief
  assumes terminal, because "the assistant learned from the rejection" reintroduces
  exactly the unauditable memory the design removes.

---

## Screen 4 — Identity Anchor

### What it is

Give it an internal stock code, a document reference, or a partner's own item number,
and it resolves to the canonical item — showing **which standard did the work** and
where a mapping was needed instead.

Small screen. Strategically the most important one in this brief.

### The problem it answers

1.5, at its root. And it is the screen that answers the strategic risk in 2.5: if item
resolution is not available as something callable, another product will build its own,
and the catalogue becomes a feed.

### Who it is for

- **Primary: the Insights / Command Center team.** This is the screen aimed squarely
  at them, because it is the concrete version of *"we will make items resolvable so
  you do not have to."*
- **Secondary: anybody debugging a dispute** who needs to know what an identifier
  refers to.

### Products it reads from and writes to

Reads TGC and the mapping surface. **Writes nothing.** That is deliberate and worth
saying during a demo: the anchor is a read capability, which is what makes it safe for
other products to depend on.

### Features

- **One input, many kinds of thing.** Internal stock code, GTIN, vendor SKU, purchase
  order line reference, partner's own item number. The screen figures out what it was
  given rather than making the user declare it.
- **The resolution result**: the canonical item, its GS1 classification, and its
  current requirement and compliance state.
- **The resolution path, shown as steps** — this is the actual feature:
  ```
    input:  "JR-4471-BLK"
      step 1   recognised as a vendor SKU in the J.Renee namespace
      step 2   mapping M-118 (ratified 2026-03-14) --> GTIN 00887...
      step 3   GTIN matched directly to catalogue item      STANDARD
      result:  canonical item -- 2 steps, 1 mapping used
  ```
- **The "no mapping needed" case is a success, shown as such.** Where a standard
  identifier did all the work, the screen says so in one line. Over time the ratio of
  standard-resolved to mapping-resolved is a genuine health metric for the network,
  and it belongs on this screen.
- **Failure is informative:** unresolvable input returns what it *would* need — which
  namespace is missing, which mapping does not exist — and offers to propose a
  candidate, landing it in screen 2 rather than dead-ending.
- **Reverse lookup:** given a canonical item, show every identifier that resolves to
  it and by what route. This is the view a partner asks for when they are onboarding.
- **The capability behind it, shown as such.** A small panel showing that this screen
  is a thin client over a published capability any product can call is more persuasive
  to the audience this screen is for than the screen itself.

### Information flow

D3's `[ J3 ]` join, extracted and made interrogable on its own.

### User flow

1. User pastes an identifier — usually copied from a document they are staring at.
2. Screen resolves and shows the path.
3. **Decision point:**
   - Resolved via standard → done. Nothing to govern, nothing to declare.
   - Resolved via mapping → the mapping reference is a link to screen 1. The user can
     check its provenance before relying on it.
   - Unresolved → the screen names what is missing and offers to propose a candidate
     into screen 2.
4. Reverse lookup as needed.

### What it proves

The anchor-and-engine claim in 2.5. **This is the screen that determines whether the
conversation with the insight-layer team is about partnership or about territory** —
so if that team is in the room, budget time on it rather than rushing to screen 3.

### Open questions for the Insights / Command Center PM

- Does item resolution already exist there in some form? If so this brief is proposing
  a consolidation, not a new capability, and should say so.
- What latency would make this callable in your pipeline rather than something you
  work around? A capability that is too slow to call is the same as one that does not
  exist.
- Is a batch form needed as well as a single lookup? This brief assumes yes and does
  not specify it.

---

## Screen 5 — Bilateral Mapping Agreement

### What it is

The relationship-class view from D5's middle lane: one mapping, both parties looking
at the same record, who ratified it, when, and the route the other party takes to
contest it.

### The problem it answers

The residue named in D5 — schema mappings where the interpretation carries money, and
the two parties have opposed financial interests.

### Who it is for

Trading-partner governance on both sides: the retailer's vendor compliance manager and
the supplier's account manager, looking at one record together.

### Products it reads from and writes to

Reads and writes the mapping surface, in its relationship-scoped form. Reads the
trading relationship itself from wherever partner records live.

### Features

- **One record, two perspectives.** The same mapping rendered from each party's side,
  with each party's own field naming shown alongside the canonical one — because
  "your field, our field" is how both parties actually think about it.
- **The ratification record**: proposed by, ratified by, dates, version — and the
  proposer/ratifier distinction from D5 shown as a feature rather than metadata,
  because a mapping proposed by one party and ratified by the other is a *stronger
  artifact* and the screen should say why.
- **The contest route, always visible to the non-ratifying party.** Not a veto — a
  filed objection that is visible, dated, and routes to a human. Exactly how vendor
  exceptions already work.
- **Effect statement**: what this mapping is currently doing — which document types it
  bridges, how many open disputes rely on it, when it was last used.
- **Status and expiry**, following the exception model: a mapping can be time-boxed,
  and an expired one stops applying rather than quietly persisting.
- **Change proposal flow** from the non-owning side: propose an amendment, which
  arrives at the owner as a decision rather than a change.

### Information flow

D5's middle lane, rendered. The governance machinery is the vendor-exception model
already shipping in the catalogue, pointed at vocabulary instead of attributes.

### User flow

1. Either party opens a mapping from their side.
2. Both see the identical record, each with their own field naming.
3. **Decision point — does the non-ratifying party accept it?**
   - Yes, or no response → it stands. Silence is acceptance, as it is for exceptions.
   - No → files a contest. Visible, dated, routed. The mapping's status reflects that
     it is contested, and screen 3 shows the contested state on any join using it —
     which is the honest behaviour, because a contested mapping is weaker evidence.
4. Resolution is a human conversation. The screen's job is to make sure both parties
   are looking at the same record while they have it.

### What it proves

That cross-party governance **reuses machinery the product already has** rather than
inventing new machinery — which is both a cost argument and a credibility argument,
because customers already understand the exception model.

### Open questions for the trading-partner governance owner

- Should silence be acceptance? It is for exceptions today. Money rides harder here.
- Does a contested mapping keep applying while contested, or suspend? This brief
  assumes it keeps applying but is visibly marked, because suspending it would let
  either party break the other's evidence assembly by objecting.
- Is expiry appropriate for a mapping, or is a schema fact permanent until changed?

---

## Screen 6 — Capability Registry

### What it is

What each product publishes, what authority each capability requires, which kinds of
tenant may call it, and what a given connection can therefore actually see.

### The problem it answers

Not a user problem — a *review* problem. It is the screen a platform or security
audience will ask for by name, and not having it is what turns a good architecture
conversation into a bad one.

### Who it is for

Platform, security and architecture reviewers, and the peer PMs deciding what to
publish.

### Products it reads from and writes to

Reads the gateway and every product's published capability set. **Writes nothing.**

### Features

- **One row per capability**, grouped by publishing product: name, what it does in
  plain language, read or write, the authority it requires, which tenant classes may
  call it, and whether it requires confirmation before committing.
- **The scope model made visible** — that reading, authoring, enforcing and deleting
  are separate grants rather than one "write" permission is a real design decision and
  this is where it becomes legible. The catalogue already works this way today:
  `tgc.read`, `tgc.requirements.write`, `tgc.exceptions.write`,
  `tgc.requirements.activate`, and `tgc.destructive` as a *fourth* grant required in
  addition to the relevant write scope.
- **"What can this connection see?"** — pick a real connection and the registry filters
  to exactly what it may call. This is the demonstration, not the list.
- **The two-sided view**: the same address, called by a retailer and by a supplier,
  yielding different capabilities because identity decides which side of the
  relationship the caller is on. A supplier can see the exceptions a retailer granted
  *them* — a shared fact they are party to — and nothing else that retailer holds.
- **Confirmation requirements shown per capability**, so the "nothing changes on a
  first request" claim is verifiable rather than asserted.
- **Refusals are visible**, not just permissions. A registry that only shows what is
  allowed answers half the question a reviewer is asking.

### Information flow

D2, rendered as a catalogue rather than as a sequence.

### User flow

1. Reviewer opens the registry, filtered to a product or a tenant class.
2. Picks a connection and asks what it can see. The answer is computed from the actual
   grants rather than described.
3. **Decision point — is anything published that should not be?** The registry is the
   screen where that is answerable at all, which is its entire justification.
4. Access is granted, revoked and audited from here — from inside a screen the customer
   owns.

### What it proves

That "participation, not absorption" is an architecture rather than a slogan. And it
answers the question a security reviewer always asks: *what stops the customer's AI
workspace from becoming the control plane?* **We do. On a screen they own.**

### Open questions for the platform / gateway PM

- Does the registry live at gateway level, aggregating what products declare? This
  brief assumes yes.
- Who is the audience for the customer-facing version — is this an admin screen the
  customer uses, or an internal one? The features differ meaningfully.
- Does revocation belong here or in each product?

---

## Screen 7 — Memory Inspector

### What it is

Side by side: what the assistant currently believes, versus what has actually been
ratified. Anything in the first column that is not in the second is explicitly marked
as **unusable for anything that counts.**

### The problem it answers

1.6, directly and completely.

### Who it is for

A security or architecture reviewer. This is the fastest way to close the
memory-poisoning conversation, and it exists mostly to be shown once per review.

### Products it reads from and writes to

Reads whatever the agent layer holds as memory, plus the mapping surface. **Writes
nothing** — which is itself part of the argument, because a screen that could edit an
assistant's beliefs would be a new attack surface rather than a mitigation.

### Features

- **Two columns**: believed, and ratified. Rows align on the correspondence they
  describe.
- **Three states, each visually distinct:**
  - Believed **and** ratified → in use. Normal.
  - Believed, **not** ratified → **marked unusable**, in the alert style, with the
    explicit statement that nothing consumes it.
  - Ratified but not believed → fine, and worth showing, because it demonstrates that
    the ratified surface is the authority rather than the cache.
- **Provenance per belief**: where it came from, when, and which session.
- **"Promote to candidate"** — the only action, and it does not declare anything. It
  files the belief into screen 2 where a human decides. The Memory Inspector cannot
  confer authority; that is the point.
- **A statement of scope, on the screen:** whose memory this is, and whether it is
  per-user or tenant-scoped. In a customer's own AI workspace it is typically per-user
  and outside our ability to inspect at all — which this screen should say plainly
  rather than imply coverage it does not have.

### Information flow

D4's rule, rendered as an audit.

```
  believed but not ratified  ---------X---->  used for nothing
                              (!)
  believed and ratified      ---------->  used, and citable
```

### User flow

1. Reviewer opens the inspector for a tenant.
2. Sorts to unratified beliefs first, because that is the column the question is about.
3. **Decision point — is anything here worrying?**
   - It is marked unusable, so the answer to "what damage could it do" is *none*, and
     that is the demonstration.
   - If a belief looks legitimate and useful → promote to candidate, where a human
     ratifies it through the normal path.
4. The conversation ends, which is what this screen is for.

### What it proves

Visibility as mitigation. It converts an abstract security argument into a screen
somebody can look at, and it converts the memory-poisoning threat from something to
detect into something that cannot reach anything.

### Open questions for the security / architecture reviewer

- Is a screen like this sufficient, or does the unratified column need to not exist at
  all in a customer's environment?
- For memory held in the customer's own AI workspace, which we cannot inspect — is
  documenting that boundary enough, or does it need a contractual answer?
- Should promotion to candidate be available at all, or does it create a path that
  laundering could exploit?

---
---

# Part 6 — Three journeys that cross screens

Part 5 described each screen alone. These are the paths a real person takes through
several of them, which is what a demo actually walks.

## J1 — The supplier's deductions analyst contests a claim

*The money journey. This is the demo.*

```
  MONDAY.  47 open claims, 12 with deadlines this week.

  [ claim queue ]
        |
        v
  +---------------------+
  |  SCREEN 3           |  four documents assemble on demand
  |  Dispute Workbench  |  discrepancy summary computed
  +----------+----------+
             |
             v
      all joins resolved?
             |
             +-- YES ---------+
             |                |
            NO                |
             |                |
             v                |
  +---------------------+     |
  |  SCREEN 4           |     |  the identifier does not resolve --
  |  Identity Anchor    |     |  the screen names what is missing
  +----------+----------+     |
             |                |
             v                |
  +---------------------+     |
  |  SCREEN 2           |     |  propose a candidate; the steward
  |  Candidate Review   |     |  ratifies it, and we return to 3
  +----------+----------+     |
             |                |
             +----------------+
                              |
                              v
                    evidence supports us?
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
    CONTEST               ACCEPT                CORRECT DATA
    ==> Active Orders     claim closed          ==> TGC
    evidence attached     reason recorded       + accept the claim
        |                                                |
        v                                                v
    exportable artifact                          next quarter's claim
    with provenance intact                       never happens
```

**What to say while walking it:** the detour through screens 4 and 2 is not a
stumble in the demo. It is the demo. Anybody can put four documents on one screen —
the question the room should be asking is *how do you know these records are about
the same product*, and that detour is the answer.

## J2 — The retailer's vendor compliance manager closes the loop

*The journey that pays back to the catalogue, and the reason this is not just a
favour to another product.*

```
  QUARTERLY.  "Which of my vendors are costing me the most in
               disputes, and why?"

  +-------------------------+
  |  Insights / Command     |   pattern across many claims, not one
  |  Center                 |   -- deductions by vendor, by claim type
  +-----------+-------------+
              |
              |  one claim type dominates: labelling violations,
              |  concentrated in three vendors
              v
  +-------------------------+
  |  SCREEN 3               |   open a representative claim
  |  Dispute Workbench      |   -- the catalogue pane shows the cause:
  +-----------+-------------+      the label attribute was never supplied
              |
              v
  +-------------------------+
  |  TGC -- the product      |   the requirement exists.  Compliance
  |  that already ships      |   reporting already shows these vendors
  +-----------+-------------+   short.  Nothing new was needed here.
              |
              v
       what changes?
              |
      +-------+--------+------------------+
      |                |                  |
      v                v                  v
  tighten the      grant a time-boxed   vendor outreach,
  requirement      exception with a     now carrying a
  ==> TGC          deadline ==> TGC     number in currency
                                        rather than a
                                        completeness score
```

**The point of J2 is the last box.** Today the strongest available argument for
fixing item data is "your completeness score is 71%." After this it is "this cost you
$180,000 last quarter and here are the three vendors it came from." One of those
gets filed and one of those gets acted on.

## J3 — The data steward keeps the vocabulary honest

*The unglamorous journey, and the one a security reviewer wants to watch.*

```
  WEEKLY.

  +-------------------------+
  |  SCREEN 2               |  queue, ordered by what is riding on it
  |  Candidate Review       |  -- a candidate blocking a dispute with
  +-----------+-------------+     a deadline sorts to the top
              |
              v
     read the evidence, then the corroboration checks
              |
      +-------+--------+-------------------+----------------+
      |                |                   |                |
      v                v                   v                v
  self-descriptive  relationship      thin evidence    contradicts an
  + all checks      fact              or a failed      EXISTING declared
  passed            |                 check            mapping
      |             v                   |                    |
      v      +---------------+          v                    v
   accept    |  SCREEN 5     |       reject with      neither is trusted
   ==> map   |  Bilateral    |       a reason         automatically --
   surface   |  Agreement    |                        steward sees both
             +-------+-------+                        and decides
                     |
                     v
             counterparty sees it,
             may contest.  Silence
             is acceptance.
      |
      v
  +-------------------------+
  |  SCREEN 1               |  audit view: what exists, what changed,
  |  Mapping Console        |  which version, who ratified it
  +-----------+-------------+
              |
              v
  +-------------------------+
  |  SCREEN 6               |  periodically: what are we publishing,
  |  Capability Registry    |  and what can each connection actually see
  +-------------------------+
```

---
---

# Part 7 — What to build, and in what order

## The honest minimum

**Screen 3 sells the story** — it is the one where a viewer sees money and recognises
their own week. If exactly one screen gets built, it is this one.

**But screens 1 and 2 are what make screen 3 honest.** Without them the workbench is a
nice layout, and the first question any informed viewer asks — *how do you know these
two records refer to the same thing?* — has nothing to point at. A demo that cannot
answer that question is worse than no demo, because it invites the room to conclude
that the join is hand-waved.

> **The minimum honest build is 3 + 1 + 2.** Screen 3 alone is a mockup. Screens 1 and
> 2 without 3 are governance with no visible payoff.

## Audience map

Build for the meeting that is actually scheduled, not for completeness.

| If the room contains | Build | Because |
| --- | --- | --- |
| The VP, or a customer-facing audience | **3** (+1, +2 if time) | Money is visible in it; the others are the credibility layer behind it |
| The Insights / Command Center PM | **3 + 4** | Screen 4 is what determines whether that conversation is about partnership or territory. Do not walk into it with only screen 3 |
| The Active Orders PM | **3** | Their documents are the evidence and their product owns the closing action. Screen 3 is entirely about them |
| Platform / gateway | **6** (+2 for the propose-confirm-enforce pattern) | The registry is the screen they will ask for by name |
| Security / architecture | **7 + 2 + 1** | The memory-poisoning conversation closes fastest with 7, and 2 and 1 are what make 7 true |
| Trading-partner governance | **5** | The one screen about two parties rather than two systems |

## The caution that matters most

**These screens must not be built inside the catalogue prototype, or styled as
catalogue features.** The point of the demo is that they belong to no single product.
Build them there and the room will read the whole thing as one product trying to
absorb everyone else's data — which is the exact conclusion Part 2.4 argues against,
reached in the first thirty seconds, before anyone has read a word of the argument.

Neutral styling, a neutral name, and every screen visibly reading from several
products is not decoration here. It is the argument, rendered.

## Two things worth instrumenting from the first build

Not features — measurements, and both are cheap now and expensive to retrofit.

1. **Time to assembled evidence** on screen 3. It is the value proposition expressed
   as one number, and the only figure that matters if anyone asks whether this works.
2. **Ratio of standard-resolved to mapping-resolved joins**, visible on screen 4. It
   is a genuine health metric for the network, and it trends in the direction that
   standards discipline improves — which makes it an argument for the catalogue's core
   proposition, computed rather than asserted.

---
---

# Part 8 — The brainstorm agenda

The part to actually run the peer-PM conversations from. Every row is a question this
brief cannot answer alone, with what we would default to if that PM has no strong
view — because arriving with a default is the difference between a working session and
a survey.

## Decision 1 — the one that blocks the most

| | |
| --- | --- |
| **Question** | Where does the mapping surface live? |
| **Who owns the answer** | Platform / gateway, with the other three PMs in the room |
| **Why it blocks** | Four of the seven screens read or write it. If it lives inside one product, that product owns vocabulary every other product depends on — and the absorption objection in 2.4 stops being a fear and becomes true |
| **Our default** | Platform-level service behind the gateway, owned by nobody's product roadmap, for the same reason the gateway itself is |

## The rest, by product

| Product / owner | Question | Why it blocks | Our default if no strong view |
| --- | --- | --- | --- |
| **Active Orders** | Does a dispute action already exist, or is screen 3 proposing a new write? | Determines whether screen 3 launches an existing flow or reimplements one — a large scope difference | It exists; screen 3 launches it and never reimplements it |
| **Active Orders** | What is a claim on the network today — an object, or an inference from a short-paid invoice? | Changes what screen 3 opens *from* | There is a claim object; if not, screen 3 opens from the invoice |
| **Active Orders** | Which claim types first? | Determines which fields the evidence panes show | Shortage and labelling, on the strength of the penalty structures in 1.1 |
| **Insights / Command Center** | Do you already do item resolution? | If yes, this is a consolidation proposal, not a new capability — and should be pitched as one | You do some, and would rather not own it |
| **Insights / Command Center** | Is "you own the cross-document join" your positioning, or ours? | 3.4 flags this as *our argument*. If it is not theirs, the join owner changes and Part 3 needs rewriting | It is compatible with theirs, and this becomes a joint plan |
| **Insights / Command Center** | What latency makes item resolution callable in your pipeline? | A capability too slow to call is one that does not exist, and the catalogue becomes a feed by default rather than by decision | Sub-second single lookup, plus a batch form |
| **Aviator Gateway** | Who runs the shared gate? | Open 1 in 3.3. Unresolved, every product builds its own front door and the economics in 2.2 collapse | A central platform team |
| **Aviator Gateway** | Is the multi-tenant risk-class concern closed? | Open 2 in 3.3. Stated as open here on purpose | Not closed. Nothing ships across the boundary until it is |
| **Agent layer** | What observes real work and proposes candidates — per-product agents, or one platform observer? | Changes the origin column on screen 2 and the whole trust model | Per-product agents, with origin always recorded |
| **Agent layer** | Internal agent-to-agent calls, or connector-only even internally? | Open 3 in 3.3. Changes what these screens concretely are | Connector-only until there is a reason it cannot be |
| **Trading-partner governance** | Is silence acceptance for a relationship-class mapping? | It is for exceptions today. More money rides here | Yes, following the exception model, with contest always available |
| **TGC (us)** | Do we publish identity capabilities before the mapping design is finished? | 2.5's strategic risk: whoever establishes canonical identity first holds the anchor position | Yes. Publish early, imperfect, and callable |

## Questions to expect from the room, with the honest answer

| They will ask | The answer |
| --- | --- |
| "Isn't this just a dashboard we could buy?" | The assembly is reproducible. The *network-wide computation* — how this partner compares to the median, what normal looks like across millions of transactions — is not. Sell computation, not collation |
| "Why not just let the assistant figure out the mappings?" | 1.6, and it is a safety *and* simplicity argument. A declared mapping is deterministic and citable; a remembered one is a hope with good intentions |
| "Is the catalogue trying to own our data?" | 2.4 and 3.2. Reads drift outward, writes stay pinned. Screen 3 writes to Active Orders, not to us — that is visible in the demo, not just claimed |
| "What if agentic AI is a bubble?" | Probably partly. The most credible analyst view expects more than 40% of agentic projects to be cancelled by end of 2027. The results that *are* materialising come from well-scoped agents in constrained workflows with human oversight — which describes this and does not describe most of what is currently funded |
| "How much of this is real today?" | The catalogue's identity, permission, audit and confirm-before-change machinery is real and shipping. Everything in Part 5 is unbuilt. Say it once, at the top, and then stop apologising for it |

---
---

# Part 9 — What would make this brief wrong

A document that only argues one direction is worth less to whoever reads it. Four
things would change the conclusion, and it is better to name them than to hear them
in a review.

**1. If the reuse is not real.** The whole economic argument in 2.2 is that identity,
permissions, audit and confirmation are paid for once. If each new document type ends
up needing its own permission model, its own audit trail and its own confirmation
flow, this is not an expansion strategy — it is four integrations wearing one name.
*Test: publish the second document type and count what had to be rebuilt.*

**2. If the deduction economics do not survive a primary-source check.** Part 1's
figures carry the argument, and several of them are not verified (see below). If the
real numbers are an order of magnitude smaller, the opportunity is still real but it
is not a VP-level one. *Test: check the Attain/CRF figures against the original survey
before any of this is presented externally.*

**3. If sessions already end in action.** The implied claim is that today's screens
are checked too late or not at all. The cheapest available measurement, worth taking
before committing serious engineering: **what fraction of report and dashboard
sessions end in an action — a fix, a waiver, an outreach — rather than ending in
nothing?** If most end in nothing, a system that speaks up beats a screen somebody has
to remember to check. If they end in multi-document forensics already, the screens
survive and the debate is over.

**4. If the gateway becomes where the value sits.** If corporate gateways become the
place control and value concentrate, any individual product's connector is commodity
plumbing — a checkbox, not a differentiator. The answer has to be the thing a gateway
cannot supply: **the requirement model, the compliance engine, the canonical item
identity, and the network of trading relationships — not the connector.** Better we
say that first than hear it in a review.

---

# Part 10 — Sourcing and verification status

Several sources block automated retrieval, so status is stated per source rather than
implied. That convention is why a reader can trust the ones marked verified.

## Not verified — check before this goes to a customer or on a slide

**Every figure in Part 1.1.** The chargeback and deduction ranges (5–15% of invoices,
2–10% of revenue, 3–8% of retail sales) and the Walmart, Target and Amazon penalty
structures are drawn from several vendor and industry analyses, none independently
confirmed.

**The Attain Consulting Group / Credit Research Foundation Customer Deductions
Benchmark Survey** (203 companies, 2018) — the source for the 5–10%-invalid and
60%-recovered figures that Part 1 rests on. Reached via secondary citation rather than
the original survey report. It is a named, dated study with a stated sample size,
which is more than most figures in this space, and it is still not verified in the
strict sense. **Confirm against the original survey report before using either number
externally.**

> **One withdrawn figure, recorded here so it does not come back.** An earlier draft of
> the source document used "65–80% of retail shortage claims are invalid," attributed
> to the Retail Value Chain Federation. That figure could not be traced to any RVCF
> publication; every public repetition leads back to deduction-recovery service
> providers, who have a direct commercial interest in the highest plausible number.
> **Do not use it.** The Attain/CRF figures replaced it for exactly that reason.

**All Trading Grid product descriptions in Part 3.** The Active Orders scope, the
e-Invoicing country coverage, the Insights transaction-wide view and its existing
Aviator integration, and Command Center's common-data-platform description all come
from **public marketing pages, not internal roadmap.** Confirm module boundaries and
current capability with the product owners before presenting any of Part 3 as a plan.

**The join-ownership claim.** That Insights / Command Center is the natural owner of
the cross-product join is **this brief's argument, not that product's stated
positioning.** It appears in Part 8 as a question to its PM for that reason.

**Gartner's 2026 agentic AI assessment** — the >40% cancellation forecast quoted in
Part 8 and Part 9. Paywalled; reached through secondary coverage.

## Verified — retrieved and read directly

From the Model Context Protocol project's own publications: Linux Foundation
stewardship since December 2025 with Anthropic, Block and OpenAI as co-founders; the
July 2026 specification's removal of sessions and its addition of gateway routing
headers; enterprise-managed authorization stable since June 2026. These support the
"why now" argument in 2.2 and the memory argument in 1.6.

**OWASP's addition of memory poisoning to its Agentic AI Top 10 in 2026** is a real,
citable classification. Individual attack-success percentages that circulate alongside
it are research-setting figures, not production incident rates, and should be treated
that way if quoted at all.

## The full ledger

Every source, with its verification status and — for the contested ones — what would
falsify the claim it supports, is in Section 6 of
[`docs/mcp-overview-and-enterprise-adoption.md`](mcp-overview-and-enterprise-adoption.md).
That document is the argument this brief turns into screens; read it if a claim here
needs its full basis.
