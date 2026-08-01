// The server-level instruction block handed to the MCP client at initialize.
//
// Lives here rather than in the route so the route stays dispatch. This is
// prose, and prose is what changes most often — keeping it out of the file that
// wires up authentication means editing the wording never risks the wiring.

import type { CallerContext } from "@/lib/mcp/context"

/**
 * The server-level instruction block, written for whichever side signed in.
 *
 * Note what this no longer does: it used to assert tenancy in prose and hope
 * the model complied. It now *describes* an authorization decision the server
 * has already made and will re-make on every call.
 */
export function buildInstructions(ctx: CallerContext, tenantName: string): string {
  const who =
    ctx.subjectType === "workload"
      ? "under an autonomous service identity with no user in the session"
      : `on behalf of ${ctx.subjectId}`

  const common =
    `You are connected as ${tenantName} (${ctx.tenantClass} tenant), ${who}. ` +
    `You have been granted these scopes: ${[...ctx.scopes].join(", ")}. ` +
    `Only the tools this connection is authorized for are listed — if an action you expect is missing, the user has not granted the scope for it, and you should tell them which scope is needed rather than trying to work around it. ` +
    `All data is mock data from a watermarked prototype. ` +
    `GROUNDING: answer questions about TGC data strictly from tool results — never invent profiles, suppliers, partners, categories, or numbers. ` +
    `When the user asks what they can do, is unsure, or asks something open-ended, call get_capabilities first to see what actions and data actually exist, then guide them. ` +
    `EMPTY RESULTS: some read tools return a note with known values when a filter matches nothing — relay those suggestions instead of just saying 'none found'. ` +
    `OUT OF SCOPE: other tenants' data is not reachable through this connection and asking for it will be refused by the server, not just declined by you. Sales, logistics, and pricing are not in this demo. `

  if (ctx.tenantClass === "supplier") {
    return (
      `Trading Grid Catalogue (TGC) — a B2B catalog data-sync network connecting retailer hubs and supplier spokes. ` +
      `This connection is the SUPPLIER side. ` +
      common +
      `SCOPE: this supplier's OWN position — how complete their catalogue is against the GS1 baseline and against each retail partner separately, which attributes and images are still outstanding, and which exceptions retailers have granted them. ` +
      `KEY IDEA: compliance is never one global score. A supplier is compliant FOR A GIVEN RETAILER, because each retailer layers its own required attributes on top of the GS1 baseline — always say which target a number refers to. ` +
      `Attributes a retailer has waived are NOT gaps; report them separately as waived rather than letting them disappear. ` +
      `This connection is READ-ONLY: the supplier cannot create or amend requirements or exceptions — only the granting retailer can. If they ask to change one, explain that and suggest they raise it with that retailer.`
    )
  }

  return (
    `Trading Grid Catalogue (TGC) — a B2B catalog data-sync network connecting retailer hubs and supplier spokes. ` +
    `This connection is the RETAILER side. ` +
    common +
    `SCOPE: authoring product requirements (attribute profiles, attributes, image requirements), monitoring the compliance of this retailer's OWN suppliers against those requirements, and managing vendor exceptions (waivers, extended deadlines, reduced scope). ` +
    `WRITES: before any write tool, restate the exact change to the user and get their explicit confirmation.`
  )
}
