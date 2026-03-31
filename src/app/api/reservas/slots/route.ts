import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, format } from 'date-fns'

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

  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
  const diaSemana = new Date(anio, mes - 1, dia).getDay()
  const diaNombre = DIAS[diaSemana]
  const horarioDia = negocio.horario?.[diaNombre]

  if (!horarioDia?.abierto || !horarioDia?.desde || !horarioDia?.hasta) {
    return NextResponse.json({ slots: [] })
  }

  const [hDesde, mDesde] = String(horarioDia.desde).split(':').map(Number)
  const [hHasta, mHasta] = String(horarioDia.hasta).split(':').map(Number)

  const inicio = new Date(anio, mes - 1, dia, hDesde, mDesde, 0)
  const fin    = new Date(anio, mes - 1, dia, hHasta, mHasta, 0)
  const duracion = negocio.duracion_turno_min

  const inicioUTC = new Date(Date.UTC(anio, mes - 1, dia, 0, 0, 0))
  const finUTC    = new Date(Date.UTC(anio, mes - 1, dia, 23, 59, 59))

  const { data: reservas } = await supabase
    .from('reservas')
    .select('barbero_id, fecha_hora, duracion, estado')
    .eq('negocio_id', negocioId)
    .gte('fecha_hora', inicioUTC.toISOString())
    .lte('fecha_hora', finUTC.toISOString())
    .neq('estado', 'cancelada')

  const { data: bloqueos } = await supabase
    .from('bloqueos')
    .select('*')
    .eq('negocio_id', negocioId)
    .lte('fecha_desde', finUTC.toISOString())
    .gte('fecha_hasta', inicioUTC.toISOString())

  const slots = []
  let cursor = new Date(inicio)

  while (addMinutes(cursor, duracion) <= fin) {
    const slotFin = addMinutes(cursor, duracion)
    const horaStr = format(cursor, 'HH:mm')

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