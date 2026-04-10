import type { Plan } from '@/types'

/** Campos mínimos del negocio para resolver permisos */
export type NegocioPlanInput = {
  plan: Plan | string
  plan_expira_at: string | null
  trial_expira_at: string | null
}

const ahora = () => new Date()

/** Suscripción de pago vigente (no mira trial). */
export function suscripcionPagoVigente(n: NegocioPlanInput): boolean {
  if (n.plan === 'cancelled') return false
  if (n.plan === 'trial') return false
  if (!n.plan_expira_at) return true
  return new Date(n.plan_expira_at) > ahora()
}

/** Trial gratuito aún activo. */
export function trialVigente(n: NegocioPlanInput): boolean {
  return (
    n.plan === 'trial' &&
    !!n.trial_expira_at &&
    new Date(n.trial_expira_at) > ahora()
  )
}

/**
 * Nivel comercial efectivo para límites y flags.
 * - trial activo → trato Pro (para que prueben todo).
 * - basic pagado y vigente → Básico.
 * - pro / premium pagado y vigente → Pro.
 * - vencido o cancelado → restricción fuerte (solo_lectura o basic según caso).
 */
export type NivelPlanEfectivo = 'pro' | 'basic' | 'solo_lectura'

export function nivelPlanEfectivo(n: NegocioPlanInput): NivelPlanEfectivo {
  if (n.plan === 'cancelled') return 'solo_lectura'

  if (trialVigente(n)) return 'pro'

  if (n.plan === 'trial' && !trialVigente(n)) {
    return 'solo_lectura'
  }

  if (n.plan === 'pro' || n.plan === 'premium') {
    return suscripcionPagoVigente(n) ? 'pro' : 'solo_lectura'
  }

  if (n.plan === 'basic') {
    return suscripcionPagoVigente(n) ? 'basic' : 'solo_lectura'
  }

  return 'basic'
}

export type CapacidadesPlan = {
  nivel: NivelPlanEfectivo
  /** Profesionales activos máximos (cuenta filas barberos activo=true). */
  maxBarberosActivos: number
  maxServicios: number
  /** Reportes con insights (staff top, servicios, hora pico, ingresos, no-shows). */
  reportesAvanzados: boolean
  /** Bloquear / desbloquear clientes (lista negra manual). */
  listaNegraClientes: boolean
  /** Marca en página pública (logo ya existe; colores personalizados pueden ampliarse). */
  marcaReservasPersonalizada: boolean
  /** Puede crear staff / servicios / editar agenda operativa. */
  puedeOperarNegocio: boolean
}

export function capacidadesDelNegocio(n: NegocioPlanInput): CapacidadesPlan {
  const nivel = nivelPlanEfectivo(n)

  if (nivel === 'solo_lectura') {
    return {
      nivel,
      maxBarberosActivos: 0,
      maxServicios: 0,
      reportesAvanzados: false,
      listaNegraClientes: false,
      marcaReservasPersonalizada: false,
      puedeOperarNegocio: false,
    }
  }

  if (nivel === 'pro') {
    return {
      nivel,
      maxBarberosActivos: 999,
      maxServicios: 999,
      reportesAvanzados: true,
      listaNegraClientes: true,
      marcaReservasPersonalizada: true,
      puedeOperarNegocio: true,
    }
  }

  // basic
  return {
    nivel,
    maxBarberosActivos: 5,
    maxServicios: 999,
    reportesAvanzados: false,
    listaNegraClientes: false,
    marcaReservasPersonalizada: false,
    puedeOperarNegocio: true,
  }
}

export function mensajeBloqueoPlan(nivel: NivelPlanEfectivo): string | null {
  if (nivel === 'solo_lectura') {
    return 'Tu suscripción no está activa. Renueva o elige un plan para seguir operando con Turnapp.'
  }
  return null
}
