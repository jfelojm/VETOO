'use client'

import { useEffect } from 'react'
import { trackGAEvent } from '@/lib/analytics'

type Props = {
  event: string
  params?: Record<string, unknown>
}

/**
 * Dispara un evento GA4 una sola vez cuando el componente se monta.
 * Útil para trackear visitas a páginas (pricing_view, demo_explore, etc.).
 */
export default function TrackOnMount({ event, params }: Props) {
  useEffect(() => {
    trackGAEvent(event, params)
  }, [event, params])
  return null
}
