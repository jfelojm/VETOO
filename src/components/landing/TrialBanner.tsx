'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import ScrollReveal from '@/components/landing/ScrollReveal'
import { trackTrialStart } from '@/lib/analytics'

const BENEFITS = [
  'Agenda y link de reservas con tu marca',
  'Recordatorios por email',
  'Panel para dueño y equipo',
  'Cancela cuando quieras — sin letra pequeña',
]

export default function TrialBanner() {
  return (
    <section className="bg-chalk py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal>
          <div className="overflow-hidden rounded-[32px] bg-ink px-6 py-10 md:px-12 md:py-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
                  14 días gratis. Sin compromiso.
                </h2>
                <ul className="mt-8 space-y-3">
                  {BENEFITS.map(t => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/85 md:text-base">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-brand-glow">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-8">
                <p className="text-sm text-white/60">Después del trial</p>
                <p className="mt-2 font-heading text-4xl font-bold text-white">
                  $19<span className="text-lg font-semibold text-white/50">/mes</span>
                </p>
                <p className="text-sm text-white/50">+ IVA · Plan Básico</p>
                <Link
                  href="/auth/register"
                  className="landing-btn-primary mt-8 inline-flex justify-center py-3.5 text-center font-semibold"
                  onClick={() => trackTrialStart('trial_banner')}
                >
                  Empezar gratis
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
