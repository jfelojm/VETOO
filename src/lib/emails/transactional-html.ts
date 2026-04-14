/**
 * Plantillas de email transaccional TurnApp (design system esmeralda).
 * Solo estilos inline para compatibilidad con clientes de correo.
 */

import { addMinutes } from 'date-fns'
import {
  turnappEmailFooterLogoHtml,
  turnappEmailHeaderLogoHtml,
} from '@/lib/brand/turnapp-logo-email'

/** Colores del design system en emails (inline obligatorio) */
export const EMAIL = {
  bgBody: '#F3F2EF',
  card: '#FFFFFF',
  ink: '#0A0A0F',
  inkMuted: '#6B6B76',
  accent: '#0D9B6A',
  white: '#FFFFFF',
  border: '#E8E6E2',
  surface: '#F3F2EF',
} as const

const TZ_DEFAULT = process.env.NEGOCIO_TIMEZONE || 'America/Guayaquil'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CHECK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" role="img" aria-hidden="true">
  <circle cx="28" cy="28" r="28" fill="${EMAIL.accent}" fill-opacity="0.12"/>
  <circle cx="28" cy="28" r="22" fill="${EMAIL.accent}"/>
  <path fill="#FFFFFF" d="M24.2 32.4l-4.9-4.9 1.8-1.8 3.1 3.1 8.5-8.5 1.8 1.8-10.3 10.3z"/>
</svg>`.trim()

function formatGCalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function buildGoogleCalendarUrl(opts: {
  title: string
  start: Date
  end: Date
  details?: string
  location?: string
}): string {
  const dates = `${formatGCalUtc(opts.start)}/${formatGCalUtc(opts.end)}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates,
  })
  if (opts.details) params.set('details', opts.details)
  if (opts.location) params.set('location', opts.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function splitFechaHoraLabels(fechaHoraIso: string, timeZone = TZ_DEFAULT): { fecha: string; hora: string } {
  const d = new Date(fechaHoraIso)
  return {
    fecha: d.toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    }),
    hora: d.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }),
  }
}

function ctaButton(href: string, label: string): string {
  return `
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${EMAIL.accent};color:${EMAIL.white};padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:600;font-size:15px;line-height:1.25;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  ${escapeHtml(label)}
</a>`.trim()
}

function secondaryButton(href: string, label: string): string {
  return `
<a href="${href}" style="display:inline-block;background-color:${EMAIL.surface};color:${EMAIL.ink};padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:600;font-size:14px;line-height:1.25;font-family:'DM Sans',Helvetica,Arial,sans-serif;border:1px solid ${EMAIL.border};">
  ${escapeHtml(label)}
</a>`.trim()
}

function detailCard(opts: {
  servicio?: string | null
  fecha: string
  hora: string
  staff?: string | null
  direccion?: string | null
  negocioNombre?: string | null
}): string {
  const rows: { k: string; v: string }[] = []
  if (opts.negocioNombre) rows.push({ k: 'Negocio', v: opts.negocioNombre })
  if (opts.servicio) rows.push({ k: 'Servicio', v: opts.servicio })
  rows.push({ k: 'Fecha', v: opts.fecha })
  rows.push({ k: 'Hora', v: opts.hora })
  if (opts.staff) rows.push({ k: 'Profesional', v: opts.staff })
  if (opts.direccion) rows.push({ k: 'Dirección', v: opts.direccion })

  const inner = rows
    .map(
      r => `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${EMAIL.border};font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:${EMAIL.inkMuted};width:36%;vertical-align:top;">${escapeHtml(r.k)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${EMAIL.border};font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:${EMAIL.ink};font-weight:500;vertical-align:top;">${escapeHtml(r.v)}</td>
</tr>`
    )
    .join('')

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${EMAIL.border};border-radius:12px;background-color:${EMAIL.card};overflow:hidden;">
  <tr><td style="padding:20px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${inner}</table>
  </td></tr>
</table>`.trim()
}

function emailFooter(): string {
  const helpUrl = 'https://turnapp.lat'
  const contactMail = 'mailto:soporte@turnapp.lat'
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL.surface};border-top:1px solid ${EMAIL.border};margin-top:32px;">
  <tr>
    <td style="padding:28px 24px;text-align:center;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
      <div style="margin-bottom:12px;">${turnappEmailFooterLogoHtml(28)}</div>
      <p style="margin:0 0 12px;font-size:12px;color:${EMAIL.inkMuted};line-height:1.5;">Powered by TurnApp</p>
      <p style="margin:0;font-size:12px;line-height:1.6;">
        <a href="${helpUrl}" style="color:${EMAIL.accent};text-decoration:none;font-weight:500;">Ayuda</a>
        <span style="color:${EMAIL.border};">&nbsp;·&nbsp;</span>
        <a href="${contactMail}" style="color:${EMAIL.accent};text-decoration:none;font-weight:500;">Contacto</a>
      </p>
    </td>
  </tr>
</table>`.trim()
}

