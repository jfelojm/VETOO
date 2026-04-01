import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import AuthLandingHashRedirect from '@/components/auth/AuthLandingHashRedirect'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Turnapp — Reservas online para tu negocio',
  description:
    'Tus clientes reservan desde Instagram o WhatsApp. Tú gestionas todo desde un panel simple.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e05f10" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Turnapp" />
      </head>
      <body className={inter.className}>
        <AuthLandingHashRedirect />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}