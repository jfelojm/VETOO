import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, addMinutes, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Horario, HorarioDia, Reserva, Bloqueo, SlotDisponible } from '@/types'

// Combinar clases de Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatear fecha en español
export function formatFecha(fecha: string | Date, formato = "PPP 'a las' p") {
  return format(typeof fecha === 'string' ? parseISO(fecha) : fecha, formato, { locale: es })
}

// Formatear solo hora
export function formatHora(fecha: string | Date) {
  return format(typeof fecha === 'string' ? parseISO(fecha) : fecha, 'HH:mm', { locale: es })
}

/** Iniciales para avatar (p. ej. "Carlos Méndez" → "CM") */
export function inicialesNombre(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) {
    const a = p[0]?.[0] ?? ''
    const b = p[p.length - 1]?.[0] ?? ''
    return `${a}${b}`.toUpperCase()
  }
  return nombre.trim().slice(0, 2).toUpperCase() || '?'
}

/** Nombre mostrado en listados de reserva (prioriza lo escrito en esa cita vs. ficha cliente por teléfono). */
export function nombreClienteReservaRow(r: {
  cliente_nombre_snapshot?: string | null
  cliente?: { nombre?: string | null } | null
}): string {
  const s = r.cliente_nombre_snapshot?.trim()
  if (s) return s
  return r.cliente?.nombre?.trim() || 'Sin nombre'
}

// Nombre del día en español
const DIAS_SEMANA = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'] as const
type DiaSemana = typeof DIAS_SEMANA[number]

export function getDiaSemana(fecha: Date): DiaSemana {
  return DIAS_SEMANA[fecha.getDay()]
}

// Generar todos los slots de tiempo para un día
export function generarSlots(
  fecha: Date,
  horario: Horario,
  duracionMin: number,
  reservasExistentes: any[],
  bloqueos: Bloqueo[],
  barberoId?: string
): SlotDisponible[] {
  const dia = getDiaSemana(fecha)
  const horarioDia: HorarioDia = horario[dia]

  if (!horarioDia || !horarioDia.abierto || !horarioDia.desde || !horarioDia.hasta) {
    return []
  }

  const desde = String(horarioDia.desde)
  const hasta = String(horarioDia.hasta)

  const slots: SlotDisponible[] = []
  const [hDesde, mDesde] = desde.split(':').map(Number)
const [hHasta, mHasta] = hasta.split(':').map(Number)

  const inicio = new Date(fecha)
  inicio.setHours(hDesde, mDesde, 0, 0)

  const fin = new Date(fecha)
  fin.setHours(hHasta, mHasta, 0, 0)

  const ahora = new Date()
  let cursor = new Date(inicio)

  while (addMinutes(cursor, duracionMin) <= fin) {
    const slotFin = addMinutes(cursor, duracionMin)
    const horaStr = format(cursor, 'HH:mm')

    // ¿Ya pasó?
    const ahoraConMargen = new Date(ahora.getTime() + 30 * 60000) // 30 min de margen
const yaPaso = cursor.getTime() < ahoraConMargen.getTime()

    // ¿Choca con una reserva activa?
    const tieneReserva = reservasExistentes.some(r => {
      if (r.estado === 'cancelada') return false
      if (barberoId && r.barbero_id !== barberoId) return false
      const rInicio = parseISO(r.fecha_hora)
      const rFin = parseISO(r.fecha_hora_fin)
      return cursor < rFin && slotFin > rInicio
    })

    // ¿Está bloqueado?
    const estaBloqueado = bloqueos.some(b => {
      if (barberoId && b.barbero_id && b.barbero_id !== barberoId) return false
      const bInicio = parseISO(b.fecha_desde)
      const bFin = parseISO(b.fecha_hasta)
      return cursor < bFin && slotFin > bInicio
    })

    slots.push({
      hora: horaStr,
      disponible: !yaPaso && !tieneReserva && !estaBloqueado,
    })

    cursor = addMinutes(cursor, duracionMin)
  }

  return slots
}

// Verificar si un negocio puede recibir reservas (plan activo)
export function planActivo(negocio: { plan: string; plan_expira_at: string | null; trial_expira_at: string | null }): boolean {
  if (negocio.plan === 'cancelled') return false
  if (negocio.plan === 'trial') {
    if (!negocio.trial_expira_at) return false
    return new Date(negocio.trial_expira_at) > new Date()
  }
  if (negocio.plan_expira_at) {
    return new Date(negocio.plan_expira_at) > new Date()
  }
  return true
}

// Formatear precio
export function formatPrecio(precio: number | null, moneda = 'USD') {
  if (!precio) return 'A consultar'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: moneda }).format(precio)
}
