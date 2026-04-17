'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { trackWhatsAppContact } from '@/lib/analytics'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> & {
  source: string
  children: ReactNode
}

/**
 * Link a WhatsApp que dispara `whatsapp_contact` en GA4 al hacer click.
 * `source` identifica dónde vive el botón (ej: 'premium', 'reserva_sin_plan', 'aviso_dashboard').
 */
export default function WhatsAppLink({ source, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={() => trackWhatsAppContact(source)}
      target={rest.target ?? '_blank'}
      rel={rest.rel ?? 'noopener noreferrer'}
    >
      {children}
    </a>
  )
}
