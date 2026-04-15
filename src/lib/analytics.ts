/**
 * Google Analytics 4 — eventos de la app.
 * ID: NEXT_PUBLIC_GA_ID (preferido) o NEXT_PUBLIC_GA_MEASUREMENT_ID.
 */

const DEFAULT_GA_ID = 'G-2B9N6PG9V5'

export const GA_MEASUREMENT_ID =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)) ||
  DEFAULT_GA_ID

function gtagSend(...args: unknown[]) {
  if (typeof window === 'undefined') return
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
  if (typeof g !== 'function') return
  g(...args)
}

/** Evento genérico GA4 */
export function trackGAEvent(name: string, params?: Record<string, unknown>) {
  gtagSend('event', name, params ?? {})
}

/** Intención de registro (CTA hacia /auth/register: navbar, hero “Prueba…”, etc.) */
export function trackRegisterIntent(source: string) {
  trackGAEvent('register_intent', { cta_location: source })
}

/** Inicio de trial — botones “Empezar gratis” y equivalentes */
export function trackTrialStart(source: string) {
  trackGAEvent('trial_start', { cta_location: source })
}

/** Explorar demo pública */
export function trackDemoExplore() {
  trackGAEvent('demo_explore', {})
}

/** Usuario llegó a la sección de precios (una vez por vista de página) */
export function trackPricingView() {
  trackGAEvent('pricing_view', {})
}

/** Click en WhatsApp (plan Premium) */
export function trackWhatsAppContact(plan?: string) {
  trackGAEvent('whatsapp_contact', { plan: plan ?? 'premium' })
}
