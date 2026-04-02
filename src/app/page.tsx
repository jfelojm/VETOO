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
      <section id="planes" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">Planes</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Elige el plan que encaja con tu negocio. Premium es a medida: te armamos una propuesta personal.
          </p>
          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {/* Básico */}
            <div className="card relative flex flex-col h-full border border-gray-200">
              <p className="text-2xl mb-1" aria-hidden>
                🌱
              </p>
              <h3 className="font-bold text-xl text-gray-900 mb-0.5">Básico</h3>
              <p className="text-sm text-gray-500 mb-4">Para el negocio que quiere organizarse</p>
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0 mb-6">
                <span className="text-3xl font-bold text-gray-900">$19</span>
                <span className="text-gray-500 text-sm">+ IVA / mes</span>
              </div>
              <ul className="space-y-2.5 mb-8 text-sm text-gray-600 flex-1">
                {[
                  '2 staff',
                  'Reservas online con link',
                  'Confirmación por email',
                  'Recordatorios automáticos 24h y 2h',
                  'Panel de agenda básico',
                  'Política de cancelación',
                ].map(f => (
                  <li key={f} className="flex gap-2">
                    <span className="text-green-600 shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="block text-center py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-800 transition-colors mt-auto"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="card relative flex flex-col h-full border-2 border-brand-500 shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Más popular
              </div>
              <p className="text-2xl mb-1" aria-hidden>
                ⭐
              </p>
              <h3 className="font-bold text-xl text-gray-900 mb-0.5">Pro</h3>
              <p className="text-sm text-gray-500 mb-4">Para el negocio que quiere crecer y no perder dinero</p>
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0 mb-6">
                <span className="text-3xl font-bold text-gray-900">$39</span>
                <span className="text-gray-500 text-sm">+ IVA / mes</span>
              </div>
              <ul className="space-y-2.5 mb-4 text-sm text-gray-600 flex-1">
                <li className="flex gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  <span>Staff ilimitado</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  <span>Todo lo del Básico</span>
                </li>
                <li className="pt-1">
                  <span className="font-semibold text-gray-800">Dashboard avanzado:</span>
                  <ul className="mt-2 space-y-1.5 pl-1 ml-4 border-l-2 border-brand-100 text-gray-600">
                    <li className="pl-3">Staff que más vende</li>
                    <li className="pl-3">Servicios más solicitados</li>
                    <li className="pl-3">Horas pico del negocio</li>
                    <li className="pl-3">Ingresos por rango de fechas</li>
                    <li className="pl-3">Tasa de no-shows</li>
                  </ul>
                </li>
                {[
                  'Lista negra de no-shows',
                  'Clientes que no vuelven — alerta automática si un cliente frecuente lleva X días sin reservar',
                  'Historial completo por cliente — cuántas visitas, qué servicios, cuánto ha gastado',
                  'Página de reservas personalizada con logo y colores del negocio',
                ].map(f => (
                  <li key={f} className="flex gap-2">
                    <span className="text-green-600 shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="block text-center py-2.5 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors mt-auto"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Premium */}
            <div className="card relative flex flex-col h-full border border-gray-200 bg-gray-50/80">
              <h3 className="font-bold text-xl text-gray-900 mb-0.5">Premium</h3>
              <p className="text-sm text-gray-500 mb-4">Servicio personalizado</p>
              <p className="text-sm text-gray-600 mb-6 flex-1 leading-relaxed">
                Ideal si necesitas integraciones, volumen alto, varias sucursales o un flujo a tu medida.
                Te cotizamos según lo que necesites.
              </p>
              <p className="text-sm text-gray-700 mb-4">
                <span className="font-medium text-gray-900">Más información:</span>
                <br />
                <a
                  href="tel:+593987122959"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  +593 98 712 2959
                </a>
              </p>
              <a
                href="https://wa.me/593987122959?text=Hola%2C%20me%20interesa%20el%20plan%20Premium%20de%20Turnapp."
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2.5 rounded-xl text-sm font-medium border-2 border-brand-500 text-brand-700 hover:bg-brand-50 transition-colors mt-auto"
              >
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Turnapp · Hecho para negocios de belleza y bienestar</p>
      </footer>

    </div>
  )
}
