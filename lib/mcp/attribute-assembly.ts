// Shared attribute-assembly layer.
//
// Sits between the raw store (lib/mcp/store.ts) and its two consumers: the
// external MCP tool layer (lib/mcp/tools.ts) and the portal UI (Screen 1/2).
// Attributes are always defined at GS1 brick level — a profile that maps to
// several bricks keeps each brick's attribute set independent, with no
// merging across bricks. This module is the one place that assembles "what
// does this brick require" so the connector and the authoring screens read
// and write through the same logic instead of two hand-synced copies.

import {
  GS1_BRICKS,
  getBrickByCode,
  getSegments,
  searchBricks,
  type Gs1Brick,
  type Gs1ExtendedAttribute,
} from "@/lib/gs1-standard-library"
import { getProfileBricks, type AttributeProfile, type ProfileBrick } from "@/lib/retailer-requirements"
import {
  BASELINE_CORE_ATTRIBUTES,
  readProfileExtras,
  type AttributeRequirement,
  type ImageRequirement,
} from "@/lib/mcp/store"

export interface BrickAttributeSet {
  brickCode: string
  brickName: string
  segment: string | undefined
  coreAttributes: AttributeRequirement[]
  extendedAttributes: AttributeRequirement[]
  imageRequirements: ImageRequirement[]
}

function applyOverride(
  attr: AttributeRequirement,
  overrides: Record<string, { name?: string; guidance?: string }>
): AttributeRequirement {
  const o = overrides[attr.gs1Name]
  return o ? { ...attr, ...o } : attr
}

/**
 * Assemble one brick's full attribute set: the global baseline core rows +
 * this brick's standard extended attributes (from the GS1 library) + this
 * brick's own custom rows and image requirements, with any per-attribute
 * overrides applied. Read-only — uses readProfileExtras, never the
 * write-creating getProfileExtras, so simply inspecting a brick never
 * creates store state.
 */
export function assembleBrickAttributes(brickCode: string, tenantId?: string): BrickAttributeSet {
  const brick = getBrickByCode(brickCode)
  const extras = readProfileExtras(brickCode, tenantId)
  const excluded = new Set(extras.excludedGs1Names)
  const baseline = BASELINE_CORE_ATTRIBUTES.filter((a) => !excluded.has(a.gs1Name)).map((a) =>
    applyOverride(a, extras.overrides)
  )
  // gs1Name is the attribute's name. It used to be `"Closure (GM03CLOS)"` —
  // name plus a fabricated attribute code — which is why several places had to
  // strip a trailing "(CODE)" before showing a row to anyone.
  const standardExtended: AttributeRequirement[] = (brick?.extendedAttributes ?? [])
    .filter((a) => !excluded.has(a.name))
    .map((a) =>
      applyOverride(
        { name: a.name, gs1Name: a.name, guidance: "", source: "standard", target: "extended" },
        extras.overrides
      )
    )
  return {
    brickCode,
    brickName: brick?.brickName ?? brickCode,
    segment: brick?.segment,
    coreAttributes: [...baseline, ...extras.customAttributes.filter((a) => a.target === "core")],
    extendedAttributes: [...standardExtended, ...extras.customAttributes.filter((a) => a.target === "extended")],
    imageRequirements: extras.imageRequirements,
  }
}

/**
 * Turn whatever a caller named an attribute into the canonical `gs1Name` key
 * the store is keyed on — matching exactly first, then case-insensitively.
 *
 * A miss is an error rather than a shrug: the mutation paths below used to
 * record an exclusion for an unmatched string and report success, which looks
 * identical to a real removal until you reopen the profile.
 */
export function resolveGs1Name(
  brickCode: string,
  input: string,
  tenantId?: string
): { gs1Name: string } | { error: string } {
  const { coreAttributes, extendedAttributes } = assembleBrickAttributes(brickCode, tenantId)
  const rows = [...coreAttributes, ...extendedAttributes]
  const wanted = input.trim()
  const lower = wanted.toLowerCase()

  const match =
    rows.find((r) => r.gs1Name === wanted) ?? rows.find((r) => r.gs1Name.toLowerCase() === lower)

  if (!match) {
    const names = rows.map((r) => r.gs1Name)
    return {
      error: `No attribute named "${input}" on GS1 category ${brickCode}. ${
        names.length ? `Attributes here: ${names.join(", ")}.` : "This profile has no attributes."
      }`,
    }
  }
  return { gs1Name: match.gs1Name }
}

