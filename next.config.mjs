/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Braintrust is a server-only observability SDK (Node APIs). Keep it out of
  // the bundle so the copilot route loads it from node_modules at runtime,
  // avoiding Turbopack resolution warnings for its optional dependencies.
  serverExternalPackages: ["braintrust"],
}

export default nextConfig
