'use client'

import Script from 'next/script'

type Props = {
  /** Siempre definido desde layout (servidor) con fallback G-2B9N6PG9V5 */
  gaId: string
}

/**
 * Google Analytics 4 — tag de medición (`next/script`, afterInteractive).
 *
 * Eventos en la landing: register_intent, trial_start, demo_explore, pricing_view, whatsapp_contact
 */
export default function Analytics({ gaId }: Props) {
  const id = gaId || 'G-2B9N6PG9V5'

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  )
}
