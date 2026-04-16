import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Planes y precios | TurnApp',
  description: 'Básico con staff ilimitado, Pro multi-sucursal y Premium con agente IA para reservas por WhatsApp.',
  alternates: { canonical: 'https://turnapp.lat/planes' },
}

export default function PlanesPage() {
  return (
    <div className="min-h-screen bg-chalk px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-bold text-ink md:text-3xl">Planes TurnApp</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-muted">
        Compara funciones y precios en la landing. Elige el plan que encaje con tu negocio.
      </p>
      <Link
        href="/#precios"
        className="mt-10 inline-block font-medium text-brand-primary underline underline-offset-4 hover:text-brand-dark"
      >
        Ver tabla de precios
      </Link>
      <p className="mt-8">
        <Link href="/" className="text-sm text-ink-muted hover:text-ink">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  )
}
