'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ETIQUETA_STAFF, getTipoConfig } from '@/lib/negocio-tipo'
import TurnAppLogo, { TurnAppSymbol } from '@/components/brand/TurnAppLogo'
import Sidebar from '@/components/layout/Sidebar'
import {
  Scissors,
  Calendar,
  Settings,
  BarChart3,
  Users,
  LogOut,
  Zap,
  Lock,
  CreditCard,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { PlanAccesoProvider, usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import AvisoSuscripcion from '@/components/dashboard/AvisoSuscripcion'
import type { CapacidadesPlan } from '@/lib/plan-acceso'

/** Grupos para separadores visuales (1 operación, 2 analítica, 3 cuenta) */
const NAV_BASE = [
  { href: '/dashboard', icon: Calendar, label: 'Agenda', soloLectura: true, proOnly: false, group: 1 },
  { href: '/dashboard/barberos', icon: Users, label: ETIQUETA_STAFF, soloLectura: false, proOnly: false, group: 1 },
  { href: '/dashboard/bloqueos', icon: Lock, label: 'Bloqueos', soloLectura: false, proOnly: false, group: 1 },
  { href: '/dashboard/servicios', icon: Scissors, label: 'Servicios', soloLectura: false, proOnly: false, group: 1 },
  { href: '/dashboard/reservas', icon: Calendar, label: 'Reservas', soloLectura: true, proOnly: false, group: 1 },
  { href: '/dashboard/clientes', icon: Users, label: 'Clientes', soloLectura: true, proOnly: false, group: 1 },
  { href: '/dashboard/reportes', icon: BarChart3, label: 'Reportes', soloLectura: true, proOnly: true, group: 2 },
  { href: '/dashboard/planes', icon: CreditCard, label: 'Planes', soloLectura: true, proOnly: false, group: 3 },
  { href: '/dashboard/ajustes', icon: Settings, label: 'Ajustes', soloLectura: true, proOnly: false, group: 3 },
] as const

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
  }
  if (parts.length === 1) {
    const p = parts[0]!
    return p.length >= 2 ? p.slice(0, 2).toUpperCase() : p.toUpperCase() + '?'
  }
  return local.slice(0, 2).toUpperCase() || '?'
}

const DASHBOARD_TITLE_OVERRIDES: Record<string, string> = {
  '/dashboard/planes': 'Planes y facturación',
  '/dashboard/bloqueos': 'Bloqueos de agenda',
  '/dashboard/reportes': 'Reportes avanzados',
}

function getVetooActiveItem(pathname: string) {
  if (pathname === '/dashboard') return 'agenda'
  if (pathname.startsWith('/dashboard/pacientes')) return 'pacientes'
  if (pathname.startsWith('/dashboard/vacunacion')) return 'vacunacion'
  if (pathname.startsWith('/dashboard/mi-web')) return 'miweb'
  if (pathname.startsWith('/dashboard/configuracion')) return 'configuracion'
  return 'agenda'
}

function planLabel(plan: string) {
  if (plan === 'pro') return 'Plan Pro'
  if (plan === 'basic') return 'Plan Basic'
  if (plan === 'premium') return 'Plan Premium'
  if (plan === 'trial') return 'Plan Trial'
  return `Plan ${plan}`
}

function getDashboardMeta(pathname: string): {
  title: string
  breadcrumbs?: { label: string; href?: string }[]
} {
  const override = DASHBOARD_TITLE_OVERRIDES[pathname]
  if (override) return { title: override }

  const exact = NAV_BASE.find(n => n.href === pathname)
  if (exact) return { title: exact.label }

  if (pathname.startsWith('/dashboard/clientes/')) {
    return {
      title: 'Cliente',
      breadcrumbs: [
        { label: 'Agenda', href: '/dashboard' },
        { label: 'Clientes', href: '/dashboard/clientes' },
      ],
    }
  }

  return { title: 'Panel' }
}

