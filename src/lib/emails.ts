import { Resend } from 'resend'
import type { Reserva } from '@/types'
import { formatFecha } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'reservas@barberapp.com'

// Email de confirmación al cliente
export async function emailConfirmacionCliente(reserva: Reserva) {
  const negocio = reserva.negocio!
  const fecha = formatFecha(reserva.fecha_hora)

  await resend.emails.send({
    from: FROM,
    to: reserva.cliente!.email || '',
    subject: `Reserva confirmada en ${negocio.nombre}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Tu reserva está confirmada</h2>
        <p>Hola <strong>${reserva.cliente!.nombre}</strong>,</p>
        <p>Tu reserva en <strong>${negocio.nombre}</strong> ha sido confirmada.</p>

        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Fecha y hora:</strong> ${fecha}</p>
          ${reserva.servicio ? `<p style="margin: 4px 0;"><strong>Servicio:</strong> ${reserva.servicio.nombre}</p>` : ''}
          ${reserva.barbero ? `<p style="margin: 4px 0;"><strong>Barbero:</strong> ${reserva.barbero.nombre}</p>` : ''}
          ${negocio.direccion ? `<p style="margin: 4px 0;"><strong>Dirección:</strong> ${negocio.direccion}</p>` : ''}
        </div>

        ${reserva.politica_texto_snapshot ? `
        <div style="background: #fff8e1; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 16px 0; font-size: 14px;">
          <strong>Política de cancelación:</strong><br/>
          ${reserva.politica_texto_snapshot}
        </div>
        ` : ''}

        <p style="color: #666; font-size: 14px;">
          Si necesitas cancelar o tienes alguna duda, contacta directamente a ${negocio.nombre}
          ${negocio.telefono ? ` al ${negocio.telefono}` : ''}.
        </p>
      </div>
    `,
  })
}

// Email de aviso al barbero cuando llega una nueva reserva
export async function emailNuevaReservaNegocio(reserva: Reserva) {
  const negocio = reserva.negocio!
  const fecha = formatFecha(reserva.fecha_hora)

  await resend.emails.send({
    from: FROM,
    to: negocio.email,
    subject: `Nueva reserva — ${reserva.cliente!.nombre} — ${fecha}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Nueva reserva recibida</h2>

        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Cliente:</strong> ${reserva.cliente!.nombre}</p>
          <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${reserva.cliente!.telefono}</p>
          ${reserva.cliente!.email ? `<p style="margin: 4px 0;"><strong>Email:</strong> ${reserva.cliente!.email}</p>` : ''}
          <p style="margin: 4px 0;"><strong>Fecha y hora:</strong> ${fecha}</p>
          ${reserva.servicio ? `<p style="margin: 4px 0;"><strong>Servicio:</strong> ${reserva.servicio.nombre}</p>` : ''}
          ${reserva.barbero ? `<p style="margin: 4px 0;"><strong>Barbero:</strong> ${reserva.barbero.nombre}</p>` : ''}
          ${reserva.notas_cliente ? `<p style="margin: 4px 0;"><strong>Notas:</strong> ${reserva.notas_cliente}</p>` : ''}
        </div>

        <p style="font-size: 14px; color: #666;">
          Accede a tu panel para ver todas tus reservas.
        </p>
      </div>
    `,
  })
}

// Email de cancelación
export async function emailCancelacion(reserva: Reserva, canceladaPor: 'cliente' | 'negocio') {
  const negocio = reserva.negocio!
  const fecha = formatFecha(reserva.fecha_hora)
  const clienteEmail = reserva.cliente!.email

  if (clienteEmail) {
    await resend.emails.send({
      from: FROM,
      to: clienteEmail,
      subject: `Reserva cancelada — ${negocio.nombre}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">Tu reserva fue cancelada</h2>
          <p>Hola ${reserva.cliente!.nombre},</p>
          <p>
            ${canceladaPor === 'negocio'
              ? `${negocio.nombre} ha cancelado tu reserva del ${fecha}.`
              : `Tu reserva del ${fecha} en ${negocio.nombre} fue cancelada exitosamente.`
            }
          </p>
          <p style="color: #666; font-size: 14px;">
            Para hacer una nueva reserva visita: ${process.env.NEXT_PUBLIC_APP_URL}/reservar/${negocio.slug}
          </p>
        </div>
      `,
    })
  }
}
