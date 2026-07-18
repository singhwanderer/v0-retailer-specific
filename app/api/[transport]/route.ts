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
  createVendorException,
  getCapabilities,
  getProfileDetail,
  getSupplierComplianceSummary,
  listAttributeProfiles,
  listVendorExceptions,
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
      "Search the GS1 standard category library (bricks) by name, segment, or brick code. Returns each brick's code, name, segment, and its standard extended attributes. Use this to resolve a product category like 'dresses' or 'footwear' to a GS1 brick code before creating or inspecting an attribute profile.",
      { query: z.string().describe("Free-text search, e.g. 'dresses', 'footwear', or a brick code like 10001333") },
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
      "Get the full requirement profile for a GS1 brick code: core attributes, extended attributes (standard GS1 vs. retailer-added custom), per-attribute guidance, and image requirements (format, background, dimensions, file size, crop).",
      { brickCode: z.string().describe("GS1 brick code, e.g. 10005811 for Footwear") },
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

    server.tool(
      "list_vendor_exceptions",
      "List vendor exceptions granted by the retailer: attribute waivers, extended deadlines, and reduced-scope agreements per vendor and profile, with validity dates and Active/Expired status.",
      {
        status: z.enum(["Active", "Expired"]).optional().describe("Filter by exception status"),
        vendor: z.string().optional().describe("Filter by vendor name"),
      },
      async ({ status, vendor }) => asText(listVendorExceptions(status, vendor))
    )

    // ── Writes (in-memory demo store) ───────────────────────────────────────
    server.tool(
      "create_attribute_profile",
      "Create a new attribute profile (requirement set) for a product category, mapped to a GS1 brick. Both fields are mandatory. The profile starts as Draft and is seeded with the brick's standard extended attributes. Before calling, confirm the category name and brick choice with the user, and afterwards show them the created profile.",
      {
        categoryName: z.string().describe("The retailer's internal category name, e.g. 'Swimwear'"),
        brickCode: z.string().describe("GS1 brick code to map the category to (find via search_gs1_bricks)"),
      },
      async ({ categoryName, brickCode }) => asText(createAttributeProfile(categoryName, brickCode))
    )

    server.tool(
      "add_attribute_requirement",
      "Add a custom attribute requirement to a profile, as either a core or an extended attribute, with optional guidance text for suppliers. Confirm the details with the user before calling.",
      {
        brickCode: z.string().describe("GS1 brick code of the profile to modify"),
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
        brickCode: z.string().describe("GS1 brick code of the profile to modify"),
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

    server.tool(
      "create_vendor_exception",
      "Grant a vendor an exception on a profile: an Attribute Waiver, Extended Deadline, or Reduced Scope, covering specific attributes until a given date. All fields are mandatory; exceptionType must be one of the listed options. Confirm vendor, type, attributes, and validity with the user before calling.",
      {
        vendor: z.string().describe("Vendor name, e.g. 'Acme Apparel'"),
        profile: z.string().describe("Profile the exception applies to, e.g. 'Footwear — Core Compliance'"),
        exceptionType: z.enum(["Attribute Waiver", "Extended Deadline", "Reduced Scope"]),
        attributes: z.array(z.string()).describe("The attributes covered by the exception"),
        validUntil: z.string().describe("Validity end, e.g. 'Sep 30, 2026' or 'Permanent'"),
      },
      async (args) => asText(createVendorException(args))
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
          "Help me set up requirements for a new product category in TGC. First ask me which category, then search the GS1 library for the right brick, create the attribute profile, and walk me through adding key attributes and an image requirement — confirming each change before you write it."
        )
    )

    server.prompt(
      "audit-a-vendor",
      "Review one vendor's compliance gaps and any exceptions they hold.",
      async () =>
        prompt(
          "I want to audit one vendor in TGC. Ask me which vendor, then show their open compliance gaps and any exceptions (waivers, extended deadlines, reduced scope) they currently hold. If the name doesn't match, tell me which vendors do have data."
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

    server.prompt(
      "grant-an-exception",
      "Grant a vendor a waiver, extended deadline, or reduced-scope exception.",
      async () =>
        prompt(
          "Help me grant a vendor exception in TGC. Ask me the vendor, the profile, the exception type (Attribute Waiver, Extended Deadline, or Reduced Scope), the attributes it covers, and the valid-until date — then restate the full exception and get my confirmation before creating it."
        )
    )
  },
  {
    serverInfo: { name: "tgc-demo", version: "0.1.0" },
    instructions:
      "Trading Grid Catalogue (TGC) demo server — a B2B catalog data-sync network connecting retailer hubs and supplier spokes. " +
      "SCOPE: this connector covers the retailer side only — authoring product requirements (attribute profiles, attributes, image requirements) and monitoring supplier compliance (gaps and exceptions). " +
      "All data is mock data from a watermarked prototype; write tools store changes in an in-memory demo store that resets periodically. " +
      "GROUNDING: answer questions about TGC data strictly from tool results — never invent profiles, vendors, categories, or numbers. " +
      "When the user asks what they can do, is unsure, or asks something open-ended, call get_capabilities first to see what actions and data actually exist, then guide them. " +
      "EMPTY RESULTS: some read tools return a note with knownVendors/availableStatuses when a filter matches nothing — relay those suggestions instead of just saying 'none found'. " +
      "OUT OF SCOPE: supplier-side tools (a supplier asking about their own compliance), sales, logistics, pricing, or anything beyond retailer requirements and compliance are not in this demo — say so plainly and point to what IS available via get_capabilities, rather than answering from general knowledge as if it were TGC data. " +
      "WRITES: before any write tool, restate the exact change to the user and get their explicit confirmation.",
  },
  { basePath: "/api" }
)

export { handler as GET, handler as POST, handler as DELETE }