function DashboardMainHeader({
  pathname,
  userEmail,
  onOpenMenu,
  showMenuButton,
  mobileMenuOpen,
}: {
  pathname: string
  userEmail: string | null
  onOpenMenu: () => void
  showMenuButton: boolean
  mobileMenuOpen: boolean
}) {
  const meta = getDashboardMeta(pathname)
  const initials = initialsFromEmail(userEmail)

  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-border bg-chalk px-4 py-4 md:gap-6 md:px-8 md:py-5">
      {showMenuButton && (
        <button
          type="button"
          onClick={onOpenMenu}
          className="shrink-0 rounded-lg p-2 text-ink-muted transition-colors hover:bg-black/[0.04] hover:text-ink md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-mobile-nav"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {meta.breadcrumbs && meta.breadcrumbs.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-sm text-ink-muted" aria-label="Migas de pan">
            {meta.breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-ink-soft">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-heading font-bold text-2xl leading-tight tracking-tight text-ink truncate">
          {meta.title}
        </h1>
      </div>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark"
        title={userEmail ?? undefined}
        aria-hidden
      >
        {initials}
      </div>
    </header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [negocio, setNegocio] = useState<{
    id: string
    nombre: string
    slug: string
    plan: string
    trial_expira_at: string | null
    plan_expira_at: string | null
    tipo_negocio?: string | null
  } | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const { data: clinica, error: errClinica } = await supabase
        .from('clinicas')
        .select('id, nombre, slug, plan, trial_expira_at, plan_expira_at')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!errClinica && clinica) {
        setNegocio({
          id: clinica.id,
          nombre: clinica.nombre,
          slug: clinica.slug,
          plan: clinica.plan,
          trial_expira_at: clinica.trial_expira_at,
          plan_expira_at: clinica.plan_expira_at,
          tipo_negocio: null,
        })
        setCargando(false)
        return
      }

      const { data } = await supabase
        .from('negocios')
        .select('id, nombre, slug, plan, trial_expira_at, plan_expira_at, tipo_negocio')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!data) {
        const meta = user.user_metadata as Record<string, unknown> | undefined
        if (meta?.barbero_id != null || meta?.rol === 'barbero') {
          router.replace('/barbero/dashboard')
          return
        }
        router.replace('/auth/registro')
        return
      }
      setNegocio(data as typeof negocio)
      setCargando(false)
    }
    void verificar()
  }, [router, supabase])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk">
        <div className="text-center">
          <TurnAppSymbol size={36} color="#E8845A" className="mx-auto mb-3 animate-pulse" aria-hidden />
          <p className="text-ink-muted text-sm">Cargando tu panel...</p>
        </div>
      </div>
    )
  }

  if (!negocio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk">
        <p className="text-ink-muted text-sm">Redirigiendo…</p>
      </div>
    )
  }

  const negocioPlan = {
    id: negocio.id,
    nombre: negocio.nombre,
    slug: negocio.slug,
    plan: negocio.plan,
    plan_expira_at: negocio.plan_expira_at ?? null,
    trial_expira_at: negocio.trial_expira_at ?? null,
    tipo_negocio: negocio.tipo_negocio,
  }

  return (
    <PlanAccesoProvider negocio={negocioPlan}>
      <DashboardShell negocio={negocio} pathname={pathname} supabase={supabase}>
        {children}
      </DashboardShell>
    </PlanAccesoProvider>
  )
}

type NegocioRow = {
  id: string
  nombre: string
  slug: string
  plan: string
  trial_expira_at: string | null
  plan_expira_at: string | null
  tipo_negocio?: string | null
}

