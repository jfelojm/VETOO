import Link from 'next/link'
import { Scissors, Calendar, Bell, BarChart3, Shield, Smartphone } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-lg">Turnapp</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className="btn-primary text-sm">
              Registrar mi negocio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>✂</span>
          14 días gratis — sin tarjeta de crédito
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          <span className="text-brand-600">Reservas online para tu negocio</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Tus clientes reservan directamente desde Instagram o WhatsApp.
          Tú gestionas todo desde un panel simple. Sin complicaciones.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/register" className="btn-primary px-8 py-3 text-base">
            Empieza gratis hoy
          </Link>
          <Link href="/reservar/demo" className="btn-secondary px-8 py-3 text-base">
            Ver demo en vivo
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Configuración en menos de 10 minutos
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Smartphone,
                titulo: 'Link desde Instagram y WhatsApp',
                desc: 'Comparte tu link de reservas en tu bio de IG, stories o en WhatsApp Business. Los clientes reservan en 1 minuto desde su celular.'
              },
              {
                icon: Calendar,
                titulo: 'Gestión de agenda en tiempo real',
                desc: 'Ve todas tus reservas del día, bloquea horarios y configura la disponibilidad de cada profesional.'
              },
              {
                icon: Bell,
                titulo: 'Confirmaciones automáticas',
                desc: 'El cliente recibe confirmación por email al instante. Tú también. Sin llamadas, sin WhatsApps manuales.'
              },
              {
                icon: Shield,
                titulo: 'Política de cancelación tuya',
                desc: 'Configuras tus propias reglas: con cuánta anticipación se puede cancelar, cuántas veces, qué mensaje ve el cliente.'
              },
              {
                icon: BarChart3,
                titulo: 'Reportes y estadísticas',
                desc: 'Cuántas reservas tuviste, cuáles servicios son los más pedidos, qué horas tienen más demanda.'
              },
              {
                icon: Scissors,
                titulo: 'Varios profesionales',
                desc: 'Agrega a todo tu equipo. Cada uno con su agenda y disponibilidad independiente.'
              },
            ].map((f, i) => (
              <div key={i} className="card">
                <f.icon className="w-8 h-8 text-brand-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">{f.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">Precios simples</h2>
          <p className="text-gray-500 text-center mb-12">Sin sorpresas. Cancela cuando quieras.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                plan: 'Básico',
                precio: 20,
                features: ['2 profesionales', 'Reservas ilimitadas', 'Confirmación por email', 'Política de cancelación', 'Link para IG y WhatsApp'],
                destacado: false,
              },
              {
                plan: 'Pro',
                precio: 40,
                features: ['5 profesionales', 'Todo lo del Básico', 'Recordatorios automáticos', 'Reportes avanzados', 'Soporte prioritario'],
                destacado: true,
              },
              {
                plan: 'Premium',
                precio: 80,
                features: ['Profesionales ilimitados', 'Todo lo del Pro', 'Integración WhatsApp', 'API personalizada', 'Onboarding dedicado'],
                destacado: false,
              },
            ].map((p) => (
              <div key={p.plan} className={`card relative ${p.destacado ? 'border-2 border-brand-500 shadow-md' : ''}`}>
                {p.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Más popular
                  </div>
                )}
                <h3 className="font-bold text-lg mb-1">{p.plan}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">${p.precio}</span>
                  <span className="text-gray-400 text-sm">/mes</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className={`block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    p.destacado
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  Empezar gratis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© 2025 Turnapp · Hecho para negocios de belleza y bienestar</p>
      </footer>

    </div>
  )
}
