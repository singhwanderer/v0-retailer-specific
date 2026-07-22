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

import { tool } from "ai"
import { z } from "zod"
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
  tool: "create_attribute_profile" | "add_attribute_requirement" | "set_image_requirement"
  summary: string
  args: Record<string, unknown>
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
      inputSchema: z.object({ brickCode: z.string().describe("GS1 brick code, e.g. 10005811") }),
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
        if (existing) {
          return { error: `"${requirementName}" is already an image requirement on "${profile.name}". I can only create new requirements — edit this one manually in Attributes & Images.` }
        }
        const proposal: ProposedAction = {
          tool: "set_image_requirement",
          summary: `Add a new image requirement "${requirementName}" to "${profile.name}" (${args.format}, min ${args.minDimensions}).`,
          args,
        }
        return { proposal }
      },
    }),
  }
}

export function buildCopilotTools(ctx: CopilotContext) {
  return { ...makeReadTools(ctx), ...makeCreateTools(ctx) }
}
