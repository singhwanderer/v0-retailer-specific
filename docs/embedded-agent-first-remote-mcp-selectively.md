# Embedded Agent First, Remote MCP Selectively

**Audience:** Product-management peers, architecture, security, and retail/CPG stakeholders  
**Context:** We have a working Claude-based prototype for retailer-facing supplier catalog compliance. Retailers create requirements in our portal; suppliers can view the applicable requirements; our compliance service evaluates supplier catalog data against those retailer-owned rules.

---

> ## Editor's note — how this maps to the prototype as built
>
> This is a **position paper about surface boundaries**, and its argument holds.
> But two of its premises are already settled in code, and four of its controls
> are not built yet — a reader with the repository open should know which is
> which before weighing the recommendation. Same convention as
> [`enterprise-safe-remote-mcp.md`](./enterprise-safe-remote-mcp.md), which
> reconciles the sibling memo the same way.
>
> **Two things this doc treats as future work already ship:**
>
> | This doc says | Prototype today |
> |---|---|
> | Phase 1 — "use the embedded agent for contextual explanation and guided navigation" | The embedded agent **exists**: a docked retailer-side panel (`components/portal/compliance-agent-panel.tsx`) running an agent loop behind `/api/copilot` (`lib/copilot/agent.ts`) over its own tool set (`lib/copilot/tools.ts`), traced to LangSmith and scored against a golden set (`lib/copilot/run-eval.ts`) |
> | Phase 4 — "let an assistant draft a requirement-change proposal and show supplier/GTIN impact" | Both surfaces already do this. The panel returns a `ProposedAction` the UI renders as a confirm card; the connector returns a pending change plus a single-use token redeemed through `confirm_pending_change` (`lib/mcp/pending.ts`), and `simulate_requirement_change` shows impact before anything is applied |
>
> **One framing correction.** "Remote MCP should be read-only" reads as a
> description of the current design. It is not: the connector ships
> `tgc.requirements.write`, `tgc.exceptions.write`, `tgc.requirements.activate`
> and `tgc.destructive` (`lib/mcp/context.ts`), and no mutating tool acts on its
> first call. Read-only is therefore a **pilot deployment configuration** — grant
> only `tgc.read` and the write tools are never listed to the client — not a
> capability we lack. That is a stronger position than the one this doc argues,
> because it is a switch rather than a roadmap item.
>
> **Four controls the doc assumes, which do not exist yet.** All four are sized
> in [`mcp-implementation-plan.md`](./mcp-implementation-plan.md) §C, "Pilot
> readiness — closing the memo-to-code gaps":
>
> | Assumed | Reality | Size |
> |---|---|---|
> | Requirement-set version pinning ("Fall 2026 / v3.2") | `AttributeProfile` carries `status` + `lastUpdated` only — no version, no approval workflow (`lib/retailer-requirements.ts`) | **L** |
> | Correlation ID on every response | `AuditEntry.id` exists (`lib/mcp/audit.ts`) but is never returned to the caller | **S** |
> | Portal deep link on every result | No tool returns one | **S** |
> | Server-side retailer→supplier entitlement check | Tenant isolation is enforced per call and is real for everything *stored*; the supplier fixture `RETAILER_SUPPLIERS` is shared across retailer tenants (caveat at `lib/mcp/tools.ts`) | **M** |
>
> The sample output later in this doc should be read as **target output, not
> current output** — it cites a rule-set version that cannot yet be produced, and
> its per-attribute GTIN counts are an allocation artifact rather than an
> observed figure (the data model holds per-supplier, per-category counts and
> allocates a vendor's open-gap total across their attribute pool;
> `diagnose_gap_pattern` says so in its own response).

---

## The position

There **is** a sound reason many retailers deploy an embedded agent inside their own portal rather than expose their domain capability directly to Claude, ChatGPT, or another third-party AI client.

For our product, an embedded agent should be the **primary system-of-action experience**. A remote MCP service should be a **deliberately constrained, read-only system-of-insight extension** for customers whose work begins in an approved enterprise AI workspace.

This is not an either/or choice:

> **Embedded agent for governed workflow and action; remote MCP for portable, authorized insight and discovery.**

Retail AI adoption should pair innovation with governance. NRF's retail-sector AI principles are intended to support governance, strategic planning, consumer trust, and responsible innovation.[^nrf]

