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
// The agent covers the whole requirement lifecycle — read, create, edit,
// remove, activate. What it never does is apply any of it: the safety
// property is that no tool in this file mutates, not that the tool list is
// short. Deleting a profile is the one action that also demands the user
// retype the profile name on the card (ProposedAction.confirmText), because
// it is the widest-blast-radius write on this surface.

import { tool } from "ai"
import { z } from "zod"
import { getBrickByCode, getSegments } from "@/lib/gs1-standard-library"
import {
  RETAILER_SUPPLIERS,
  getProfileBricks,
  type AttributeProfile,
} from "@/lib/retailer-requirements"
import {
  findProfileForBrick,
  assembleBrickAttributes,
  availableCategories,
  describeAvailableCategories,
  mappingConflict,
  resolveGs1Name,
  searchBricksWithMapping,
} from "@/lib/mcp/attribute-assembly"
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
    | "delete_attribute_profile"
    | "activate_profile"
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
  /**
   * When set, the card keeps its button disabled until the user types this
   * string exactly. The external connector gates a delete behind a
   * single-use confirmation token it must redeem through a second tool; a
   * card with one clickable button is a weaker gate than that, and profile
   * deletion is the one action where the difference matters.
   */
  confirmText?: string
}

function knownSuppliers(): string[] {
  return [...new Set(RETAILER_SUPPLIERS.map((s) => s.supplier))].sort()
}

/** Profile lookup by name, matched the same way the store matches it. */
function findProfileByName(ctx: CopilotContext, profileName: string): AttributeProfile | undefined {
  const wanted = profileName.toLowerCase().trim()
  return ctx.profiles.find((p) => p.name.toLowerCase() === wanted)
}

function unknownProfile(ctx: CopilotContext, profileName: string): string {
  return `No attribute profile named "${profileName}". Your profiles: ${ctx.profiles.map((p) => p.name).join(", ")}.`
}

// ── Reads ─────────────────────────────────────────────────────────────────────

