import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generarSlots } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const negocioId = searchParams.get('negocio_id')
  const fechaStr  = searchParams.get('fecha')
  const barberoId = searchParams.get('barbero_id') || undefined

  if (!negocioId || !fechaStr) {
    return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fecha = new Date(fechaStr)

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, horario, duracion_turno_min')
    .eq('id', negocioId)
    .single()

  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: reservas } = await supabase
    .from('reservas')
    .select('id, barbero_id, fecha_hora, fecha_hora_fin, duracion, estado')
    .eq('negocio_id', negocioId)
    .gte('fecha_hora', startOfDay(fecha).toISOString())
    .lte('fecha_hora', endOfDay(fecha).toISOString())
    .neq('estado', 'cancelada')

  const { data: bloqueos } = await supabase
    .from('bloqueos')
    .select('*')
    .eq('negocio_id', negocioId)
    .lte('fecha_desde', endOfDay(fecha).toISOString())
    .gte('fecha_hasta', startOfDay(fecha).toISOString())

  const slots = generarSlots(
    fecha,
    negocio.horario,
    negocio.duracion_turno_min,
    reservas ?? [],
    bloqueos ?? [],
    barberoId
  )

  return NextResponse.json({ slots })
}