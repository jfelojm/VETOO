import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Vetoo',
  description: 'SaaS de gestión para clínicas veterinarias en Ecuador.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

