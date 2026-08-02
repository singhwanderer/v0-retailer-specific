# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js clickable prototype ("Trading Grid Catalogue" / TGC) demonstrating how a
**retailer** defines product-data requirements and how a **supplier** meets them across
a catalogue network. All data is mock/in-memory — there is no real backend or
database. See `README.md` for the full product narrative (personas, what's wired
vs. intentionally inert, requirement-authoring model, MCP connector, in-product
chat agent) — it is detailed and should be read before making non-trivial changes.

## Commands

```bash
pnpm install
pnpm dev              # start dev server at http://localhost:3000
pnpm build            # production build
pnpm start            # run production build
pnpm lint             # eslint . (flat config, eslint.config.mjs)
pnpm check:exceptions # tsx scripts/check-exception-seed.ts — validates vendor exception seed data
pnpm gen:oauth-key    # node scripts/generate-oauth-key.mjs — generates TGC_OAUTH_PRIVATE_JWK
```

There is no test suite/framework configured (no `test` script, no jest/vitest).
Verify changes via `pnpm lint`, `pnpm build`, and manual exercise in the browser.

Package manager is **pnpm** (`pnpm-lock.yaml` is the source of truth; a
`package-lock.json` also exists but is not the one to update).

## Architecture

### One page, state-driven screens

`app/page.tsx` is the entire portal UI — a single client component that switches
between retailer/supplier screens via React state (no router-based routes for the
portal itself). `Perspective` (`"retailer" | "supplier"`) and screen-enum state
(`RetailerScreen`, `SupplierScreen`) drive which `components/portal/screen-*.tsx`
component renders. Screen components live in `components/portal/`; generic UI
primitives (shadcn/ui) live in `components/ui/`.

### Data layer: mock modules + one in-memory demo store

Domain data starts as static mock modules (`lib/retailer-requirements.ts`,
`lib/supplier-catalogue.ts`, `lib/generated-suppliers.ts`, `lib/gs1-*.ts`,
`lib/system-filters.ts`, `lib/partner-filters.ts`, `lib/vendor-exceptions.ts`).
`lib/mcp/store.ts` seeds a `DemoStore` from these modules and is the single
mutable source of truth for profiles, profile extras (custom attributes/images,
overrides, exclusions — since GS1-standard rows are derived, not stored), and
vendor exceptions. Both the portal UI and the MCP/copilot write tools mutate
through this store. **Important caveat:** the browser (client-rendered portal)
and the Vercel serverless MCP route are separate runtime processes with separate
in-memory module scope — state does not literally share across that boundary,
and all in-memory state resets on cold start.

### One shared tool layer, three consumers

`lib/mcp/tools.ts` (retailer) and `lib/mcp/tools-supplier.ts` (supplier) hold the
actual business logic (read/create/edit/remove against the store). Three
different surfaces call into this same layer instead of re-implementing it:

1. **Portal UI** — calls the functions directly as plain client-side calls.
2. **External MCP connector** — `app/api/[transport]/route.ts` exposes the tools
   over Model Context Protocol (via `mcp-handler`) for external clients (claude.ai,
   Claude Desktop, ChatGPT). OAuth 2.1 plumbing lives in `app/oauth/*`,
   `app/.well-known/*`, and `lib/mcp/{auth,oauth,guard,tenants,audit,manifest,
   instructions,prompts}.ts`.
3. **In-portal chat agent** — `components/portal/compliance-agent-panel.tsx` talks
   to `/api/copilot` (`app/api/copilot/route.ts`), which runs an LLM agent loop
   (`lib/copilot/agent.ts`) over `lib/copilot/tools.ts`. Its read tools proxy
   `lib/mcp/tools.ts`; write tools never mutate directly — they return a
   `proposal` the panel renders as a confirm card, and only "Apply" performs the
   mutation.

`lib/mcp/attribute-assembly.ts` is the one place that assembles "what does this
GS1 brick require" (baseline core + brick's standard extended attributes + custom
rows/image requirements), used by both the UI and the connector so they never
diverge.

### Mutation safety pattern (MCP connector)

No mutating MCP tool acts on its first call. It returns a preview of the change
plus a short-lived single-use token (`lib/mcp/pending.ts`); a separate
`confirm_pending_change` tool performs the actual mutation. Deletions require an
additional `tgc.destructive` scope on top of the relevant write scope. This
confirmation lives in the protocol layer (not just a UI affordance) because
external MCP clients have no UI of ours to render a confirm card in — see
`docs/mcp-enterprise-auth-trd.md` (ENT-06a).

### Requirement authoring model

Attributes are defined at **GS1 brick** level, never free-text category level. A
retailer requirement (`AttributeProfile`) can map to multiple GS1 bricks (via
`components/portal/gs1-brick-picker.tsx`); each mapped brick keeps its own
attribute set (nothing merges across bricks). The free-text Category/Product Type
field is independent of, and drives only the list-view label for, however many
GS1 bricks are actually mapped underneath.

### Evaluation

`lib/copilot/run-eval.ts` runs an uploaded golden dataset (see
`scripts/generate-golden-dataset.ts`, `scripts/upload-golden-dataset.mjs`) through
the *same* `lib/copilot/agent.ts` function used in production, with results traced
to LangSmith, so eval scores reflect real agent behavior. The external MCP
connector is not traced and not covered by this golden set (see
`docs/eval-framework-pm-presentation.md`).

## Conventions

- Path alias `@/*` maps to the repo root (see `tsconfig.json`).
- `lib/generated-suppliers.ts` is generated mock data (thousands of literal rows)
  and is excluded from linting — do not hand-edit expecting lint feedback; regen
  via `scripts/generate-suppliers.ts` if it needs to change.
- ESLint: pre-existing UI backlog rules (`@typescript-eslint/no-unused-vars`,
  `react/no-unescaped-entities`, `@next/next/no-img-element`) are set to `warn`,
  not `error` — don't quietly upgrade them project-wide as a side effect of an
  unrelated change. New code should still avoid triggering them.
- Env vars used: `GEMINI_API_KEY` (copilot agent model), `LANGSMITH_DATASET`,
  `ENABLE_EVAL_TRIGGER` / `NEXT_PUBLIC_EVAL_TRIGGER_SECRET` (eval trigger gating),
  `TGC_OAUTH_PRIVATE_JWK` (MCP OAuth signing key — **required** in both
  Production and Preview on Vercel; without it each serverless instance derives
  its own key, breaking token/client-registration continuity across instances).
- Root-level `*.csv` and `gs1_extended_attribute_master_code_list.csv` are source
  data for the GS1 attribute library / generated datasets, not build artifacts —
  don't delete them as "unused." `docs/*.csv` duplicates some of these for the
  MCP/docs context.
