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

/** “Sin preferencia”: hay capacidad si barberos libres > reservas sin barbero en ese hueco. */
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

  const reservasSolapadas = reservas.filter(r => {
    const rInicio = new Date(r.fecha_hora)
    const rFin = addMinutes(rInicio, r.duracion)
    return solapa(cursor, slotFin, rInicio, rFin)
  })

  const ocupadosPorBarbero = new Set<string>()
  let reservasSinBarbero = 0
  for (const r of reservasSolapadas) {
    if (r.barbero_id) ocupadosPorBarbero.add(r.barbero_id)
    else reservasSinBarbero++
  }

  const barberosLibres = barberIds.filter(
    id => !ocupadosPorBarbero.has(id) && !barberoBloqueadoEnSlot(id, cursor, slotFin, bloqueos)
  )

  if (barberosLibres.length > reservasSinBarbero) {
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
