import { addMinutes } from 'date-fns'

export type ReservaSlotRow = {
  barbero_id: string | null
  fecha_hora: string
  duracion: number
}

export type BloqueoSlotRow = {
  barbero_id: string | null
  fecha_desde: string
  fecha_hasta: string
}

export function solapa(cursor: Date, slotFin: Date, inicio: Date, fin: Date) {
  return cursor < fin && slotFin > inicio
}

export function barberoBloqueadoEnSlot(
  barberoId: string,
  cursor: Date,
  slotFin: Date,
  bloqueos: BloqueoSlotRow[]
): boolean {
  return bloqueos.some(b => {
    const bInicio = new Date(b.fecha_desde)
    const bFin = new Date(b.fecha_hasta)
    if (!solapa(cursor, slotFin, bInicio, bFin)) return false
    if (!b.barbero_id) return true
    return b.barbero_id === barberoId
  })
}

/** Ocupación explícita + reservas sin barbero en el hueco + quiénes siguen libres (sin bloqueo). */
export function analizarCapacidadSlot(
  cursor: Date,
  slotFin: Date,
  barberIds: string[],
  reservas: ReservaSlotRow[],
  bloqueos: BloqueoSlotRow[]
) {
  const reservasSolapadas = reservas.filter(r => {
    const rInicio = new Date(r.fecha_hora)
    const rFin = addMinutes(rInicio, r.duracion)
    return solapa(cursor, slotFin, rInicio, rFin)
  })

  const ocupadosExplicit = new Set<string>()
  let sinAsignar = 0
  for (const r of reservasSolapadas) {
    if (r.barbero_id) ocupadosExplicit.add(r.barbero_id)
    else sinAsignar++
  }

  const libres = barberIds.filter(
    id => !ocupadosExplicit.has(id) && !barberoBloqueadoEnSlot(id, cursor, slotFin, bloqueos)
  )

  return { reservasSolapadas, ocupadosExplicit, sinAsignar, libres }
}

/** “Sin preferencia”: hay capacidad si hay más barberos libres que reservas sin barbero en ese hueco. */
export function slotDisponibleSinPreferencia(
  cursor: Date,
  slotFin: Date,
  barberIds: string[],
  reservas: ReservaSlotRow[],
  bloqueos: BloqueoSlotRow[]
): { disponible: boolean; motivo?: 'bloqueo' | 'ocupado' } {
  if (barberIds.length === 0) {
    return { disponible: false, motivo: 'ocupado' }
  }

  const { sinAsignar, libres } = analizarCapacidadSlot(
    cursor,
    slotFin,
    barberIds,
    reservas,
    bloqueos
  )

  if (libres.length > sinAsignar) {
    return { disponible: true }
  }

  const bloqueoNegocio = bloqueos.some(b => {
    if (b.barbero_id) return false
    const bInicio = new Date(b.fecha_desde)
    const bFin = new Date(b.fecha_hasta)
    return solapa(cursor, slotFin, bInicio, bFin)
  })
  return { disponible: false, motivo: bloqueoNegocio ? 'bloqueo' : 'ocupado' }
}

/** Barbero estable para guardar una reserva “sin preferencia” (orden por id). */
export function elegirBarberoParaSinPreferencia(
  cursor: Date,
  slotFin: Date,
  barberIds: string[],
  reservas: ReservaSlotRow[],
  bloqueos: BloqueoSlotRow[]
): string | null {
  if (barberIds.length === 0) return null
  const { libres, sinAsignar } = analizarCapacidadSlot(
    cursor,
    slotFin,
    barberIds,
    reservas,
    bloqueos
  )
  if (libres.length <= sinAsignar) return null
  /** Primer libre según el orden de `barberIds` (convención: negocio ordenado por nombre). */
  return libres[0]
}

/**
 * Barbero concreto: libre si no tiene reserva explícita ni bloqueo y las reservas sin asignar
 * pueden cubrirse con otros profesionales del pool (evita solapar con un hueco ya “tomado” por sin preferencia).
 */
export function slotDisponibleParaBarberoConcreto(
  barberoId: string,
  cursor: Date,
  slotFin: Date,
  barberIds: string[],
  reservas: ReservaSlotRow[],
  bloqueos: BloqueoSlotRow[]
): { disponible: boolean; motivo?: 'bloqueo' | 'ocupado' } {
  if (!barberIds.includes(barberoId)) {
    return { disponible: false, motivo: 'ocupado' }
  }
  if (barberoBloqueadoEnSlot(barberoId, cursor, slotFin, bloqueos)) {
    return { disponible: false, motivo: 'bloqueo' }
  }

  const { libres, sinAsignar } = analizarCapacidadSlot(
    cursor,
    slotFin,
    barberIds,
    reservas,
    bloqueos
  )

  if (!libres.includes(barberoId)) {
    return { disponible: false, motivo: 'ocupado' }
  }

  const otrosLibres = libres.length - 1
  if (otrosLibres < sinAsignar) {
    return { disponible: false, motivo: 'ocupado' }
  }

  return { disponible: true }
}