/**
 * Find the profile mapped to a brick code — checks ALL of a profile's mapped
 * bricks (via getProfileBricks), not just its primary brickCode. A profile's
 * secondary bricks are otherwise invisible to a plain
 * `profiles.find(p => p.brickCode === brickCode)` lookup.
 */
export function findProfileForBrick(
  profiles: AttributeProfile[],
  brickCode: string
): AttributeProfile | undefined {
  return profiles.find((p) => getProfileBricks(p).some((b) => b.code === brickCode))
}

/**
 * Every GS1 category not yet mapped to any profile, in library order. A new
 * profile can only be built on one of these, so both the search tool and the
 * mapping-conflict error quote from this list — the alternative is an agent
 * that can discover a category is free only by proposing it and being refused.
 */
export function unmappedBricks(profiles: AttributeProfile[]): Gs1Brick[] {
  return GS1_BRICKS.filter((b) => !findProfileForBrick(profiles, b.brickCode))
}

/**
 * The error for "you asked for a GS1 category another profile already owns".
 *
 * It names the categories still free to map, and offers that as the FIRST way
 * out. Listing only extend-or-delete — the two exits this string used to
 * offer — meant a user who insisted ("create a new one already!") got the same
 * refusal back, because those really were the only options the agent had been
 * handed, while an unmapped category sat there the whole time.
 *
 * It also says "GS1 category" throughout: AttributeProfile.category is a
 * separate free-text label that several profiles legitimately share, so an
 * unqualified "a category belongs to one profile" reads as false to anyone
 * looking at their own requirements list.
 */
export function mappingConflict(
  profiles: AttributeProfile[],
  brick: Gs1Brick,
  ownerName: string
): string {
  const free = unmappedBricks(profiles)
  const nearby = free.filter((b) => b.segment === brick.segment)
  const suggest = (nearby.length ? nearby : free).map((b) => b.brickName)
  const options = [
    ...(suggest.length
      ? [`map the new profile to a GS1 category that is still free — ${suggest.join(", ")}`]
      : []),
    `add the requirement to "${ownerName}" instead`,
    `delete "${ownerName}" first, if you mean to replace it`,
  ]
  return (
    `The GS1 category "${brick.brickName}" is already mapped to the "${ownerName}" profile, ` +
    `and a GS1 category can belong to only one profile at a time. ` +
    `(A profile's own category label is a different, free-text field — profiles may share that.) ` +
    `Ways forward: ${options.join("; ")}. ` +
    `Put these to the user and let them choose; do not pick a category on their behalf.`
  )
}

export interface AvailableCategoryGroup {
  segment: string
  categories: { brickCode: string; brickName: string }[]
}

/**
 * The GS1 categories a new profile could be mapped to, grouped by segment.
 *
 * Grouped rather than flat because there are usually well over a dozen, and a
 * flat list is not something the agent can put to a user readably. Carries the
 * code alongside the name so the user can answer with either — they may well be
 * reading a code off the requirements screen.
 */
export function availableCategories(profiles: AttributeProfile[]): AvailableCategoryGroup[] {
  const bySegment = new Map<string, { brickCode: string; brickName: string }[]>()
  for (const b of unmappedBricks(profiles)) {
    const group = bySegment.get(b.segment) ?? []
    group.push({ brickCode: b.brickCode, brickName: b.brickName })
    bySegment.set(b.segment, group)
  }
  return [...bySegment.entries()]
    .map(([segment, categories]) => ({ segment, categories }))
    .sort((a, b) => a.segment.localeCompare(b.segment))
}

/** The same list as one line of prose, for embedding in a tool's note. */
export function describeAvailableCategories(profiles: AttributeProfile[]): string {
  const groups = availableCategories(profiles)
  if (!groups.length) return "Every GS1 category is already mapped to a profile."
  return groups
    .map((g) => `${g.segment}: ${g.categories.map((c) => c.brickName).join(", ")}`)
    .join(". ")
}

export interface BrickMatch {
  brickCode: string
  brickName: string
  segment: string
  /** Whether a NEW profile can be mapped here — false once some profile owns it. */
  available: boolean
  /** The profile already holding this category, when `available` is false. */
  mappedTo?: string
  extendedAttributes: Gs1ExtendedAttribute[]
}

