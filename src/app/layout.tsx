import type { Metadata } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'
import { Toaster } from 'sonner'
import AuthLandingHashRedirect from '@/components/auth/AuthLandingHashRedirect'
import Analytics from '@/components/Analytics'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

/** Dominio canónico (SEO) — no usar env aquí para evitar dominios duplicados en indexación */
const SITE_URL = 'https://turnapp.lat'

const GA_ID =
  process.env.NEXT_PUBLIC_GA_ID ||
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  'G-2B9N6PG9V5'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    /** Resuelve a la URL absoluta de la ruta actual (p. ej. /dashboard → https://turnapp.lat/dashboard) */
    canonical: './',
  },
  title: 'TurnApp — Reservas online para tu negocio',
  description:
    'Tus clientes reservan desde Instagram o WhatsApp. Tú gestionas todo desde un panel simple.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'TurnApp — Reservas online para tu negocio',
    description:
      'Tus clientes reservan desde Instagram o WhatsApp. Tú gestionas todo desde un panel simple.',
    url: SITE_URL,
    siteName: 'TurnApp',
    locale: 'es_EC',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'TurnApp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TurnApp — Reservas online para tu negocio',
    description:
      'Tus clientes reservan desde Instagram o WhatsApp. Tú gestionas todo desde un panel simple.',
    images: ['/twitter-image'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${dmSans.variable}`}>
      <head>
        {/* Explícito: a veces el merge de metadata no basta para Search Console */}
        <meta
          name="google-site-verification"
          content="4Thv0XFzGovF9kU6c_x3ruRaAp1vyjHHPWxJDKBLadU"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D9B6A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TurnApp" />
      </head>
      <body className={dmSans.className}>
        <Analytics gaId={GA_ID} />
        <AuthLandingHashRedirect />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
