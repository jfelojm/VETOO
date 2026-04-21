import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronAuth } from '@/lib/cron-auth'
import { Resend } from 'resend'
import { addHours } from 'date-fns'
import { enviarRecordatorioWhatsappWebhook } from '@/lib/recordatorios-canales'
import {
  DEFAULT_FROM_EMAIL,
  htmlEmailRecordatorioReserva,
} from '@/lib/emails/transactional-html'

const FROM = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const resend = getResend()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ahora = new Date()

  // Buscar reservas en las próximas 2-3 horas (recordatorio 2h)
  const en2h = addHours(ahora, 2)
  const en3h = addHours(ahora, 3)

  // Buscar reservas en las próximas 24-25 horas (recordatorio 24h)
  const en24h = addHours(ahora, 24)
  const en25h = addHours(ahora, 25)

  const selectJoin =
    '*, cliente:clientes(nombre, email, telefono), negocio:negocios(nombre, slug, direccion, email, telefono, cancelacion_horas_minimo, recordatorio_email_cliente, recordatorio_whatsapp_cliente, is_demo), barbero:barberos(nombre), servicio:servicios(nombre)'

  // Límite superior estricto (.lt): si usáramos .lte, la misma cita en el borde coincidiría en dos
  // ejecuciones horarias del cron y se duplicarían los correos.
  const { data: reservas2h } = await supabase
    .from('reservas')
    .select(selectJoin)
    .eq('estado', 'confirmada')
    .gte('fecha_hora', en2h.toISOString())
    .lt('fecha_hora', en3h.toISOString())

  const { data: reservas24h } = await supabase
    .from('reservas')
    .select(selectJoin)
    .eq('estado', 'confirmada')
    .gte('fecha_hora', en24h.toISOString())
    .lt('fecha_hora', en25h.toISOString())

  let enviados = 0
  const procesadas = new Set<string>()

  for (const reserva of [...(reservas2h ?? []), ...(reservas24h ?? [])]) {
    if (procesadas.has(reserva.id)) continue
    procesadas.add(reserva.id)

    const cliente = reserva.cliente as {
      nombre?: string
      email?: string | null
      telefono?: string | null
    } | null
    const negocio = reserva.negocio as {
      nombre?: string
      slug?: string
      direccion?: string | null
      email?: string | null
      telefono?: string | null
      cancelacion_horas_minimo?: number | null
      recordatorio_email_cliente?: boolean | null
      recordatorio_whatsapp_cliente?: boolean | null
      is_demo?: boolean | null
    } | null

    if (negocio?.is_demo) continue
    const barbero = reserva.barbero as { nombre?: string } | null
    const servicio = reserva.servicio as { nombre?: string } | null
    const nombreCliente =
      (reserva as { cliente_nombre_snapshot?: string | null }).cliente_nombre_snapshot?.trim() ||
      cliente?.nombre ||
      'Cliente'

    const es2h = (reservas2h ?? []).some((r: { id: string }) => r.id === reserva.id)
    const texto = es2h ? 'en 2 horas' : 'mañana'

    const fechaStr = new Date(reserva.fecha_hora).toLocaleString('es-EC', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Guayaquil',
    })

    const emailOn = negocio?.recordatorio_email_cliente !== false
    const waOn = negocio?.recordatorio_whatsapp_cliente === true
    const telCliente = cliente?.telefono?.trim()

    const cuerpoPlano =
      `Hola ${nombreCliente}, recordatorio: turno ${texto} en ${negocio?.nombre ?? ''}. ` +
      `${servicio ? `Servicio: ${servicio.nombre}. ` : ''}` +
      `${barbero ? `Profesional: ${barbero.nombre}. ` : ''}` +
      `Fecha: ${fechaStr}.`

    if (resend && emailOn && cliente?.email?.trim()) {
      try {
        const slug = (negocio?.slug ?? '').trim() || 'reservar'
        const html = htmlEmailRecordatorioReserva({
          clienteNombre: nombreCliente,
          negocioNombre: negocio?.nombre ?? 'el local',
          negocioDireccion: negocio?.direccion ?? null,
          negocioSlug: slug,
          negocioEmail: negocio?.email ?? null,
          negocioTelefono: negocio?.telefono ?? null,
          servicioNombre: servicio?.nombre ?? null,
          staffNombre: barbero?.nombre ?? null,
          fechaHoraIso: reserva.fecha_hora as string,
          ventana: es2h ? '2h' : '24h',
          cancelacionHorasMin: negocio?.cancelacion_horas_minimo ?? 2,
          appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
        })
        const subject = es2h
          ? `Recordatorio: tu cita en 2 horas — ${negocio?.nombre ?? ''}`
          : `Recordatorio: tu cita mañana — ${negocio?.nombre ?? ''}`
        await resend.emails.send({
          from: FROM,
          to: cliente.email,
          subject: subject.trim(),
          html,
        })
        enviados++
      } catch (e) {
        console.error('[recordatorios] email cliente', reserva.id, e)
      }
    }

    if (waOn && telCliente) {
      const ok = await enviarRecordatorioWhatsappWebhook(telCliente, cuerpoPlano)
      if (ok) enviados++
    }
  }

  return NextResponse.json({ ok: true, enviados })
}