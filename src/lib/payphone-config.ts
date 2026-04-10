import { randomBytes } from 'crypto'

/**
 * Montos en centavos (USD). PayPhone exige `tax` junto con `amountWithTax`.
 * TurnApp: todo el cobro grava IVA → amountWithoutTax = 0; amount = amountWithTax + tax + amountWithoutTax.
 */

const DEFAULT_PAYPHONE_LINKS = 'https://pay.payphonetodoesposible.com/api/Links'

/** Variante que algunos hosts IIS enrutan distinto (evita 500 HTML por ruta incorrecta). */
const PAYPHONE_LINKS_ALT_LOWERCASE = 'https://pay.payphonetodoesposible.com/api/links'

/** Producción; sandbox u otro host si PayPhone te lo indica (`PAYPHONE_LINKS_API_URL`). */
export function payphoneLinksApiUrl(): string {
  return process.env.PAYPHONE_LINKS_API_URL?.trim() || DEFAULT_PAYPHONE_LINKS
}

/** Orden: URL configurada o default (`/api/Links`), luego `/api/links` (minúsculas). */
export function payphoneLinksUrlCandidates(): string[] {
  const primary = payphoneLinksApiUrl()
  const alt = PAYPHONE_LINKS_ALT_LOWERCASE
  if (primary === alt) return [primary]
  return [primary, alt]
}

/**
 * URL de notificación por link (opcional).
 * La ruta `/api/suscripcion/pagar` intenta primero el body **sin** `notifyUrl`; si existe
 * esta variable, hace un tercer intento con `notifyUrl`. Preferible: notificación solo en el panel PayPhone.
 */
export function payphoneNotifyUrlDesdeEnv(): string | undefined {
  const raw = process.env.PAYPHONE_LINKS_NOTIFY_URL?.trim()
  if (!raw) return undefined
  return raw.replace(/\/$/, '')
}

export const PAYPHONE_PLANES = {
  basic: {
    /** PayPhone: `reference` máx. 10 caracteres. */
    reference: 'TurnBasico',
    /** Total a cobrar */
    amount: 2185,
    /** Base gravada (monto con impuesto / categoría gravada; sin incluir el impuesto en el valor) */
    amountWithTax: 1900,
    /** Monto no gravado (en TurnApp todo lleva IVA) */
    amountWithoutTax: 0,
    tax: 285,
  },
  pro: {
    reference: 'TurnPro',
    amount: 4485,
    amountWithTax: 3900,
    amountWithoutTax: 0,
    tax: 585,
  },
  premium: {
    reference: 'TurnPremi',
    amount: 17250,
    amountWithTax: 15000,
    amountWithoutTax: 0,
    tax: 2250,
  },
} as const

export type PayPhonePlanKey = keyof typeof PAYPHONE_PLANES

export function additionalDataPago(negocioId: string, plan: PayPhonePlanKey): string {
  return `${negocioId}|${plan}`
}

/**
 * PayPhone: máx. 16 caracteres. Generamos 15 (hex) por intento (evita duplicate key en BD).
 */
export function clientTransactionIdPayPhone(): string {
  return randomBytes(8).toString('hex').slice(0, 15)
}
