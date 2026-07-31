# Embedded Agent First, Remote MCP Selectively

**Audience:** Product-management peers, architecture, security, and retail/CPG stakeholders  
**Context:** We have a working Claude-based prototype for retailer-facing supplier catalog compliance. Retailers create requirements in our portal; suppliers can view the applicable requirements; our compliance service evaluates supplier catalog data against those retailer-owned rules.

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

An embedded agent operates inside the portal where our product already controls the user journey and business context.

### It has workflow context

The portal already knows the selected retailer, supplier, catalog, category/GPC, requirement-set version, user role, and the current workflow state. The agent can use that context safely rather than ask the user to recreate it in a prompt.

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
| Create supplier remediation case or contact supplier | Portal first | External write actions require strong confirmation, policy checks, and audit |
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

Limit the external remote MCP service to retailer-facing, read-only decision support:

```text
get_active_requirement_set(category_or_gpc)
assess_supplier_compliance(supplier_id, category_or_gpc)
get_high_impact_compliance_gaps(supplier_id, category_or_gpc, limit)
rank_supplier_compliance(category_or_gpc, limit)
```

Each response should contain only decision-ready, authorized data:

- Retailer requirement-set name and version
- Supplier and category scope
- Aggregate eligible-GTIN count and compliance percentage
- Failed attribute names and prioritized counts
- High-level recommended next step
- Portal deep link and correlation ID

Do **not** expose raw supplier files, arbitrary product search, unrestricted GTIN exports, generic database query tools, write capabilities, or cross-tenant results.

## Claude vs. M365 Copilot

Claude and Microsoft 365 Copilot are **work surfaces**, not separate compliance products. The same remote MCP layer should apply the same retailer requirements, supplier entitlement, compliance calculation, and audit controls.

| Dimension | Claude Chat | Microsoft 365 Copilot |
|---|---|---|
| Best fit | Teams that use Claude as a knowledge/analysis workspace | Enterprises already working in Microsoft 365, Teams, and Copilot Chat |
| Connection model | Authorized user connects to an approved remote MCP service | Tenant-admin-governed declarative agent/plugin exposes selected tools |
| Common identity path | OAuth access token after enterprise OIDC/SSO sign-in | Microsoft Entra SSO or OAuth access token |
| Product capability | Read-only compliance insight and portal routing | Read-only compliance insight and portal routing |
| Policy source of truth | Our services validate tenant, role, supplier, catalog, and tool entitlement | The same services validate tenant, role, supplier, catalog, and tool entitlement |

We should avoid building separate compliance logic for every assistant. One governed service layer is the scalable product architecture; client wrappers are deliberately thin.

## Enterprise safety model

A remote MCP endpoint should be considered **externally reachable but not publicly accessible**. Network reachability does not grant data access.

For every request, the service must:

1. Require OAuth authentication using enterprise OIDC/SSO at the authorization layer.
2. Validate token signature, issuer, expiry, audience/resource, and permitted client context.
3. Derive the tenant and retailer role from verified claims and server-side entitlements—not from the user's prompt.
4. Verify that the retailer is entitled to inspect the requested supplier, category, and catalog scope.
5. Accept only allowlisted read-only tools and schema-validated inputs.
6. Return a minimized response rather than raw catalog data.
7. Create an auditable trace with a correlation ID, authenticated subject, tool, authorization decision, and outcome.

A user can ask, “Show me another retailer’s supplier gaps,” but the service must reject the request because entitlement is evaluated server-side. The LLM does not decide access.

## How to explain the distinction

Use this language with peers and stakeholders:

> “The embedded agent is our primary workflow experience and control plane. It helps retailers define requirements, investigate evidence, and perform governed remediation inside our portal.”

> “Remote MCP is an optional, read-only enterprise extension. It allows an authorized user to identify supplier-compliance risk from Claude or Microsoft 365 Copilot, then routes them back to our portal to review evidence and take controlled action.”

> “Our competitive value is not chat. It is the retailer-owned requirements, supplier-network entitlements, compliance calculation, evidence, and remediation workflow. MCP makes those controlled insights available in enterprise workspaces without giving those workspaces control over our data or workflow.”

## Example: the right external use case

**Question in Claude or M365 Copilot:**

> “Rank our women’s-footwear suppliers by readiness against active Fall 2026 requirements. Which missing attributes put the most GTINs at risk?”

**Authorized, minimized result:**

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
```

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

### Phase 1 — Embedded agent and portal workflows

- Make requirements configuration, compliance evidence, and remediation intuitive in the portal.
- Use the embedded agent for contextual explanation and guided navigation.
- Preserve explicit human approvals for all changes.

### Phase 2 — Read-only remote MCP insight pilot

- Expose 2–4 aggregate compliance/readiness tools.
- Support one approved client, starting with the already-working Claude prototype.
- Require enterprise identity, entitlement validation, audit traces, output minimization, rate limits, and denial tests.
- Route every actionable result back to the portal.

### Phase 3 — M365 Copilot enterprise distribution

- Package the same read-only remote MCP tools behind a tenant-governed M365 Copilot declarative agent.
- Use Entra SSO or OAuth, with the same server-side data and policy controls.
- Expand only after a customer validates the meeting/planning use case.

### Phase 4 — Guided, not autonomous, write assistance

- Let an assistant draft a requirement-change proposal and show supplier/GTIN impact.
- Keep final review, versioning, approval, and publication in the portal.
- Introduce individual write tools only after a separate threat model, customer approval, confirmation design, and measurable evaluation.

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
