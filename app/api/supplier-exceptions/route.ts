// Exception feed for the supplier portal.
//
// The demo store is a module global, so the browser has its own copy that is
// seeded identically but never sees writes made by the MCP server (which run
// in the Node process). Without this route, an exception granted in chat would
// change the retailer's numbers and silently do nothing on the supplier side.
// The supplier portal polls here and hydrates its copy from the response.
//
// Reads through exceptionsGrantedToVendor() rather than a raw store read, for
// two reasons: it now gathers rows from EVERY retailer tenant that granted one
// (a supplier trades with several, and a raw read would only ever surface the
// default tenant's), and it applies the same "only rows naming this vendor"
// narrowing the supplier's MCP tool uses — so the portal and the connector can
// never disagree about what a supplier is entitled to see.

import { NextResponse } from "next/server"
import { exceptionsGrantedToVendor } from "@/lib/mcp/store"
import { SUPPLIER_PERSONA } from "@/lib/supplier-catalogue"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ exceptions: exceptionsGrantedToVendor(SUPPLIER_PERSONA) })
}
