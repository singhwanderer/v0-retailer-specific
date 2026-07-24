// Discreet, opt-in trigger for the golden-set eval — backs the small button
// on the supplier product-attributes screen so one person can kick off a
// fresh LangSmith experiment from the browser instead of running anything in
// a terminal. Off by default: both env vars below must be set, or this route
// 404s as if it doesn't exist (no route/login page to discover).
//
// Enable by setting on the deployment (e.g. Vercel, or locally in .env.local):
//   ENABLE_EVAL_TRIGGER=true
//   NEXT_PUBLIC_EVAL_TRIGGER_SECRET=<a private value only you know>
//
// (NEXT_PUBLIC_ so the button in the browser can send it automatically —
// this is a personal/demo-grade gate, not a real secret; don't reuse this
// value for anything sensitive.)

import { runGoldenEval } from "@/lib/copilot/run-eval"

export async function POST(req: Request) {
  if (process.env.ENABLE_EVAL_TRIGGER !== "true" || !process.env.NEXT_PUBLIC_EVAL_TRIGGER_SECRET) {
    return new Response(null, { status: 404 })
  }

  const suppliedSecret = new URL(req.url).searchParams.get("secret")
  if (suppliedSecret !== process.env.NEXT_PUBLIC_EVAL_TRIGGER_SECRET) {
    return new Response(null, { status: 404 })
  }

  try {
    const { experimentName, resultCount } = await runGoldenEval()
    return Response.json({ ok: true, experimentName, resultCount })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
