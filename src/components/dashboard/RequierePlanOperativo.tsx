'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'

export default function RequierePlanOperativo({ children }: { children: ReactNode }) {
  const { capacidades } = usePlanAcceso()
  if (!capacidades?.puedeOperarNegocio) {
    return (
      <div className="card max-w-lg">
        <h2 className="font-semibold text-gray-900 mb-2">Suscripción requerida</h2>
        <p className="text-sm text-gray-600 mb-4">
          Con tu plan actual solo puedes consultar información. Renueva o contrata un plan para gestionar
          staff, servicios y bloqueos.
        </p>
        <Link href="/#planes" className="btn-primary inline-block text-center">
          Ver planes
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
