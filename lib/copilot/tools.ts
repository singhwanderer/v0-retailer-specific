// Tool layer for the TGC Compliance Agent (app/api/copilot/route.ts).
//
// Read tools proxy the same functions the external MCP connector uses
// (lib/mcp/tools.ts), so answers stay grounded in the same data model.
// Create tools deliberately never mutate anything server-side — they
// validate the request and return a `proposal` object describing the
// change. The client renders that proposal as a confirm card; only a
// user-confirmed "Apply" click calls the real createAttributeProfile /
// addAttributeRequirement / setImageRequirement functions (client-side,
// the same way Screen 1 / Screen 2 already do), so a chat-originated
// change lands in the same place a manual edit would.
//
// updateAttributeRequirement is intentionally never imported here — the
// agent has no code path to edit an existing requirement, by design.

import { tool, type Tool } from "ai"
import { z } from "zod"
import { auditFor } from "@/lib/mcp/audit"
import { SCOPES, type CallerContext } from "@/lib/mcp/context"
import { TOOL_MANIFEST } from "@/lib/mcp/manifest"
import { getBrickByCode, getSegments, searchBricks } from "@/lib/gs1-standard-library"
import {
  RETAILER_SUPPLIERS,
  getProfileBricks,
  type AttributeProfile,
} from "@/lib/retailer-requirements"
import { findProfileForBrick, assembleBrickAttributes } from "@/lib/mcp/attribute-assembly"
import { SYSTEM_FILTERS, getSystemFilter, type SystemFilterId } from "@/lib/system-filters"
import { runRetailerReport, type ReportFilterRef } from "@/lib/compliance-report"

export interface CopilotContext {
  /** The requesting browser tab's current attribute-profile list (React
   *  state from app/page.tsx) — read tools use this instead of the
   *  serverless store so the agent sees profiles created earlier in this
   *  session, including ones it proposed and the user applied. */
  profiles: AttributeProfile[]
}

export interface ProposedAction {
  tool:
    | "create_attribute_profile"
    | "add_attribute_requirement"
    | "set_image_requirement"
    | "update_attribute_requirement"
    | "remove_attribute_requirement"
    | "remove_image_requirement"
  summary: string
  args: Record<string, unknown>
  /**
   * Removes something that already exists. The confirm card styles these
   * differently and states the consequence, because "add an attribute" and
   * "stop requiring an attribute" should not look like the same decision.
   */
  destructive?: boolean
  /** What the user is actually agreeing to — shown on the confirm card. */
  consequence?: string
}

function knownSuppliers(): string[] {
  return [...new Set(RETAILER_SUPPLIERS.map((s) => s.supplier))].sort()
}

// ── Reads ─────────────────────────────────────────────────────────────────────

