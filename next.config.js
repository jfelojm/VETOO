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
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'barberapp-ebon.vercel.app' }],
        destination: 'https://turnapp.lat/:path*',
        permanent: true,
      },
      /** URLs cortas para SEO / sitemap (canónico sigue siendo /auth/*) */
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/registro', destination: '/auth/registro', permanent: true },
      /**
       * NO redirigir www → apex aquí: en Vercel suele configurarse apex → www.
       * Si ambas reglas existen, el navegador entra en bucle (ERR_TOO_MANY_REDIRECTS).
       * El dominio canónico se define en Vercel (Dominios → asignar el que sea “principal”).
       */
    ]
  },
}

module.exports = nextConfig
