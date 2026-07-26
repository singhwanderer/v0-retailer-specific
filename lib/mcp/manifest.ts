// The curated tool registry (§4A row 11).
//
// Previously each tool was registered inline in the MCP route with its schema
// and handler, and nothing recorded what authority it needed. That works right
// up until "which tools can a read-only connection see?" or "which tools may a
// supplier tenant call?" needs an answer — at which point the answer lives in
// thirteen places and drifts.
//
// So authority is declared as data, next to the schema: required scope,
// permitted tenant classes, and whether an autonomous workload may call it.
// The route iterates this list to register tools, filters tools/list by the
// caller's scopes, and runs every handler through runGuarded(). Adding a tool
// without declaring its authority is not possible — the type demands it.
//
// Worth noting for the platform conversation: because TGC is the named first
// implementation behind the TG Aviator MCP Gateway, this shape (tool + scope +
// tenant class + read/write) is a candidate *platform* registry schema, not
// just TGC plumbing. A gateway needs exactly this metadata to publish a vetted
// catalog rather than letting every team wire up its own tools.

import { z } from "zod"
import { SCOPES, type CallerContext, type Scope } from "@/lib/mcp/context"
import type { TenantClass } from "@/lib/mcp/tenants"
import {
  addAttributeRequirement,
  createAttributeProfile,
  getCapabilities,
  getProfileDetail,
  getSupplierCompliance,
  listAttributeProfiles,
  listMySuppliers,
  listSystemFilters,
  listVendorExceptions,
  runComplianceReport,
  searchGs1Bricks,
  setImageRequirement,
  setVendorException,
} from "@/lib/mcp/tools"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodRawShape = Record<string, z.ZodType<any, any, any>>

export interface ToolDefinition {
  name: string
  description: string
  /** Zod raw shape, exactly as the MCP SDK expects it. */
  schema: ZodRawShape
  /** Whether this tool mutates state — surfaced in the registry and the audit UI. */
  kind: "read" | "write"
  requiredScope: Scope
  /**
   * Which tenant classes may call this tool. Today's inventory is entirely
   * retailer-side; supplier-side tools (§4B) become safe to add only once this
   * field is being enforced, which is the point of declaring it now.
   */
  allowedTenantClasses: TenantClass[]
  /**
   * May an autonomous workload identity (no human in the session) call this?
   * Writes are human-delegated only: an agent acting on its own must not be
   * able to waive a compliance requirement with nobody to approve it.
   */
  allowWorkload: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: CallerContext, args: any) => unknown
}

const RETAILER_ONLY: TenantClass[] = ["retailer"]

