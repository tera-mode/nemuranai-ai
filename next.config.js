/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig