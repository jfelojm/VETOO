'use client'

import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/analytics'

/**
 * Google Analytics 4 — tag de medición (`next/script`, afterInteractive).
 * Cargado desde el layout (body) con el componente Analytics.
 *
 * Eventos en la landing: register_intent, trial_start, demo_explore, pricing_view, whatsapp_contact
 */
export default function Analytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
