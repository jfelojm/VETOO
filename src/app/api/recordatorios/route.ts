import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { addHours, isAfter, isBefore } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const { data: reservas2h } = await supabase
    .from('reservas')
    .select('*, cliente:clientes(nombre, email, telefono), negocio:negocios(nombre), barbero:barberos(nombre), servicio:servicios(nombre)')
    .eq('estado', 'confirmada')
    .gte('fecha_hora', en2h.toISOString())
    .lte('fecha_hora', en3h.toISOString())

  const { data: reservas24h } = await supabase
    .from('reservas')
    .select('*, cliente:clientes(nombre, email, telefono), negocio:negocios(nombre), barbero:barberos(nombre), servicio:servicios(nombre)')
    .eq('estado', 'confirmada')
    .gte('fecha_hora', en24h.toISOString())
    .lte('fecha_hora', en25h.toISOString())

  let enviados = 0

  for (const reserva of [...(reservas2h ?? []), ...(reservas24h ?? [])]) {
    const cliente = reserva.cliente as any
    const negocio = reserva.negocio as any
    const barbero = reserva.barbero as any
    const servicio = reserva.servicio as any
    const nombreCliente =
      (reserva as { cliente_nombre_snapshot?: string | null }).cliente_nombre_snapshot?.trim() ||
      cliente?.nombre ||
      'Cliente'

    if (!cliente?.email) continue

    const es2h  = (reservas2h ?? []).some((r: any) => r.id === reserva.id)
    const texto = es2h ? 'en 2 horas' : 'mañana'

    const fechaStr = new Date(reserva.fecha_hora).toLocaleString('es-EC', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Guayaquil'
    })

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: cliente.email,
      subject: `Recordatorio: tu turno ${texto} en ${negocio?.nombre}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <h2 style="color:#e05f10;">Recordatorio de tu reserva</h2>
        <p>Hola <strong>${nombreCliente}</strong>, te recordamos que tienes un turno <strong>${texto}</strong>.</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Negocio:</strong> ${negocio?.nombre}</p>
          ${servicio ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${servicio.nombre}</p>` : ''}
          ${barbero ? `<p style="margin:4px 0;"><strong>Barbero:</strong> ${barbero.nombre}</p>` : ''}
          <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaStr}</p>
        </div>
        <p style="color:#666;font-size:14px;">El pago se realiza en el local. ¡Te esperamos!</p>
      </div>`,
    })
    enviados++
  }

  return NextResponse.json({ ok: true, enviados })
}