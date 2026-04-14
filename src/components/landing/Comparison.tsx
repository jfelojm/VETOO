import ScrollReveal from '@/components/landing/ScrollReveal'
import { Check, X } from 'lucide-react'

/** turnOk / otherOk = ¿es ventaja para esa columna? */
const ROWS = [
  { label: 'Dueño de los clientes', turnOk: true, otherOk: false },
  { label: 'Comisiones por reserva', turnOk: true, otherOk: false },
  { label: 'Pasarela y cobro en Ecuador', turnOk: true, otherOk: false },
  { label: 'Soporte en español', turnOk: true, otherOk: false },
  { label: 'Agente IA (Mateo) para WhatsApp', turnOk: true, otherOk: false },
  { label: 'Precio transparente desde', turnOk: true, otherOk: false },
] as const

function Cell({ ok }: { ok: boolean }) {
  return (
    <div className="flex items-center justify-center py-3.5">
      {ok ? (
        <Check className="h-5 w-5 text-brand-primary" strokeWidth={2.5} />
      ) : (
        <X className="h-5 w-5 text-danger" strokeWidth={2.5} />
      )}
    </div>
  )
}

export default function Comparison() {
  return (
    <section className="bg-chalk py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4">
        <ScrollReveal>
          <h2 className="text-center font-heading text-3xl font-bold text-ink md:text-4xl">
            TurnApp vs. &quot;otros&quot;
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-ink-muted">
            Misma necesidad, distinta filosofía: tus clientes y tu dinero, contigo.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80} className="mt-12 overflow-hidden rounded-2xl border border-border bg-chalk shadow-sm">
          <div className="grid grid-cols-[1fr_minmax(88px,1fr)_minmax(88px,1fr)] text-sm font-medium md:grid-cols-[1fr_120px_120px]">
            <div className="border-b border-border bg-surface px-3 py-3 text-ink-soft md:px-4" />
            <div className="flex items-center justify-center border-b border-border bg-brand-light py-3 text-brand-dark">
              TurnApp
            </div>
            <div className="flex items-center justify-center border-b border-border bg-surface py-3 text-ink-muted">
              Otros
            </div>
            {ROWS.map(row => (
              <div key={row.label} className="contents">
                <div className="border-b border-border bg-chalk px-3 py-3.5 text-ink-soft md:px-4">
                  {row.label}
                </div>
                <div className="border-b border-border bg-brand-light/25">
                  <Cell ok={row.turnOk} />
                </div>
                <div className="border-b border-border bg-chalk">
                  <Cell ok={row.otherOk} />
                </div>
              </div>
            ))}
          </div>
          <p className="border-t border-border bg-surface px-4 py-3 text-center text-xs text-ink-muted">
            Comparación orientativa según el tipo de plataforma agregadora típica.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
