/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Prevent the bundler from trying to bundle langsmith (server-only).
  // langsmith/dist/langchain.js statically imports @langchain/core which is
  // not installed; externalizing the whole package avoids that resolution.
  serverExternalPackages: ["langsmith"],
}

export default nextConfig