## The business context

Retailers need suppliers to provide product data that meets their own requirements: category attributes, taxonomy, images, regulatory fields, pack details, and channel-specific commerce content.

Our platform makes those requirements operational:

```text
Retailer defines and versions requirements in our portal
                     |
                     v
Requirements become visible to applicable suppliers
                     |
                     v
Our services assess supplier catalog data against the active retailer rule set
                     |
                     v
Retailer identifies gaps, prioritizes remediation, and completes governed actions
```

This is a supplier-network compliance workflow, not general-purpose catalog chat. Walmart's published supplier requirements demonstrate the same fundamental operating model: suppliers must meet retailer-specific requirements, submit evidence where required, and remediate non-compliance; the retailer evaluates results and can impose consequences for unresolved issues.[^walmart]

## Why an embedded agent comes first

An embedded agent operates inside the portal where our product already controls the user journey and business context. This is not a proposal — it is the surface we already have. The TGC Compliance Agent is a docked, retailer-side chat panel, off by default and toggled from the top bar, running an agent loop behind `/api/copilot` over its own tool set.

The detail that matters for this argument: its **read** tools proxy the same functions in `lib/mcp/tools.ts` that the external connector calls, so both surfaces answer from one data model and one compliance engine. Its **write** tools deliberately do not — they never mutate server-side, returning a proposal the panel renders as a confirm card, and only an explicit "Apply" click calls the same create/update functions the requirement screens use.

### It has workflow context

The portal already knows the selected retailer, supplier, catalog, category/GPC, requirement-set status, user role, and the current workflow state. The agent can use that context safely rather than ask the user to recreate it in a prompt. It also cites back: every answer carries the in-app screen where the user can verify it themselves, derived from which tools actually fired rather than guessed by the model.

### It is the correct action surface

High-impact activities need a controlled interface:

- Create, edit, version, approve, or publish retailer requirements
- Review rule-change impact before suppliers are affected
- Approve exceptions or remediation decisions
- Review GTIN-level evidence and fix data
- Initiate supplier follow-up or formal remediation workflows
- Publish catalog data or change a product's compliance state

These actions require explicit confirmation, impact preview, validation, audit history, ownership, and sometimes segregation of duties. An embedded portal workflow is better suited to that than a general chat surface.

### It protects the product's value

The portal is where customers see evidence, configure requirements, manage supplier obligations, and complete remediation. An embedded agent improves that experience; it should not become a shortcut that bypasses it.

### It is where the external surface is governed

This is the strongest evidence for the whole coexistence argument, and it is already built. The portal carries an **AI Access** screen (`components/portal/screen-ai-access.tsx`) where a retailer administrator sees which scopes an assistant holds and reads the access log — every tool call an assistant made, allowed or refused, with who acted, which assistant, which tool, and which scope it required. The same record is queryable conversationally through `query_access_log`, administrators only, scoped to that organisation's own activity.

So the relationship is not two peer surfaces sharing a backend. **The portal governs the connector.** Whatever an external assistant can see or do is granted, revoked, and audited from inside the product — which is the concrete answer to "what stops the AI workspace from becoming the control plane."

## Why a remote MCP capability can still matter

Remote MCP is valuable when the user's decision starts **outside** the portal.

Examples:

- A category leader is in a weekly launch-readiness meeting and asks, “Which suppliers pose the greatest risk to the Fall footwear launch?”
- A merchandising operations leader is in Microsoft Teams/Copilot and asks, “Summarize this week's supplier compliance movement against our active rules.”
- A data-governance lead uses an approved AI workspace to prepare a leadership brief: “Which attributes are the main blockers across our top 20 suppliers?”

In these cases, the AI client should provide a summarized, authorized answer and a deep link back to our portal. It should **not** become the place where the user changes requirements or corrects supplier data.

## Product-surface decision matrix

