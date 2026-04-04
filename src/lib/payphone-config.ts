/** Montos en centavos (USD). IVA Ecuador 15%. amount = amountWithTax + tax */

const DEFAULT_PAYPHONE_LINKS = 'https://pay.payphonetodoesposible.com/api/Links'

/** Producción; sandbox u otro host si PayPhone te lo indica (`PAYPHONE_LINKS_API_URL`). */
export function payphoneLinksApiUrl(): string {
  return process.env.PAYPHONE_LINKS_API_URL?.trim() || DEFAULT_PAYPHONE_LINKS
}

/**
 * URL de notificación por link (opcional).
 * La API Links oficial no documenta bien `notifyUrl`; si el servidor devuelve HTML,
 * deja esto sin definir y configura Notificación Externa solo en el panel PayPhone.
 */
export function payphoneNotifyUrlDesdeEnv(): string | undefined {
  const raw = process.env.PAYPHONE_LINKS_NOTIFY_URL?.trim()
  if (!raw) return undefined
  return raw.replace(/\/$/, '')
}

export const PAYPHONE_PLANES = {
  basic: {
    /** ASCII: algunos backends fallan con acentos en `reference` */
    reference: 'Turnapp Plan Basico',
    /** Total a cobrar */
    amount: 2185,
    /** Base gravada (sin IVA) */
    amountWithTax: 1900,
    tax: 285,
  },
  pro: {
    reference: 'Turnapp Plan Pro',
    amount: 4485,
    amountWithTax: 3900,
    tax: 585,
  },
} as const

export type PayPhonePlanKey = keyof typeof PAYPHONE_PLANES

export function additionalDataPago(negocioId: string, plan: PayPhonePlanKey): string {
  return JSON.stringify({ n: negocioId, p: plan })
}

/**
 * Max 15 caracteres (PayPhone). Sin guiones; hex del UUID + milisegundos.
 */
export function clientTransactionIdPayPhone(negocioId: string): string {
  const compact = negocioId.replace(/-/g, '') + Date.now().toString()
  return compact.slice(0, 15)
}
