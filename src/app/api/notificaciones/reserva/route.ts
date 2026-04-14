import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DEFAULT_FROM_EMAIL,
  htmlEmailConfirmacionReserva,
} from '@/lib/emails/transactional-html'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      negocio_email,
      negocio_nombre,
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      barbero_nombre,
      servicio_nombre,
      fecha_hora,
      negocio_slug,
      negocio_direccion,
      cancelacion_horas_minimo,
      duracion_min,
    } = body as Record<string, unknown>

    const fecha =
      typeof fecha_hora === 'string'
        ? format(parseISO(fecha_hora), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
        : 'Fecha no disponible'

    const fromAddr = (process.env.RESEND_FROM_EMAIL as string | undefined) ?? DEFAULT_FROM_EMAIL

    // Email al negocio
    await resend.emails.send({
      from: fromAddr,
      to: String(negocio_email ?? ''),
      subject: `Nueva reserva — ${String(cliente_nombre ?? '')}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h2 style="color:#e05f10;">Nueva reserva recibida</h2>
          <p>Tienes una nueva reserva en <strong>${negocio_nombre}</strong>.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Cliente:</strong> ${cliente_nombre}</p>
            <p style="margin:4px 0;"><strong>Teléfono:</strong> ${cliente_telefono}</p>
            ${cliente_email ? `<p style="margin:4px 0;"><strong>Email:</strong> ${cliente_email}</p>` : ''}
            ${servicio_nombre ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${servicio_nombre}</p>` : ''}
            ${barbero_nombre ? `<p style="margin:4px 0;"><strong>Barbero:</strong> ${barbero_nombre}</p>` : ''}
            <p style="margin:4px 0;"><strong>Fecha y hora:</strong> ${fecha}</p>
          </div>
          <p style="color:#666;font-size:14px;">Ingresa a tu panel para ver todos tus turnos.</p>
        </div>
      `,
    })

    // Email al cliente (si tiene email)
    if (cliente_email && typeof fecha_hora === 'string') {
      const slug =
        typeof negocio_slug === 'string' && negocio_slug.trim() ? negocio_slug.trim() : 'local'
      const htmlCliente = htmlEmailConfirmacionReserva({
        clienteNombre: String(cliente_nombre ?? ''),
        negocioNombre: String(negocio_nombre ?? ''),
        negocioDireccion:
          typeof negocio_direccion === 'string' ? negocio_direccion : null,
        negocioSlug: slug,
        servicioNombre: servicio_nombre ? String(servicio_nombre) : null,
        staffNombre: barbero_nombre ? String(barbero_nombre) : null,
        fechaHoraIso: fecha_hora,
        duracionMin: typeof duracion_min === 'number' ? duracion_min : 60,
        cancelacionHorasMin:
          typeof cancelacion_horas_minimo === 'number' ? cancelacion_horas_minimo : 2,
        politicaExtra: null,
        appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
      })
      await resend.emails.send({
        from: fromAddr,
        to: String(cliente_email),
        subject: `Reserva confirmada en ${negocio_nombre}`,
        html: htmlCliente,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error enviando email:', err)
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })
  }
}