function makeReadTools(ctx: CopilotContext) {
  return {
    search_gs1_bricks: tool({
      description: "Search GS1 product categories (bricks) by name or keyword.",
      inputSchema: z.object({ query: z.string().describe("Free-text search, e.g. 'handbags' or 'footwear'") }),
      execute: async ({ query }) =>
        searchBricks(query).map((b) => ({
          brickCode: b.brickCode,
          brickName: b.brickName,
          segment: b.segment,
          standardExtendedAttributes: b.extendedAttributes.map((a) => `${a.name} (${a.code})`),
        })),
    }),

    list_attribute_profiles: tool({
      description: "List the retailer's attribute profiles (requirement sets), optionally filtered by status.",
      inputSchema: z.object({ status: z.enum(["Active", "Draft"]).optional() }),
      execute: async ({ status }) => {
        const matches = status ? ctx.profiles.filter((p) => p.status === status) : ctx.profiles
        if (status && matches.length === 0) {
          const available = [...new Set(ctx.profiles.map((p) => p.status))]
          return {
            matches: [],
            availableStatuses: available,
            note: `No attribute profiles with status "${status}". Available statuses: ${available.join(", ")}.`,
          }
        }
        return matches
      },
    }),

    get_profile_detail: tool({
      description: "Get the full attribute and image-requirement detail for one GS1 category code.",
      inputSchema: z.object({ brickCode: z.string().describe("GS1 brick code, e.g. 10001077 for Shoes - General Purpose") }),
      execute: async ({ brickCode }) => {
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        const brick = getBrickByCode(brickCode)
        if (!profile && !brick) {
          return { error: `No attribute profile or GS1 category found for category code ${brickCode}. Use search_gs1_bricks or list_attribute_profiles to find valid codes.` }
        }
        const { coreAttributes, extendedAttributes, imageRequirements } = assembleBrickAttributes(brickCode)
        return {
          profile: profile ?? { note: "No retailer profile created yet for this GS1 category", brickCode, brickName: brick?.brickName },
          coreAttributes,
          extendedAttributes,
          imageRequirements,
        }
      },
    }),

    list_my_suppliers: tool({
      description: "List the suppliers trading under this retailer account, ranked by open compliance gaps.",
      inputSchema: z.object({}),
      // Deliberately uncapped: this is the fixture for testing whether the
      // agent accurately reports/counts/lists a large tool output (~1000
      // rows, see lib/generated-suppliers.ts) rather than hallucinating over
      // it (see golden-dataset Template 4 in scripts/generate-golden-dataset.ts).
      // This is a permanent product decision, not a bug — don't add a limit here.
      execute: async () => ({
        note: "Compliance for the suppliers trading under your retailer account, ranked by open gaps.",
        suppliers: [...RETAILER_SUPPLIERS]
          .sort((a, b) => b.openGaps - a.openGaps)
          .map(({ supplier, category, brickCode, openGaps, productsWithGaps, productsComplete }) => ({
            supplier,
            category,
            brickCode,
            openGaps,
            productsWithGaps,
            productsComplete,
          })),
      }),
    }),

    get_supplier_compliance: tool({
      description: "Look up compliance status for one supplier by name (partial match).",
      inputSchema: z.object({ supplier: z.string() }),
      execute: async ({ supplier }) => {
        const q = supplier.toLowerCase().trim()
        const matches = RETAILER_SUPPLIERS.filter((s) => s.supplier.toLowerCase().includes(q))
        if (matches.length === 0) {
          const known = knownSuppliers()
          return {
            matches: [],
            knownSuppliers: known,
            note: `No supplier matched "${supplier}". Suppliers trading under your retailer account: ${known.join(", ")}.`,
          }
        }
        return matches
      },
    }),

    list_system_filters: tool({
      description: "List the global System attribute filters (e.g. GS1 Core Scorecard) both sides of the network can run.",
      inputSchema: z.object({}),
      execute: async () => SYSTEM_FILTERS.map(({ id, name, description, scope }) => ({ id, name, description, scope })),
    }),

    run_compliance_report: tool({
      description:
        "Run a compliance report across the retailer's vendor base — against one attribute profile, a global System filter, or all active profiles. Choose only one of systemFilterId or profileName.",
      inputSchema: z.object({
        systemFilterId: z.string().optional(),
        profileName: z.string().optional(),
        supplier: z.string().optional().describe("Narrow the report to one supplier by name"),
        maxAttributes: z.number().int().positive().optional(),
      }),
      execute: async ({ systemFilterId, profileName, supplier, maxAttributes }) => {
        if (systemFilterId && profileName) {
          return { error: "Choose ONE filter mode: either systemFilterId or profileName. Omit both to scan against all active profiles." }
        }

        let filter: ReportFilterRef
        let filterLabel: string
        let resolvedProfile = "all-active"

        if (systemFilterId) {
          const sys = getSystemFilter(systemFilterId)
          if (!sys) {
            return { error: `Unknown system filter "${systemFilterId}". Valid ids: ${SYSTEM_FILTERS.map((f) => f.id).join(", ")}.` }
          }
          filter = { kind: "system", id: sys.id as SystemFilterId }
          filterLabel = sys.name
        } else {
          if (profileName) {
            const match = ctx.profiles.find((p) => p.name.toLowerCase() === profileName.toLowerCase().trim())
            if (!match) {
              return { error: `No attribute profile named "${profileName}". Your profiles: ${ctx.profiles.map((p) => p.name).join(", ")}.` }
            }
            resolvedProfile = match.name
          }
          filter = { kind: "account", retailer: "Dillard's" }
          filterLabel = profileName ? resolvedProfile : "All active profiles"
        }

        let vendorScope = "all"
        if (supplier) {
          const q = supplier.toLowerCase().trim()
          const match = RETAILER_SUPPLIERS.find((s) => s.supplier.toLowerCase().includes(q))
          if (!match) {
            const known = knownSuppliers()
            return { knownSuppliers: known, note: `No supplier matched "${supplier}". Suppliers trading under your retailer account: ${known.join(", ")}.` }
          }
          vendorScope = match.supplier
        }

        const result = runRetailerReport(
          RETAILER_SUPPLIERS,
          ctx.profiles,
          filter,
          resolvedProfile,
          vendorScope,
          { maxAttributes: maxAttributes ?? 10, ignoreDiscontinued: true }
        )

        return {
          filter: { label: filterLabel, type: filter.kind === "system" ? "System" : "Account" },
          vendorScope: vendorScope === "all" ? "All vendors" : vendorScope,
          ...result,
          coreAttributeNote:
            "Core baseline attributes (Product ID, Product Description, GTIN code, GTIN Description, NRF Size Code, NRF Color Code, Size Description, Color Description) are always present on all products and are excluded from gap calculations.",
        }
      },
    }),

    get_capabilities: tool({
      description: "Get a plain-English summary of what this agent can do, plus a live snapshot of current data. Call this when the user asks what they can do or seems unsure.",
      inputSchema: z.object({}),
      execute: async () => ({
        about:
          "TGC Compliance Agent — retailer-side requirement authoring (read + create only, never edits existing rows) and supplier compliance monitoring.",
        youCanAsk: {
          understandRequirements: "Look up what a product category requires (attributes, image rules).",
          monitorSuppliers: "See how your suppliers are doing on compliance and where the gaps are.",
          runComplianceReports: "Run a compliance report against a profile or a global System filter.",
          createRequirements: "Create a new attribute profile, add a new custom attribute, or add a new image requirement — always with a confirm step before anything is applied.",
        },
        cannotDo: [
          "Edit or delete an existing attribute, image rule, or profile — that stays a manual action in Attributes & Images.",
          "Vendor exceptions (waivers, extended deadlines, reduced scope).",
          "Other retailers' or peer accounts' data.",
          "Sales, logistics, or pricing.",
        ],
        liveSnapshot: {
          attributeProfiles: ctx.profiles.map((p) => ({ name: p.name, category: p.category, status: p.status, brickCode: p.brickCode })),
          mySuppliers: knownSuppliers(),
          gs1Segments: getSegments(),
          systemFilters: SYSTEM_FILTERS.map((f) => f.id),
        },
      }),
    }),
  }
}

