'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Scissors, ImageIcon, X } from 'lucide-react'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import RequierePlanOperativo from '@/components/dashboard/RequierePlanOperativo'

const MAX_FOTO_BYTES = 3 * 1024 * 1024
const MIME_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  duracion: number
  precio: number | null
  activo: boolean
  orden: number
  photo_url?: string | null
}

export default function ServiciosPage() {
  const supabase = createClient()
  const { capacidades } = usePlanAcceso()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [negocioId, setNegocioId] = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', duracion: '30', precio: '' })
  const [guardando, setGuardando] = useState(false)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [previewLocal, setPreviewLocal] = useState<string | null>(null)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)
      const { data } = await supabase.from('servicios').select('*').eq('negocio_id', neg.id).order('orden')
      setServicios(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    async function signThumbs() {
      const next: Record<string, string> = {}
      for (const s of servicios) {
        if (!s.photo_url) continue
        const { data } = await supabase.storage.from('service-photos').createSignedUrl(s.photo_url, 3600)
        if (data?.signedUrl) next[s.id] = data.signedUrl
      }
      if (!cancelled) {
        setThumbUrls(next)
      }
    }
    void signThumbs()
    return () => {
      cancelled = true
    }
  }, [servicios, supabase])

  async function authHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  async function subirFotoApi(servicioId: string, file: File): Promise<boolean> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/servicios/${servicioId}/photo`, {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: form,
    })
    const json = (await res.json().catch(() => ({}))) as {
      error?: string
      photo_url?: string
      signedUrl?: string | null
    }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudo subir la foto')
      return false
    }
    if (json.photo_url) {
      setServicios(prev => prev.map(s => (s.id === servicioId ? { ...s, photo_url: json.photo_url! } : s)))
      if (json.signedUrl) {
        setThumbUrls(prev => ({ ...prev, [servicioId]: json.signedUrl! }))
      }
    }
    return true
  }

  async function eliminarFotoApi(servicioId: string): Promise<boolean> {
    const res = await fetch(`/api/servicios/${servicioId}/photo`, {
      method: 'DELETE',
      credentials: 'include',
      headers: await authHeaders(),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudo eliminar la foto')
      return false
    }
    setServicios(prev => prev.map(s => (s.id === servicioId ? { ...s, photo_url: null } : s)))
    setThumbUrls(prev => {
      const n = { ...prev }
      delete n[servicioId]
      return n
    })
    return true
  }

  function onArchivoFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!MIME_FOTO.has(f.type)) {
      toast.error('Usa JPG, PNG o WEBP')
      return
    }
    if (f.size > MAX_FOTO_BYTES) {
      toast.error('Máximo 3 MB')
      return
    }
    if (previewLocal) URL.revokeObjectURL(previewLocal)
    setArchivoFoto(f)
    setPreviewLocal(URL.createObjectURL(f))
  }

  function limpiarFotoPendiente() {
    if (previewLocal) URL.revokeObjectURL(previewLocal)
    setPreviewLocal(null)
    setArchivoFoto(null)
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!form.duracion || isNaN(Number(form.duracion))) {
      toast.error('La duración debe ser un número')
      return
    }
    setGuardando(true)

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      duracion: Number(form.duracion),
      precio: form.precio ? Number(form.precio) : null,
    }

    let servicioIdParaFoto: string | null = null

    if (editando) {
      const { error } = await supabase.from('servicios').update(payload).eq('id', editando.id)
      if (error) {
        toast.error('Error al guardar')
        setGuardando(false)
        return
      }
      setServicios(prev => prev.map(s => (s.id === editando.id ? { ...s, ...payload } : s)))
      servicioIdParaFoto = editando.id
      toast.success('Servicio actualizado')
    } else {
      const tope = capacidades?.maxServicios ?? 999
      if (servicios.length >= tope) {
        toast.error(`Tu plan permite hasta ${tope} servicios. Sube a Pro para ilimitados.`)
        setGuardando(false)
        return
      }
      const { data, error } = await supabase
        .from('servicios')
        .insert({
          ...payload,
          negocio_id: negocioId,
          orden: servicios.length,
        })
        .select()
        .single()
      if (error || !data) {
        toast.error('Error al guardar')
        setGuardando(false)
        return
      }
      setServicios(prev => [...prev, data as Servicio])
      servicioIdParaFoto = data.id
      toast.success('Servicio agregado')
    }

    if (servicioIdParaFoto && archivoFoto) {
      const ok = await subirFotoApi(servicioIdParaFoto, archivoFoto)
      if (ok) toast.success('Foto guardada')
      limpiarFotoPendiente()
    }

    cancelar()
    setGuardando(false)
  }

  async function toggleActivo(s: Servicio) {
    const { error } = await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id)
    if (error) {
      toast.error('Error')
      return
    }
    setServicios(prev => prev.map(x => (x.id === s.id ? { ...x, activo: !x.activo } : x)))
    toast.success(s.activo ? 'Servicio desactivado' : 'Servicio activado')
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    const s = servicios.find(x => x.id === id)
    if (s?.photo_url) {
      const fotoOk = await eliminarFotoApi(id)
      if (!fotoOk) return
    }
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
      return
    }
    setServicios(prev => prev.filter(x => x.id !== id))
    toast.success('Servicio eliminado')
  }

  function abrirEditar(s: Servicio) {
    limpiarFotoPendiente()
    setEditando(s)
    setForm({
      nombre: s.nombre,
      descripcion: s.descripcion ?? '',
      duracion: String(s.duracion),
      precio: s.precio ? String(s.precio) : '',
    })
    setMostrarForm(true)
  }

  function cancelar() {
    limpiarFotoPendiente()
    setMostrarForm(false)
    setEditando(null)
    setForm({ nombre: '', descripcion: '', duracion: '30', precio: '' })
  }

  async function quitarFotoExistente() {
    if (!editando) return
    const ok = await eliminarFotoApi(editando.id)
    if (ok) toast.success('Foto eliminada')
    limpiarFotoPendiente()
    setEditando(prev => (prev ? { ...prev, photo_url: null } : null))
  }

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  const topeServ = capacidades?.maxServicios ?? 999
  const puedeNuevoServicio = capacidades?.puedeOperarNegocio && servicios.length < topeServ

  const previewFormSrc = previewLocal ?? (editando?.id ? thumbUrls[editando.id] : null)

  return (
    <RequierePlanOperativo>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
            <p className="text-gray-500 text-sm mt-1">
              {servicios.length} servicio{servicios.length !== 1 ? 's' : ''}
              {capacidades?.nivel === 'basic' ? ` · máx. ${topeServ} en plan Básico` : ''}
              {capacidades?.nivel === 'pro' ? ' · ilimitado en tu plan' : ''}
            </p>
            {capacidades?.nivel === 'basic' && servicios.length >= topeServ && (
              <p className="text-xs text-amber-800 mt-2">
                <Link href="/#planes" className="font-medium text-brand-700 underline">
                  Plan Pro
                </Link>{' '}
                incluye servicios ilimitados.
              </p>
            )}
          </div>
          {!mostrarForm && (
            <button
              type="button"
              disabled={!puedeNuevoServicio}
              onClick={() => puedeNuevoServicio && setMostrarForm(true)}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Agregar servicio
            </button>
          )}
        </div>

        {mostrarForm && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre del servicio *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="input"
                  placeholder="Ej: Corte clásico, Barba, Keratina..."
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input resize-none h-16"
                  placeholder="Descripción opcional del servicio"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Duración (minutos) *</label>
                  <select
                    value={form.duracion}
                    onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))}
                    className="input"
                  >
                    {[15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240].map(v => (
                      <option key={v} value={v}>
                        {v} minutos{v >= 60 ? ` (${v / 60}h)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Precio referencial (USD)</label>
                  <input
                    value={form.precio}
                    onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                    className="input"
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="Ej: 8.00"
                  />
                  <p className="text-xs text-gray-400 mt-1">El pago se realiza en el local</p>
                </div>
              </div>

              <div>
                <label className="label">Foto del servicio</label>
                <p className="text-xs text-gray-500 mb-2">JPG, PNG o WEBP · máx. 3 MB</p>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="w-24 h-24 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {previewFormSrc ? (
                      <Image
                        src={previewFormSrc}
                        alt={editando?.nombre ? `Vista previa · ${editando.nombre}` : 'Vista previa'}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <Scissors className="w-10 h-10 text-gray-300" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer w-fit">
                      <ImageIcon className="w-4 h-4" />
                      Elegir imagen
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={onArchivoFotoChange}
                      />
                    </label>
                    {(archivoFoto || (editando?.photo_url && !previewLocal)) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (archivoFoto) limpiarFotoPendiente()
                          else if (editando?.photo_url) void quitarFotoExistente()
                        }}
                        className="text-sm text-red-600 hover:underline inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        {archivoFoto ? 'Quitar imagen nueva' : 'Eliminar foto actual'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => void guardar()} disabled={guardando} className="btn-primary">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar'}
                </button>
                <button onClick={cancelar} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {servicios.length === 0 ? (
          <div className="card text-center py-12">
            <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No tienes servicios agregados todavía</p>
            <button
              type="button"
              disabled={!puedeNuevoServicio}
              onClick={() => puedeNuevoServicio && setMostrarForm(true)}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 inline mr-2" /> Agregar el primero
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {servicios.map(s => (
              <div key={s.id} className="card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                  {thumbUrls[s.id] ? (
                    <Image
                      src={thumbUrls[s.id]}
                      alt={s.nombre}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Scissors className="w-6 h-6 text-brand-600" />
                  )}
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
                  <button
                    onClick={() => toggleActivo(s)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {s.activo ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => void eliminar(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequierePlanOperativo>
  )
}
