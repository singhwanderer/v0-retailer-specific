// Public JWK set for verifying tokens issued by the demo authorization server.
//
// Only the public half is ever exported here — the private key stays in the
// signing path in lib/mcp/oauth.ts.

import { getKeys } from "@/lib/mcp/oauth"

export async function GET() {
  const { publicJwk } = await getKeys()
  return Response.json({ keys: [publicJwk] }, { headers: { "Cache-Control": "no-store" } })
}
