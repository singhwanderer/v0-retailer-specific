# Enterprise-Safe Remote MCP for Retailer Catalog Compliance

**Audience:** Product management, architecture, security, and retail/CPG business stakeholders  
**Purpose:** Recommend a controlled, external-facing remote MCP pilot that exposes *limited catalog-compliance insights* to authorized enterprise AI clients without exposing raw customer data or transferring policy control outside our platform.

## Decision requested

Approve a gated pilot of a remote MCP service for **read-only retailer catalog-compliance queries**.

This is not a proposal to expose our catalog database, supplier files, internal APIs, or unrestricted agent access. It is a proposal to expose a small allowlist of governed business capabilities, protected by enterprise identity, authorization, tenant controls, and audit logging.

## The retail problem

Retailers receive catalog data from many suppliers, but each retailer has its own category-specific data requirements: required attributes, taxonomy, image rules, regulatory fields, pack information, and launch-readiness expectations.

Today, a retailer often discovers that a supplier is incomplete only after manual review. That creates spreadsheet and email loops, late remediation, delayed item activation, and inconsistent commerce content.

This is an established retail/CPG data-quality problem. GS1 US defines trading-partner data quality as consistent, complete, accurate, standards-based, and timestamped data, supported by validation processes for internal use and external sharing.[^gs1]

## Our differentiated capability

Our platform—not an LLM—is the system of record and policy authority.

1. A retailer creates, versions, approves, and publishes its product-data requirements in our portal.
2. Relevant requirements are made visible to suppliers in the supplier experience.
3. Our services evaluate supplier catalog records against the retailer-owned requirement set.
4. An authorized retailer user can ask an approved AI client a question such as: **“Which footwear suppliers are least compliant with our active Fall requirements, and what should we address first?”**
5. The remote MCP service returns a constrained, tenant-scoped compliance result and links the user back to our portal for review and remediation.

**The product is retailer-owned requirements and supplier-compliance intelligence. MCP is only the secure interoperability layer that lets approved AI work surfaces call that capability.**

## Target use case

### Seasonal assortment readiness

A category operations manager has 14 days before a seasonal intake freeze. Rather than review thousands of GTINs manually, they ask:

> “Rank women’s-footwear suppliers by compliance with our active Fall 2026 requirements. Which missing attributes put the most items at risk?”

The result is generated from the retailer's active rule-set version and catalog records—not model memory:

```text
Requirement set: Northstar Women’s Footwear / Fall 2026 / v3.2
Supplier: Alpine Footwear
Scope: 8,420 eligible GTINs
Compliance: 76%

Highest-impact gaps
- Material composition: 1,140 GTINs missing
- Heel height value and unit: 784 GTINs missing
- Country of origin: 621 GTINs missing

Next action
Open Supplier Compliance in our portal to review the priority GTINs.
```

This turns data completeness into an operational launch-risk decision. It does not let the AI client alter requirements, change products, contact suppliers, or publish data.

## Why external MCP, rather than a data export

| Option | What it enables | Main limitation |
|---|---|---|
| CSV export or direct data feed | Bulk data consumption | Copies data outside our control boundary; weak context, limited real-time policy enforcement |
| Client-specific chatbot integration | A tailored experience in one AI client | Rebuilds integration and security logic for every client |
| Governed remote MCP | A small, reusable set of live business capabilities across approved clients | Requires disciplined identity, authorization, tool design, monitoring, and pilot controls |

A remote MCP service can be safer than broad API access when it exposes fewer capabilities: only named tools, typed inputs, policy validation on every request, minimized outputs, and no raw database access.

## What is exposed—and what is not

### Initial tool allowlist

```text
get_active_requirement_set(category_or_gpc)
assess_supplier_compliance(supplier_id, category_or_gpc)
get_high_impact_compliance_gaps(supplier_id, category_or_gpc, limit)
rank_supplier_compliance(category_or_gpc, limit)
```

Each tool returns only the minimum decision-ready information: active rule-set version, authorized scope, aggregate counts, compliance rate, failed attribute names, prioritized findings, portal deep link, and correlation ID.

### Explicit non-goals

The pilot does **not** expose:

