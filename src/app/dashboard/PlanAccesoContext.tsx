'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  capacidadesDelNegocio,
  mensajeBloqueoPlan,
  type CapacidadesPlan,
  type NegocioPlanInput,
} from '@/lib/plan-acceso'

type NegocioContexto = NegocioPlanInput & { id: string; nombre: string; slug: string; tipo_negocio?: string | null }

type Valor = {
  negocio: NegocioContexto | null
  capacidades: CapacidadesPlan | null
  avisoPlan: string | null
}

const PlanAccesoContext = createContext<Valor | null>(null)

export function PlanAccesoProvider({
  negocio,
  children,
}: {
  negocio: NegocioContexto | null
  children: ReactNode
}) {
  const valor = useMemo<Valor>(() => {
    if (!negocio) {
      return { negocio: null, capacidades: null, avisoPlan: null }
    }
    const capacidades = capacidadesDelNegocio(negocio)
    return {
      negocio,
      capacidades,
      avisoPlan: mensajeBloqueoPlan(capacidades.nivel),
    }
  }, [negocio])

  return <PlanAccesoContext.Provider value={valor}>{children}</PlanAccesoContext.Provider>
}

export function usePlanAcceso() {
  const ctx = useContext(PlanAccesoContext)
  if (!ctx) {
    throw new Error('usePlanAcceso debe usarse dentro de PlanAccesoProvider')
  }
  return ctx
}
