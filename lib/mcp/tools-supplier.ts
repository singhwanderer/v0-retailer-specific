// Supplier-side tool layer for the TGC MCP server.
//
// The retailer asks "how are my suppliers doing?". A supplier asks the mirror
// question: "how am I doing, for each of the retailers I sell to, and what have
// they let me off?" Same network, same server, same URL — the tenant class of
// whoever signed in decides which half they get.
//
// These tools were not safe to build until two-tenant-class isolation existed
// (§4B gated them on exactly that). Now that ENT-05 is enforced, a supplier
// tenant can hold a real surface without any risk of reaching retailer-side
// data — every tool here is declared `allowedTenantClasses: ["supplier"]` in
// the manifest and re-checked per call by runGuarded().
//
// No new business logic: every figure comes from the same functions the
// supplier portal screens already render, so the connector and the UI can never
// disagree about a gap count.

import type { CallerContext } from "@/lib/mcp/context"
import { exceptionsGrantedToVendor } from "@/lib/mcp/store"
import { PARTNERS, getPartnerExtraAttributes } from "@/lib/partner-filters"
import {
  SUPPLIER_PERSONA,
  SUPPLIER_PRODUCTS_SEED,
  countBaselineGaps,
  getCategory,
  getGapRecords,
  getPartnerSummary,
  getTargetCompletion,
  type GapTarget,
  type SupplierProduct,
} from "@/lib/supplier-catalogue"
import { getBrickByCode } from "@/lib/gs1-standard-library"

/**
 * The catalogue this supplier tenant owns.
 *
 * J.Renée is the only supplier tenant in the demo, so this is the shared
 * fixture the portal renders. A real multi-supplier deployment keys this per
 * tenant exactly as the retailer store already is — recorded in
 * docs/mcp-enterprise-auth-trd.md rather than papered over.
 */
function myProducts(_ctx: CallerContext): SupplierProduct[] {
  return SUPPLIER_PRODUCTS_SEED
}

/** This tenant's own vendor name, as retailers know it. Never an argument. */
function myVendorName(_ctx: CallerContext): string {
  return SUPPLIER_PERSONA
}

