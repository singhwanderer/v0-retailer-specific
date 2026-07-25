// Exception feed for the supplier portal.
//
// The demo store is a module global, so the browser has its own copy that is
// seeded identically but never sees writes made by the MCP server (which run
// in the Node process). Without this route, an exception granted in chat would
// change the retailer's numbers and silently do nothing on the supplier side.
// The supplier portal polls here and hydrates its copy from the response.

import { NextResponse } from "next/server"
import { getStore } from "@/lib/mcp/store"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ exceptions: getStore().vendorExceptions })
}