- Raw supplier catalog files, unrestricted GTIN exports, credentials, internal schemas, or database queries
- Cross-retailer or cross-tenant data
- Supplier data beyond the requesting retailer's entitled scope
- Requirement creation, editing, approval, publishing, supplier outreach, enrichment write-back, or product publication
- Generic file, shell, code-execution, or arbitrary URL-fetching tools
- Long-lived broad credentials or client-held backend credentials

## Security architecture

```text
Authorized user in Claude or M365 Copilot
        |
        |  OAuth authorization flow; enterprise OIDC/SSO login
        v
API gateway / MCP edge
        |
        |  validate token, rate-limit, inspect request, audit
        v
Remote MCP compliance service
        |
        |  enforce tenant + retailer + role + supplier/catalog entitlement
        v
Requirements, compliance, and catalog services
        |
        v
Minimized structured result + correlation ID
```

The AI client is never trusted as the authorization decision-maker. It submits a tool request; our gateway and services validate identity and policy before any data is returned.

## Security controls

| Risk concern | Required control | Pilot evidence |
|---|---|---|
| Unauthenticated external access | OAuth 2.1; OIDC-backed enterprise login; deny anonymous requests | Successful login and rejected anonymous request |
| Token replay or use against another service | Audience/resource-bound, short-lived access tokens; issuer/signature/expiry validation | Token validation test and rejected wrong-audience token |
| Cross-customer leakage | Tenant derived from verified token and checked server-side; never trust prompt-supplied retailer ID | Attempted cross-tenant query is denied |
| Excessive data disclosure | Read-only tool allowlist; result minimization; pagination and response-size limits | Tool response contract review |
| Unauthorized supplier visibility | Server-side retailer-to-supplier/catalog entitlement check on every tool call | Unauthorized supplier request is denied |
| Prompt injection/tool misuse | Treat prompts and retrieved text as untrusted; strict schemas; tool/input validation; no arbitrary tools | Adversarial test results |
| Unauthorized changes | No write tools in phase one; requirement changes remain in portal approval/version workflow | Attempted change request is refused and linked to portal |
| Secret leakage | No tokens in URLs/logs; redact credentials and sensitive fields; managed secret store | Logging and secret-handling review |
| Weak forensic evidence | Correlation IDs; immutable security/audit events; monitor failures and unusual call volume | Trace for every demo query |
| Unbounded cost or scraping | Rate limits, quotas, timeout and result limits, anomaly alerts | Load/abuse test report |

The MCP authorization specification treats protected MCP servers as OAuth resource servers. It requires access-token validation and requires servers to accept only tokens issued for their own resources; it also supports scope-based least privilege and protected-resource metadata for authorization-server discovery.[^mcp-auth]

## Why this does not leak customer data by design

An external endpoint does not automatically mean public data access. The endpoint is public only in **network reachability**; the data and tools remain private behind authentication and authorization.

The system returns data only when all of the following are true:

1. The user has authenticated through an approved authorization server.
2. The access token is valid, unexpired, signed by a trusted issuer, and issued for this MCP resource.
3. The caller has the required read scope and approved client/application context.
4. The server derives the user's tenant and retailer role from verified claims and/or our entitlement service.
5. The requested supplier and catalog scope are authorized for that retailer.
6. The invoked tool is on the read-only allowlist and the request conforms to its input schema.
7. The response is minimized to the decision required—not a raw catalog extract.

A user can phrase a request as “show me Competitor Retailer’s supplier gaps,” but the server must deny it because the verified caller is not entitled to that tenant. Natural-language instructions never override server-side policy.

## Claude and Microsoft 365 Copilot

The retail capability is the same; the client entry point and enterprise governance model differ.

| Area | Claude Chat | Microsoft 365 Copilot |
|---|---|---|
| User context | Teams using Claude as their AI work surface | Teams operating in Microsoft 365, Teams, and Copilot Chat |
| Connection model | Authorized connection to remote MCP server | Tenant-governed declarative agent/plugin calling remote MCP tools |
| Identity path | OAuth access token after enterprise OIDC/SSO login | Microsoft Entra SSO or OAuth access token |
| Our back end | Same remote MCP endpoint, requirements, compliance engine, entitlement checks, and audit | Same remote MCP endpoint, requirements, compliance engine, entitlement checks, and audit |
| Product role | Conversational work surface | Conversational work surface |