| User job | Preferred surface | Reason |
|---|---|---|
| Define, edit, version, approve, or publish retailer requirements | Portal UI + embedded agent | Changes supplier obligations; requires impact review, approval, audit, and explicit confirmation |
| View active requirement set and explain a rule | Both | Read-only and grounded in the same rules service |
| Assess one supplier's compliance | Both | Read-only analysis is useful in portal or enterprise AI workspace |
| Review GTIN-level failures and evidence | Portal + embedded agent | Requires detailed record review, navigation, and controlled remediation |
| Rank suppliers/categories by launch risk | Remote MCP or embedded agent | High-value decision support; often starts in meetings or planning workspaces |
| Create management brief, meeting summary, or action list | Remote MCP | The work artifact commonly lives in Claude, Copilot, Teams, or documents |
| Draft supplier remediation outreach | Both | `draft_vendor_outreach` is a **read-scope** tool on both surfaces: it composes a subject and body from the supplier's actual open gaps, excluding attributes already waived by an Active exception. Nothing is sent and no outreach record is stored — the human copies the text into their own mail client. Sending is outside the product today, so there is no external write action here to govern |
| Create a formal supplier remediation case | Portal first | A tracked case is a stored obligation with an owner and a lifecycle, not a drafted message |
| Modify catalog, approve exception, publish data | Portal only in early phases | High-impact system-of-action workflow |

## The strategic architecture

```text
                         Embedded agent
                              |
Retailer portal -> Requirement configuration, compliance review, remediation
                              |
                              v
                   Core catalog intelligence services
                    - Requirement lifecycle/versioning
                    - Supplier and retailer entitlement
                    - Compliance calculation
                    - GTIN evidence and audit trail
                              |
                  Read-only, minimized MCP tool layer
                              |
               Claude / M365 Copilot / approved future clients
                              |
          Meeting triage, summaries, discovery, leadership insights
                              |
                       Deep link back to portal
```

The critical point: **the remote MCP service is not direct database access.** It is a narrow product API that calls the same governed requirements and compliance services used by the portal.

## What MCP should expose initially

Limit the *externally granted* surface to retailer-facing, read-only decision support. Four capability shapes carry the pilot, and each already has an implementation:

| Capability shape | Implemented as |
|---|---|
| Retrieve the active requirement set for a category | `list_attribute_profiles` + `get_profile_detail` |
| Assess one supplier's compliance | `get_supplier_compliance`, or `run_compliance_report` scoped to one supplier |
| Rank a supplier's highest-impact gaps | `run_compliance_report` → `missingAttributes`, ranked, bounded by `maxAttributes` |
| Rank suppliers against each other | `run_compliance_report` → per-vendor rows, sorted worst-first |

Two implemented tools go *beyond* this list and are worth including in the pilot on their own merits: `diagnose_gap_pattern` (cross-vendor — "four suppliers are failing the same field" is an insight a per-vendor screen structurally cannot produce) and `get_compliance_trend`.

**Read-only here is a deployment configuration, not a missing capability.** Scopes already filter the tool list when the handler is built, so a grant of `tgc.read` alone means the write tools are never listed to the client — the assistant cannot call what it cannot see. What is still needed is for this to be an explicit, documented, testable pilot profile rather than an emergent property of the scope check (**S**, §C of the implementation plan).

Each response should contain only decision-ready, authorized data:

| Field | Status |
|---|---|
| Retailer requirement-set name | Returned today |
| Supplier and category scope | Returned today |
| Aggregate product count and compliance percentage | Returned today |
| Failed attribute names and prioritized counts | Returned today |
| High-level recommended next step | Returned today |
| Requirement-set **version** | **Not built** — no version field exists (**L**) |
| Portal deep link | **Not built** (**S**) |
| Correlation ID | **Not built** — the audit record exists but is not returned (**S**) |

The last three are what turn a chat answer into something a user can act on and support can retrace. They are the cheapest items on the pilot-readiness list and two of the three are small.

Do **not** expose raw supplier files, arbitrary product search, unrestricted GTIN exports, generic database query tools, write capabilities, or cross-tenant results.

## One service layer, many work surfaces

Claude and Microsoft 365 Copilot are **work surfaces**, not separate compliance products. The same remote MCP layer applies the same retailer requirements, supplier entitlement, compliance calculation, and audit controls regardless of which client is calling, and client wrappers stay deliberately thin.

The consequence worth stating to stakeholders: **which client a customer permits is a procurement decision, not an architectural one.** A customer that forbids consumer AI can still have this capability through Copilot in their own Microsoft tenant, or through the TG Aviator Gateway, without a single change to our server. The client-by-client comparison — identity path, governing authority, and where the in-portal agent sits alongside them — is laid out in [`mcp-pm-presentation.md`](./mcp-pm-presentation.md); it is not repeated here.