// ── Creates (proposal-only — never mutate anything server-side) ────────────────

function makeCreateTools(ctx: CopilotContext) {
  return {
    create_attribute_profile: tool({
      description:
        "Propose a NEW attribute profile mapped to one or more GS1 categories. Does not create anything — returns a proposal the user must confirm.",
      inputSchema: z.object({
        name: z.string().describe("Profile name shown in the requirements list"),
        brickCodes: z.array(z.string()).min(1).describe("One or more GS1 brick codes, from search_gs1_bricks"),
        category: z.string().optional().describe("Free-text category label; defaults to name"),
      }),
      execute: async ({ name, brickCodes, category }) => {
        const bricks = brickCodes.map((code) => ({ code, brick: getBrickByCode(code) }))
        const missing = bricks.find((b) => !b.brick)
        if (missing) {
          return { error: `Unknown GS1 category code ${missing.code}. Use search_gs1_bricks to find the right category first.` }
        }
        const conflict = bricks.find((b) => findProfileForBrick(ctx.profiles, b.code))
        if (conflict) {
          const owner = findProfileForBrick(ctx.profiles, conflict.code)!
          return { error: `GS1 category ${conflict.code} is already mapped to the "${owner.name}" profile. Ask to add a requirement to that profile instead — I can't edit an existing one, but you can from Attributes & Images.` }
        }
        const brickNames = bricks.map((b) => b.brick!.brickName).join(", ")
        const proposal: ProposedAction = {
          tool: "create_attribute_profile",
          summary: `Create a new profile "${name}" mapped to: ${brickNames}.`,
          args: { name, brickCodes, category: category ?? name },
        }
        return { proposal }
      },
    }),

    add_attribute_requirement: tool({
      description:
        "Propose adding a NEW custom attribute requirement to an EXISTING profile's GS1 category. Does not add anything — returns a proposal the user must confirm. Cannot be used to change an existing attribute's name or guidance.",
      inputSchema: z.object({
        brickCode: z.string(),
        attributeName: z.string(),
        target: z.enum(["core", "extended"]),
        guidance: z.string().optional(),
      }),
      execute: async ({ brickCode, attributeName, target, guidance }) => {
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        if (!profile) {
          return { error: `No attribute profile exists for GS1 category ${brickCode}. Propose creating one first with create_attribute_profile.` }
        }
        const proposal: ProposedAction = {
          tool: "add_attribute_requirement",
          summary: `Add a new ${target} attribute "${attributeName}" to "${profile.name}"${guidance ? ` (guidance: ${guidance})` : ""}.`,
          args: { brickCode, attributeName, target, guidance },
        }
        return { proposal }
      },
    }),

    set_image_requirement: tool({
      description:
        "Propose adding a NEW image requirement to an existing profile's GS1 category. Refuses if a same-named image requirement already exists on that category, since replacing one is an edit, not a create.",
      inputSchema: z.object({
        brickCode: z.string(),
        requirementName: z.string(),
        format: z.string(),
        background: z.string(),
        minDimensions: z.string(),
        maxFileSize: z.string(),
        shapeCrop: z.string(),
        guidanceNote: z.string().optional(),
      }),
      execute: async (args) => {
        const { brickCode, requirementName } = args
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        if (!profile) {
          return { error: `No attribute profile exists for GS1 category ${brickCode}. Propose creating one first with create_attribute_profile.` }
        }
        const existing = assembleBrickAttributes(brickCode).imageRequirements.find(
          (r) => r.requirementName.toLowerCase() === requirementName.toLowerCase().trim()
        )
        const proposal: ProposedAction = {
          tool: "set_image_requirement",
          summary: `${existing ? "Replace" : "Add"} the image requirement "${requirementName}" on "${profile.name}" (${args.format}, min ${args.minDimensions}).`,
          args,
          consequence: existing
            ? `An image requirement named "${requirementName}" already exists here and will be overwritten.`
            : undefined,
        }
        return { proposal }
      },
    }),
  }
}