We should not build separate compliance engines per AI assistant. The governed platform service remains one; integration adapters are thin and controlled.

## Industry-aligned practices

This approach follows established patterns rather than inventing a retail-specific security exception:

- **Retail/CPG master-data governance:** GS1 US describes data quality as complete, accurate, standards-based, and timestamped, supported by processes that validate information for external sharing.[^gs1]
- **Standards-based product information:** GS1's Data Quality Framework supports suppliers improving master data and retailers protecting the integrity of data synchronized with trading partners; GPC provides a common product-classification language.[^gs1-framework]
- **Identity-first API access:** Microsoft documents securing MCP servers through Azure API Management with OAuth tokens or Entra-issued JWTs, token validation at the gateway, and managed credential handling for backend calls.[^azure-apim]
- **Least privilege and read/write separation:** OWASP recommends minimum necessary tools, per-tool scopes, separate tool sets by trust level, explicit authorization for sensitive operations, and human approval for high-impact actions.[^owasp]
- **AI risk governance:** NIST’s AI RMF and its Generative AI Profile provide a voluntary risk-management framework for designing, deploying, evaluating, and governing trustworthy AI systems.[^nist]

## Pilot proposal

### Scope

- **Users:** 5–15 named internal users or a single design-partner retailer tenant
- **Client:** Claude Chat first, because the existing prototype is operational; M365 Copilot packaging only after tenant approval
- **Data:** Synthetic or pre-approved, non-sensitive sample catalog data for the initial security test; tightly controlled design-partner data only after sign-off
- **Operations:** Read-only compliance insight; no writes, publishing, or supplier communication
- **Duration:** 6–8 weeks

### Success criteria

- At least 10 predefined retail-compliance questions return correct, authorized, traceable answers.
- Every request has a correlation ID and a retrievable audit record.
- Cross-tenant, wrong-audience, invalid-token, missing-scope, and unauthorized-supplier tests fail closed.
- Prompt-injection and tool-abuse test suite shows no bypass of access controls or tool allowlist.
- Users can identify readiness risk faster than the manual comparison workflow.
- Security, architecture, and product agree on a residual-risk assessment before any expansion.

### Exit criteria before production

1. Threat model and data-classification review completed.
2. OAuth/OIDC and token-validation design approved.
3. Tool schemas, output minimization, and entitlement enforcement tested.
4. Independent security testing/red-team abuse cases executed.
5. Monitoring, incident response, retention, and customer-support ownership defined.
6. Customer terms, data-processing, and AI-client data-handling implications reviewed by Legal/Privacy.
7. Clear approval path for each future write-capable tool.

## What we should not claim

- “MCP is inherently secure.” Security depends on implementation and governance.
- “Claude or Copilot can access our data safely by default.” They must be explicitly authorized and constrained.
- “Read-only means zero risk.” Read tools can still expose data, so entitlement checks and minimization are mandatory.
- “The model decides access.” It does not; our platform and gateway decide access.

## Recommendation

Approve a controlled **read-only remote MCP pilot** for retailer compliance insight.

The pilot advances a differentiated retail proposition: retailers govern the requirements; suppliers receive a clear target; our platform calculates compliance; and authorized users can obtain timely, auditable insights in the AI work surface their enterprise already uses.

The architecture preserves our control plane. Requirements authoring, approval, publication, remediation, customer entitlements, and all data-access decisions remain inside our platform. MCP expands the user interface—not the data perimeter.

---

## Reference links

[^gs1]: [GS1 US National Data Quality Playbook](https://www.gs1us.org/industries-and-insights/by-industry/retail-grocery/data-quality-playbook)

[^gs1-framework]: [GS1 Data Quality Framework, Standards and Guidelines](https://gs1.org/standards/data-quality-framework) and [GS1 US retail grocery standards resources](https://www.gs1us.org/industries-and-insights/by-industry/retail-grocery/resources)

[^mcp-auth]: [Model Context Protocol Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)

[^azure-apim]: [Microsoft Learn: Secure access to MCP servers in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/secure-mcp-servers)

[^owasp]: [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)

[^nist]: [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
