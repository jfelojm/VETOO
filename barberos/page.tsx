'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, User } from 'lucide-react'

interface Barbero {
  id: string
  nombre: string
  bio: string | null
  activo: boolean
  orden: number
}

export default function BarberosPage() {
  const supabase = createClient()
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [negocioId, setNegocioId] = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Barbero | null>(null)
  const [form, setForm] = useState({ nombre: '', bio: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)
      const { data } = await supabase.from('barberos').select('*').eq('negocio_id', neg.id).order('orden')
      setBarberos(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  async function guardar() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    if (editando) {
      const { error } = await supabase.from('barberos').update({ nombre: form.nombre, bio: form.bio || null }).eq('id', editando.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      setBarberos(prev => prev.map(b => b.id === editando.id ? { ...b, nombre: form.nombre, bio: form.bio || null } : b))
      toast.success('Barbero actualizado')
    } else {
      const { data, error } = await supabase.from('barberos').insert({
        negocio_id: negocioId, nombre: form.nombre, bio: form.bio || null, orden: barberos.length
      }).select().single()
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      setBarberos(prev => [...prev, data])
      toast.success('Barbero agregado')
    }
    setForm({ nombre: '', bio: '' })
    setMostrarForm(false)
    setEditando(null)
    setGuardando(false)
  }

  async function toggleActivo(barbero: Barbero) {
    const { error } = await supabase.from('barberos').update({ activo: !barbero.activo }).eq('id', barbero.id)
    if (error) { toast.error('Error'); return }
    setBarberos(prev => prev.map(b => b.id === barbero.id ? { ...b, activo: !b.activo } : b))
    toast.success(barbero.activo ? 'Barbero desactivado' : 'Barbero activado')
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este barbero?')) return
    const { error } = await supabase.from('barberos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setBarberos(prev => prev.filter(b => b.id !== id))
    toast.success('Barbero eliminado')
  }

  function abrirEditar(b: Barbero) {
    setEditando(b)
    setForm({ nombre: b.nombre, bio: b.bio ?? '' })
    setMostrarForm(true)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm({ nombre: '', bio: '' })
  }

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barberos</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona el equipo de tu barbería</p>
        </div>
        {!mostrarForm && (
          <button onClick={() => setMostrarForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar barbero
          </button>
        )}
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editando ? 'Editar barbero' : 'Nuevo barbero'}</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="input" placeholder="Nombre del barbero" />
            </div>
            <div>
              <label className="label">Descripción / especialidad</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="input resize-none h-20" placeholder="Ej: Especialista en cortes modernos y degradados" />
            </div>
            <div className="flex gap-3">
              <button onClick={guardar} disabled={guardando} className="btn-primary">
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button onClick={cancelar} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de barberos */}
      {barberos.length === 0 ? (
        <div className="card text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No tienes barberos agregados todavía</p>
          <button onClick={() => setMostrarForm(true)} className="btn-primary">
            <Plus className="w-4 h-4 inline mr-2" /> Agregar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {barberos.map(b => (
            <div key={b.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 shrink-0">
                {b.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{b.nombre}</p>
                {b.bio && <p className="text-sm text-gray-500 truncate">{b.bio}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${b.activo ? 'badge-green' : 'badge-gray'}`}>
                  {b.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => toggleActivo(b)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={b.activo ? 'Desactivar' : 'Activar'}>
                  {b.activo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                <button onClick={() => abrirEditar(b)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <Pencil className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => eliminar(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