## Enterprise safety model

A remote MCP endpoint should be considered **externally reachable but not publicly accessible**. Network reachability does not grant data access.

For every request, the service must:

| # | Control | Built today? |
|---|---|---|
| 1 | Require OAuth authentication using enterprise OIDC/SSO at the authorization layer | Yes — the endpoint requires OAuth 2.1 sign-in; the demo authorization server stands in for a customer's own IdP |
| 2 | Validate token signature, issuer, expiry, audience/resource, and permitted client context | Yes, including audience binding |
| 3 | Derive the tenant and retailer role from verified claims and server-side entitlements — not from the user's prompt | Yes, re-evaluated per call rather than fixed when the connection was established |
| 4 | Verify the retailer is entitled to inspect the requested supplier, category, and catalog scope | **Partly.** Tenant isolation is enforced per call and is real for everything *stored* — profiles, profile extras, exceptions, which is where every write lands. The supplier fixture itself is shared across retailer tenants, so supplier-level entitlement is not modelled yet (**M**) |
| 5 | Accept only allowlisted tools and schema-validated inputs | Yes — tools are a fixed manifest with typed schemas, filtered by granted scope. The read-only *pilot profile* still needs to be explicit and testable (**S**) |
| 6 | Return a minimized response rather than raw catalog data | Yes |
| 7 | Create an auditable trace with authenticated subject, tool, authorization decision, and outcome | Yes — and it is readable by administrators from the portal's AI Access screen and via `query_access_log`. The **correlation ID is not returned to the caller** (**S**), so a user cannot quote the record back to support |

A user can ask, "Show me another retailer's supplier gaps," but the service rejects the request because entitlement is evaluated server-side. The LLM does not decide access — and the denial itself is logged, which is what makes the access log evidence rather than a feature list.

Sizes in bold are from [`mcp-implementation-plan.md`](./mcp-implementation-plan.md) §C. The honest summary for a security reviewer: **identity, isolation, allowlisting, minimization, and audit are real; supplier-level entitlement and caller-visible traceability are not yet.**

## How to explain the distinction

Use this language with peers and stakeholders:

> “The embedded agent is our primary workflow experience and control plane. It helps retailers define requirements, investigate evidence, and perform governed remediation inside our portal.”

> “Remote MCP is an optional, read-only enterprise extension. It allows an authorized user to identify supplier-compliance risk from Claude or Microsoft 365 Copilot, then routes them back to our portal to review evidence and take controlled action.”

> “Our competitive value is not chat. It is the retailer-owned requirements, supplier-network entitlements, compliance calculation, evidence, and remediation workflow. MCP makes those controlled insights available in enterprise workspaces without giving those workspaces control over our data or workflow.”

## Example: the right external use case

**Question in Claude or M365 Copilot:**

> “Rank our women’s-footwear suppliers by readiness against active Fall 2026 requirements. Which missing attributes put the most GTINs at risk?”

**Authorized, minimized result — target output, not current output:**

```text
Requirement set: Northstar Women’s Footwear / Fall 2026 / v3.2
Supplier: Alpine Footwear
Scope: 8,420 eligible GTINs
Compliance: 76%

Highest-impact gaps
- Material composition: 1,140 missing
- Heel-height value and unit: 784 missing
- Country of origin: 621 missing

Next step
Open Supplier Compliance in our portal to review the priority GTINs.
Reference: req-4f2a91c
```

Three things in that block do not exist yet, and it is better to say so than to demo it and be caught: the **`v3.2` version** (no version field, **L**), the **`Reference:` correlation ID** (**S**), and a **deep link** behind "Open Supplier Compliance" (**S**). The per-attribute counts are also an allocation across the supplier's attribute pool rather than an observed per-attribute GTIN figure — real GTIN-level attribution is a data-model change, not a presentation change.

What *is* real today is everything that makes the answer trustworthy: the numbers come from the same deterministic engine the portal screens use, the supplier scope is derived from verified claims, and the call is logged whether it succeeded or was refused.

**A request that must stay in the portal:**

> “Make heel height optional for all women’s footwear suppliers.”

**Correct response:**

