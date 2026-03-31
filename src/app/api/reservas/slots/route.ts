import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, addMinutes } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

/** Zona del negocio: en Vercel el servidor está en UTC; el horario JSON es “reloj local” del salón. */
const TZ_NEGOCIO = process.env.NEGOCIO_TIMEZONE || 'America/Guayaquil'

/** Día ISO (lunes=1 … domingo=7) → clave en `negocios.horario` */
const DIA_POR_ISO = {
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
  7: 'domingo',
} as const

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function nombreDiaEnZona(fechaIso: string, timeZone: string) {
  const mediodia = fromZonedTime(`${fechaIso}T12:00:00`, timeZone)
  const isoDow = Number(formatInTimeZone(mediodia, timeZone, 'i'))
  return DIA_POR_ISO[isoDow as keyof typeof DIA_POR_ISO]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const negocioId = searchParams.get('negocio_id')
  const fechaIso  = searchParams.get('fecha_iso')
  const barberoId = searchParams.get('barbero_id') || undefined
  const conDetalle = searchParams.get('detalle') === '1'

  if (!negocioId || !fechaIso) {
    return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, horario, duracion_turno_min')
    .eq('id', negocioId)
    .single()

  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const diaNombre = nombreDiaEnZona(fechaIso, TZ_NEGOCIO)
  const horarioDia = diaNombre ? negocio.horario?.[diaNombre] : undefined

  if (!horarioDia?.abierto || !horarioDia?.desde || !horarioDia?.hasta) {
    return NextResponse.json({ slots: [] })
  }

  const [hDesde, mDesde] = String(horarioDia.desde).split(':').map(Number)
  const [hHasta, mHasta] = String(horarioDia.hasta).split(':').map(Number)

  const inicioJornada = fromZonedTime(
    `${fechaIso}T${pad2(hDesde)}:${pad2(mDesde)}:00`,
    TZ_NEGOCIO
  )
  const finJornada = fromZonedTime(
    `${fechaIso}T${pad2(hHasta)}:${pad2(mHasta)}:00`,
    TZ_NEGOCIO
  )
  const duracion = negocio.duracion_turno_min

  const rangoInicio = fromZonedTime(`${fechaIso}T00:00:00`, TZ_NEGOCIO)
  const rangoFinExclusivo = addDays(rangoInicio, 1)

  const { data: reservas } = await supabase
    .from('reservas')
    .select('barbero_id, fecha_hora, duracion, estado')
    .eq('negocio_id', negocioId)
    .gte('fecha_hora', rangoInicio.toISOString())
    .lt('fecha_hora', rangoFinExclusivo.toISOString())
    .neq('estado', 'cancelada')

  const { data: bloqueos } = await supabase
    .from('bloqueos')
    .select('*')
    .eq('negocio_id', negocioId)
    .lt('fecha_desde', rangoFinExclusivo.toISOString())
    .gt('fecha_hasta', rangoInicio.toISOString())

  const slots = []
  let cursor = new Date(inicioJornada)

  while (addMinutes(cursor, duracion) <= finJornada) {
    const slotFin = addMinutes(cursor, duracion)
    const horaStr = formatInTimeZone(cursor, TZ_NEGOCIO, 'HH:mm')

    const conflictoReserva = (reservas ?? []).find((r: any) => {
      if (barberoId && r.barbero_id !== barberoId) return false
      const rInicio = new Date(r.fecha_hora)
      const rFin    = addMinutes(rInicio, r.duracion)
      return cursor < rFin && slotFin > rInicio
    })

    const conflictoBloqueo = (bloqueos ?? []).find((b: any) => {
      if (barberoId && b.barbero_id && b.barbero_id !== barberoId) return false
      const bInicio = new Date(b.fecha_desde)
      const bFin    = new Date(b.fecha_hasta)
      return cursor < bFin && slotFin > bInicio
    })

    const disponible = !conflictoReserva && !conflictoBloqueo
    const slot: { hora: string; disponible: boolean; motivo?: 'bloqueo' | 'ocupado' } = {
      hora: horaStr,
      disponible,
    }
    if (conDetalle && !disponible) {
      slot.motivo = conflictoBloqueo ? 'bloqueo' : 'ocupado'
    }
    slots.push(slot)

    cursor = addMinutes(cursor, duracion)
  }

  return NextResponse.json({ slots })
}
