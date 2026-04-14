'use client'

import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/analytics'

/**
 * Google Analytics 4 — tag de medición.
 * Sustituir G-XXXXXXXXXX vía NEXT_PUBLIC_GA_MEASUREMENT_ID en producción.
 *
 * Eventos usados en la app:
 * - register_intent: CTA a registro (navbar, hero)
 * - trial_start: “Empezar gratis” y CTAs equivalentes
 * - demo_explore: “Explorar demo”
 * - pricing_view: scroll a #precios
 * - whatsapp_contact: WhatsApp Premium
 */
export default function Analytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  )
}
