import { NextRequest } from 'next/server'
import {
  procesarNotificacionPayPhone,
  type PayPhoneNotificacionBody,
} from '@/lib/payphone-webhook'

/**
 * Webhook PayPhone — Notificación Externa.
 * El comercio debe registrar en PayPhone la URL completa que termina en este path
 * (el método debe llamarse NotificacionPago según documentación PayPhone).
 *
 * AdditionalData: `negocioId|plan` (basic|pro|premium). Parseo en `parsePlanDesdeAdditionalData` (payphone-webhook).
 */
export async function POST(req: NextRequest) {
  let body: PayPhoneNotificacionBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ Response: false, ErrorCode: '111' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return procesarNotificacionPayPhone(body)
}
