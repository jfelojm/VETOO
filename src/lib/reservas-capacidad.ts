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

function hashString32(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

/** Reservas del día ya acotadas a `reservas`; cuenta por barbero (solo filas con barbero_id). */
function contarReservasDiaPorBarbero(
  reservas: ReservaSlotRow[],
  ids: string[]
): Map<string, number> {
  const set = new Set(ids)
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, 0)
  for (const r of reservas) {
    if (r.barbero_id && set.has(r.barbero_id)) {
      m.set(r.barbero_id, (m.get(r.barbero_id) ?? 0) + 1)
    }
  }
  return m
}

/**
 * Barbero para “sin preferencia”: el que menos reservas lleva ese día entre los libres en el hueco;
 * si empatan, desempate estable con `tieBreakSeed` (fecha/hora + negocio) para repartir entre iguales.
 */
export function elegirBarberoParaSinPreferencia(
  cursor: Date,
  slotFin: Date,
  barberIds: string[],
  reservas: ReservaSlotRow[],
  bloqueos: BloqueoSlotRow[],
  tieBreakSeed: string
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

  const counts = contarReservasDiaPorBarbero(reservas, libres)
  let min = Infinity
  for (const id of libres) {
    const c = counts.get(id) ?? 0
    if (c < min) min = c
  }
  const candidatos = libres.filter(id => (counts.get(id) ?? 0) === min)
  candidatos.sort((a, b) => a.localeCompare(b))
  const idx = hashString32(tieBreakSeed) % candidatos.length
  return candidatos[idx]
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
