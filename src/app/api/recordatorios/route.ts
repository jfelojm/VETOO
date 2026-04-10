import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { addHours } from 'date-fns'
import { enviarRecordatorioWhatsappWebhook } from '@/lib/recordatorios-canales'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export async function GET(req: NextRequest) {
  // Verificar que viene del cron de Vercel
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
    '*, cliente:clientes(nombre, email, telefono), negocio:negocios(nombre, recordatorio_email_cliente, recordatorio_whatsapp_cliente), barbero:barberos(nombre), servicio:servicios(nombre)'

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
      recordatorio_email_cliente?: boolean | null
      recordatorio_whatsapp_cliente?: boolean | null
    } | null
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

    if (emailOn && cliente?.email?.trim()) {
      try {
        await resend.emails.send({
          from: FROM,
          to: cliente.email,
          subject: `Recordatorio: tu turno ${texto} en ${negocio?.nombre}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <h2 style="color:#e05f10;">Recordatorio de tu reserva</h2>
        <p>Hola <strong>${nombreCliente}</strong>, te recordamos que tienes un turno <strong>${texto}</strong>.</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Negocio:</strong> ${negocio?.nombre}</p>
          ${servicio ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${servicio.nombre}</p>` : ''}
          ${barbero ? `<p style="margin:4px 0;"><strong>Profesional:</strong> ${barbero.nombre}</p>` : ''}
          <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaStr}</p>
        </div>
        <p style="color:#666;font-size:14px;">El pago se realiza en el local. ¡Te esperamos!</p>
      </div>`,
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