'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import ScrollReveal from '@/components/landing/ScrollReveal'

const FAQ_ITEMS = [
  {
    q: '¿Qué incluye el trial de 14 días?',
    a: 'Acceso completo a la funcionalidad del plan que elijas al registrarte, sin pedir tarjeta. Cancelas cuando quieras.',
  },
  {
    q: '¿Quién es Mateo, el agente de WhatsApp?',
    a: 'Mateo es el agente de TurnApp (IA) que puede orientar a tus clientes y ayudar a agendar según la configuración de tu negocio e integraciones disponibles.',
  },
  {
    q: '¿Cobran comisión por reserva?',
    a: 'No. Los clientes son tuyos; el precio del plan es mensual y transparente.',
  },
  {
    q: '¿Puedo usar mi propio dominio o marca?',
    a: 'Tu página de reservas refleja el nombre y la identidad de tu negocio. Premium incluye opciones adicionales a medida.',
  },
  {
    q: '¿Funciona en Ecuador?',
    a: 'Sí. TurnApp está pensado para negocios en Ecuador, con soporte en español y flujos de cobro locales donde aplique.',
  },
  {
    q: '¿Cómo cancelo mi suscripción?',
    a: 'Desde tu panel o escribiendo a soporte. Sin permanencia forzada en los planes estándar.',
  },
] as const

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    }),
    []
  )

  return (
    <section id="faq" className="scroll-mt-24 bg-chalk py-20 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4">
        <ScrollReveal>
          <h2 className="text-center font-heading text-3xl font-bold text-ink md:text-4xl">
            Preguntas frecuentes
          </h2>
          <p className="mx-auto mt-4 text-center text-ink-muted">
            Respuestas rápidas antes de crear tu cuenta.
          </p>
        </ScrollReveal>

        <div className="mt-12 space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <ScrollReveal key={item.q} delay={i * 40}>
              <div className="overflow-hidden rounded-2xl border border-border bg-chalk transition-shadow hover:shadow-md">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span className="font-heading text-base font-semibold text-ink md:text-lg">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-ink-muted transition-transform',
                      open === i && 'rotate-180'
                    )}
                  />
                </button>
                {open === i && (
                  <div className="border-t border-border px-5 pb-4 pt-0 text-sm leading-relaxed text-ink-muted">
                    {item.a}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
