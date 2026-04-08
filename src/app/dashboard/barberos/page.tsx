'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Mail, Check, X } from 'lucide-react'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import RequierePlanOperativo from '@/components/dashboard/RequierePlanOperativo'
import Link from 'next/link'
import { emailsIguales } from '@/lib/email'

interface Staff {
  id: string
  nombre: string
  bio: string | null
  activo: boolean
  email: string | null
  user_id: string | null
  negocio_id: string
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
  }, [])

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

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  const activos = staff.filter(b => b.activo).length
  const tope = capacidades?.maxBarberosActivos ?? 999
  const puedeAgregarMas =
    capacidades?.puedeOperarNegocio && activos < tope

  return (
    <RequierePlanOperativo>
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activos} activo{activos !== 1 ? 's' : ''}
            {capacidades?.nivel === 'basic' ? ` · máx. ${tope} en plan Básico` : ''}
            {capacidades?.nivel === 'pro' ? ' · ilimitado en tu plan' : ''}
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-xl">
            Cada profesional invitado debe usar un{' '}
            <span className="font-medium text-gray-700">correo distinto</span> al de tu cuenta de administrador. Si tú
            también atiendes en la agenda, añade tu ficha y usa{' '}
            <span className="font-medium text-gray-700">Vincular mi cuenta</span> (misma cuenta, sin invitar por correo).
          </p>
          {capacidades?.nivel === 'basic' && activos >= tope && (
            <p className="text-xs text-amber-800 mt-2">
              <Link href="/#planes" className="font-medium text-brand-700 underline">
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
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Nuevo miembro del staff</h2>
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
            <div className="flex gap-3">
              <button onClick={agregarMiembro} disabled={guardando} className="btn-primary">
                {guardando ? 'Guardando...' : 'Agregar al staff'}
              </button>
              <button onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">No tienes miembros en el staff</p>
          <p className="text-gray-400 text-xs mt-1">Agrega a tu equipo para que los clientes puedan elegir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(miembro => (
            <div key={miembro.id} className={`card ${!miembro.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-sm shrink-0">
                  {miembro.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{miembro.nombre}</p>
                    {!miembro.activo && <span className="badge badge-gray">Inactivo</span>}
                    {miembro.user_id && <span className="badge badge-green text-xs">Acceso activo</span>}
                  </div>
                  {miembro.bio && <p className="text-sm text-gray-500 mt-0.5">{miembro.bio}</p>}
                  {miembro.email && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {miembro.email}
                      {miembro.user_id
                        ? <span className="text-green-600 ml-1">✓ Cuenta creada</span>
                        : <span className="text-amber-600 ml-1">Pendiente activación</span>}
                    </p>
                  )}
                  {invitandoId === miembro.id && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500">
                        Correo del profesional (no puede ser el mismo que el administrador).
                      </p>
                      <div className="flex gap-2">
                        <input
                          value={emailInvite}
                          onChange={e => setEmailInvite(e.target.value)}
                          className="input text-sm py-1.5 flex-1"
                          placeholder="otro-correo@ejemplo.com"
                          type="email"
                        />
                        <button
                          type="button"
                          onClick={() => void enviarInvitacion(miembro)}
                          disabled={guardando}
                          className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInvitandoId(null)
                            setEmailInvite('')
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!miembro.user_id && invitandoId !== miembro.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => void vincularMiCuenta(miembro)}
                        disabled={vinculandoId === miembro.id}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-brand-50 text-brand-800 rounded-lg hover:bg-brand-100 disabled:opacity-60"
                      >
                        {vinculandoId === miembro.id ? '…' : 'Vincular mi cuenta'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInvitandoId(miembro.id)
                          setEmailInvite(miembro.email ?? '')
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                      >
                        <Mail className="w-3 h-3" /> Invitar otro correo
                      </button>
                    </>
                  )}
                  <button onClick={() => toggleActivo(miembro)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      miembro.activo
                        ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}>
                    {miembro.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </RequierePlanOperativo>
  )
}