function makeReadTools(ctx: CopilotContext) {
  return {
    search_gs1_bricks: tool({
      description:
        "Search GS1 product categories (bricks) by name, segment, or category code. Matching is literal against those fields, not fuzzy — a product type the GS1 names do not use will find nothing, which is a signal to ask the user, not to pick the nearest category. Each hit says whether it is still free to map to a new profile. Call with an empty query to list the whole library.",
      inputSchema: z.object({ query: z.string().describe("Free-text search, e.g. 'dresses' or 'footwear'; empty lists all categories") }),
      // Each hit says whether the category is still free to map, and an empty
      // or fully-taken result carries a note naming the categories that are —
      // see searchBricksWithMapping.
      execute: async ({ query }) => {
        const { matches, note } = searchBricksWithMapping(ctx.profiles, query)
        const shaped = matches.map(({ extendedAttributes, ...b }) => ({
          ...b,
          standardExtendedAttributes: extendedAttributes.map((a) => a.name),
        }))
        return note ? { matches: shaped, note } : shaped
      },
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
      inputSchema: z.object({
        brickCode: z.string().describe("GS1 brick code for the category, as returned by search_gs1_bricks or list_attribute_profiles"),
      }),
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
          "TGC Compliance Agent — retailer-side requirement authoring across the full lifecycle (read, create, edit, remove, activate) and supplier compliance monitoring. Nothing is ever applied without you confirming it on a card.",
        youCanAsk: {
          understandRequirements: "Look up what a product category requires (attributes, image rules).",
          monitorSuppliers: "See how your suppliers are doing on compliance and where the gaps are.",
          runComplianceReports: "Run a compliance report against a profile or a global System filter.",
          createRequirements: "Create a new attribute profile, add a new custom attribute, or add a new image requirement.",
          changeRequirements: "Change an attribute's label or supplier guidance, stop requiring an attribute or an image, or activate a Draft profile and deactivate an Active one.",
          deleteProfiles: "Delete a whole profile and everything under it — the widest-reaching action here, so the card makes you retype the profile name first.",
        },
        everyChangeIsConfirmed:
          "No action applies itself. Each one comes back as a proposal card with Apply and Cancel, and removals state what they do to your compliance numbers before you decide.",
        cannotDo: [
          "Apply any change without you confirming it.",
          "Vendor exceptions (waivers, extended deadlines, reduced scope) — those stay a manual action.",
          "Simulate a requirement change before making it, or read the AI access log. Both exist on the external MCP connector, not here.",
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
        "Propose a NEW attribute profile. Does not create anything — returns a proposal the user must confirm. A profile has two independent parts: `name`, which is the retailer's own label and can be anything, and `brickCodes`, the GS1 categories it covers. The name never implies the category — do not derive one from the other. Call without brickCodes when the user has named a profile but not said what it covers: the result is the list of categories still free, to put to the user. Every GS1 category belongs to at most one profile.",
      inputSchema: z.object({
        name: z.string().describe("Profile name shown in the requirements list — the retailer's own label, unconstrained"),
        brickCodes: z
          .array(z.string())
          .optional()
          .describe(
            "GS1 brick codes the profile covers, from search_gs1_bricks. Omit if the user has not said which category — you will get the available ones back to ask them."
          ),
        category: z.string().optional().describe("Free-text category label; defaults to name"),
      }),
      execute: async ({ name, brickCodes, category }) => {
        // No category yet. This is the normal state after "create a requirement
        // called Troy" — a name on its own says nothing about which GS1
        // category it covers — so it returns the next step, not an error.
        if (!brickCodes?.length) {
          return {
            needsCategory: true,
            profileName: name,
            availableCategories: availableCategories(ctx.profiles),
            note:
              `"${name}" is the retailer's own label for the profile and does not have to match a GS1 category name — ` +
              `nothing needs to be looked up for it. What is still missing is which GS1 category the profile covers, ` +
              `and that is the user's decision: ask them, offering the available categories below by segment. ` +
              `They can answer with a category name or its code. Do not choose one for them, and do not call this tool ` +
              `again until they have.`,
          }
        }
        const bricks = brickCodes.map((code) => ({ code, brick: getBrickByCode(code) }))
        const missing = bricks.find((b) => !b.brick)
        if (missing) {
          return {
            error:
              `Unknown GS1 category code ${missing.code}. Use search_gs1_bricks to find the right category first. ` +
              `Categories still free to map — ${describeAvailableCategories(ctx.profiles)}`,
          }
        }
        const conflict = bricks.find((b) => findProfileForBrick(ctx.profiles, b.code))
        if (conflict) {
          const owner = findProfileForBrick(ctx.profiles, conflict.code)!
          return {
            error: mappingConflict(ctx.profiles, conflict.brick!, owner.name),
          }
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
        gs1Name: z.string().describe("The attribute's name as get_profile_detail returns it"),
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
        const resolved = resolveGs1Name(brickCode, gs1Name)
        if ("error" in resolved) return resolved
        const changes = [
          ...(name !== undefined ? [`label → "${name}"`] : []),
          ...(guidance !== undefined ? [`guidance → "${guidance}"`] : []),
        ].join(", ")
        const proposal: ProposedAction = {
          tool: "update_attribute_requirement",
          // The card shows the name the retailer sees on screen; args carry
          // the canonical store key the apply path needs.
          summary: `Update "${resolved.gs1Name}" on "${profile.name}": ${changes}.`,
          args: { brickCode, gs1Name: resolved.gs1Name, name, guidance },
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
        gs1Name: z.string().describe("The attribute's name as get_profile_detail returns it"),
      }),
      execute: async ({ brickCode, gs1Name }) => {
        const profile = findProfileForBrick(ctx.profiles, brickCode)
        if (!profile) {
          return { error: `No attribute profile exists for GS1 category ${brickCode}.` }
        }
        const resolved = resolveGs1Name(brickCode, gs1Name)
        if ("error" in resolved) return resolved
        const proposal: ProposedAction = {
          tool: "remove_attribute_requirement",
          summary: `Stop requiring "${resolved.gs1Name}" on "${profile.name}".`,
          args: { brickCode, gs1Name: resolved.gs1Name },
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

    activate_profile: tool({
      description:
        "Propose activating a Draft profile so its requirements start being enforced across the vendor base, or returning an Active profile to Draft. Does not change anything — returns a proposal the user must confirm.",
      inputSchema: z.object({
        profileName: z.string(),
        status: z
          .enum(["Active", "Draft"])
          .describe("'Active' to start enforcing this profile, 'Draft' to stop and return it to editing"),
      }),
      execute: async ({ profileName, status }) => {
        const profile = findProfileByName(ctx, profileName)
        if (!profile) return { error: unknownProfile(ctx, profileName) }
        if (profile.status === status) {
          return { error: `"${profile.name}" is already ${status}. Nothing to change.` }
        }
        const proposal: ProposedAction = {
          tool: "activate_profile",
          summary: `Set the "${profile.name}" profile from ${profile.status} to ${status}.`,
          args: { profileName: profile.name, status },
          consequence:
            status === "Active"
              ? `Vendor items in ${profile.category} start being assessed against this profile. Expect reported gap counts to rise the first time a report runs — those gaps already existed, they were simply not being measured.`
              : `Vendor items in ${profile.category} stop being assessed against this profile. The requirements are kept and can be re-activated.`,
        }
        return { proposal }
      },
    }),

    delete_attribute_profile: tool({
      description:
        "Propose deleting a whole requirement profile and every attribute and image rule beneath it. This is the widest-reaching action available here. Does not delete anything — returns a proposal the user must confirm by retyping the profile name. Always state the consequence before proposing this.",
      inputSchema: z.object({ profileName: z.string() }),
      execute: async ({ profileName }) => {
        const profile = findProfileByName(ctx, profileName)
        if (!profile) return { error: unknownProfile(ctx, profileName) }
        const bricks = getProfileBricks(profile)
        const images = bricks.reduce(
          (sum, b) => sum + assembleBrickAttributes(b.code).imageRequirements.length,
          0
        )
        const proposal: ProposedAction = {
          tool: "delete_attribute_profile",
          summary: `Delete the "${profile.name}" profile (${profile.category}) and everything under it.`,
          args: { profileName: profile.name },
          destructive: true,
          confirmText: profile.name,
          consequence: [
            bricks.length === 1
              ? `1 GS1 category loses its requirements: ${bricks[0].name}.`
              : `${bricks.length} GS1 categories lose their requirements: ${bricks.map((b) => b.name).join(", ")}.`,
            `Everything the profile carries goes with it — ${profile.attributes}${images ? `, including ${images} stored image rule${images === 1 ? "" : "s"}` : ""}.`,
            profile.status === "Active"
              ? "This profile is ACTIVE — vendor items in these categories stop being assessed the moment this applies."
              : "This profile is a Draft, so nothing is currently being assessed against it.",
            "There is no undo in this prototype. The profile would have to be recreated from scratch.",
          ].join(" "),
        }
        return { proposal }
      },
    }),
  }
}

export function buildCopilotTools(ctx: CopilotContext) {
  return { ...makeReadTools(ctx), ...makeCreateTools(ctx), ...makeEditTools(ctx) }
}
