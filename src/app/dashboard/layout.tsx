import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BarberApp — Reservas para barberías y peluquerías',
  description: 'Sistema de reservas online para barberías y peluquerías. Gestiona tus turnos desde Instagram, WhatsApp o Google.',
  manifest: '/manifest.json',
  themeColor: '#e05f10',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BarberApp',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}