// Generates the signing key for the demo OAuth authorization server.
//
// The key must be the SAME across every serverless instance of a deployment.
// When it isn't, each instance signs with its own key and a token minted by one
// is rejected by the next — which surfaces as "Token rejected: signature
// verification failed" in the portal's Access log and, for the caller, a full
// re-authentication part-way through a session.
//
//   pnpm gen:oauth-key
//
// Paste the printed value into TGC_OAUTH_PRIVATE_JWK in the Vercel project
// (Production and Preview), then redeploy. Without the variable the server falls
// back to generating a throwaway key per instance, which is fine locally.

import { exportJWK, generateKeyPair } from "jose"

const ALG = "RS256"

const { privateKey } = await generateKeyPair(ALG, { extractable: true })
const jwk = await exportJWK(privateKey)
jwk.alg = ALG
jwk.use = "sig"

// Base64 so the value survives the Vercel environment-variable UI as one opaque
// string, rather than as JSON that has to be escaped correctly.
const encoded = Buffer.from(JSON.stringify(jwk), "utf8").toString("base64")

console.log(`
Add this to your Vercel project as TGC_OAUTH_PRIVATE_JWK
(Settings → Environment Variables → Production + Preview), then redeploy.

This is a PRIVATE key. Do not commit it, and do not paste it into a PR or issue.

${encoded}
`)