export const TOOL_MANIFEST: ToolDefinition[] = [
  // ── Discoverability ────────────────────────────────────────────────────────
  {
    name: "get_capabilities",
    description:
      "Return a plain-English catalog of what this TGC connector can do (read and write actions with example phrasings) plus a live snapshot of the demo data: the attribute profiles, retail partners, vendors, and categories that actually have data. Call this when the user asks 'what can I do?', 'what can you help with?', or seems unsure what to ask — and to ground answers in what data really exists before saying something is unavailable.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx) => getCapabilities(ctx),
  },

  // ── Reads ──────────────────────────────────────────────────────────────────
  {
    name: "search_gs1_bricks",
    description:
      "Search the GS1 standard category library by name, segment, or category code. Returns each GS1 category's code, name, segment, and its standard extended attributes. Use this to resolve a product category like 'dresses' or 'footwear' to a GS1 category code before creating or inspecting an attribute profile.",
    schema: {
      query: z
        .string()
        .describe("Free-text search, e.g. 'dresses', 'footwear', or a category code like 10001333"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (_ctx, { query }: { query: string }) => searchGs1Bricks(query),
  },
  {
    name: "list_attribute_profiles",
    description:
      "List the retailer's attribute profiles (requirement sets per product category), including status (Active/Draft), the mapped GS1 brick, and last-updated date.",
    schema: {
      status: z.enum(["Active", "Draft"]).optional().describe("Filter by profile status"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, { status }: { status?: "Active" | "Draft" }) => listAttributeProfiles(ctx, status),
  },
  {
    name: "get_profile_detail",
    description:
      "Get the full requirement profile for a GS1 category code: core attributes, extended attributes (standard GS1 vs. retailer-added custom), per-attribute guidance, and image requirements (format, background, dimensions, file size, crop).",
    schema: {
      brickCode: z.string().describe("GS1 category code, e.g. 10001077 for Shoes - General Purpose"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, { brickCode }: { brickCode: string }) => getProfileDetail(ctx, brickCode),
  },
  {
    name: "list_my_suppliers",
    description:
      "List the suppliers trading under your retailer account, each with their category, open attribute gaps, products with gaps, and fully compliant products. Ranked by open gaps. This only covers your own suppliers — other retail partners' or peer accounts' data is not available through this connector.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: () => listMySuppliers(),
  },
  {
    name: "get_supplier_compliance",
    description:
      "Get compliance detail for one of your suppliers by name: category, product counts, and open gaps. If the name doesn't match a known supplier (including if it's actually another retail partner's name), returns the list of suppliers that do have data.",
    schema: {
      supplier: z.string().describe("Supplier name, e.g. 'J.Renée' or 'Nike'"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (_ctx, { supplier }: { supplier: string }) => getSupplierCompliance(supplier),
  },
  {
    name: "list_system_filters",
    description:
      "List the global System attribute filters (e.g. GS1 Core Scorecard, GS1 Extended Scorecard). These are standard rule sets configured platform-wide: suppliers and retailers running the same System filter evaluate the exact same rules. Use the returned ids with run_compliance_report.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: () => listSystemFilters(),
  },
  {
    name: "run_compliance_report",
    description:
      "Run a defensive compliance report across your vendor base (read-only, mock data, computed on demand — the portal UI keeps its own report queue). Scan against either one of your attribute profiles (profileName), all your active profiles (default), or a global System filter (systemFilterId from list_system_filters). Optionally scope to a single supplier. Returns overall compliance %, ranked missing attributes, per-category breakdown, and per-vendor rows. Attributes waived by an Active vendor exception are not counted as gaps.",
    schema: {
      systemFilterId: z
        .string()
        .optional()
        .describe(
          "A System filter id from list_system_filters, e.g. 'gs1-core'. Mutually exclusive with profileName."
        ),
      profileName: z
        .string()
        .optional()
        .describe(
          "One of your attribute profile names, e.g. 'Footwear'. Omit (and omit systemFilterId) to scan against all active profiles."
        ),
      supplier: z
        .string()
        .optional()
        .describe("Scope the report to one supplier by name, e.g. 'J.Renée'. Omit for all vendors."),
      maxAttributes: z
        .number()
        .int()
        .min(1)
        .max(999)
        .optional()
        .describe(
          "Maximum attributes to report in the ranked missing list (legacy semantics: 999 = all). Default 10."
        ),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => runComplianceReport(ctx, args),
  },
  {
    name: "list_vendor_exceptions",
    description:
      "List vendor exceptions on file — waivers, extended deadlines, or reduced-scope exclusions granted against a supplier's requirements. Optionally filter by vendor name or status (Active/Expired). These are the exceptions that reduce a vendor's gap count in run_compliance_report.",
    schema: {
      vendor: z.string().optional().describe("Vendor name to filter by, e.g. 'Levi Strauss & Co.'"),
      status: z.enum(["Active", "Expired"]).optional().describe("Filter by exception status"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, { vendor, status }: { vendor?: string; status?: "Active" | "Expired" }) =>
      listVendorExceptions(ctx, vendor, status),
  },

  // ── Writes (in-memory demo store) ──────────────────────────────────────────
  {
    name: "create_attribute_profile",
    description:
      "Create a new attribute profile (requirement set) for a product category, mapped to one or more GS1 categories. The profile starts as Draft and is seeded with each mapped GS1 category's standard extended attributes — each brick keeps its own attribute set, with no merging across bricks. Before calling, confirm the category name, GS1 category choice(s), and free-text product-type label with the user, and afterwards show them the created profile.",
    schema: {
      categoryName: z.string().describe("The retailer's internal category name, e.g. 'Swimwear'"),
      brickCodes: z
        .array(z.string())
        .min(1)
        .describe("One or more GS1 category codes to map (find via search_gs1_bricks)"),
      category: z
        .string()
        .optional()
        .describe(
          "Free-text product-type label shown in the requirements list, e.g. 'Women's Apparel' — independent of which GS1 categories are mapped; defaults to categoryName if omitted"
        ),
    },
    kind: "write",
    requiredScope: SCOPES.requirementsWrite,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    handler: (
      ctx,
      { categoryName, brickCodes, category }: { categoryName: string; brickCodes: string[]; category?: string }
    ) => createAttributeProfile(ctx, categoryName, brickCodes, category),
  },
  {
    name: "add_attribute_requirement",
    description:
      "Add a custom attribute requirement to a profile, as either a core or an extended attribute, with optional guidance text for suppliers. Confirm the details with the user before calling.",
    schema: {
      brickCode: z.string().describe("GS1 category code of the profile to modify"),
      attributeName: z.string().describe("Name of the attribute, e.g. 'Care Instructions'"),
      target: z.enum(["core", "extended"]).describe("Whether this is a core or extended attribute"),
      guidance: z
        .string()
        .optional()
        .describe("Guidance text shown to suppliers, e.g. 'Max 35 characters'"),
    },
    kind: "write",
    requiredScope: SCOPES.requirementsWrite,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    handler: (
      ctx,
      {
        brickCode,
        attributeName,
        target,
        guidance,
      }: { brickCode: string; attributeName: string; target: "core" | "extended"; guidance?: string }
    ) => addAttributeRequirement(ctx, brickCode, attributeName, target, guidance),
  },
  {
    name: "set_image_requirement",
    description:
      "Add or update an image requirement on a profile (matched by requirement name). All fields except guidanceNote are mandatory — collect every mandatory value from the user before calling, offering only the listed options for format and background. Confirm the details with the user before calling.",
    schema: {
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
      guidanceNote: z
        .string()
        .optional()
        .describe("Optional note for suppliers, e.g. 'No mannequin, no props.'"),
    },
    kind: "write",
    requiredScope: SCOPES.requirementsWrite,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    handler: (ctx, { brickCode, ...requirement }: { brickCode: string } & Record<string, never>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setImageRequirement(ctx, brickCode, requirement as any),
  },
  {
    name: "set_vendor_exception",
    description:
      "Create or update a vendor exception — a waiver, extended deadline, or reduced-scope exclusion against one or more attributes for a named vendor, scoped to one category. An Active 'Attribute Waiver' exception's attributes reduce that vendor's gap count for this exact category in run_compliance_report and the portal's own Compliance Reports/Dashboard screens (Extended Deadline and Reduced Scope still change which attribute is named as a gap, but don't reduce the count). To update an existing exception (e.g. revoke it by setting status to Expired, or extend validUntil), pass its id from list_vendor_exceptions; omit id to create a new one. If no vendor is named, the exception applies to J.Renée, the supplier persona this demo is logged in as. Confirm the exact vendor, category, exception type, attributes, and validity with the user before calling — this changes real compliance numbers.",
    schema: {
      id: z
        .string()
        .optional()
        .describe("Existing exception id to update, from list_vendor_exceptions. Omit to create a new exception."),
      vendor: z
        .string()
        .optional()
        .describe(
          "Vendor name, e.g. 'Levi Strauss & Co.'. Omit to apply the exception to J.Renée — the supplier persona this demo is logged in as, and the only vendor whose supplier-side view reflects an exception."
        ),
      brickCode: z
        .string()
        .describe(
          "GS1 category code the exception applies to (find via search_gs1_bricks or list_attribute_profiles). Scopes the exception to this vendor's category so it can't leak into a different category the same vendor also supplies, e.g. Calvin Klein supplies Footwear, Shirts, and Dresses separately."
        ),
      profile: z.string().describe("Profile name the exception applies to, e.g. 'Apparel — Extended Sustainability'"),
      exceptionType: z
        .enum(["Attribute Waiver", "Extended Deadline", "Reduced Scope"])
        .describe("Type of exception"),
      attributes: z
        .array(z.string())
        .min(1)
        .describe("Attribute names this exception waives/extends/reduces, e.g. ['Sustainable Materials Y/N']"),
      validUntil: z.string().describe("Expiry date as free text, e.g. 'Sep 30, 2026', or 'Permanent'"),
      status: z.enum(["Active", "Expired"]).optional().describe("Exception status — defaults to Active on create"),
    },
    kind: "write",
    requiredScope: SCOPES.exceptionsWrite,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    handler: (ctx, args) => setVendorException(ctx, args),
  },
]

/** Tools this caller's granted scopes permit them to see and call. */
export function toolsForScopes(scopes: Set<Scope>): ToolDefinition[] {
  return TOOL_MANIFEST.filter((t) => scopes.has(t.requiredScope))
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_MANIFEST.find((t) => t.name === name)
}
