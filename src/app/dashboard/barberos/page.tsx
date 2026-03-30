'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Mail, Check, X } from 'lucide-react'

interface Barbero {
  id: string
  nombre: string
  bio: string | null
  activo: boolean
  email: string | null
  user_id: string | null
  negocio_id: string
}

export default function BarberosPage() {
  const supabase = createClient()
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [negocioId, setNegocioId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [invitandoId, setInvitandoId] = useState<string | null>(null)
  const [emailInvite, setEmailInvite] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)
      const { data } = await supabase
        .from('barberos')
        .select('*')
        .eq('negocio_id', neg.id)
        .order('created_at', { ascending: true })
      setBarberos(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  async function agregarBarbero() {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    setGuardando(true)
    const { data, error } = await supabase
      .from('barberos')
      .insert({ negocio_id: negocioId, nombre: nombre.trim(), bio: bio.trim() || null, activo: true })
      .select('*').single()
    if (error) { toast.error('Error al agregar'); setGuardando(false); return }
    setBarberos(prev => [...prev, data])
    setNombre(''); setBio(''); setMostrarForm(false)
    toast.success('Profesional agregado')
    setGuardando(false)
  }

  async function toggleActivo(barbero: Barbero) {
    const { error } = await supabase
      .from('barberos').update({ activo: !barbero.activo }).eq('id', barbero.id)
    if (error) { toast.error('Error al actualizar'); return }
    setBarberos(prev => prev.map(b => b.id === barbero.id ? { ...b, activo: !b.activo } : b))
  }

  async function enviarInvitacion(barbero: Barbero) {
    if (!emailInvite.trim()) { toast.error('Ingresa el email'); return }
    setGuardando(true)
    const res = await fetch('/api/barberos/invitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barbero_id: barbero.id, email: emailInvite.trim(), negocio_id: negocioId }),
    })
    if (!res.ok) {
      toast.error('Error al enviar invitación')
      setGuardando(false)
      return
    }
    setBarberos(prev => prev.map(b => b.id === barbero.id ? { ...b, email: emailInvite.trim() } : b))
    setInvitandoId(null)
    setEmailInvite('')
    toast.success('Invitación enviada por email')
    setGuardando(false)
  }

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profesionales</h1>
          <p className="text-gray-500 text-sm mt-1">{barberos.length} profesionales registrados</p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Nuevo profesional</h2>
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
              <button onClick={agregarBarbero} disabled={guardando} className="btn-primary">
                {guardando ? 'Guardando...' : 'Agregar profesional'}
              </button>
              <button onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {barberos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">No tienes profesionales registrados</p>
          <p className="text-gray-400 text-xs mt-1">Agrega a tu equipo para que los clientes puedan elegir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {barberos.map(b => (
            <div key={b.id} className={`card ${!b.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-sm shrink-0">
                  {b.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{b.nombre}</p>
                    {!b.activo && <span className="badge badge-gray">Inactivo</span>}
                    {b.user_id && <span className="badge badge-green text-xs">Acceso activo</span>}
                  </div>
                  {b.bio && <p className="text-sm text-gray-500 mt-0.5">{b.bio}</p>}
                  {b.email && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {b.email}
                      {b.user_id ? <span className="text-green-600 ml-1">✓ Cuenta creada</span> : <span className="text-amber-600 ml-1">Pendiente activación</span>}
                    </p>
                  )}
                  {invitandoId === b.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={emailInvite}
                        onChange={e => setEmailInvite(e.target.value)}
                        className="input text-sm py-1.5 flex-1"
                        placeholder="email@ejemplo.com"
                        type="email"
                      />
                      <button onClick={() => enviarInvitacion(b)} disabled={guardando}
                        className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setInvitandoId(null); setEmailInvite('') }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!b.user_id && invitandoId !== b.id && (
                    <button onClick={() => { setInvitandoId(b.id); setEmailInvite(b.email ?? '') }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                      <Mail className="w-3 h-3" /> Invitar
                    </button>
                  )}
                  <button onClick={() => toggleActivo(b)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      b.activo
                        ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}>
                    {b.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
