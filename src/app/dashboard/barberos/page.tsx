'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Mail,
  Check,
  X,
  UserPlus,
  Calendar,
  Scissors,
  BarChart3,
  ChevronLeft,
} from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import RequierePlanOperativo from '@/components/dashboard/RequierePlanOperativo'
import Link from 'next/link'
import { emailsIguales } from '@/lib/email'
import { cn } from '@/lib/utils'

interface Staff {
  id: string
  nombre: string
  bio: string | null
  activo: boolean
  email: string | null
  user_id: string | null
  negocio_id: string
}

type TabDetalle = 'agenda' | 'servicios' | 'estadisticas'

function rolStaff(m: Staff): string {
  if (m.user_id) return 'Profesional con acceso'
  if (m.email) return 'Invitación pendiente'
  return 'Ficha local'
}

export default function StaffPage() {
  const supabase = createClient()
  const { capacidades } = usePlanAcceso()
  const [staff, setStaff] = useState<Staff[]>([])
  const [negocioId, setNegocioId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [invitandoId, setInvitandoId] = useState<string | null>(null)
  const [emailInvite, setEmailInvite] = useState('')
  const [correoDueño, setCorreoDueño] = useState<string | null>(null)
  const [vinculandoId, setVinculandoId] = useState<string | null>(null)

  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [tabDetalle, setTabDetalle] = useState<TabDetalle>('agenda')
  const [statsMes, setStatsMes] = useState<{ reservas: number; noShows: number } | null>(null)
  const [cargandoStats, setCargandoStats] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)
      setCorreoDueño(user.email ?? null)
      const { data } = await supabase
        .from('barberos')
        .select('*')
        .eq('negocio_id', neg.id)
        .order('created_at', { ascending: true })
      setStaff(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [supabase])

  useEffect(() => {
    if (!detalleId || !negocioId) {
      setStatsMes(null)
      return
    }
    let cancelled = false
    setCargandoStats(true)
    const inicio = startOfMonth(new Date()).toISOString()
    const fin = endOfMonth(new Date()).toISOString()
    void (async () => {
      const [{ count: cRes }, { count: cNs }] = await Promise.all([
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .eq('barbero_id', detalleId)
          .gte('fecha_hora', inicio)
          .lte('fecha_hora', fin)
          .neq('estado', 'cancelada'),
        supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .eq('barbero_id', detalleId)
          .gte('fecha_hora', inicio)
          .lte('fecha_hora', fin)
          .eq('estado', 'no_show'),
      ])
      if (!cancelled) {
        setStatsMes({ reservas: cRes ?? 0, noShows: cNs ?? 0 })
        setCargandoStats(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detalleId, negocioId, supabase])

  async function agregarMiembro() {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    const activos = staff.filter(b => b.activo).length
    if (capacidades && activos >= capacidades.maxBarberosActivos) {
      toast.error(
        `Tu plan permite hasta ${capacidades.maxBarberosActivos} profesionales activos. Sube a Pro para ilimitados.`
      )
      return
    }
    setGuardando(true)
    const { data, error } = await supabase
      .from('barberos')
      .insert({ negocio_id: negocioId, nombre: nombre.trim(), bio: bio.trim() || null, activo: true })
      .select('*').single()
    if (error) { toast.error('Error al agregar'); setGuardando(false); return }
    setStaff(prev => [...prev, data])
    setNombre(''); setBio(''); setMostrarForm(false)
    toast.success('Miembro del staff agregado')
    setGuardando(false)
  }

  async function toggleActivo(miembro: Staff) {
    if (!miembro.activo && capacidades) {
      const activos = staff.filter(b => b.activo).length
      if (activos >= capacidades.maxBarberosActivos) {
        toast.error(
          `Límite de ${capacidades.maxBarberosActivos} profesionales activos en tu plan. Desactiva otro o sube a Pro.`
        )
        return
      }
    }
    const { error } = await supabase
      .from('barberos').update({ activo: !miembro.activo }).eq('id', miembro.id)
    if (error) { toast.error('Error al actualizar'); return }
    setStaff(prev => prev.map(b => b.id === miembro.id ? { ...b, activo: !b.activo } : b))
  }

  async function enviarInvitacion(miembro: Staff) {
    if (!emailInvite.trim()) {
      toast.error('Ingresa el email')
      return
    }
    if (correoDueño && emailsIguales(emailInvite, correoDueño)) {
      toast.error(
        'El correo del administrador no puede usarse para invitar a un profesional. Usa otro correo o «Vincular mi cuenta» si tú eres ese profesional.'
      )
      return
    }
    setGuardando(true)
    const res = await fetch('/api/barberos/invitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barbero_id: miembro.id, email: emailInvite.trim(), negocio_id: negocioId }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(typeof payload.error === 'string' ? payload.error : 'Error al enviar invitación')
      setGuardando(false)
      return
    }
    setStaff(prev => prev.map(b => (b.id === miembro.id ? { ...b, email: emailInvite.trim() } : b)))
    setInvitandoId(null)
    setEmailInvite('')
    toast.success('Invitación enviada por email')
    setGuardando(false)
  }

  async function vincularMiCuenta(miembro: Staff) {
    setVinculandoId(miembro.id)
    try {
      const res = await fetch('/api/barberos/vincular-mi-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbero_id: miembro.id, negocio_id: negocioId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload.error === 'string' ? payload.error : 'No se pudo vincular')
        return
      }
      await supabase.auth.refreshSession()
      const { data: { user } } = await supabase.auth.getUser()
      setStaff(prev =>
        prev.map(b =>
          b.id === miembro.id
            ? { ...b, user_id: user?.id ?? b.user_id, email: user?.email ?? b.email }
            : b
        )
      )
      toast.success('Tu cuenta quedó vinculada a este profesional')
    } finally {
      setVinculandoId(null)
    }
  }

  if (cargando) return <div className="text-ink-muted text-sm">Cargando...</div>

  const activos = staff.filter(b => b.activo).length
  const tope = capacidades?.maxBarberosActivos ?? 999
  const puedeAgregarMas =
    capacidades?.puedeOperarNegocio && activos < tope

  const miembroDetalle = detalleId ? staff.find(s => s.id === detalleId) : null

  return (
    <RequierePlanOperativo>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mt-0 text-sm text-ink-muted">
              {activos} activo{activos !== 1 ? 's' : ''}
              {capacidades?.nivel === 'basic' ? ` · máx. ${tope} en plan Básico` : ''}
              {capacidades?.nivel === 'pro' ? ' · ilimitado en tu plan' : ''}
            </p>
            <p className="mt-2 max-w-xl text-xs text-ink-muted">
              Cada profesional invitado debe usar un{' '}
              <span className="font-medium text-ink-soft">correo distinto</span> al de tu cuenta de administrador. Si tú
              también atiendes en la agenda, añade tu ficha y usa{' '}
              <span className="font-medium text-ink-soft">Vincular mi cuenta</span> (misma cuenta, sin invitar por correo).
            </p>
            {capacidades?.nivel === 'basic' && activos >= tope && (
              <p className="mt-2 text-xs text-amber-800">
                <Link href="/#planes" className="font-medium text-brand-primary underline">
                  Plan Pro
                </Link>
                {' '}incluye staff ilimitado.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!puedeAgregarMas}
            onClick={() => puedeAgregarMas && setMostrarForm(!mostrarForm)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto touch-manipulation"
          >
            <UserPlus className="h-4 w-4" strokeWidth={2} /> Agregar
          </button>
        </div>

        {mostrarForm && (
          <div className="card">
            <h2 className="mb-4 font-heading font-semibold text-ink">Nuevo miembro del staff</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  className="input" placeholder="Nombre del profesional" />
              </div>
              <div>
                <label className="label">Descripción (opcional)</label>
                <input value={bio} onChange={e => setBio(e.target.value)}
                  className="input" placeholder="Especialidad, años de experiencia..." />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void agregarMiembro()} disabled={guardando} className="btn-primary">
                  {guardando ? 'Guardando...' : 'Agregar al staff'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {miembroDetalle ? (
          <div className="card overflow-hidden border-border p-0">
            <div className="border-b border-border bg-surface/50 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setDetalleId(null)}
                className="mb-3 flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" /> Volver a la lista
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-lg font-bold text-brand-dark">
                  {miembroDetalle.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-xl font-bold text-ink">{miembroDetalle.nombre}</h2>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {miembroDetalle.email ?? 'Sin correo asociado'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Secciones del profesional">
                {([
                  { id: 'agenda' as const, label: 'Agenda', Icon: Calendar },
                  { id: 'servicios' as const, label: 'Servicios', Icon: Scissors },
                  { id: 'estadisticas' as const, label: 'Estadísticas', Icon: BarChart3 },
                ]).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tabDetalle === id}
                    onClick={() => setTabDetalle(id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 touch-manipulation',
                      tabDetalle === id
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'bg-surface text-ink-soft hover:bg-brand-light hover:text-brand-dark'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-5 sm:px-6">
              {tabDetalle === 'agenda' && (
                <div className="rounded-2xl border border-border bg-chalk p-4 text-sm text-ink-soft">
                  <p className="font-medium text-ink">Agenda y disponibilidad</p>
                  <p className="mt-2 text-ink-muted">
                    Gestiona los turnos de este profesional desde <strong className="text-ink-soft">Reservas</strong> y los bloqueos en <strong className="text-ink-soft">Bloqueos</strong>.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/dashboard/reservas" className="btn-primary inline-flex text-sm">
                      Ir a reservas
                    </Link>
                    <Link href="/dashboard/bloqueos" className="btn-secondary inline-flex text-sm">
                      Ir a bloqueos
                    </Link>
                  </div>
                </div>
              )}

              {tabDetalle === 'servicios' && (
                <div className="rounded-2xl border border-border bg-chalk p-4 text-sm text-ink-soft">
                  <p className="font-medium text-ink">Servicios del negocio</p>
                  <p className="mt-2 text-ink-muted">
                    Los servicios se configuran a nivel del negocio y aplican a todo el equipo.
                  </p>
                  <Link href="/dashboard/servicios" className="btn-primary mt-4 inline-flex text-sm">
                    Gestionar servicios
                  </Link>
                </div>
              )}

              {tabDetalle === 'estadisticas' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Reservas del mes</p>
                    <p className="mt-2 font-heading text-3xl font-extrabold text-brand-primary">
                      {cargandoStats ? '…' : statsMes?.reservas ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Rating</p>
                    <p className="mt-2 font-heading text-3xl font-extrabold text-brand-primary">—</p>
                    <p className="mt-1 text-[11px] text-ink-muted">Próximamente</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">No-shows</p>
                    <p className="mt-2 font-heading text-3xl font-extrabold text-brand-primary">
                      {cargandoStats ? '…' : statsMes?.noShows ?? '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : staff.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm text-ink-muted">No tienes miembros en el staff</p>
            <p className="mt-1 text-xs text-ink-muted">Agrega a tu equipo para que los clientes puedan elegir</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {staff.map(miembro => (
              <li key={miembro.id}>
                <div
                  className={cn(
                    'card transition-shadow',
                    !miembro.activo && 'opacity-90'
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand-dark">
                        {miembro.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading font-semibold text-ink">{miembro.nombre}</p>
                          {miembro.activo ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                              </span>
                              Activo
                            </span>
                          ) : (
                            <span className="rounded-full bg-ink-muted/15 px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">{rolStaff(miembro)}</p>
                        {miembro.bio && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{miembro.bio}</p>}
                        {miembro.email && (
                          <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                            <Mail className="h-3.5 w-3.5 shrink-0" /> {miembro.email}
                            {miembro.user_id
                              ? <span className="ml-1 font-medium text-success">· Cuenta creada</span>
                              : <span className="ml-1 font-medium text-warning">· Pendiente activación</span>}
                          </p>
                        )}
                        {invitandoId === miembro.id && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-ink-muted">
                              Correo del profesional (no puede ser el mismo que el administrador).
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                value={emailInvite}
                                onChange={e => setEmailInvite(e.target.value)}
                                className="input min-w-0 flex-1 py-2 text-sm"
                                placeholder="otro-correo@ejemplo.com"
                                type="email"
                              />
                              <button
                                type="button"
                                onClick={() => void enviarInvitacion(miembro)}
                                disabled={guardando}
                                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-primary px-3 py-2 text-white hover:bg-brand-dark disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInvitandoId(null)
                                  setEmailInvite('')
                                }}
                                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-chalk px-3 py-2 text-ink-muted hover:bg-surface"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setDetalleId(miembro.id)
                          setTabDetalle('agenda')
                        }}
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        Ver detalle
                      </button>
                      {!miembro.user_id && invitandoId !== miembro.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => void vincularMiCuenta(miembro)}
                            disabled={vinculandoId === miembro.id}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-border bg-chalk px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-brand-primary/40 hover:bg-brand-light hover:text-brand-dark disabled:opacity-60 sm:w-auto"
                          >
                            {vinculandoId === miembro.id ? '…' : 'Vincular mi cuenta'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInvitandoId(miembro.id)
                              setEmailInvite(miembro.email ?? '')
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-dark sm:w-auto"
                          >
                            <UserPlus className="h-3.5 w-3.5" strokeWidth={2} /> Invitar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => void toggleActivo(miembro)}
                        className={cn(
                          'inline-flex w-full justify-center rounded-full px-3 py-2 text-xs font-medium transition-colors sm:w-auto',
                          miembro.activo
                            ? 'border border-border bg-chalk text-ink-soft hover:bg-surface'
                            : 'bg-brand-light text-brand-dark hover:bg-brand-light/80'
                        )}
                      >
                        {miembro.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RequierePlanOperativo>
  )
}
