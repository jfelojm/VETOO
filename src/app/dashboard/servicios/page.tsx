'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Scissors } from 'lucide-react'

interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  duracion: number
  precio: number | null
  activo: boolean
  orden: number
}

export default function ServiciosPage() {
  const supabase = createClient()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [negocioId, setNegocioId] = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', duracion: '30', precio: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)
      const { data } = await supabase.from('servicios').select('*').eq('negocio_id', neg.id).order('orden')
      setServicios(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  async function guardar() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.duracion || isNaN(Number(form.duracion))) { toast.error('La duración debe ser un número'); return }
    setGuardando(true)

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      duracion: Number(form.duracion),
      precio: form.precio ? Number(form.precio) : null,
    }

    if (editando) {
      const { error } = await supabase.from('servicios').update(payload).eq('id', editando.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      setServicios(prev => prev.map(s => s.id === editando.id ? { ...s, ...payload } : s))
      toast.success('Servicio actualizado')
    } else {
      const { data, error } = await supabase.from('servicios').insert({
        ...payload, negocio_id: negocioId, orden: servicios.length
      }).select().single()
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      setServicios(prev => [...prev, data])
      toast.success('Servicio agregado')
    }
    cancelar()
    setGuardando(false)
  }

  async function toggleActivo(s: Servicio) {
    const { error } = await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id)
    if (error) { toast.error('Error'); return }
    setServicios(prev => prev.map(x => x.id === s.id ? { ...x, activo: !x.activo } : x))
    toast.success(s.activo ? 'Servicio desactivado' : 'Servicio activado')
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setServicios(prev => prev.filter(s => s.id !== id))
    toast.success('Servicio eliminado')
  }

  function abrirEditar(s: Servicio) {
    setEditando(s)
    setForm({ nombre: s.nombre, descripcion: s.descripcion ?? '', duracion: String(s.duracion), precio: s.precio ? String(s.precio) : '' })
    setMostrarForm(true)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm({ nombre: '', descripcion: '', duracion: '30', precio: '' })
  }

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">Define los servicios que ofreces y sus precios</p>
        </div>
        {!mostrarForm && (
          <button onClick={() => setMostrarForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar servicio
          </button>
        )}
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre del servicio *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="input" placeholder="Ej: Corte clásico, Barba, Keratina..." />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="input resize-none h-16" placeholder="Descripción opcional del servicio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Duración (minutos) *</label>
                <select value={form.duracion} onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))} className="input">
                  {[15,20,30,45,60,75,90,120,150,180,240].map(v => (
                    <option key={v} value={v}>{v} minutos{v >= 60 ? ` (${v/60}h)` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Precio referencial (USD)</label>
                <input value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                  className="input" type="number" min="0" step="0.50" placeholder="Ej: 8.00" />
                <p className="text-xs text-gray-400 mt-1">El pago se realiza en el local</p>
              </div>
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

      {/* Lista de servicios */}
      {servicios.length === 0 ? (
        <div className="card text-center py-12">
          <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No tienes servicios agregados todavía</p>
          <button onClick={() => setMostrarForm(true)} className="btn-primary">
            <Plus className="w-4 h-4 inline mr-2" /> Agregar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {servicios.map(s => (
            <div key={s.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{s.nombre}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">{s.duracion} min</span>
                  {s.precio && <span className="text-xs text-gray-500 font-medium">${s.precio}</span>}
                  {s.descripcion && <span className="text-xs text-gray-400 truncate">{s.descripcion}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${s.activo ? 'badge-green' : 'badge-gray'}`}>
                  {s.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => toggleActivo(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  {s.activo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <Pencil className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => eliminar(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
