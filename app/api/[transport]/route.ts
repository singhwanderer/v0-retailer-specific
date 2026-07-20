// TGC demo MCP server — Streamable HTTP endpoint at /api/mcp.
//
// Exposes the prototype's mock catalogue data through the tool inventory
// described in docs/mcp-concept.md, so any MCP client (claude.ai, ChatGPT
// developer mode, Claude Desktop) can query requirements and supplier
// compliance and create requirements against the in-memory demo store.

import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import {
  addAttributeRequirement,
  createAttributeProfile,
  getCapabilities,
  getProfileDetail,
  getSupplierComplianceSummary,
  listAttributeProfiles,
  listVendorGaps,
  searchGs1Bricks,
  setImageRequirement,
} from "@/lib/mcp/tools"

function asText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
}

const handler = createMcpHandler(
  (server) => {
    // ── Discoverability ──────────────────────────────────────────────────────
    server.tool(
      "get_capabilities",
      "Return a plain-English catalog of what this TGC connector can do (read and write actions with example phrasings) plus a live snapshot of the demo data: the attribute profiles, retail partners, vendors, and categories that actually have data. Call this when the user asks 'what can I do?', 'what can you help with?', or seems unsure what to ask — and to ground answers in what data really exists before saying something is unavailable.",
      {},
      async () => asText(getCapabilities())
    )

    // ── Reads ────────────────────────────────────────────────────────────────
    server.tool(
      "search_gs1_bricks",
      "Search the GS1 standard category library by name, segment, or category code. Returns each GS1 category's code, name, segment, and its standard extended attributes. Use this to resolve a product category like 'dresses' or 'footwear' to a GS1 category code before creating or inspecting an attribute profile.",
      { query: z.string().describe("Free-text search, e.g. 'dresses', 'footwear', or a category code like 10001333") },
      async ({ query }) => asText(searchGs1Bricks(query))
    )

    server.tool(
      "list_attribute_profiles",
      "List the retailer's attribute profiles (requirement sets per product category), including status (Active/Draft), the mapped GS1 brick, and last-updated date.",
      { status: z.enum(["Active", "Draft"]).optional().describe("Filter by profile status") },
      async ({ status }) => asText(listAttributeProfiles(status))
    )

    server.tool(
      "get_profile_detail",
      "Get the full requirement profile for a GS1 category code: core attributes, extended attributes (standard GS1 vs. retailer-added custom), per-attribute guidance, and image requirements (format, background, dimensions, file size, crop).",
      { brickCode: z.string().describe("GS1 category code, e.g. 10005811 for Footwear") },
      async ({ brickCode }) => asText(getProfileDetail(brickCode))
    )

    server.tool(
      "get_supplier_compliance_summary",
      "Summarize supplier compliance across the network: per retail partner, the number of open attribute gaps, products with gaps, and fully compliant products, plus how many products are still uncategorised (no GS1 brick assigned). Vendors are ranked by open gaps.",
      {},
      async () => asText(getSupplierComplianceSummary())
    )

    server.tool(
      "list_vendor_gaps",
      "List product-level compliance gaps: which products have open attribute gaps against which retail partner, with the product's GS1 category. Optionally filter by partner name.",
      { vendor: z.string().optional().describe("Filter by retail partner name, e.g. 'Dillard's'") },
      async ({ vendor }) => asText(listVendorGaps(vendor))
    )

    // ── Writes (in-memory demo store) ───────────────────────────────────────
    server.tool(
      "create_attribute_profile",
      "Create a new attribute profile (requirement set) for a product category, mapped to a GS1 category. Both fields are mandatory. The profile starts as Draft and is seeded with the GS1 category's standard extended attributes. Before calling, confirm the category name and GS1 category choice with the user, and afterwards show them the created profile.",
      {
        categoryName: z.string().describe("The retailer's internal category name, e.g. 'Swimwear'"),
        brickCode: z.string().describe("GS1 category code to map the category to (find via search_gs1_bricks)"),
      },
      async ({ categoryName, brickCode }) => asText(createAttributeProfile(categoryName, brickCode))
    )

    server.tool(
      "add_attribute_requirement",
      "Add a custom attribute requirement to a profile, as either a core or an extended attribute, with optional guidance text for suppliers. Confirm the details with the user before calling.",
      {
        brickCode: z.string().describe("GS1 category code of the profile to modify"),
        attributeName: z.string().describe("Name of the attribute, e.g. 'Care Instructions'"),
        target: z.enum(["core", "extended"]).describe("Whether this is a core or extended attribute"),
        guidance: z.string().optional().describe("Guidance text shown to suppliers, e.g. 'Max 35 characters'"),
      },
      async ({ brickCode, attributeName, target, guidance }) =>
        asText(addAttributeRequirement(brickCode, attributeName, target, guidance))
    )

    server.tool(
      "set_image_requirement",
      "Add or update an image requirement on a profile (matched by requirement name). All fields except guidanceNote are mandatory — collect every mandatory value from the user before calling, offering only the listed options for format and background. Confirm the details with the user before calling.",
      {
        brickCode: z.string().describe("GS1 category code of the profile to modify"),
        requirementName: z.string().describe("e.g. 'Hero Shot' or 'Lifestyle Image'"),
        format: z
          .enum(["JPEG", "PNG", "TIFF", "WebP"])
          .describe("Image file format — must be one of the listed options"),
        background: z
          .enum(["Pure white (#FFFFFF)", "Light grey (#F5F5F5)", "Transparent", "Lifestyle/contextual"])
          .describe("Background treatment — must be one of the listed options"),
        minDimensions: z.string().describe("e.g. '2000 × 2000 px'"),
        maxFileSize: z.string().describe("e.g. '10 MB'"),
        shapeCrop: z.string().describe("e.g. 'Square, product centered'"),
        guidanceNote: z.string().optional().describe("Optional note for suppliers, e.g. 'No mannequin, no props.'"),
      },
      async ({ brickCode, ...requirement }) => asText(setImageRequirement(brickCode, requirement))
    )

    // ── Starter prompts ──────────────────────────────────────────────────────
    // Surfaced by MCP clients (e.g. claude.ai's prompt picker) as clickable
    // suggestions so a teammate opening the connector cold knows what to try.
    const prompt = (text: string) => ({
      messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
    })

    server.prompt(
      "review-supplier-compliance",
      "See which retail partners are furthest behind on compliance and on which products.",
      async () =>
        prompt(
          "Using the TGC connector, which of my retail partners are furthest behind on compliance, and on which products and attributes? Rank them by open gaps and cite the tool results."
        )
    )

    server.prompt(
      "set-up-category-requirements",
      "Guided flow to create requirements for a new product category.",
      async () =>
        prompt(
          "Help me set up requirements for a new product category in TGC. First ask me which category, then search the GS1 library for the right GS1 category, create the attribute profile, and walk me through adding key attributes and an image requirement — confirming each change before you write it."
        )
    )

    server.prompt(
      "audit-a-vendor",
      "Review one retail partner's open compliance gaps.",
      async () =>
        prompt(
          "I want to audit one retail partner in TGC. Ask me which partner, then show their open compliance gaps by product and attribute. If the name doesn't match, tell me which partners do have data."
        )
    )

    server.prompt(
      "explain-a-profile",
      "Get the full requirement breakdown for a category profile.",
      async () =>
        prompt(
          "Explain one of my TGC attribute profiles in full. Ask me which category, then break down its core attributes, extended attributes (standard GS1 vs. custom), per-attribute guidance, and image requirements."
        )
    )
  },
  {
    serverInfo: { name: "tgc-demo", version: "0.1.0" },
    instructions:
      "Trading Grid Catalogue (TGC) demo server — a B2B catalog data-sync network connecting retailer hubs and supplier spokes. " +
      "SCOPE: this connector covers the retailer side only — authoring product requirements (attribute profiles, attributes, image requirements) and monitoring supplier compliance gaps. " +
      "All data is mock data from a watermarked prototype; write tools store changes in an in-memory demo store that resets periodically. " +
      "GROUNDING: answer questions about TGC data strictly from tool results — never invent profiles, partners, categories, or numbers. " +
      "When the user asks what they can do, is unsure, or asks something open-ended, call get_capabilities first to see what actions and data actually exist, then guide them. " +
      "EMPTY RESULTS: some read tools return a note with known partners/statuses when a filter matches nothing — relay those suggestions instead of just saying 'none found'. " +
      "OUT OF SCOPE: vendor exceptions (waivers, extended deadlines, reduced scope), supplier-side tools (a supplier asking about their own compliance), sales, logistics, pricing, or anything beyond retailer requirements and compliance-gap monitoring are not in this demo — say so plainly and point to what IS available via get_capabilities, rather than answering from general knowledge as if it were TGC data. " +
      "WRITES: before any write tool, restate the exact change to the user and get their explicit confirmation.",
  },
  { basePath: "/api" }
)

export { handler as GET, handler as POST, handler as DELETE }
