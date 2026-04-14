import ScrollReveal from '@/components/landing/ScrollReveal'
import { Smartphone, MessageSquare, LayoutGrid } from 'lucide-react'

export default function Features() {
  return (
    <section id="funciones" className="scroll-mt-24 bg-chalk py-20 md:py-28">
      <div className="mx-auto max-w-6xl space-y-24 px-4 md:space-y-32">
        {/* Row 1 */}
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
              <Smartphone className="h-3.5 w-3.5" />
              Reservas 24/7
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink md:text-4xl">
              Tu negocio recibe reservas mientras duermes
            </h2>
            <p className="mt-4 text-ink-muted">
              El cliente elige servicio, profesional y horario desde tu link. Tú ves todo en la agenda al
              instante.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="mx-auto max-w-sm rounded-[2rem] border-4 border-ink/10 bg-ink p-3 shadow-xl">
              <div className="overflow-hidden rounded-[1.5rem] bg-chalk">
                <div className="border-b border-border bg-surface px-4 py-3 text-center text-xs font-semibold text-ink">
                  Servicios
                </div>
                <div className="space-y-2 p-3">
                  {['Corte clásico', 'Barba', 'Combo'].map((s, i) => (
                    <div
                      key={s}
                      className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm ${
                        i === 0 ? 'bg-brand-light text-brand-dark' : 'bg-surface text-ink-soft'
                      }`}
                    >
                      <span>{s}</span>
                      <span className="text-xs font-medium opacity-80">25 min</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Row 2 — Mateo */}
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <ScrollReveal className="order-2 lg:order-1">
            <div className="mx-auto max-w-md rounded-2xl border border-[#25D366]/40 bg-[#0b141a] p-4 shadow-xl">
              <p className="mb-3 text-center text-[11px] font-medium text-white/50">
                Mateo (Agente TurnApp)
              </p>
              <div className="space-y-3 text-sm">
                <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-[#005c4b] px-3 py-2 text-white/95">
                  Hola, quiero agendar un corte para mañana a las 10am
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-[#1f2c33] px-3 py-2 text-white/90">
                  ¡Hola! Claro, mañana a las 10am con Carlos está disponible. ¿Confirmo?
                </div>
                <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-[#005c4b] px-3 py-2 text-white/95">
                  Sí, perfecto
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-[#1f2c33] px-3 py-2 text-white/90">
                  ✓ Listo, tu turno está confirmado. Te enviamos el detalle por aquí.
                </div>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal className="order-1 lg:order-2" delay={60}>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
              <MessageSquare className="h-3.5 w-3.5" />
              IA + WhatsApp
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink md:text-4xl">
              Mateo responde por ti, 24 horas al día
            </h2>
            <p className="mt-4 text-ink-muted">
              <strong className="text-ink">Mateo (Agente TurnApp)</strong> orienta a tus clientes y puede
              integrarse con tu flujo de WhatsApp Business para agendar sin fricción.
            </p>
          </ScrollReveal>
        </div>

        {/* Row 3 */}
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
              <LayoutGrid className="h-3.5 w-3.5" />
              Equipo
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink md:text-4xl">
              Cada profesional maneja su propia agenda
            </h2>
            <p className="mt-4 text-ink-muted">
              Varios barberos, horarios distintos y servicios por persona — todo organizado en un solo
              negocio.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: '156', l: 'reservas / mes', c: 'text-brand-primary' },
                { k: '4.8', l: 'valoración media', c: 'text-amber-600' },
                { k: '3%', l: 'no-shows', c: 'text-ink-soft' },
                { k: '$1.8k', l: 'ingreso estimado', c: 'text-brand-dark' },
              ].map(s => (
                <div
                  key={s.l}
                  className="landing-stat-card rounded-2xl border border-border bg-chalk p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <p className={`font-heading text-2xl font-bold ${s.c}`}>{s.k}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{s.l}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
