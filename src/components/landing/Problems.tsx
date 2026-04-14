import { MessageCircle, UserX, Users } from 'lucide-react'
import ScrollReveal from '@/components/landing/ScrollReveal'

const ITEMS = [
  {
    icon: MessageCircle,
    title: 'WhatsApp no es agenda',
    desc: 'Los mensajes se pierden, no sabes quién viene a qué hora y pierdes tiempo coordinando.',
    fix: 'TurnApp centraliza reservas en un solo lugar.',
  },
  {
    icon: UserX,
    title: 'Los no-shows cuestan dinero',
    desc: 'Sillas vacías y horas sin facturar porque no hay recordatorios ni políticas claras.',
    fix: 'Recordatorios automáticos y políticas de cancelación que tú defines.',
  },
  {
    icon: Users,
    title: 'Tus clientes no son tuyos',
    desc: 'Las plataformas que cobran comisión se quedan con los datos y con la relación.',
    fix: 'Los clientes son tuyos. Sin comisiones por reserva.',
  },
] as const

export default function Problems() {
  return (
    <section id="problemas" className="scroll-mt-24 bg-ink py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-brand-primary" />
        <ScrollReveal>
          <h2 className="font-heading text-center text-3xl font-bold text-white md:text-4xl">
            ¿Te suena familiar?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-ink-muted">
            Tres problemas que vemos en barberías y salones todos los días.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ITEMS.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 80}>
              <div className="landing-card-dark group h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-glow/30 hover:shadow-lg">
                <item.icon className="h-10 w-10 text-brand-glow" strokeWidth={1.5} />
                <h3 className="mt-3 font-heading text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.desc}</p>
                <p className="mt-4 rounded-xl bg-brand-dark/80 px-3 py-2 text-sm font-medium text-brand-glow">
                  {item.fix}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
