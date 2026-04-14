/** @type {import('next').NextConfig} */
const nextConfig = {
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
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'barberapp-ebon.vercel.app' }],
        destination: 'https://turnapp.lat/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.turnapp.lat' }],
        destination: 'https://turnapp.lat/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
