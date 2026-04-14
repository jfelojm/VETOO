'use client'

import Link from 'next/link'
import ScrollReveal from '@/components/landing/ScrollReveal'
import { trackTrialStart } from '@/lib/analytics'

export default function FinalCTA() {
  return (
    <section className="bg-ink py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <ScrollReveal>
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            ¿Listo para dejar de perder clientes?
          </h2>
          <p className="mt-4 text-white/65">
            Crea tu cuenta en minutos. Sin tarjeta de crédito en el trial.
          </p>
          <Link
            href="/auth/register"
            className="landing-btn-primary mt-10 inline-flex min-w-[240px] justify-center px-10 py-4 text-lg font-semibold"
            onClick={() => trackTrialStart('final_cta')}
          >
            Empezar ahora — Es gratis
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}