/** Resolve a free-text target to the shape the gap engine expects. */
function resolveTarget(target: string | undefined): { target: GapTarget; label: string } | { error: string } {
  const q = (target ?? "gs1").toLowerCase().trim()
  if (q === "gs1" || q === "baseline" || q === "gs1 baseline") {
    return { target: { kind: "gs1" }, label: "GS1 baseline" }
  }
  const partner = PARTNERS.find((p) => p.name.toLowerCase() === q || p.id === q)
  if (!partner) {
    return {
      error: `Unknown target "${target}". Use "gs1" for the industry baseline, or one of your retail partners: ${PARTNERS.map((p) => p.name).join(", ")}.`,
    }
  }
  return { target: { kind: "retailer", name: partner.name }, label: partner.name }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Headline compliance: how complete this supplier's catalogue is against the
 * GS1 baseline and against each retail partner separately.
 *
 * The per-partner split is the point — a supplier is never "compliant" in the
 * abstract, only compliant for a given retailer's requirements.
 */
export function getMyComplianceStatus(ctx: CallerContext) {
  const products = myProducts(ctx)
  const gs1 = getTargetCompletion(products, "gs1")

  return {
    vendor: myVendorName(ctx),
    catalogue: {
      totalProducts: products.length,
      categorised: products.filter((p) => p.state === "categorised").length,
      uncategorised: products.filter((p) => p.state !== "categorised").length,
      openBaselineGaps: countBaselineGaps(products),
    },
    gs1Baseline: {
      productsAssessed: gs1.total,
      productsComplete: gs1.complete,
      completionPct: gs1.pct,
      byCategory: gs1.byCategory,
    },
    byRetailPartner: PARTNERS.map((partner) => {
      const completion = getTargetCompletion(products, partner.name)
      const summary = getPartnerSummary(products, partner.name)
      return {
        retailer: partner.name,
        productsAssessed: completion.total,
        productsComplete: completion.complete,
        completionPct: completion.pct,
        openGaps: summary.gaps,
        selectionCodes: summary.codes,
      }
    }).sort((a, b) => b.openGaps - a.openGaps),
    note:
      "Compliance is per retail partner, not a single global score: each retailer layers its own required attributes on top of the GS1 baseline. Attributes a retailer has waived for you are not counted as gaps — call list_my_exceptions to see them.",
  }
}

/**
 * The retail partners this supplier trades with, ranked by where the work is.
 * `extraAttributes` is what that retailer requires *beyond* the GS1 standard —
 * the honest answer to "why am I compliant for one retailer and not another".
 */
export function listMyRetailPartners(ctx: CallerContext) {
  const products = myProducts(ctx)

  return {
    vendor: myVendorName(ctx),
    partners: PARTNERS.map((partner) => {
      const summary = getPartnerSummary(products, partner.name)
      const completion = getTargetCompletion(products, partner.name)
      return {
        retailer: partner.name,
        selectionCodes: summary.codes,
        openGaps: summary.gaps,
        productsComplete: summary.complete,
        completionPct: completion.pct,
        retailerSpecificAttributeCount: partner.extras,
      }
    }).sort((a, b) => b.openGaps - a.openGaps),
    note:
      "Selection codes group your products by GS1 category for one retailer. 'Retailer-specific attributes' are the fields that retailer requires on top of the GS1 standard set.",
  }
}

/**
 * What is actually still outstanding, for one target.
 *
 * Returns waived attributes alongside missing ones rather than silently
 * dropping them: a supplier needs to know the difference between "you never
 * have to supply this" and "this requirement quietly vanished".
 */
export function getMyOpenGaps(
  ctx: CallerContext,
  args: { target?: string; brickCode?: string; maxProducts?: number }
) {
  const resolved = resolveTarget(args.target)
  if ("error" in resolved) return resolved

  const products = myProducts(ctx).filter((p) => {
    if (p.state !== "categorised") return false
    if (args.brickCode && p.brickCode !== args.brickCode) return false
    return true
  })

  if (products.length === 0) {
    return {
      target: resolved.label,
      matches: [],
      note: args.brickCode
        ? `No categorised products under GS1 category ${args.brickCode}. Call get_my_compliance_status to see which categories you have products in.`
        : "No categorised products to assess. Products must be assigned a GS1 category before they can be compliance-checked.",
    }
  }

  // Bounded retrieval (§4A row 8) — a catalogue-wide gap dump is unbounded by
  // nature, so cap it and say so rather than returning everything.
  const limit = Math.min(Math.max(args.maxProducts ?? 20, 1), 100)

  // Aggregate across products so the answer is about requirements, not rows.
  const missingCounts = new Map<string, number>()
  const waivedCounts = new Map<string, number>()
  const perProduct: {
    productId: string
    description: string
    category: string | null
    missingAttributes: string[]
    missingImages: string[]
    waivedAttributes: string[]
  }[] = []

  for (const product of products) {
    const records = getGapRecords(product, resolved.target)
    for (const a of records.missingAttrs) missingCounts.set(a.name, (missingCounts.get(a.name) ?? 0) + 1)
    for (const a of records.waivedAttrs) waivedCounts.set(a.name, (waivedCounts.get(a.name) ?? 0) + 1)

    if (perProduct.length < limit && (records.missingAttrs.length > 0 || records.missingImages.length > 0)) {
      perProduct.push({
        productId: product.id,
        description: product.description,
        category: getCategory(product),
        missingAttributes: records.missingAttrs.map((a) => a.name),
        missingImages: records.missingImages.map((i) => i.name),
        waivedAttributes: records.waivedAttrs.map((a) => a.name),
      })
    }
  }

  const rank = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, productCount]) => ({ name, productCount }))

  const productsWithGaps = products.filter(
    (p) => getGapRecords(p, resolved.target).missingAttrs.length > 0
  ).length

  return {
    vendor: myVendorName(ctx),
    target: resolved.label,
    ...(args.brickCode ? { brickCode: args.brickCode, brickName: getBrickByCode(args.brickCode)?.brickName } : {}),
    productsAssessed: products.length,
    productsWithGaps,
    mostCommonMissingAttributes: rank(missingCounts).slice(0, 10),
    waivedForYou: rank(waivedCounts),
    products: perProduct,
    ...(perProduct.length >= limit ? { truncated: `Showing the first ${limit} products with gaps.` } : {}),
    note:
      "'waivedForYou' are attributes a retailer has excused you from — they are NOT counted as gaps. A waiver only applies to the retailer that granted it and only in the category it was scoped to; the GS1 baseline can never be waived by a retailer.",
  }
}

