// Shared attribute-assembly layer.
//
// Sits between the raw store (lib/mcp/store.ts) and its two consumers: the
// external MCP tool layer (lib/mcp/tools.ts) and the portal UI (Screen 1/2).
// Attributes are always defined at GS1 brick level — a profile that maps to
// several bricks keeps each brick's attribute set independent, with no
// merging across bricks. This module is the one place that assembles "what
// does this brick require" so the connector and the authoring screens read
// and write through the same logic instead of two hand-synced copies.

import { getBrickByCode } from "@/lib/gs1-standard-library"
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
export function assembleBrickAttributes(brickCode: string): BrickAttributeSet {
  const brick = getBrickByCode(brickCode)
  const extras = readProfileExtras(brickCode)
  const excluded = new Set(extras.excludedGs1Names)
  const baseline = BASELINE_CORE_ATTRIBUTES.filter((a) => !excluded.has(a.gs1Name)).map((a) =>
    applyOverride(a, extras.overrides)
  )
  const standardExtended: AttributeRequirement[] = (brick?.extendedAttributes ?? [])
    .filter((a) => !excluded.has(`${a.name} (${a.code})`))
    .map((a) =>
      applyOverride(
        { name: a.name, gs1Name: `${a.name} (${a.code})`, guidance: "", source: "standard", target: "extended" },
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
