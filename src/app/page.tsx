import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Vetoo | Gestión para clínicas veterinarias',
  description: 'Gestión digital para clínicas veterinarias en Ecuador.',
}

export default function HomePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: '#FBF7F4' }}
    >
      <Image src="/logo.svg" alt="" width={96} height={96} priority className="mb-6" />
      <h1
        className="text-center font-serif"
        style={{ fontSize: 48, color: '#2C2420', lineHeight: 1.1 }}
      >
        Vetoo
      </h1>
      <p className="mt-4 max-w-lg text-center" style={{ color: '#7A6A62', fontSize: 16 }}>
        Gestión digital para clínicas veterinarias en Ecuador
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/auth/login"
          className="inline-flex min-w-[160px] items-center justify-center font-medium text-white"
          style={{
            backgroundColor: '#E8845A',
            borderRadius: 10,
            height: 44,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          Ingresar
        </Link>
        <Link
          href="/auth/registro"
          className="inline-flex min-w-[200px] items-center justify-center font-medium"
          style={{
            border: '2px solid #E8845A',
            color: '#E8845A',
            backgroundColor: 'transparent',
            borderRadius: 10,
            height: 44,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          Registrar mi clínica
        </Link>
      </div>
    </div>
  )
}
