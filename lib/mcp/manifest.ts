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
import type { ProfileStatus } from "@/lib/retailer-requirements"
import type { ToolGuardSpec } from "@/lib/mcp/guard"
import {
  getMyComplianceStatus,
  getMyOpenGaps,
  listMyExceptions,
  listMyRetailPartners,
  runMyComplianceReport,
} from "@/lib/mcp/tools-supplier"
import {
  addAttributeRequirement,
  createAttributeProfile,
  deleteAttributeProfile,
  diagnoseGapPattern,
  draftVendorOutreach,
  getCapabilities,
  getProfileDetail,
  getSupplierCompliance,
  listAttributeProfiles,
  listMySuppliers,
  getComplianceTrend,
  listSystemFilters,
  listVendorExceptions,
  queryAccessLog,
  removeAttributeRequirement,
  removeImageRequirement,
  revokeVendorException,
  runComplianceReport,
  searchGs1Bricks,
  setImageRequirement,
  setProfileStatus,
  setVendorException,
  simulateRequirementChange,
  updateAttributeRequirement,
} from "@/lib/mcp/tools"
import { getStore, readProfileExtras } from "@/lib/mcp/store"
import {
  assembleBrickAttributes,
  describeAvailableCategories,
  findProfileForBrick,
  resolveGs1Name,
} from "@/lib/mcp/attribute-assembly"
import {
  createPendingChange,
  discardPendingChange,
  listPendingChanges,
  takePendingChange,
} from "@/lib/mcp/pending"
import { runGuarded } from "@/lib/mcp/guard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodRawShape = Record<string, z.ZodType<any, any, any>>

export interface ToolDefinition {
  name: string
  description: string
  /** Zod raw shape, exactly as the MCP SDK expects it. */
  schema: ZodRawShape
  /** Whether this tool mutates state — surfaced in the registry and the audit UI. */
  kind: "read" | "write"
  /**
   * Removes or deactivates something that already exists. Declared separately
   * from `kind` because "write" is far too coarse a bucket to consent to:
   * adding an attribute and deleting the profile it lives on are different
   * authorities. A destructive tool additionally requires SCOPES.destructive
   * and is surfaced to clients with MCP's destructiveHint annotation.
   */
  destructive?: boolean
  /**
   * Two-phase: the first call previews and returns a confirmation token, and
   * only confirm_pending_change executes. Every mutating tool sets this — see
   * lib/mcp/pending.ts for why the confirmation lives in the protocol rather
   * than in a UI card the external clients don't have.
   */
  requiresConfirmation?: boolean
  /**
   * Describe what the call *would* do, for the preview phase. Returning
   * `{ error }` refuses before a token is ever minted, so an invalid request
   * fails at proposal time rather than at confirm time.
   */
  preview?: (
    ctx: CallerContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any
  ) => { summary: string; effect: string[] } | { error: string }
  requiredScope: Scope
  /**
   * Which tenant classes may call this tool. Today's inventory is entirely
   * retailer-side; supplier-side tools (§4B) become safe to add only once this
   * field is being enforced, which is the point of declaring it now.
   */
  allowedTenantClasses: TenantClass[]
  /** Scopes required on top of requiredScope — destructive tools add SCOPES.destructive. */
  additionalScopes?: Scope[]
  /**
   * May an autonomous workload identity (no human in the session) call this?
   * Writes are human-delegated only: an agent acting on its own must not be
   * able to waive a compliance requirement with nobody to approve it. This
   * extends to confirmation: an agent may propose, but only a person approves.
   */
  allowWorkload: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: CallerContext, args: any) => unknown
}

// ── Preview helpers ──────────────────────────────────────────────────────────
// A preview's job is to state the consequence in the user's terms before a
// token exists. These resolve the same store the handler will, so a preview
// that says "this profile doesn't exist" refuses at proposal time rather than
// letting a token be minted for a change that would fail on confirm.

interface ExceptionArgs {
  id?: string
  vendor?: string
  brickCode: string
  exceptionType: "Attribute Waiver" | "Extended Deadline" | "Reduced Scope"
  attributes: string[]
  validUntil: string
  status?: "Active" | "Expired"
}

function findProfile(ctx: CallerContext, name: string) {
  return getStore(ctx.tenantId).profiles.find((p) => p.name.toLowerCase() === name.toLowerCase().trim())
}

function unknownProfile(ctx: CallerContext, name: string): string {
  const names = getStore(ctx.tenantId).profiles.map((p) => p.name)
  return `No attribute profile named "${name}". Your profiles: ${names.join(", ")}.`
}

function profileLabel(ctx: CallerContext, brickCode: string): string {
  const profile = findProfileForBrick(getStore(ctx.tenantId).profiles, brickCode)
  return profile ? `the "${profile.name}" profile (GS1 category ${brickCode})` : `GS1 category ${brickCode}`
}

/** Refuse at preview time if the profile a write targets doesn't exist yet. */
function profileMissing(ctx: CallerContext, brickCode: string): { error: string } | null {
  if (findProfileForBrick(getStore(ctx.tenantId).profiles, brickCode)) return null
  return {
    error: `No attribute profile exists for GS1 category ${brickCode}. Create one first with create_attribute_profile.`,
  }
}

