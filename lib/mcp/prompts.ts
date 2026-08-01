// Starter prompts — the clickable suggestions an MCP client (e.g. claude.ai's
// prompt picker) shows so a teammate opening the connector cold knows what to
// try.
//
// Only offered when the tools behind them are actually available to this
// caller: suggesting an action they would be refused for is a worse experience
// than not suggesting it. A supplier asks the mirror question of a retailer's,
// so the two sets are separate rather than one list with caveats.

import type { createMcpHandler } from "mcp-handler"
import type { CallerContext } from "@/lib/mcp/context"
import type { ToolDefinition } from "@/lib/mcp/manifest"

/** The server object `createMcpHandler` hands to its setup callback. */
type McpServerArg = Parameters<Parameters<typeof createMcpHandler>[0]>[0]

export function registerPrompts(server: McpServerArg, ctx: CallerContext, visible: ToolDefinition[]) {
  const canRead = visible.some((t) => t.kind === "read")
  const canWrite = visible.some((t) => t.kind === "write")
  const isSupplier = ctx.tenantClass === "supplier"

  const prompt = (text: string) => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
  })

  if (canRead && isSupplier) {
    server.prompt(
      "how-am-i-doing",
      "See your own compliance position across every retail partner.",
      async () =>
        prompt(
          "Using the TGC connector, how compliant is my catalogue? Break it down by retail partner and against the GS1 baseline, and tell me which partner I'm furthest behind for."
        )
    )

    server.prompt(
      "what-am-i-missing",
      "See exactly which attributes and images are still outstanding.",
      async () =>
        prompt(
          "What am I still missing in TGC? Ask me which retail partner (or the GS1 baseline), then list the attributes and images I most often fail to supply, and tell me separately which attributes have been waived for me."
        )
    )

    server.prompt(
      "what-has-been-waived",
      "Review the exceptions retailers have granted you.",
      async () =>
        prompt(
          "What exceptions have my retail partners granted me in TGC? For each, tell me who granted it, which attributes it covers, what it actually changes, and when it expires."
        )
    )
  }

  if (canRead && !isSupplier) {
    server.prompt(
      "review-supplier-compliance",
      "See which of your suppliers are furthest behind on compliance and on what.",
      async () =>
        prompt(
          "Using the TGC connector, which of my suppliers are furthest behind on compliance, and on what categories? Rank them by open gaps and cite the tool results."
        )
    )

    server.prompt(
      "audit-a-vendor",
      "Review one of your suppliers' open compliance gaps.",
      async () =>
        prompt(
          "I want to audit one of my suppliers in TGC. Ask me which supplier, then show their compliance — category, product counts, and open gaps. If the name doesn't match one of my suppliers, tell me which suppliers do have data."
        )
    )

    server.prompt(
      "run-compliance-report",
      "Run a compliance report across your vendor base against a profile or a System scorecard.",
      async () =>
        prompt(
          "Run a compliance report across my vendor base in TGC. Ask me whether to scan against one of my attribute profiles or a global System filter (list them with list_system_filters — e.g. GS1 Core Scorecard), then run it and summarize the worst vendors and the top missing attributes from the tool result."
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
  }

  if (canWrite) {
    server.prompt(
      "set-up-category-requirements",
      "Guided flow to create requirements for a new product category.",
      async () =>
        prompt(
          "Help me set up requirements for a new product category in TGC. First ask me which category, then search the GS1 library for the right GPC classification, create the attribute profile, and walk me through adding key attributes and an image requirement — confirming each change before you write it."
        )
    )
  }
}