export interface BrickSearchResult {
  matches: BrickMatch[]
  /** Present only when the raw matches alone would strand the caller. */
  note?: string
}

/**
 * Search the GS1 library and say, per hit, whether the category is still free
 * to map. The note carries the recovery path in the two cases where the match
 * list on its own is a dead end: nothing matched at all, and everything that
 * matched is already spoken for. Named alternatives come from the library, so
 * the agent relays real categories instead of inventing a plausible one — the
 * failure mode that put "Booties" onto an already-mapped footwear category.
 */
export function searchBricksWithMapping(
  profiles: AttributeProfile[],
  query: string
): BrickSearchResult {
  const matches: BrickMatch[] = searchBricks(query).map((b) => {
    const owner = findProfileForBrick(profiles, b.brickCode)
    return {
      brickCode: b.brickCode,
      brickName: b.brickName,
      segment: b.segment,
      available: !owner,
      ...(owner ? { mappedTo: owner.name } : {}),
      extendedAttributes: b.extendedAttributes,
    }
  })

  const free = unmappedBricks(profiles)
  const freeNames = (bricks: Gs1Brick[]) => bricks.map((b) => b.brickName).join(", ")

  // No query at all: this is the "what could I map to?" call, so say so rather
  // than returning 25 rows with no framing.
  if (!query.trim()) {
    return {
      matches,
      note:
        `The full GS1 category library. Only the ones marked available can be mapped to a NEW profile; ` +
        `the rest already belong to one. Still free — ${describeAvailableCategories(profiles)}`,
    }
  }

  if (matches.length === 0) {
    return {
      matches,
      note:
        // Deliberately does NOT say "no category matches X". The caller may
        // have passed a profile NAME, which is the retailer's own label and has
        // no reason to match anything in the GS1 library — reporting that as a
        // failed lookup is how "no GS1 category matches Troy" got said out loud.
        `Nothing in the GS1 library matches "${query}". If that was a profile name rather than a product type, ` +
        `it does not need to match anything — profile names are the retailer's own label. Ask the user which GS1 ` +
        `category the profile should cover; do not infer one. ` +
        `Segments in the library: ${getSegments().join(", ")}. ` +
        (free.length
          ? `Categories still free to map — ${describeAvailableCategories(profiles)}`
          : `Every GS1 category is already mapped to a profile.`),
    }
  }

  if (matches.every((m) => !m.available)) {
    const segments = new Set(matches.map((m) => m.segment))
    const nearby = free.filter((b) => segments.has(b.segment))
    const suggest = nearby.length ? nearby : free
    return {
      matches,
      note:
        `Every category matching "${query}" already belongs to a profile, and a GS1 category can belong to only one profile at a time. ` +
        (suggest.length
          ? `Still free to map to a new profile: ${freeNames(suggest)}. Put these to the user and let them choose.`
          : `No GS1 category is left unmapped — a new profile is not possible until one is freed.`),
    }
  }

  return { matches }
}

/**
 * A profile's attribute-count summary string (e.g. "51 attributes · 2 image
 * requirements · 2 GS1 categories"), for the requirements list and the
 * detail screen's subtitle. The global 4-row baseline is counted once (it's
 * one data-entry event per product, not per brick); everything brick-specific
 * (custom core, standard extended, custom extended, images) is summed across
 * every mapped brick with no dedup — bricks are independent scopes.
 */
export function describeProfileAttributes(bricks: Pick<ProfileBrick, "code">[]): string {
  let customCore = 0
  let extended = 0
  let images = 0
  for (const b of bricks) {
    const set = assembleBrickAttributes(b.code)
    customCore += set.coreAttributes.length - BASELINE_CORE_ATTRIBUTES.length
    extended += set.extendedAttributes.length
    images += set.imageRequirements.length
  }
  const total = BASELINE_CORE_ATTRIBUTES.length + customCore + extended
  const imagePart = images ? ` · ${images} image requirement${images !== 1 ? "s" : ""}` : ""
  const bricksPart = bricks.length > 1 ? ` · ${bricks.length} GS1 categories` : ""
  return `${total} attributes${imagePart}${bricksPart}`
}