/**
 * Envoltorio común: barra brand 4px, logo, card blanca max 560px, footer surface.
 */
export function wrapTransactionalEmail(opts: {
  preheader: string
  children: string
}): string {
  const pre = escapeHtml(opts.preheader)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${pre}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.bgBody};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${EMAIL.bgBody};">${pre}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL.bgBody};">
    <tr>
      <td style="padding:24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="560" style="max-width:560px;width:100%;margin:0 auto;">
          <tr>
            <td style="background-color:${EMAIL.card};border-radius:16px;overflow:hidden;border:1px solid ${EMAIL.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:4px;background-color:${EMAIL.accent};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 24px 8px;text-align:center;">
                    ${turnappEmailHeaderLogoHtml()}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 32px;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:${EMAIL.ink};font-size:15px;line-height:1.55;">
                    ${opts.children}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              ${emailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export type ConfirmacionEmailParams = {
  clienteNombre: string
  negocioNombre: string
  negocioDireccion?: string | null
  negocioSlug: string
  servicioNombre?: string | null
  staffNombre?: string | null
  fechaHoraIso: string
  duracionMin: number
  cancelacionHorasMin: number
  politicaExtra?: string | null
  appBaseUrl: string
}

export function htmlEmailConfirmacionReserva(p: ConfirmacionEmailParams): string {
  const { fecha, hora } = splitFechaHoraLabels(p.fechaHoraIso)
  const start = new Date(p.fechaHoraIso)
  const end = addMinutes(start, Math.max(p.duracionMin, 15))
  const title = `Reserva: ${p.servicioNombre ?? 'Cita'} — ${p.negocioNombre}`
  const details = [
    p.servicioNombre ? `Servicio: ${p.servicioNombre}` : '',
    p.staffNombre ? `Profesional: ${p.staffNombre}` : '',
    `Lugar: ${p.negocioNombre}`,
  ]
    .filter(Boolean)
    .join('\n')
  const calUrl = buildGoogleCalendarUrl({
    title,
    start,
    end,
    details,
    location: p.negocioDireccion ?? undefined,
  })

  const inner = `
<div style="text-align:center;margin-bottom:24px;">${CHECK_SVG}</div>
<h1 style="margin:0 0 8px;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:${EMAIL.ink};text-align:center;line-height:1.25;">
  Tu reserva está confirmada
</h1>
<p style="margin:0 0 24px;color:${EMAIL.inkMuted};font-size:15px;text-align:center;line-height:1.5;">
  Hola <strong style="color:${EMAIL.ink};">${escapeHtml(p.clienteNombre)}</strong>, tu cita en <strong style="color:${EMAIL.ink};">${escapeHtml(p.negocioNombre)}</strong> quedó registrada.
</p>
${detailCard({
  servicio: p.servicioNombre,
  fecha,
  hora,
  staff: p.staffNombre,
  direccion: p.negocioDireccion,
})}
<div style="text-align:center;margin:28px 0 20px;">
  ${ctaButton(calUrl, 'Agregar a mi calendario')}
</div>
<p style="margin:0 0 8px;color:${EMAIL.inkMuted};font-size:14px;line-height:1.55;text-align:left;">
  Si necesitas cancelar, hazlo con al menos <strong style="color:${EMAIL.ink};">${p.cancelacionHorasMin}</strong> horas de anticipación.
</p>
${
  p.politicaExtra
    ? `<div style="margin-top:16px;padding:14px 16px;background-color:${EMAIL.surface};border-left:3px solid ${EMAIL.accent};border-radius:8px;font-size:13px;color:${EMAIL.ink};line-height:1.5;text-align:left;">
  <strong>Política del local:</strong><br/>${escapeHtml(p.politicaExtra)}
</div>`
    : ''
}
<p style="margin:20px 0 0;color:${EMAIL.inkMuted};font-size:14px;line-height:1.5;text-align:left;">
  El pago se realiza en el local salvo que el negocio indique lo contrario. ¡Te esperamos!
</p>`

  return wrapTransactionalEmail({
    preheader: `Tu reserva en ${p.negocioNombre} está confirmada — ${fecha} ${hora}`,
    children: inner,
  })
}

export type RecordatorioEmailParams = {
  clienteNombre: string
  negocioNombre: string
  negocioDireccion?: string | null
  negocioSlug: string
  negocioEmail?: string | null
  negocioTelefono?: string | null
  servicioNombre?: string | null
  staffNombre?: string | null
  fechaHoraIso: string
  ventana: '24h' | '2h'
  /** Horas mínimas de anticipación para cancelar (texto legal) */
  cancelacionHorasMin: number
  appBaseUrl: string
}

export function htmlEmailRecordatorioReserva(p: RecordatorioEmailParams): string {
  const { fecha, hora } = splitFechaHoraLabels(p.fechaHoraIso)
  const titulo =
    p.ventana === '24h'
      ? 'Te recordamos tu cita mañana'
      : 'Te recordamos tu cita en 2 horas'
  const pre =
    p.ventana === '24h'
      ? `Mañana tienes cita en ${p.negocioNombre}`
      : `En 2 horas tu cita en ${p.negocioNombre}`

  const base = (p.appBaseUrl || 'https://turnapp.lat').replace(/\/$/, '')
  const reservarUrl = `${base}/reservar/${encodeURIComponent(p.negocioSlug)}`

  const emailNeg = p.negocioEmail?.trim()
  const subjectConfirm = encodeURIComponent(`Confirmo mi asistencia — ${p.negocioNombre}`)
  const subjectCancel = encodeURIComponent(`Necesito cancelar mi reserva — ${p.negocioNombre}`)
  const bodyConfirm = encodeURIComponent(
    `Hola,\n\nConfirmo mi asistencia a la cita del ${fecha} a las ${hora}.\n\nGracias.`
  )
  const bodyCancel = encodeURIComponent(
    `Hola,\n\nNecesito cancelar o reprogramar mi reserva del ${fecha} a las ${hora}.\n\nMotivo:\n\n`
  )

  let urlConfirmar = reservarUrl
  let urlCancelar = reservarUrl
  if (emailNeg) {
    urlConfirmar = `mailto:${encodeURIComponent(emailNeg)}?subject=${subjectConfirm}&body=${bodyConfirm}`
    urlCancelar = `mailto:${encodeURIComponent(emailNeg)}?subject=${subjectCancel}&body=${bodyCancel}`
  } else if (p.negocioTelefono?.trim()) {
    const tel = p.negocioTelefono.replace(/\s/g, '')
    urlConfirmar = `tel:${tel}`
    urlCancelar = `tel:${tel}`
  }

  const inner = `
<h1 style="margin:0 0 8px;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:${EMAIL.ink};text-align:left;line-height:1.25;">
  ${escapeHtml(titulo)}
</h1>
<p style="margin:0 0 24px;color:${EMAIL.inkMuted};font-size:15px;text-align:left;line-height:1.5;">
  Hola <strong style="color:${EMAIL.ink};">${escapeHtml(p.clienteNombre)}</strong>, este es un recordatorio de tu próxima cita.
</p>
${detailCard({
  negocioNombre: p.negocioNombre,
  servicio: p.servicioNombre,
  fecha,
  hora,
  staff: p.staffNombre,
  direccion: p.negocioDireccion,
})}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
  <tr>
    <td style="text-align:center;padding:8px 0;">
      ${ctaButton(urlConfirmar, 'Confirmar asistencia')}
    </td>
  </tr>
  <tr>
    <td style="text-align:center;padding:8px 0 0;">
      ${secondaryButton(urlCancelar, 'Necesito cancelar')}
    </td>
  </tr>
</table>
<p style="margin:24px 0 0;color:${EMAIL.inkMuted};font-size:13px;line-height:1.5;text-align:left;">
  Recuerda: para cancelar suele requerirse al menos <strong style="color:${EMAIL.ink};">${p.cancelacionHorasMin}</strong> horas de anticipación.
</p>
<p style="margin:16px 0 0;color:${EMAIL.inkMuted};font-size:14px;line-height:1.5;text-align:left;">
  El pago se realiza en el local. ¡Te esperamos!
</p>`

  return wrapTransactionalEmail({
    preheader: pre,
    children: inner,
  })
}

/** Remitente por defecto cuando el dominio esté verificado en Resend */
export const DEFAULT_FROM_EMAIL = 'reservas@turnapp.lat'
