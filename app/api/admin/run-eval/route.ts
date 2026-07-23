// Discreet, opt-in trigger for the golden-set eval — lets one person kick off
// a fresh Braintrust experiment from the browser instead of asking engineering
// to run `npm run eval`. Off by default: both env vars below must be set, or
// this route 404s as if it doesn't exist (no route/login page to discover).
//
// Enable by setting on the deployment (e.g. Vercel, or locally in .env.local):
//   ENABLE_EVAL_TRIGGER=true
//   EVAL_TRIGGER_SECRET=<a private value only you know>
//
// Trigger with:
//   curl -X POST "https://<your-deployment>/api/admin/run-eval?secret=<value>"

import { runGoldenEval } from "@/lib/copilot/run-eval"

export async function POST(req: Request) {
  if (process.env.ENABLE_EVAL_TRIGGER !== "true" || !process.env.EVAL_TRIGGER_SECRET) {
    return new Response(null, { status: 404 })
  }

  const suppliedSecret = new URL(req.url).searchParams.get("secret")
  if (suppliedSecret !== process.env.EVAL_TRIGGER_SECRET) {
    return new Response(null, { status: 404 })
  }

  try {
    const result = await runGoldenEval()
    return Response.json({
      ok: true,
      experimentUrl: result.summary.experimentUrl,
      projectUrl: result.summary.projectUrl,
      resultCount: result.results.length,
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