/**
 * Exceptions retailers have granted to this supplier.
 *
 * These rows live in the granting retailer's tenant, and the supplier reads
 * only the ones naming them — see exceptionsGrantedToVendor() in
 * lib/mcp/store.ts for why that is a bilateral fact rather than a hole in
 * tenant isolation.
 */
export function listMyExceptions(ctx: CallerContext, args: { status?: "Active" | "Expired" }) {
  const vendor = myVendorName(ctx)
  const all = exceptionsGrantedToVendor(vendor)
  const matches = args.status ? all.filter((e) => e.status === args.status) : all

  if (matches.length === 0) {
    return {
      vendor,
      matches: [],
      note: args.status
        ? `No ${args.status} exceptions have been granted to you. ${all.length > 0 ? `You have ${all.length} exception(s) with another status.` : "No retailer has granted you an exception."}`
        : "No retailer has granted you an exception. Every requirement in your profiles currently applies in full.",
    }
  }

  return {
    vendor,
    exceptions: matches.map((e) => ({
      grantedBy: e.grantedBy,
      exceptionType: e.exceptionType,
      profile: e.profile,
      brickCode: e.brickCode,
      brickName: e.brickCode ? getBrickByCode(e.brickCode)?.brickName : undefined,
      // An exception with no category scope never reduces a gap count — say so
      // rather than letting it look like relief the supplier doesn't have.
      ...(e.brickCode ? {} : { unscoped: "Not scoped to a category, so it does not reduce any gap count." }),
      attributes: e.attributes,
      validUntil: e.validUntil,
      status: e.status,
      effect:
        e.exceptionType === "Attribute Waiver"
          ? "These attributes no longer count as gaps against you for this category."
          : e.exceptionType === "Extended Deadline"
            ? "You have extra time to supply these attributes — they still count as open gaps until then."
            : "These attributes have been narrowed in scope for you.",
    })),
    note:
      "Exceptions are granted by a retailer and apply only to that retailer, only in the category they were scoped to. You can see the exceptions that name you; you cannot see anything else the granting retailer holds, and you cannot create or amend an exception yourself.",
  }
}

/** Plain-English capability catalog for a supplier tenant. */
export function getSupplierCapabilities(ctx: CallerContext) {
  const products = myProducts(ctx)
  const gs1 = getTargetCompletion(products, "gs1")
  const exceptions = exceptionsGrantedToVendor(myVendorName(ctx))

  return {
    about:
      "TGC connector — supplier side. You are signed in as a supplier, so these tools answer questions about YOUR OWN catalogue: how compliant you are, for which retail partner, what is still outstanding, and what has been waived for you. Ask in your own words; the examples are illustrations, not a fixed command list.",
    youCanAsk: {
      myComplianceStatus: {
        summary: "See how compliant your catalogue is, overall and per retail partner.",
        examples: [
          "How compliant am I overall?",
          "Which retailer am I furthest behind for?",
          "How am I doing against the GS1 baseline?",
        ],
      },
      myRetailPartners: {
        summary: "See who you trade with and where the outstanding work is for each.",
        examples: [
          "Which retail partners do I sell to?",
          "How many extra attributes does Dillard's require beyond GS1?",
          "Where do I have the most gaps?",
        ],
      },
      myOpenGaps: {
        summary: "See exactly which attributes and images are still missing, for a chosen target.",
        examples: [
          "What am I missing for Dillard's?",
          "Which attributes do I most often fail to supply?",
          "What's outstanding on my footwear products?",
        ],
      },
      myExceptions: {
        summary: "See waivers, deadline extensions, and reduced-scope exclusions granted to you.",
        examples: [
          "What has been waived for me?",
          "Do I have any active exceptions?",
          "Has Dillard's given me an extension on anything?",
        ],
      },
    },
    writeActions: [],
    liveSnapshot: {
      vendor: myVendorName(ctx),
      products: products.length,
      gs1CompletionPct: gs1.pct,
      retailPartners: PARTNERS.map((p) => p.name),
      activeExceptionsGrantedToYou: exceptions.filter((e) => e.status === "Active").length,
      exampleRetailerExtras: getPartnerExtraAttributes(
        "Dillard's",
        products.find((p) => p.brickCode)?.brickCode ?? ""
      ) as string[],
    },
    note:
      "All data is mock/demo and watermarked. This connection is read-only: supplier-side tools do not change requirements or exceptions — only the granting retailer can do that. Out of scope: other suppliers' data, and anything a retailer holds beyond the exceptions that name you.",
  }
}
