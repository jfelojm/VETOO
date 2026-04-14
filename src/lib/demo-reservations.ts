import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

const TZ = 'America/Guayaquil'

/** Día ISO en la zona del negocio (1=lunes … 7=domingo) */
function isoWeekdayEc(dateStr: string): number {
  const d = fromZonedTime(`${dateStr}T12:00:00`, TZ)
  return Number(formatInTimeZone(d, TZ, 'i'))
}

function ecTodayString(): string {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd')
}

function ecDatePlusDays(days: number): string {
  const anchor = fromZonedTime(`${ecTodayString()}T12:00:00`, TZ)
  return formatInTimeZone(addDays(anchor, days), TZ, 'yyyy-MM-dd')
}

function toUtcIso(dateStr: string, hour: number, minute: number): string {
  const h = String(hour).padStart(2, '0')
  const m = String(minute).padStart(2, '0')
  return fromZonedTime(`${dateStr}T${h}:${m}:00`, TZ).toISOString()
}

const DEMO_CLIENTES: { nombre: string; telefono: string }[] = [
  { nombre: 'María José López', telefono: '+593991000001' },
  { nombre: 'Carlos Andrés Vega', telefono: '+593991000002' },
  { nombre: 'Lucía Fernanda Torres', telefono: '+593991000003' },
  { nombre: 'Diego Sebastián Mora', telefono: '+593991000004' },
  { nombre: 'Valentina Reyes', telefono: '+593991000005' },
  { nombre: 'Andrés Felipe Cárdenas', telefono: '+593991000006' },
  { nombre: 'Camila Alejandra Pino', telefono: '+593991000007' },
  { nombre: 'Santiago Herrera', telefono: '+593991000008' },
  { nombre: 'Isabella Mendoza', telefono: '+593991000009' },
  { nombre: 'Ricardo Iván Salazar', telefono: '+593991000010' },
  { nombre: 'Paula Fernanda Costa', telefono: '+593991000011' },
  { nombre: 'Juan Pablo Terán', telefono: '+593991000012' },
  { nombre: 'Daniela Alexandra Vélez', telefono: '+593991000013' },
  { nombre: 'Mateo Andrés Gavilanes', telefono: '+593991000014' },
  { nombre: 'Nicole Alexandra Franco', telefono: '+593991000015' },
  { nombre: 'Sebastián Rodrigo Macías', telefono: '+593991000016' },
  { nombre: 'Gabriela Cristina Mora', telefono: '+593991000017' },
  { nombre: 'Fernando José Carrasco', telefono: '+593991000018' },
]

type BarberoRow = { id: string; orden: number | null }
type ServicioRow = { id: string; duracion: number; orden: number | null }

/**
 * Genera ~18 citas en los próximos días (saltando domingos), sin solapar al mismo barbero.
 */
function planificarSlots(): { dateStr: string; hour: number; minute: number; barberIdx: number; servicioIdx: number }[] {
  const out: { dateStr: string; hour: number; minute: number; barberIdx: number; servicioIdx: number }[] = []
  let dayOffset = 0
  const maxDays = 21
  while (out.length < 18 && dayOffset < maxDays) {
    const dateStr = ecDatePlusDays(dayOffset)
    if (isoWeekdayEc(dateStr) === 7) {
      dayOffset++
      continue
    }
    const isSabado = isoWeekdayEc(dateStr) === 6
    const horas = isSabado ? [9, 11, 13] : [9, 11, 14]
    for (let b = 0; b < 3; b++) {
      if (out.length >= 18) break
      out.push({
        dateStr,
        hour: horas[b],
        minute: 0,
        barberIdx: b,
        servicioIdx: out.length % 6,
      })
    }
    dayOffset++
  }
  return out.slice(0, 18)
}

export async function refreshDemoReservations(admin: SupabaseClient): Promise<{
  ok: boolean
  message: string
  inserted?: number
}> {
  const { data: negocio, error: e1 } = await admin
    .from('negocios')
    .select('id')
    .eq('slug', 'demo')
    .eq('is_demo', true)
    .maybeSingle()

  if (e1 || !negocio) {
    return { ok: false, message: 'No existe negocio demo (slug=demo, is_demo=true). Ejecuta el seed SQL primero.' }
  }

  const negocioId = negocio.id

  const { error: eDelR } = await admin.from('reservas').delete().eq('negocio_id', negocioId)
  if (eDelR) return { ok: false, message: `Error borrando reservas demo: ${eDelR.message}` }

  const { error: eDelC } = await admin.from('clientes').delete().eq('negocio_id', negocioId)
  if (eDelC) return { ok: false, message: `Error borrando clientes demo: ${eDelC.message}` }

  const { data: barberos, error: eB } = await admin
    .from('barberos')
    .select('id, orden')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .order('orden', { ascending: true })

  const { data: servicios, error: eS } = await admin
    .from('servicios')
    .select('id, duracion, orden')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (eB || eS || !barberos?.length || !servicios?.length) {
    return { ok: false, message: 'Faltan barberos o servicios en el negocio demo.' }
  }

  const bSorted = [...(barberos as BarberoRow[])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
  )
  const sSorted = [...(servicios as ServicioRow[])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
  )

  const slots = planificarSlots()
  const clientesPayload = DEMO_CLIENTES.slice(0, slots.length).map(c => ({
    negocio_id: negocioId,
    nombre: c.nombre,
    telefono: c.telefono,
    email: null as string | null,
  }))

  const { data: insertedClientes, error: eInsC } = await admin
    .from('clientes')
    .insert(clientesPayload)
    .select('id')

  if (eInsC || !insertedClientes?.length) {
    return { ok: false, message: `Error insertando clientes demo: ${eInsC?.message ?? 'sin filas'}` }
  }

  const reservasPayload = slots.map((slot, i) => {
    const barberoId = bSorted[slot.barberIdx % bSorted.length]?.id
    const servicio = sSorted[slot.servicioIdx % sSorted.length]
    const clienteId = insertedClientes[i]?.id
    return {
      negocio_id: negocioId,
      barbero_id: barberoId,
      servicio_id: servicio?.id ?? null,
      cliente_id: clienteId,
      fecha_hora: toUtcIso(slot.dateStr, slot.hour, slot.minute),
      duracion: servicio?.duracion ?? 30,
      estado: 'confirmada' as const,
      politica_aceptada: true,
      politica_texto_snapshot: 'Demostración TurnApp',
      cliente_nombre_snapshot: DEMO_CLIENTES[i]?.nombre ?? 'Cliente',
    }
  })

  const { error: eInsR } = await admin.from('reservas').insert(reservasPayload)
  if (eInsR) {
    return { ok: false, message: `Error insertando reservas demo: ${eInsR.message}` }
  }

  return { ok: true, message: 'Reservas demo renovadas.', inserted: reservasPayload.length }
}
