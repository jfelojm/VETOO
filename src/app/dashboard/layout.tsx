'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors, Calendar, Settings, BarChart3, Users, LogOut, Zap } from 'lucide-react'

const NAV = [
  { href: '/dashboard',           icon: Calendar,  label: 'Agenda' },
  { href: '/dashboard/barberos',  icon: Users,     label: 'Barberos' },
  { href: '/dashboard/servicios', icon: Scissors,  label: 'Servicios' },
  { href: '/dashboard/reservas',  icon: Calendar,  label: 'Reservas' },
  { href: '/dashboard/clientes',  icon: Users,     label: 'Clientes' },
  { href: '/dashboard/reportes',  icon: BarChart3, label: 'Reportes' },
  { href: '/dashboard/ajustes',   icon: Settings,  label: 'Ajustes' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [negocio, setNegocio] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      const { data } = await supabase
        .from('negocios')
        .select('id, nombre, slug, plan, trial_expira_at')
        .eq('owner_id', user.id)
        .single()
      if (!data) { router.replace('/auth/register'); return }
      setNegocio(data)
      setCargando(false)
    }
    verificar()
  }, [])

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Scissors className="w-8 h-8 text-brand-600 mx-auto mb-3 animate-pulse" />
        <p className="text-gray-400 text-sm">Cargando tu panel...</p>
      </div>
    </div>
  )

  const diasTrial = negocio?.plan === 'trial' && negocio?.trial_expira_at
    ? Math.max(0, Math.ceil((new Date(negocio.trial_expira_at).getTime() - Date.now()) / 86400000))
    : null

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.replace('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full z-40">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-brand-600" />
            <span className="font-bold text-sm">BarberApp</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">{negocio?.nombre}</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          {diasTrial !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">Trial gratuito</span>
              </div>
              <p className="text-xs text-amber-700">
                {diasTrial > 0 ? `${diasTrial} días restantes` : 'Trial expirado'}
              </p>
            </div>
          )}
          <a href={`/reservar/${negocio?.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors">
            <span>🔗</span> Ver mi página de reservas
          </a>
          <button onClick={cerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors mt-1">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}