> “I cannot change retailer requirements from this assistant. Open the Catalog Requirements Portal to review affected suppliers and GTINs, create a new requirement-set version, and submit it through the approval workflow.”

That refusal is not a product weakness. It demonstrates an intentional enterprise safety boundary.

## Why this strengthens—not weakens—our market fit

The embedded experience remains where the complex, high-value workflow occurs. The remote MCP layer expands the moments in which our product can create value:

- Before a meeting: prepare a current supplier-readiness brief
- During a meeting: identify the largest risks and decisions
- After a meeting: deep link decision owners into the portal to investigate and remediate

This can increase portal discovery and adoption rather than replace it. The product stays differentiated because a generic LLM cannot calculate retailer-specific compliance without our live rule lifecycle, supplier access model, catalog data, and audit-backed evidence.

## Recommended phased approach

### Already done — the embedded agent and the guided-write pattern

Two phases an earlier draft of this document proposed as future work have shipped, and the sequence below starts from that:

- **The embedded agent exists** — retailer-side, docked, off by default, answering from the same compliance engine as the portal screens and citing the screen where each answer can be verified.
- **Guided, not autonomous, writing exists on both surfaces.** Nothing mutates on a first call. The panel returns a proposal card the user applies; the connector returns a pending change plus a single-use confirmation token, and `simulate_requirement_change` shows impact first. Activation and deletion each need their own additional scope beyond write, because switching enforcement on and removing a rule are not the same risk as editing one.

The remaining question is not whether an assistant may propose changes. That is designed and running. It is which grants a *customer* gets on an external surface, and in what order.

### Phase 1 — Close the pilot-readiness gaps

The blocking work is [`mcp-implementation-plan.md`](./mcp-implementation-plan.md) §C, not new capability: requirement-set versioning (**L**), correlation IDs in responses (**S**), portal deep links (**S**), retailer→supplier entitlement (**M**), a prompt-injection test suite (**M**), rate limits and response-size caps (**M**), and an explicit read-only pilot profile (**S**). A security reviewer will ask for these by name.

### Phase 2 — Read-only remote MCP insight pilot

- Grant `tgc.read` only, so no write tool is listed to the client at all.
- Support one approved client, starting with the already-working Claude connector.
- Require enterprise identity, entitlement validation, audit traces, output minimization, rate limits, and denial tests — with the denials demonstrated, not asserted.
- Route every actionable result back to the portal.

### Phase 3 — M365 Copilot enterprise distribution

- Package the same read-only tools behind a tenant-governed M365 Copilot declarative agent.
- Use Entra SSO or OAuth, with the same server-side data and policy controls.
- Expand only after a customer validates the meeting/planning use case.

### Phase 4 — Extend write grants outward, deliberately

- The mechanism is built; this phase is about *granting* it externally, one scope at a time.
- Keep final review, approval, and publication in the portal.
- Each additional scope needs its own threat model, customer approval, and measurable evaluation before it is offered — and the injection suite from Phase 1 is the precondition for any of it.

## Recommendation

Do not position external MCP as a replacement for an embedded retail agent.

Position the portfolio as:

> **Portal-first for governance and action; MCP-selective for secure, portable insight.**

This preserves the portal as the retailer's system of record and system of action, while allowing authorized enterprise users to surface real-time, tenant-scoped supplier-compliance intelligence from the AI workspace where their planning and decisions already happen.

---

## External references

[^nrf]: [NRF: Principles for the Use of Artificial Intelligence in the Retail Sector](https://nrf.com/news/nrf-releases-retail-principles-artificial-intelligence) — retail-sector guidance focused on governance, strategic planning, trust, and responsible innovation.

[^walmart]: [Walmart Supplier Requirements: Audits, Certifications and Testing](https://corporate.walmart.com/purpose/esgreport/supplier-requirements/audits-certifications-and-testing) — example of a retailer-specific supplier compliance model involving standards, evidence, assessment, remediation, and consequences.

- [GS1 US Data Quality Playbook](https://www.gs1us.org/industries-and-insights/by-industry/retail-grocery/data-quality-playbook) — product-data quality and trading-partner practices.
- [Model Context Protocol Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) — OAuth-based authorization model for protected MCP servers.
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — least privilege, tool permissions, human approval, and agent-security controls.