function SidebarContent({
  negocio,
  pathname,
  capacidades,
  tipoCfg,
  TipoSidebarIcon,
  diasTrial,
  onNavigate,
  cerrarSesion,
  showCloseButton,
  onClose,
}: {
  negocio: NegocioRow
  pathname: string
  capacidades: CapacidadesPlan | null
  tipoCfg: ReturnType<typeof getTipoConfig>
  TipoSidebarIcon: import('react').ComponentType<{ className?: string }>
  diasTrial: number | null
  onNavigate?: () => void
  cerrarSesion: () => void
  showCloseButton?: boolean
  onClose?: () => void
}) {
  const visibleNav = NAV_BASE.filter(item => {
    if (item.proOnly && !capacidades?.reportesAvanzados) return false
    if (!item.soloLectura && capacidades?.nivel === 'solo_lectura') return false
    return true
  })

  const navLinkClass = (active: boolean) =>
    [
      'flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-colors duration-200 ease-out border-l-[3px]',
      active
        ? 'border-l-brand-primary bg-[rgba(13,155,106,0.15)] text-white font-medium'
        : 'border-l-transparent text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white',
    ].join(' ')

  return (
    <>
      <div className="p-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-2">
          <TurnAppLogo
            variant="dark"
            size="md"
            href="/dashboard"
            onClick={onNavigate}
          />
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/55 hover:bg-white/[0.06] hover:text-white transition-colors -mr-1 -mt-0.5"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-white/70 bg-white/[0.08] rounded-lg px-2 py-1.5 border border-white/[0.08]">
          <TipoSidebarIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-medium">{tipoCfg.label}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 min-h-0">
        <div className="space-y-0.5">
          {visibleNav.map((item, i) => (
            <div key={item.href}>
              {i > 0 && item.group !== visibleNav[i - 1]!.group && (
                <div className="h-px bg-[rgba(255,255,255,0.06)] my-2.5" role="separator" />
              )}
              <Link
                href={item.href}
                className={navLinkClass(pathname === item.href)}
                onClick={onNavigate}
              >
                <item.icon className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
                {item.label}
              </Link>
            </div>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-white/[0.06] shrink-0 mt-auto">
        {diasTrial !== null && (
          <div className="bg-amber-500/15 border border-amber-400/25 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-medium text-amber-100">Trial gratuito</span>
            </div>
            <p className="text-xs text-amber-200/90">
              {diasTrial > 0 ? `${diasTrial} días restantes` : 'Trial expirado'}
            </p>
          </div>
        )}
        <a
          href={`/reservar/${negocio.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[rgba(255,255,255,0.55)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <span aria-hidden>🔗</span> Ver mi página de reservas
        </a>
        <p className="text-xs text-[rgba(255,255,255,0.35)] truncate px-3 mt-3 mb-2">{negocio.nombre}</p>
        <button
          type="button"
          onClick={() => {
            void cerrarSesion()
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[rgba(255,255,255,0.75)] bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

function DashboardShell({
  negocio,
  pathname,
  supabase,
  children,
}: {
  negocio: NegocioRow
  pathname: string
  supabase: ReturnType<typeof createClient>
  children: React.ReactNode
}) {
  const { capacidades, avisoPlan } = usePlanAcceso()
  const tipoCfg = getTipoConfig(negocio.tipo_negocio)
  const TipoSidebarIcon = tipoCfg.Icon

  const diasTrial =
    negocio.plan === 'trial' && negocio.trial_expira_at
      ? Math.max(
          0,
          Math.ceil((new Date(negocio.trial_expira_at!).getTime() - Date.now()) / 86400000)
        )
      : null

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.replace('/auth/login')
  }

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [supabase])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar escritorio */}
      <div className="hidden md:block">
        <Sidebar
          clinicaName={negocio.nombre}
          planName={planLabel(negocio.plan)}
          activeItem={getVetooActiveItem(pathname)}
        />
      </div>

      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" id="dashboard-mobile-nav" role="dialog" aria-modal="true" aria-label="Navegación">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar menú"
            onClick={closeMobile}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[220px] max-w-[100vw] shadow-lg">
            <Sidebar
              clinicaName={negocio.nombre}
              planName={planLabel(negocio.plan)}
              activeItem={getVetooActiveItem(pathname)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-screen w-full flex-1 flex-col bg-[#FBF7F4] md:ml-[220px]">
        <DashboardMainHeader
          pathname={pathname}
          userEmail={userEmail}
          onOpenMenu={() => setMobileOpen(true)}
          showMenuButton
          mobileMenuOpen={mobileOpen}
        />
        <main className="dashboard-stack flex-1 px-4 py-6 md:px-8 md:py-8">
          {avisoPlan && capacidades?.nivel === 'solo_lectura' && <AvisoSuscripcion mensaje={avisoPlan} />}
          {children}
        </main>
      </div>
    </div>
  )
}
