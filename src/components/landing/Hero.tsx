'use client'

import Link from 'next/link'
import ScrollReveal from '@/components/landing/ScrollReveal'
import { trackDemoExplore, trackRegisterIntent } from '@/lib/analytics'

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pb-24 lg:pt-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-10">
        <ScrollReveal>
          <p className="mb-4 inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft md:text-sm">
            Sistema de reservas para negocios de belleza
          </p>
          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-ink md:text-5xl lg:text-[3.25rem]">
            Tus clientes reservan solos.{' '}
            <span className="text-brand-primary">Tú gestionas todo.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg">
            Sin comisiones, sin sorpresas. Los clientes son de tu negocio: tú decides políticas, horarios y
            precios. Todo desde un panel claro, en español.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/auth/register"
              className="landing-btn-primary inline-flex items-center justify-center px-8 py-3.5 text-center text-base font-semibold"
              onClick={() => trackRegisterIntent('hero_prueba_14_dias')}
            >
              Prueba 14 días gratis
            </Link>
            <Link
              href="/reservar/demo"
              className="landing-btn-secondary inline-flex items-center justify-center px-8 py-3.5 text-center text-base font-semibold"
              onClick={() => trackDemoExplore()}
            >
              Explorar demo
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-muted md:text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" /> Sin tarjeta
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" /> Listo en 5 min
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" /> Soporte en español
            </li>
          </ul>
        </ScrollReveal>

        <ScrollReveal delay={120} className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div
            className="relative mx-auto perspective-[1200px] [transform-style:preserve-3d]"
            style={{ perspective: '1200px' }}
          >
            <div
              className="relative rounded-2xl border border-border bg-chalk p-4 shadow-lg transition-transform duration-500 [transform:rotateX(6deg)_rotateY(-8deg)] md:p-5"
              style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
            >
              <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-semibold text-ink">Agenda hoy</span>
                <span className="rounded-md bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                  Lun 31 mar
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink-muted">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-md text-[10px] ${
                      i === 8 ? 'bg-brand-primary text-white' : 'bg-surface text-ink-muted'
                    } flex items-center justify-center`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 rounded-xl bg-surface p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Próximas citas
                </p>
                <div className="flex items-center justify-between rounded-lg bg-chalk px-2 py-2 text-xs">
                  <span className="text-ink-soft">10:00 · Corte</span>
                  <span className="text-brand-primary">Carlos</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-chalk px-2 py-2 text-xs">
                  <span className="text-ink-soft">11:30 · Barba</span>
                  <span className="text-brand-primary">Ana</span>
                </div>
              </div>
            </div>

            <div>
              <div className="landing-float absolute -right-2 top-8 max-w-[200px] rounded-xl border border-border bg-chalk p-3 text-xs shadow-md md:-right-4 md:top-12">
                <p className="font-semibold text-brand-primary">+12 reservas hoy</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Mientras dormías</p>
              </div>
              <div className="landing-float-delayed absolute -left-4 bottom-12 max-w-[200px] rounded-xl border border-border bg-chalk p-3 text-xs shadow-md md:bottom-16">
                <p className="font-semibold text-ink">Recordatorio enviado</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Carlos M.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
