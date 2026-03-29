import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const negocioId = searchParams.get('negocio_id')
  const fechaIso  = searchParams.get('fecha_iso') // formato: YYYY-MM-DD
  const barberoId = searchParams.get('barbero_id') || undefined

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

  // Determinar el día de la semana
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia, 12, 0, 0)
  const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
  const diaNombre = DIAS[fecha.getDay()]
  const horarioDia = negocio.horario?.[diaNombre]

  if (!horarioDia?.abierto || !horarioDia?.desde || !horarioDia?.hasta) {
    return NextResponse.json({ slots: [] })
  }

  // Generar slots del día
  const [hDesde, mDesde] = String(horarioDia.desde).split(':').map(Number)
  const [hHasta, mHasta] = String(horarioDia.hasta).split(':').map(Number)

  const inicio = new Date(anio, mes - 1, dia, hDesde, mDesde, 0)
  const fin    = new Date(anio, mes - 1, dia, hHasta, mHasta, 0)
  const duracion = negocio.duracion_turno_min

  // Cargar reservas del día en UTC (guardadas en UTC en la DB)
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

  // Generar slots
  const slots = []
  let cursor = new Date(inicio)

  while (addMinutes(cursor, duracion) <= fin) {
    const slotFin = addMinutes(cursor, duracion)
    const horaStr = format(cursor, 'HH:mm')

    // Verificar si ya pasó (hora local del día)
    const ahoraLocal = new Date()
    const yaPaso = cursor < ahoraLocal

    // Verificar conflicto con reservas
    const tieneReserva = (reservas ?? []).some((r: any) => {
      if (barberoId && r.barbero_id !== barberoId) return false
      // Las reservas están en UTC, comparar correctamente
      const rInicio = new Date(r.fecha_hora)
      const rFin    = addMinutes(rInicio, r.duracion)
      return cursor < rFin && slotFin > rInicio
    })

    // Verificar bloqueos
    const estaBloqueado = (bloqueos ?? []).some((b: any) => {
      if (barberoId && b.barbero_id && b.barbero_id !== barberoId) return false
      const bInicio = new Date(b.fecha_desde)
      const bFin    = new Date(b.fecha_hasta)
      return cursor < bFin && slotFin > bInicio
    })

    slots.push({
      hora: horaStr,
      disponible: !yaPaso && !tieneReserva && !estaBloqueado,
    })

    cursor = addMinutes(cursor, duracion)
  }

  return NextResponse.json({ slots })
}