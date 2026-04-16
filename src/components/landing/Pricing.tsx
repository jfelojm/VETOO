'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import ScrollReveal from '@/components/landing/ScrollReveal'
import { trackPricingView, trackTrialStart, trackWhatsAppContact } from '@/lib/analytics'

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let sent = false
    const io = new IntersectionObserver(
      entries => {
        if (sent || !entries[0]?.isIntersecting) return
        sent = true
        trackPricingView()
        io.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="precios"
      className="scroll-mt-24 bg-surface py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal>
          <h2 className="text-center font-heading text-3xl font-bold text-ink md:text-4xl">Planes</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-ink-muted">
            Elige el plan que encaja con tu negocio. Todos incluyen staff ilimitado desde el día uno.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:items-stretch">
          <ScrollReveal>
            <div className="landing-pricing-card flex h-full flex-col rounded-2xl border border-border bg-chalk p-8">
              <p className="text-2xl" aria-hidden>
                🌱
              </p>
              <h3 className="mt-2 font-heading text-xl font-bold text-ink">Básico</h3>
              <p className="text-sm text-ink-muted">Para el negocio que quiere organizarse</p>
              <div className="mt-6 flex flex-wrap items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-ink">$19</span>
                <span className="text-sm text-ink-muted">+ IVA / mes</span>
              </div>
              <ul className="mt-8 flex-1 space-y-2.5 text-sm text-ink-soft">
                {[
                  'Staff ilimitado',
                  'Reservas online con link',
                  'Confirmación por email',
                  'Recordatorios automáticos 24h y 2h',
                  'Panel de agenda básico',
                  'Política de cancelación',
                ].map(f => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="landing-btn-primary mt-8 inline-flex justify-center py-3 text-center font-semibold"
                onClick={() => trackTrialStart('pricing_basico')}
              >
                Empezar gratis
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <div className="landing-pricing-card relative flex h-full flex-col rounded-2xl border-2 border-brand-primary bg-chalk p-8 shadow-brand">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-4 py-1 text-xs font-semibold text-white">
                Popular
              </div>
              <p className="text-2xl" aria-hidden>
                ⭐
              </p>
              <h3 className="mt-2 font-heading text-xl font-bold text-ink">Pro</h3>
              <p className="text-sm text-ink-muted">Para el negocio con varias sucursales</p>
              <div className="mt-6 flex flex-wrap items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-ink">$39</span>
                <span className="text-sm text-ink-muted">+ IVA / mes</span>
              </div>
              <ul className="mt-8 flex-1 space-y-2.5 text-sm text-ink-soft">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Varias sucursales en una misma cuenta
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Todo lo del Básico
                </li>
                <li className="pt-1">
                  <span className="font-semibold text-ink">Dashboard avanzado:</span>
                  <ul className="mt-2 space-y-1 border-l-2 border-brand-light pl-3 text-ink-muted">
                    <li>Staff que más vende</li>
                    <li>Servicios más solicitados</li>
                    <li>Horas pico</li>
                    <li>Ingresos por rango de fechas</li>
                    <li>Tasa de no-shows</li>
                  </ul>
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Lista negra y alertas de clientes
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Página de reservas con tu marca
                </li>
              </ul>
              <Link
                href="/auth/register"
                className="landing-btn-primary mt-8 inline-flex justify-center py-3 text-center font-semibold"
                onClick={() => trackTrialStart('pricing_pro')}
              >
                Empezar gratis
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={160}>
            <div className="landing-pricing-card flex h-full flex-col rounded-2xl border border-border bg-chalk/90 p-8">
              <p className="text-2xl" aria-hidden>
                🤖
              </p>
              <h3 className="mt-2 font-heading text-xl font-bold text-ink">Premium</h3>
              <p className="text-sm text-ink-muted">Agente de chat IA para tu negocio</p>
              <div className="mt-6 flex flex-wrap items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-ink">$150</span>
                <span className="text-sm text-ink-muted">USD / mes</span>
              </div>
              <ul className="mt-8 flex-1 space-y-2.5 text-sm text-ink-soft">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Todo lo del plan Pro
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Agente IA que administra reservas por WhatsApp
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Asesoría de servicios al cliente 24/7
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Reprogramaciones y cancelaciones automáticas
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                  Configuración personalizada del agente
                </li>
              </ul>
              <a
                href="https://wa.me/593987122959?text=Hola%2C%20me%20interesa%20el%20plan%20Premium%20de%20TurnApp%20con%20el%20agente%20IA."
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-primary mt-8 inline-flex justify-center py-3 text-center font-semibold"
                onClick={() => trackWhatsAppContact('premium')}
              >
                Contactar ventas
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
