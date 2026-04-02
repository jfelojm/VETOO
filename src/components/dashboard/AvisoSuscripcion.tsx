import Link from 'next/link'

export default function AvisoSuscripcion({ mensaje }: { mensaje: string }) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">{mensaje}</p>
      <p className="mt-2 text-amber-800/90">
        <Link href="/#planes" className="font-semibold text-brand-700 hover:text-brand-800 underline">
          Ver planes y precios
        </Link>
        {' · '}
        <a href="https://wa.me/593987122959" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          WhatsApp
        </a>
      </p>
    </div>
  )
}
