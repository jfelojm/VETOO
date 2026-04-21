const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Evita que Turbopack tome el lockfile del repo padre y falle build/deploy */
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/registro', destination: '/auth/registro', permanent: true },
    ]
  },
}

module.exports = nextConfig