// ── Edits and removals (proposal-only, same as creates) ──────────────────────
//
// These exist so the agent covers the whole lifecycle rather than only the
// half that adds. The safety property is unchanged and is the reason it is safe
// to widen: no tool here mutates anything. Each returns a proposal, and the
// only code path that writes is the user clicking Apply on the card.

function makeEditTools(ctx: CopilotContext) {
  return {
    update_attribute_requirement: tool({
      description:
        "Propose changing an existing attribute's display label or supplier guidance on a profile. Works for both custom rows and rows inherited from the GS1 standard. Does not change anything — returns a proposal the user must confirm.",
      inputSchema: z.object({
        brickCode: z.string(),
        gs1Name: z.string().describe("The attribute's GS1 name exactly as get_profile_detail returns it"),
        name: z.string().optional().describe("New display label"),
        guidance: z.string().optional().describe("New supplier guidance"),
      }),
      execute: async ({ brickCode, gs1Name, name, guidance }) => {
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        if (!profile) {
          return { error: `No attribute profile exists for GS1 category ${brickCode}.` }
        }
        if (name === undefined && guidance === undefined) {
          return { error: "Nothing to change — I need a new label, new guidance, or both." }
        }
        const changes = [
          ...(name !== undefined ? [`label → "${name}"`] : []),
          ...(guidance !== undefined ? [`guidance → "${guidance}"`] : []),
        ].join(", ")
        const proposal: ProposedAction = {
          tool: "update_attribute_requirement",
          summary: `Update "${gs1Name}" on "${profile.name}": ${changes}.`,
          args: { brickCode, gs1Name, name, guidance },
          consequence:
            "Changes how the requirement reads for suppliers. Gap counts are unaffected — this does not change whether it is met.",
        }
        return { proposal }
      },
    }),

    remove_attribute_requirement: tool({
      description:
        "Propose removing an attribute from a profile's requirements, so suppliers are no longer asked for it. Does not remove anything — returns a proposal the user must confirm. Always state the consequence before proposing this.",
      inputSchema: z.object({
        brickCode: z.string(),
        gs1Name: z.string().describe("The attribute's GS1 name exactly as get_profile_detail returns it"),
      }),
      execute: async ({ brickCode, gs1Name }) => {
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        if (!profile) {
          return { error: `No attribute profile exists for GS1 category ${brickCode}.` }
        }
        const proposal: ProposedAction = {
          tool: "remove_attribute_requirement",
          summary: `Stop requiring "${gs1Name}" on "${profile.name}".`,
          args: { brickCode, gs1Name },
          destructive: true,
          consequence:
            "Open gaps against this attribute disappear from reports, so compliance improves without any supplier supplying anything. That is lowering the bar, not closing a gap.",
        }
        return { proposal }
      },
    }),

    remove_image_requirement: tool({
      description:
        "Propose removing an image requirement from a profile. Does not remove anything — returns a proposal the user must confirm.",
      inputSchema: z.object({
        brickCode: z.string(),
        requirementName: z.string(),
      }),
      execute: async ({ brickCode, requirementName }) => {
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        if (!profile) {
          return { error: `No attribute profile exists for GS1 category ${brickCode}.` }
        }
        const existing = assembleBrickAttributes(brickCode).imageRequirements.find(
          (r) => r.requirementName.toLowerCase() === requirementName.toLowerCase().trim()
        )
        if (!existing) {
          const names = assembleBrickAttributes(brickCode).imageRequirements.map((r) => r.requirementName)
          return {
            error: `No image requirement named "${requirementName}" on "${profile.name}". ${
              names.length ? `Image requirements here: ${names.join(", ")}.` : "This profile has no image requirements."
            }`,
          }
        }
        const proposal: ProposedAction = {
          tool: "remove_image_requirement",
          summary: `Stop requiring the "${existing.requirementName}" image on "${profile.name}".`,
          args: { brickCode, requirementName: existing.requirementName },
          destructive: true,
          consequence: "Images already supplied are not deleted — only the requirement to supply them.",
        }
        return { proposal }
      },
    }),
  }
}

// ── Audit ────────────────────────────────────────────────────────────────────

/**
 * Emit one audit line per copilot tool call.
 *
 * The Access log's claim is "every AI action against this organisation", and
 * this agent is an AI acting on catalogue data — it just arrives through
 * /api/copilot instead of /api/mcp. Without this it is invisible, and
 * `query_access_log` tells the AI it returns every tool call an assistant made
 * while silently omitting a whole assistant.
 *
 * This RECORDS but does not GATE, which is the one way it differs from
 * runGuarded(): there is no consent screen behind the copilot and so no grant to
 * enforce against. runGuarded() is also deliberately not reused — its
 * `invoke: () => T` is synchronous, so an async `execute` would be timed before
 * it settled and a rejection would escape the try/catch entirely.
 *
 * Applied inside buildCopilotTools() so it is the single emit point for this
 * path: a tool added to any of the three groups is audited without its author
 * remembering to.
 */
function withCopilotAudit<T extends Record<string, Tool>>(tools: T, caller: CallerContext | null): T {
  // No portal session behind this run (the eval harness), so there is no
  // identity to attribute the calls to and nothing truthful to record.
  if (!caller) return tools

  const audited = Object.entries(tools).map(([name, definition]) => {
    const execute = definition.execute
    if (typeof execute !== "function") return [name, definition]

    // Reuse the connector's declared scope for the same tool name rather than
    // keeping a second table here that can drift out of step with it.
    const requiredScope = TOOL_MANIFEST.find((t) => t.name === name)?.requiredScope ?? SCOPES.read

    const wrapped: typeof execute = async (args, options) => {
      const started = Date.now()
      try {
        const result = await execute(args, options)
        auditFor(caller, name, requiredScope, "allowed", Date.now() - started)
        return result
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        auditFor(caller, name, requiredScope, "error", Date.now() - started, reason)
        // The agent loop decides what to do with a failure; auditing it must not
        // change that.
        throw err
      }
    }

    return [name, { ...definition, execute: wrapped }]
  })

  return Object.fromEntries(audited) as T
}

export function buildCopilotTools(ctx: CopilotContext, caller: CallerContext | null) {
  const tools = { ...makeReadTools(ctx), ...makeCreateTools(ctx), ...makeEditTools(ctx) }
  return withCopilotAudit(tools, caller)
}