const RETAILER_ONLY: TenantClass[] = ["retailer"]
const SUPPLIER_ONLY: TenantClass[] = ["supplier"]
/** Discovery must work for everyone — see get_capabilities below. */
const BOTH_CLASSES: TenantClass[] = ["retailer", "supplier"]

export const TOOL_MANIFEST: ToolDefinition[] = [
  // ── Discoverability ────────────────────────────────────────────────────────
  {
    name: "get_capabilities",
    description:
      "Return a plain-English catalog of what this TGC connector can do (read and write actions with example phrasings) plus a live snapshot of the data that actually exists. Call this when the user asks 'what can I do?', 'what can you help with?', or seems unsure what to ask — and to ground answers in what data really exists before saying something is unavailable. The answer differs for a retailer and a supplier, because they get different tools.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    // Available to BOTH classes: "what can you help me with?" has to work for
    // everyone, or a supplier's first question dead-ends on an empty tool list.
    allowedTenantClasses: BOTH_CLASSES,
    allowWorkload: true,
    handler: (ctx) => getCapabilities(ctx),
  },

  // ── Reads ──────────────────────────────────────────────────────────────────
  {
    name: "search_gs1_bricks",
    description:
      "Search the GS1 standard category library by name, category (Footwear, Clothing, etc.), or category code. Returns each GS1 category's code, name, category grouping, its standard extended attributes, and whether it is still free to map to a new profile (`available`, plus `mappedTo` when it is not). Use this to resolve a product type like 'dresses' or 'footwear' to a GS1 category code before creating or inspecting an attribute profile. Matching is literal against those fields, not fuzzy: a product type the GS1 names do not use will find nothing, and a profile name will usually find nothing — neither is a failure, both mean ask the user which category they mean. If nothing matches, or every match is already mapped, the result carries a `note` naming the categories that are still free — relay those rather than picking a similar-sounding category yourself. Call with an empty query to list the whole library.",
    schema: {
      query: z
        .string()
        .describe("Free-text search, e.g. 'dresses', 'footwear', or a category code like 10001333"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, { query }: { query: string }) => searchGs1Bricks(ctx, query),
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
      "List the global System attribute filters (e.g. GS1 Core Scorecard, GS1 Extended Scorecard). These are standard rule sets configured platform-wide: suppliers and retailers running the same System filter evaluate the exact same rules. Use the returned ids with whichever report tool your side of the network has.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    // Both classes: these are neutral, platform-wide standards, owned by no
    // tenant — which is precisely what the description claims, and the reason
    // both sides can be said to evaluate "the exact same rules". A supplier
    // needs the ids to run its own report against a scorecard.
    allowedTenantClasses: BOTH_CLASSES,
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
    name: "get_compliance_trend",
    description:
      "See a 6-month compliance trend for a filter, a single supplier, or one supplier within one of their categories (e.g. 'is Blackwood Collective improving in Footwear?'). IMPORTANT: this prototype captures no real compliance history — past months are reconstructed by rolling catalogue state backward on a deterministic, seeded trajectory and re-scoring it, anchored so today's point always equals the live number run_compliance_report would return right now for the same scope. Always relay this as reconstructed/illustrative, never as a captured historical record. Same filter arguments as run_compliance_report: a System filter id, one of your attribute profiles, or omit both for all active profiles; optionally scope to one supplier, and optionally further to one of that supplier's categories (category requires supplier).",
    schema: {
      systemFilterId: z
        .string()
        .optional()
        .describe("A System filter id from list_system_filters, e.g. 'gs1-core'. Mutually exclusive with profileName."),
      profileName: z
        .string()
        .optional()
        .describe("One of your attribute profile names, e.g. 'Footwear'. Omit (and omit systemFilterId) for all active profiles."),
      supplier: z.string().optional().describe("Scope the trend to one supplier by name, e.g. 'J.Renée'. Omit for the aggregate."),
      category: z
        .string()
        .optional()
        .describe("Further scope to one of that supplier's GS1 categories, e.g. 'Footwear'. Requires supplier to be set."),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => getComplianceTrend(ctx, args),
  },
  {
    name: "diagnose_gap_pattern",
    description:
      "Find requirements that many DIFFERENT vendors are failing at once — the cross-vendor pattern a per-vendor screen can't show. When several vendors all miss the same attribute, that is usually one requirement-clarity problem (the field is ambiguous) rather than several unrelated vendor problems, and the response includes the retailer's own authored guidance for that attribute (account/profile mode only) so you can see what to rewrite. IMPORTANT: the vendor count here is DISTINCT vendors with a gap on that attribute — a different number from run_compliance_report's missingAttributes, which sums gap shares (an allocation-order artifact, not an observed per-attribute count). Same filter arguments as run_compliance_report: a System filter id, one of your attribute profiles, or omit both for all active profiles.",
    schema: {
      systemFilterId: z
        .string()
        .optional()
        .describe("A System filter id from list_system_filters, e.g. 'gs1-core'. Mutually exclusive with profileName. System filters carry no authored guidance."),
      profileName: z
        .string()
        .optional()
        .describe("One of your attribute profile names, e.g. 'Footwear'. Omit (and omit systemFilterId) for all active profiles."),
      minVendors: z
        .number()
        .optional()
        .describe("Minimum distinct vendors failing an attribute for it to be reported. Default 3."),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => diagnoseGapPattern(ctx, args),
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
      "Create a new attribute profile (requirement set) for a product category, mapped to one or more GS1 categories. The profile starts as Draft and is seeded with each mapped GS1 category's standard extended attributes — each brick keeps its own attribute set, with no merging across bricks. `categoryName` is the retailer's own label for the requirement, which can be anything — the name never implies the category, do not derive one from the other. `brickCodes` is the GS1 categories it covers. Call without brickCodes when the user has named a profile but not said what it covers: the call is refused with the list of categories still free, to put to the user. Every GS1 category belongs to at most one profile. Before calling, confirm the name and the GS1 category choice(s) with the user, and afterwards show them the created profile. There is no separate free-text category or product-type field to set — the requirement's coverage is carried entirely by its mapped GS1 categories.",
    schema: {
      categoryName: z.string().describe("The retailer's internal category name, e.g. 'Swimwear' — the retailer's own label, unconstrained"),
      brickCodes: z
        .array(z.string())
        .optional()
        .describe(
          "GS1 category codes to map (find via search_gs1_bricks). Omit if the user has not said which category — the refusal names the available ones to ask them about."
        ),
    },
    kind: "write",
    requiredScope: SCOPES.requirementsWrite,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { categoryName: string; brickCodes?: string[] }) => {
      // A name on its own is not half a request — it is the normal state after
      // "create a requirement called Troy". Refusing here means no confirmation
      // token is minted (see the `preview` contract above), so the agent has to
      // go back and ask which category rather than inventing one.
      if (!a.brickCodes?.length) {
        return {
          error:
            `"${a.categoryName}" is the retailer's own label for the profile and does not have to match a GS1 category ` +
            `name. What is missing is which GS1 category it covers, and that is the user's decision: ask them, offering ` +
            `the categories still free — ${describeAvailableCategories(getStore(ctx.tenantId).profiles)} ` +
            `They can answer with a category name or its code.`,
        }
      }
      const codes = a.brickCodes
      return {
        summary: `Create a new "${a.categoryName}" requirement profile mapped to ${codes.length} GS1 categor${codes.length === 1 ? "y" : "ies"}.`,
        effect: [
          `GS1 categories mapped: ${codes.join(", ")}. Each keeps its own attribute set — nothing is merged across them.`,
          "The profile is seeded with each category's standard GS1 extended attributes.",
          "It starts as a DRAFT, so nothing is assessed against it until it is activated.",
        ],
      }
    },
    handler: (ctx, { categoryName, brickCodes }: { categoryName: string; brickCodes?: string[] }) =>
      createAttributeProfile(ctx, categoryName, brickCodes ?? []),
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
    requiresConfirmation: true,
    preview: (
      ctx,
      a: { brickCode: string; attributeName: string; target: "core" | "extended"; guidance?: string }
    ) => {
      const missing = profileMissing(ctx, a.brickCode)
      if (missing) return missing
      return {
        summary: `Require "${a.attributeName}" as a ${a.target} attribute on ${profileLabel(ctx, a.brickCode)}.`,
        effect: [
          ...(a.guidance ? [`Supplier guidance: "${a.guidance}".`] : []),
          "Every supplier item in this category that lacks the attribute becomes an open gap, so reported compliance will fall until suppliers populate it.",
          "Run simulate_requirement_change first if the user wants to know how far it would fall before committing.",
        ],
      }
    },
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
    requiresConfirmation: true,
    preview: (
      ctx,
      a: {
        brickCode: string
        requirementName: string
        format: string
        background: string
        minDimensions: string
        maxFileSize: string
      }
    ) => {
      const missing = profileMissing(ctx, a.brickCode)
      if (missing) return missing
      const existing = assembleBrickAttributes(a.brickCode, ctx.tenantId).imageRequirements.some(
        (r) => r.requirementName.toLowerCase() === a.requirementName.toLowerCase().trim()
      )
      return {
        summary: `${existing ? "Replace" : "Add"} the "${a.requirementName}" image requirement on ${profileLabel(ctx, a.brickCode)}.`,
        effect: [
          `${a.format}, ${a.background.toLowerCase()}, minimum ${a.minDimensions}, up to ${a.maxFileSize}.`,
          existing
            ? "An image requirement with this name already exists here and will be overwritten."
            : "Suppliers in this category will be asked for this image.",
        ],
      }
    },
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
    requiresConfirmation: true,
    preview: (ctx, a: ExceptionArgs) => {
      const vendor = a.vendor?.trim() || "J.Renée"
      const waives = a.exceptionType === "Attribute Waiver"
      return {
        summary: `${a.id ? "Update" : "Grant"} a ${a.exceptionType} for ${vendor} on ${a.attributes.join(", ")}, valid until ${a.validUntil}.`,
        effect: [
          `Vendor: ${vendor}${a.vendor?.trim() ? "" : " (assumed — no vendor was named)"}`,
          `Scoped to GS1 category ${a.brickCode} only — it will not apply to other categories this vendor supplies.`,
          waives
            ? `This REDUCES ${vendor}'s reported gap count for this category. Compliance numbers will change.`
            : `This does not reduce the gap count — an ${a.exceptionType} changes which attribute is named as the gap, but the requirement stays open.`,
          ...(a.status === "Expired" ? ["Status will be set to Expired, so it stops applying immediately."] : []),
        ],
      }
    },
    handler: (ctx, args) => setVendorException(ctx, args),
  },

  // ── Edits ──────────────────────────────────────────────────────────────────
  {
    name: "update_attribute_requirement",
    description:
      "Change an existing attribute row's display label or supplier guidance on a profile. Works for both retailer-added custom rows and rows inherited from the GS1 standard (an inherited row is recorded as an override rather than mutated). Returns a preview and a confirmation token; call confirm_pending_change to apply it.",
    schema: {
      brickCode: z.string().describe("GS1 category code of the profile to modify"),
      gs1Name: z
        .string()
        .describe(
          "The attribute's name as returned by get_profile_detail, e.g. 'Heel Height'. A name that matches no attribute on this profile is refused."
        ),
      name: z.string().optional().describe("New display label for the attribute"),
      guidance: z.string().optional().describe("New guidance text shown to suppliers"),
    },
    kind: "write",
    requiredScope: SCOPES.requirementsWrite,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { brickCode: string; gs1Name: string; name?: string; guidance?: string }) => {
      const missing = profileMissing(ctx, a.brickCode)
      if (missing) return missing
      if (a.name === undefined && a.guidance === undefined) {
        return { error: "Nothing to change — provide a new name, new guidance, or both." }
      }
      const resolved = resolveGs1Name(a.brickCode, a.gs1Name, ctx.tenantId)
      if ("error" in resolved) return resolved
      return {
        summary: `Update "${resolved.gs1Name}" on ${profileLabel(ctx, a.brickCode)}.`,
        effect: [
          ...(a.name !== undefined ? [`Label becomes "${a.name}".`] : []),
          ...(a.guidance !== undefined ? [`Supplier guidance becomes "${a.guidance}".`] : []),
          "Suppliers see the new wording the next time they view this requirement. Gap counts are unaffected — this changes how the requirement reads, not whether it is met.",
        ],
      }
    },
    handler: (
      ctx,
      { brickCode, gs1Name, ...updates }: { brickCode: string; gs1Name: string; name?: string; guidance?: string }
    ) => updateAttributeRequirement(ctx, brickCode, gs1Name, updates),
  },
  {
    name: "activate_profile",
    description:
      "Activate a Draft attribute profile so its requirements start being enforced across the vendor base, or return an Active profile to Draft. Returns a preview and a confirmation token; call confirm_pending_change to apply it.",
    schema: {
      profileName: z.string().describe("Profile name, e.g. 'Swimwear'"),
      status: z
        .enum(["Active", "Draft"])
        .describe("'Active' to start enforcing this profile, 'Draft' to stop and return it to editing"),
    },
    kind: "write",
    requiredScope: SCOPES.requirementsWrite,
    // Authoring produces Drafts; this is the switch that starts measuring every
    // vendor item in the category against them. Separate authority, separate
    // grant — so a connection that can create requirements still cannot enforce
    // one without a human ticking this box (or activating in the portal).
    additionalScopes: [SCOPES.activate],
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { profileName: string; status: "Active" | "Draft" }) => {
      const profile = findProfile(ctx, a.profileName)
      if (!profile) return { error: unknownProfile(ctx, a.profileName) }
      if (profile.status === a.status) {
        return { error: `"${profile.name}" is already ${a.status}. Nothing to change.` }
      }
      return {
        summary: `Set the "${profile.name}" profile from ${profile.status} to ${a.status}.`,
        effect:
          a.status === "Active"
            ? [
                `Vendor items under "${profile.name}" start being assessed against this profile's requirements.`,
                "Expect reported gap counts to rise the first time a report runs — those gaps already existed, they were simply not being measured.",
              ]
            : [
                `Vendor items under "${profile.name}" stop being assessed against this profile.`,
                "Gaps against these requirements will no longer be reported. The requirements themselves are kept and can be re-activated.",
              ],
      }
    },
    handler: (ctx, { profileName, status }: { profileName: string; status: ProfileStatus }) =>
      setProfileStatus(ctx, profileName, status),
  },

  // ── Removals ───────────────────────────────────────────────────────────────
  // Every tool below additionally requires SCOPES.destructive. Consenting to
  // "author requirements" is not consent to delete them, and a connection that
  // was granted only the write scope does not see these in its tool list.
  {
    name: "remove_attribute_requirement",
    description:
      "Remove an attribute from a profile's requirements. A retailer-added custom row is deleted; a row inherited from the GS1 standard is recorded as an exclusion (standard rows are derived, not stored). Requires the destructive scope in addition to the requirements-write scope. Returns a preview and a confirmation token; call confirm_pending_change to apply it.",
    schema: {
      brickCode: z.string().describe("GS1 category code of the profile to modify"),
      gs1Name: z
        .string()
        .describe(
          "The attribute's name as returned by get_profile_detail, e.g. 'Closure'. A name that matches no attribute on this profile is refused."
        ),
    },
    kind: "write",
    destructive: true,
    requiredScope: SCOPES.requirementsWrite,
    additionalScopes: [SCOPES.destructive],
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { brickCode: string; gs1Name: string }) => {
      const missing = profileMissing(ctx, a.brickCode)
      if (missing) return missing
      const resolved = resolveGs1Name(a.brickCode, a.gs1Name, ctx.tenantId)
      if ("error" in resolved) return resolved
      return {
        summary: `Remove "${resolved.gs1Name}" from ${profileLabel(ctx, a.brickCode)}.`,
        effect: [
          "Suppliers will no longer be asked for this attribute in this category.",
          "Any currently open gaps against it disappear from reports — reported compliance will improve without any supplier supplying anything.",
          "This is the difference between fixing a number and lowering the bar. Confirm only if you mean to stop requiring it.",
        ],
      }
    },
    handler: (ctx, { brickCode, gs1Name }: { brickCode: string; gs1Name: string }) =>
      removeAttributeRequirement(ctx, brickCode, gs1Name),
  },
  {
    name: "remove_image_requirement",
    description:
      "Remove an image requirement from a profile by its requirement name. Requires the destructive scope in addition to the requirements-write scope. Returns a preview and a confirmation token; call confirm_pending_change to apply it.",
    schema: {
      brickCode: z.string().describe("GS1 category code of the profile to modify"),
      requirementName: z.string().describe("e.g. 'Hero Shot'"),
    },
    kind: "write",
    destructive: true,
    requiredScope: SCOPES.requirementsWrite,
    additionalScopes: [SCOPES.destructive],
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { brickCode: string; requirementName: string }) => {
      const missing = profileMissing(ctx, a.brickCode)
      if (missing) return missing
      const rows = assembleBrickAttributes(a.brickCode, ctx.tenantId).imageRequirements
      const match = rows.find((r) => r.requirementName.toLowerCase() === a.requirementName.toLowerCase().trim())
      if (!match) {
        const names = rows.map((r) => r.requirementName)
        return {
          error: `No image requirement named "${a.requirementName}" on ${profileLabel(ctx, a.brickCode)}. ${
            names.length ? `Image requirements here: ${names.join(", ")}.` : "This profile has no image requirements."
          }`,
        }
      }
      return {
        summary: `Remove the "${match.requirementName}" image requirement from ${profileLabel(ctx, a.brickCode)}.`,
        effect: [
          `Suppliers will no longer be asked for a ${match.format} image at ${match.minDimensions} on a ${match.background.toLowerCase()} background.`,
          match.source === "global"
            ? "This is a shared requirement used by other categories too — this only excludes it from this category; it stays in place everywhere else."
            : "Images already supplied are not deleted — only the requirement to supply them.",
        ],
      }
    },
    handler: (ctx, { brickCode, requirementName }: { brickCode: string; requirementName: string }) =>
      removeImageRequirement(ctx, brickCode, requirementName),
  },
  {
    name: "delete_attribute_profile",
    description:
      "Delete a whole requirement profile and every attribute and image rule beneath it. This is the widest-reaching action in the connector. Requires the destructive scope in addition to the requirements-write scope. Returns a preview and a confirmation token; call confirm_pending_change to apply it.",
    schema: {
      profileName: z.string().describe("Profile name, e.g. 'Swimwear'"),
    },
    kind: "write",
    destructive: true,
    requiredScope: SCOPES.requirementsWrite,
    additionalScopes: [SCOPES.destructive],
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { profileName: string }) => {
      const profile = findProfile(ctx, a.profileName)
      if (!profile) return { error: unknownProfile(ctx, a.profileName) }
      const bricks = profile.bricks?.length ? profile.bricks : [{ code: profile.brickCode, name: profile.brickName }]
      const images = bricks.reduce(
        (sum, b) => sum + readProfileExtras(b.code, ctx.tenantId).imageRequirements.length,
        0
      )
      return {
        summary: `Delete the "${profile.name}" profile (${bricks.map((b) => b.name).join(", ")}) and everything under it.`,
        effect: [
          bricks.length === 1
            ? `1 GS1 category loses its requirements: ${bricks[0].name}.`
            : `${bricks.length} GS1 categories lose their requirements: ${bricks.map((b) => b.name).join(", ")}.`,
          `Everything the profile carries goes with it — ${profile.attributes}${images ? `, including ${images} stored image rule${images === 1 ? "" : "s"}` : ""}.`,
          profile.status === "Active"
            ? "This profile is ACTIVE — vendor items in these categories stop being assessed the moment this applies."
            : "This profile is a Draft, so nothing is currently being assessed against it.",
          "There is no undo in this prototype. The profile would have to be recreated from scratch.",
        ],
      }
    },
    handler: (ctx, { profileName }: { profileName: string }) => deleteAttributeProfile(ctx, profileName),
  },
  {
    name: "revoke_vendor_exception",
    description:
      "Revoke a vendor exception — either expiring it (keeping the row with status Expired, the audit-friendly default) or deleting the record outright. Requires the destructive scope in addition to the exceptions-write scope. Returns a preview and a confirmation token; call confirm_pending_change to apply it.",
    schema: {
      id: z.string().describe("Exception id from list_vendor_exceptions"),
      mode: z
        .enum(["expire", "delete"])
        .optional()
        .describe(
          "'expire' (default) keeps the row visible with status Expired; 'delete' removes the record entirely"
        ),
    },
    kind: "write",
    destructive: true,
    requiredScope: SCOPES.exceptionsWrite,
    additionalScopes: [SCOPES.destructive],
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: false,
    requiresConfirmation: true,
    preview: (ctx, a: { id: string; mode?: "expire" | "delete" }) => {
      const row = getStore(ctx.tenantId).vendorExceptions.find((e) => e.id === a.id)
      if (!row) {
        return { error: `No vendor exception with id "${a.id}". Use list_vendor_exceptions to find the right id.` }
      }
      const mode = a.mode ?? "expire"
      const wasWaiver = row.exceptionType === "Attribute Waiver" && row.status === "Active"
      return {
        summary: `${mode === "delete" ? "Delete" : "Expire"} the ${row.exceptionType} granted to ${row.vendor} on ${row.attributes.join(", ")}.`,
        effect: [
          `Vendor: ${row.vendor}, category ${row.brickCode}, currently ${row.status}.`,
          wasWaiver
            ? `${row.vendor}'s reported gap count for this category will RISE — the waived attributes become outstanding again.`
            : "Gap counts do not change; this exception was not reducing them.",
          mode === "delete"
            ? "The record is removed entirely, so there is no trace that the exception was ever granted."
            : "The row stays visible with status Expired, preserving the record of what applied and when.",
        ],
      }
    },
    handler: (ctx, { id, mode }: { id: string; mode?: "expire" | "delete" }) =>
      revokeVendorException(ctx, id, mode ?? "expire"),
  },

  // ── Confirmation ───────────────────────────────────────────────────────────
  {
    name: "confirm_pending_change",
    description:
      "Apply a change that was previously proposed. Every mutating tool returns a preview and a confirmation_token instead of acting; pass that token here to execute it. ALWAYS show the user the preview's summary and effects and get their explicit approval before calling this — that approval is the entire purpose of the two-phase flow. Tokens are single-use and expire after 10 minutes.",
    schema: {
      confirmation_token: z.string().describe("The confirmation_token returned by the proposing tool"),
    },
    kind: "write",
    // Deliberately the read scope: this tool's own authority is nil. The scopes
    // and tenant class of the *target* tool are re-checked inside the handler,
    // so a read-only connection holding a token still cannot execute anything.
    requiredScope: SCOPES.read,
    allowedTenantClasses: BOTH_CLASSES,
    // An agent may propose; only a person approves.
    allowWorkload: false,
    handler: (ctx, { confirmation_token }: { confirmation_token: string }) => {
      const found = takePendingChange(ctx, confirmation_token)
      if (!found.ok) return { error: found.error }

      const def = getToolDefinition(found.pending.tool)
      if (!def) {
        return { error: `The pending change referenced an unknown tool "${found.pending.tool}".` }
      }

      // The token is not a credential. Authority is re-derived from the
      // confirming caller's own context, exactly as it would be on a direct
      // call — a token minted while a scope was held is worthless once it
      // isn't.
      const outcome = runGuarded(ctx, guardSpecFor(def), () => def.handler(ctx, found.pending.args))
      if (!outcome.ok) return outcome.error

      return {
        confirmed: found.pending.summary,
        tool: found.pending.tool,
        result: outcome.result,
      }
    },
  },
  {
    name: "list_pending_changes",
    description:
      "List changes proposed in this organisation that are still awaiting confirmation, with what each would do and when it expires. Use this if the user loses track of a proposal.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: BOTH_CLASSES,
    allowWorkload: true,
    handler: (ctx) => {
      const pending = listPendingChanges(ctx)
      if (pending.length === 0) {
        return { pending: [], note: "Nothing is awaiting confirmation. Proposals expire 10 minutes after they are made." }
      }
      return {
        pending: pending.map((p) => ({
          confirmation_token: p.token,
          tool: p.tool,
          summary: p.summary,
          effect: p.effect,
          expiresInSeconds: Math.max(0, Math.round((p.expiresAt - Date.now()) / 1000)),
        })),
      }
    },
  },
  {
    name: "discard_pending_change",
    description: "Discard a proposed change without applying it, so its token can no longer be confirmed.",
    schema: {
      confirmation_token: z.string().describe("The confirmation_token to discard"),
    },
    kind: "write",
    requiredScope: SCOPES.read,
    allowedTenantClasses: BOTH_CLASSES,
    allowWorkload: true,
    handler: (ctx, { confirmation_token }: { confirmation_token: string }) =>
      discardPendingChange(ctx, confirmation_token)
        ? { discarded: confirmation_token, note: "The proposal was discarded. Nothing was changed." }
        : { error: `No pending change with token "${confirmation_token}" — it may have already been confirmed, discarded, or expired.` },
  },

  // ── Analysis ───────────────────────────────────────────────────────────────
  {
    name: "simulate_requirement_change",
    description:
      "Answer 'what would this do to my vendor base?' WITHOUT changing anything. Adds or removes an attribute on a profile hypothetically and re-runs the real compliance engine, returning the change in total gaps, overall compliance %, how many vendors would newly fall out of compliance, and the per-vendor impact. Use this BEFORE proposing an authoring change whenever the user is weighing whether to require something.",
    schema: {
      profileName: z.string().describe("Profile name, e.g. 'Apparel'"),
      attributeName: z.string().describe("Attribute to add or remove hypothetically, e.g. 'Sustainable Materials Y/N'"),
      action: z
        .enum(["add", "remove"])
        .optional()
        .describe("'add' (default) to model requiring it, 'remove' to model dropping it"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => simulateRequirementChange(ctx, args),
  },
  {
    name: "draft_vendor_outreach",
    description:
      "Draft a remediation message to one supplier, built from their actual open gaps ranked worst-first, with attributes already covered by an Active exception excluded. Returns a subject and body for a human to review and send — nothing is sent and no outreach record is stored.",
    schema: {
      supplier: z.string().describe("Supplier name, e.g. 'Levi Strauss & Co.'"),
      tone: z
        .enum(["direct", "collaborative"])
        .optional()
        .describe("'collaborative' (default) offers to discuss exceptions; 'direct' states the requirement"),
      deadline: z.string().optional().describe("Free-text deadline, e.g. 'March 31'"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: RETAILER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => draftVendorOutreach(ctx, args),
  },
  {
    name: "query_access_log",
    description:
      "Search this organisation's AI access log — every tool call an assistant made, allowed or refused, with who acted, which assistant, which tool, and which scope it required. Administrators only, and scoped to this organisation's own activity. Use it to answer 'what has our AI been doing?'.",
    schema: {
      outcome: z.enum(["allowed", "denied", "error"]).optional().describe("Filter by outcome"),
      tool: z.string().optional().describe("Filter to tool names containing this text"),
      limit: z.number().int().min(1).max(100).optional().describe("Maximum entries to return (default 25)"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: BOTH_CLASSES,
    // A workload has no role, and the audit trail is an administrative
    // artifact — there is no person whose administrative standing it could
    // borrow.
    allowWorkload: false,
    handler: (ctx, args) => queryAccessLog(ctx, args),
  },

  // ── Supplier-side reads ────────────────────────────────────────────────────
  // The mirror of the retailer inventory above. These became safe to expose
  // only once tenant-class isolation was enforced per call (§4B gated them on
  // exactly that); a retailer tenant can never see or call them.
  {
    name: "get_my_compliance_status",
    description:
      "Get this supplier's own compliance position: catalogue size, GS1 baseline completion, and completion for each retail partner separately with their open gap counts. Use this first when a supplier asks 'how am I doing?' — compliance is always per retail partner, never one global score.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: SUPPLIER_ONLY,
    allowWorkload: true,
    handler: (ctx) => getMyComplianceStatus(ctx),
  },
  {
    name: "list_my_retail_partners",
    description:
      "List the retail partners this supplier trades with — selection codes, open gaps, products complete, completion percentage, and how many retailer-specific attributes each requires on top of the GS1 standard set. Use this to answer 'who do I sell to?' or 'why am I compliant for one retailer but not another?'.",
    schema: {},
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: SUPPLIER_ONLY,
    allowWorkload: true,
    handler: (ctx) => listMyRetailPartners(ctx),
  },
  {
    name: "get_my_open_gaps",
    description:
      "Get what is still outstanding for this supplier against one target: the GS1 baseline, or one named retail partner. Returns the most commonly missing attributes across the catalogue, per-product detail, and — separately — the attributes that retailer has WAIVED, which are not gaps. Optionally scope to one GS1 category.",
    schema: {
      target: z
        .string()
        .optional()
        .describe(
          "'gs1' for the industry baseline (the default), or a retail partner name such as 'Dillard's'"
        ),
      brickCode: z.string().optional().describe("Scope to one GS1 category code, e.g. 10001077"),
      maxProducts: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum products to list individually (default 20). Aggregate counts cover everything."),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: SUPPLIER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => getMyOpenGaps(ctx, args),
  },
  {
    name: "run_my_compliance_report",
    description:
      "Run a compliance report across your OWN catalogue — the 'am I ready for this retailer before they pull my data?' scan. Scan against either a global System scorecard (systemFilterId, from list_system_filters) or one retail partner's account filter (retailer). Returns overall completion %, ranked missing attributes and per-category breakdown, computed against the catalogue as it stands right now — nothing is retained, so re-running later will give different figures as products are enriched. WHICH FILTER TO PICK: a retail partner answers 'am I ready for them', and is usually what the supplier means. Of the scorecards, 'gs1-extended' is the one that surfaces outstanding attributes; 'gs1-core' and 'nrf-retail-ready' cover core fields that are always populated in this demo catalogue, so they score 100% and are not evidence of overall readiness. NOTE: a System scorecard is a different measure from get_my_open_gaps' 'gs1' baseline target and the two will not agree — always say which one a figure came from.",
    schema: {
      systemFilterId: z
        .string()
        .optional()
        .describe(
          "A System scorecard id, e.g. 'gs1-core', 'gs1-extended', 'nrf-retail-ready'. Mutually exclusive with retailer. Defaults to 'gs1-core'."
        ),
      retailer: z
        .string()
        .optional()
        .describe("Scan against one retail partner's account filter, e.g. 'Belk'. Mutually exclusive with systemFilterId."),
      maxAttributes: z
        .number()
        .int()
        .min(1)
        .max(999)
        .optional()
        .describe("Maximum attributes in the ranked missing list (999 = all). Default 10."),
      ignoreDiscontinued: z
        .boolean()
        .optional()
        .describe("Exclude discontinued products from the scan. Default true."),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: SUPPLIER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => runMyComplianceReport(ctx, args),
  },
  {
    name: "list_my_exceptions",
    description:
      "List the exceptions retailers have granted to this supplier — waivers, extended deadlines, and reduced-scope exclusions — each labelled with the retailer that granted it and what it actually changes. A supplier can see the exceptions that name them, but nothing else the granting retailer holds, and cannot create or amend one.",
    schema: {
      status: z.enum(["Active", "Expired"]).optional().describe("Filter by exception status"),
    },
    kind: "read",
    requiredScope: SCOPES.read,
    allowedTenantClasses: SUPPLIER_ONLY,
    allowWorkload: true,
    handler: (ctx, args) => listMyExceptions(ctx, args),
  },
]

/**
 * Tools this caller's granted scopes permit them to see and call.
 *
 * Every declared scope must be held, not just the primary one — otherwise a
 * connection granted requirements-write but not destructive would be shown the
 * delete tools and only discover the refusal after proposing a deletion.
 */
export function toolsForScopes(scopes: Set<Scope>): ToolDefinition[] {
  return TOOL_MANIFEST.filter(
    (t) => scopes.has(t.requiredScope) && (t.additionalScopes ?? []).every((s) => scopes.has(s))
  )
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_MANIFEST.find((t) => t.name === name)
}

/** The guard spec for one tool — derived from the manifest, never hand-written. */
export function guardSpecFor(tool: ToolDefinition): ToolGuardSpec {
  return {
    name: tool.name,
    requiredScope: tool.requiredScope,
    additionalScopes: tool.additionalScopes,
    allowedTenantClasses: tool.allowedTenantClasses,
    allowWorkload: tool.allowWorkload,
  }
}

/**
 * MCP tool annotations, so a client can warn a user before a call rather than
 * after. These are hints for the client's UX — the enforcement is still
 * runGuarded plus the confirmation step, and a client that ignores them gains
 * nothing.
 */
export function annotationsFor(tool: ToolDefinition) {
  return {
    readOnlyHint: tool.kind === "read",
    destructiveHint: tool.destructive === true,
    idempotentHint: tool.kind === "read",
    openWorldHint: false,
  }
}

/**
 * Invoke one tool, interposing the confirmation step.
 *
 * A mutating tool's first call never reaches its handler: it previews and mints
 * a token, and confirm_pending_change is the only path to the handler. Putting
 * this here rather than in each handler means a newly added write tool is
 * two-phase by declaring `requiresConfirmation`, and cannot quietly opt out by
 * forgetting to call something.
 */
export function invokeTool(ctx: CallerContext, tool: ToolDefinition, args: unknown): unknown {
  if (!tool.requiresConfirmation) return tool.handler(ctx, args)

  const preview = tool.preview
    ? tool.preview(ctx, args)
    : { summary: `Run ${tool.name}.`, effect: ["This change has no preview declared."] }

  if ("error" in preview) return { error: preview.error }

  const pending = createPendingChange(ctx, tool.name, args, preview.summary, preview.effect)
  return {
    status: "confirmation_required",
    summary: preview.summary,
    effect: preview.effect,
    destructive: tool.destructive === true,
    confirmation_token: pending.token,
    expiresInSeconds: Math.round((pending.expiresAt - Date.now()) / 1000),
    next_step:
      "Nothing has changed yet. Show the summary and effects above to the user, get their explicit approval, then call confirm_pending_change with this confirmation_token. If they decline, call discard_pending_change instead.",
  }
}
