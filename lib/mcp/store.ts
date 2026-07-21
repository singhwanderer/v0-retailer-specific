// In-memory demo store for the MCP server.
//
// Seeded from the same mock modules the portal screens render, then mutated
// by the MCP write tools so a "create" followed by a "list" in the same demo
// conversation shows the new data. State lives in module scope: it survives
// while the serverless instance stays warm and resets on cold start — every
// write tool says so in its response.

import {
  ATTRIBUTE_PROFILES,
  type AttributeProfile,
} from "@/lib/retailer-requirements"

export interface AttributeRequirement {
  name: string
  gs1Name: string
  guidance: string
  source: "standard" | "custom"
  target: "core" | "extended"
}

export interface ImageRequirement {
  requirementName: string
  format: string
  background: string
  minDimensions: string
  maxFileSize: string
  shapeCrop: string
  guidanceNote?: string
}

export interface ProfileExtras {
  customAttributes: AttributeRequirement[]
  imageRequirements: ImageRequirement[]
  /**
   * Edits to a standard (GS1-inherited or baseline) row — keyed by gs1Name.
   * Standard rows aren't stored themselves (they're derived live from the GS1
   * brick / BASELINE_CORE_ATTRIBUTES), so an edit to one is recorded here
   * instead of mutating a row that doesn't otherwise exist in the store.
   */
  overrides: Record<string, { name?: string; guidance?: string }>
}

export interface DemoStore {
  profiles: AttributeProfile[]
  /** Keyed by GS1 category (brick) code */
  profileExtras: Record<string, ProfileExtras>
}

// The 8 baseline core attributes every profile shares, regardless of category
// (mirrors Screen 2's BASELINE_CORE_ROWS).
export const BASELINE_CORE_ATTRIBUTES: AttributeRequirement[] = [
  { name: "Product ID", gs1Name: "Product ID", guidance: "", source: "standard", target: "core" },
  { name: "Product Description", gs1Name: "Product Description", guidance: "", source: "standard", target: "core" },
  { name: "GTIN code", gs1Name: "GTIN code", guidance: "", source: "standard", target: "core" },
  { name: "GTIN Description", gs1Name: "GTIN Description", guidance: "Max 35 characters. Plain language product name.", source: "standard", target: "core" },
  { name: "NRF Size Code", gs1Name: "NRF Size Code", guidance: "Primary and secondary codes both required.", source: "standard", target: "core" },
  { name: "NRF Color Code", gs1Name: "NRF Color Code", guidance: "Must match NRF standard code table. See NRF guide.", source: "standard", target: "core" },
  { name: "Size Description", gs1Name: "Size Description", guidance: "", source: "standard", target: "core" },
  { name: "Color Description", gs1Name: "Color Description", guidance: "Max 10 characters. All caps.", source: "standard", target: "core" },
]

function seed(): DemoStore {
  return {
    profiles: ATTRIBUTE_PROFILES.map((p) => ({ ...p })),
    profileExtras: {
      // Footwear ships with the Hero Shot image requirement Screen 2 displays.
      // Its core attributes are the shared 8-attribute baseline — no custom core rows.
      "10005811": {
        customAttributes: [],
        imageRequirements: [
          {
            requirementName: "Hero Shot",
            format: "JPEG",
            background: "Pure white (#FFFFFF)",
            minDimensions: "2000 × 2000 px",
            maxFileSize: "10 MB",
            shapeCrop: "Square, product centered",
            guidanceNote: "No mannequin, no props.",
          },
        ],
        overrides: {},
      },
    },
  }
}

const globalScope = globalThis as typeof globalThis & { __tgcDemoStore?: DemoStore }

export function getStore(): DemoStore {
  globalScope.__tgcDemoStore ??= seed()
  return globalScope.__tgcDemoStore
}

/** Read-only view of a profile's extras — never persists a new entry. */
export function readProfileExtras(brickCode: string): ProfileExtras {
  return getStore().profileExtras[brickCode] ?? { customAttributes: [], imageRequirements: [], overrides: {} }
}

/** Mutable extras for a brick — creates and persists an entry if none exists.
 *  Only call from write paths that have already confirmed a profile exists. */
export function getProfileExtras(brickCode: string): ProfileExtras {
  const store = getStore()
  store.profileExtras[brickCode] ??= { customAttributes: [], imageRequirements: [], overrides: {} }
  return store.profileExtras[brickCode]
}
