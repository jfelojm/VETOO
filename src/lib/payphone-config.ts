/** Montos en centavos (USD). IVA Ecuador 15%. amount = amountWithTax + tax */

export const PAYPHONE_LINKS_URL = 'https://pay.payphonetodoesposible.com/api/Links'

export const PAYPHONE_PLANES = {
  basic: {
    reference: 'Turnapp Plan Básico',
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

/** Max 15 caracteres según PayPhone */
export function clientTransactionIdPayPhone(negocioId: string): string {
  return `${negocioId}-${Date.now()}`.slice(0, 15)
}
