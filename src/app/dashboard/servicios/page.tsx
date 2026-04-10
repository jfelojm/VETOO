'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Scissors,
  ImageIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import RequierePlanOperativo from '@/components/dashboard/RequierePlanOperativo'
import type { Servicio, ServicioFoto } from '@/types'
import { MAX_FOTOS_POR_SERVICIO } from '@/lib/servicio-fotos-api'
import { inferImageMime } from '@/lib/servicio-fotos-mime'

const MAX_FOTO_BYTES = 3 * 1024 * 1024

type FotoApi = ServicioFoto & { signedUrl: string | null }

function mapRowToServicio(r: Record<string, unknown>): Servicio {
  const raw = r.servicio_fotos as ServicioFoto[] | undefined
  const fotos = raw ? [...raw].sort((a, b) => a.orden - b.orden) : undefined
  const { servicio_fotos: _, ...rest } = r
  return { ...(rest as unknown as Servicio), fotos }
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
  const [fotosEdit, setFotosEdit] = useState<FotoApi[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  async function authHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  async function recargarServicios() {
    if (!negocioId) return
    const { data } = await supabase
      .from('servicios')
      .select(
        `
        *,
        servicio_fotos ( id, servicio_id, negocio_id, storage_path, orden, created_at )
      `
      )
      .eq('negocio_id', negocioId)
      .order('orden')
    setServicios((data ?? []).map(row => mapRowToServicio(row as Record<string, unknown>)))
  }

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)
      const { data } = await supabase
        .from('servicios')
        .select(
          `
          *,
          servicio_fotos ( id, servicio_id, negocio_id, storage_path, orden, created_at )
        `
        )
        .eq('negocio_id', neg.id)
        .order('orden')
      setServicios((data ?? []).map(row => mapRowToServicio(row as Record<string, unknown>)))
      setCargando(false)
    }
    cargar()
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    async function loadThumbsFromApi() {
      const headers = await authHeaders()
      const next: Record<string, string> = {}
      for (const s of servicios) {
        const fotos = [...(s.fotos ?? [])].sort((a, b) => a.orden - b.orden)
        if (fotos.length === 0 && !s.photo_url) continue
        const res = await fetch(`/api/servicios/${s.id}/photos`, {
          credentials: 'include',
          headers,
        })
        if (!res.ok) continue
        const json = (await res.json().catch(() => ({}))) as {
          fotos?: { signedUrl?: string | null }[]
        }
        const url = json.fotos?.[0]?.signedUrl
        if (url) next[s.id] = url
      }
      if (!cancelled) setThumbUrls(next)
    }
    void loadThumbsFromApi()
    return () => {
      cancelled = true
    }
  }, [servicios, supabase])

  async function cargarFotosFormulario(servicioId: string) {
    const res = await fetch(`/api/servicios/${servicioId}/photos`, {
      credentials: 'include',
      headers: await authHeaders(),
    })
    const json = (await res.json().catch(() => ({}))) as { fotos?: FotoApi[]; error?: string }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudieron cargar las fotos')
      setFotosEdit([])
      return
    }
    setFotosEdit(json.fotos ?? [])
  }

  async function subirFotos(servicioId: string, files: FileList | File[]) {
    const arr = Array.from(files)
    if (arr.length === 0) return
    if (fotosEdit.length + arr.length > MAX_FOTOS_POR_SERVICIO) {
      toast.error(`Máximo ${MAX_FOTOS_POR_SERVICIO} fotos por servicio`)
      return
    }
    setSubiendoFotos(true)
    const form = new FormData()
    for (const f of arr) {
      if (!inferImageMime(f)) {
        toast.error('Usa JPG, PNG o WEBP')
        setSubiendoFotos(false)
        return
      }
      if (f.size > MAX_FOTO_BYTES) {
        toast.error('Máximo 3 MB por foto')
        setSubiendoFotos(false)
        return
      }
      form.append('files', f)
    }
    const res = await fetch(`/api/servicios/${servicioId}/photos`, {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: form,
    })
    const text = await res.text()
    let json: { error?: string } = {}
    try {
      json = JSON.parse(text) as { error?: string }
    } catch {
      /* HTML o texto plano */
    }
    if (!res.ok) {
      toast.error(json.error ?? (text ? text.slice(0, 160) : `Error ${res.status}`))
      setSubiendoFotos(false)
      return
    }
    toast.success('Fotos actualizadas')
    await cargarFotosFormulario(servicioId)
    await recargarServicios()
    setSubiendoFotos(false)
  }

  async function eliminarFoto(servicioId: string, photoId: string) {
    const res = await fetch(`/api/servicios/${servicioId}/photos/${photoId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: await authHeaders(),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudo eliminar')
      return
    }
    await cargarFotosFormulario(servicioId)
    await recargarServicios()
  }

  async function reordenar(servicioId: string, ids: string[]) {
    const res = await fetch(`/api/servicios/${servicioId}/photos/reorder`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ ids }),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudo reordenar')
      return
    }
    await cargarFotosFormulario(servicioId)
    await recargarServicios()
  }

  function moverFoto(servicioId: string, photoId: string, delta: number) {
    const ids = fotosEdit.map(f => f.id)
    const i = ids.indexOf(photoId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    void reordenar(servicioId, next)
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

    if (editando) {
      const { error } = await supabase.from('servicios').update(payload).eq('id', editando.id)
      if (error) {
        toast.error('Error al guardar')
        setGuardando(false)
        return
      }
      await recargarServicios()
      setEditando(prev =>
        prev && prev.id === editando.id
          ? {
              ...prev,
              nombre: payload.nombre,
              descripcion: payload.descripcion,
              duracion: payload.duracion,
              precio: payload.precio,
            }
          : prev
      )
      toast.success('Servicio actualizado')
    } else {
      const tope = capacidades?.maxServicios ?? 999
      if (servicios.length >= tope) {
        toast.error(
          tope >= 999
            ? 'No se pudo agregar el servicio (límite del sistema).'
            : `Tu plan permite hasta ${tope} servicios. Sube de plan para más cupos.`
        )
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
        .select(
          `
          *,
          servicio_fotos ( id, servicio_id, negocio_id, storage_path, orden, created_at )
        `
        )
        .single()
      if (error || !data) {
        toast.error('Error al guardar')
        setGuardando(false)
        return
      }
      const nuevo = mapRowToServicio(data as Record<string, unknown>)
      setServicios(prev => [...prev, nuevo])
      setEditando(nuevo)
      toast.success('Servicio agregado. Puedes subir hasta 5 fotos.')
      void cargarFotosFormulario(nuevo.id)
    }

    setGuardando(false)
  }

  async function toggleActivo(s: Servicio) {
    const { error } = await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id)
    if (error) {
      toast.error('Error')
      return
    }
    await recargarServicios()
    toast.success(s.activo ? 'Servicio desactivado' : 'Servicio activado')
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    const s = servicios.find(x => x.id === id)
    const paths = new Set<string>()
    for (const f of s?.fotos ?? []) paths.add(f.storage_path)
    if (s?.photo_url) paths.add(s.photo_url)
    for (const p of paths) {
      await supabase.storage.from('service-photos').remove([p])
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
    setEditando(s)
    setForm({
      nombre: s.nombre,
      descripcion: s.descripcion ?? '',
      duracion: String(s.duracion),
      precio: s.precio ? String(s.precio) : '',
    })
    setMostrarForm(true)
    void cargarFotosFormulario(s.id)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm({ nombre: '', descripcion: '', duracion: '30', precio: '' })
    setFotosEdit([])
  }

  function nuevoServicio() {
    setEditando(null)
    setForm({ nombre: '', descripcion: '', duracion: '30', precio: '' })
    setFotosEdit([])
    setMostrarForm(true)
  }

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  const topeServ = capacidades?.maxServicios ?? 999
  const puedeNuevoServicio = capacidades?.puedeOperarNegocio && servicios.length < topeServ
  const fotosCount = editando ? fotosEdit.length : 0

  return (
    <RequierePlanOperativo>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
            <p className="text-gray-500 text-sm mt-1">
              {servicios.length} servicio{servicios.length !== 1 ? 's' : ''}
              {capacidades?.nivel === 'basic' &&
                (topeServ >= 999 ? ' · servicios ilimitados en plan Básico' : ` · máx. ${topeServ} en plan Básico`)}
              {capacidades?.nivel === 'pro' ? ' · ilimitado en tu plan' : ''}
            </p>
            {capacidades?.nivel === 'basic' && topeServ < 999 && servicios.length >= topeServ && (
              <p className="text-xs text-amber-800 mt-2">
                <Link href="/dashboard/planes" className="font-medium text-brand-700 underline">
                  Otros planes
                </Link>{' '}
                permiten más servicios.
              </p>
            )}
          </div>
          {!mostrarForm && (
            <button
              type="button"
              disabled={!puedeNuevoServicio}
              onClick={() => puedeNuevoServicio && nuevoServicio()}
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

              {editando && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="label mb-0">Fotos del servicio</label>
                    <span className="text-xs font-medium text-gray-500">
                      {fotosCount}/{MAX_FOTOS_POR_SERVICIO} fotos
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">JPG, PNG o WEBP · máx. 3 MB cada una</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {fotosEdit.map((f, idx) => (
                      <div
                        key={f.id}
                        className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 aspect-square min-h-[120px]"
                      >
                        {f.signedUrl ? (
                          <Image
                            src={f.signedUrl}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                            sizes="(max-width: 640px) 50vw, 120px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Scissors className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moverFoto(editando.id, f.id, -1)}
                            className="p-1 rounded bg-white/90 shadow border border-gray-200 disabled:opacity-30"
                            aria-label="Subir en el carrusel"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx >= fotosEdit.length - 1}
                            onClick={() => moverFoto(editando.id, f.id, 1)}
                            className="p-1 rounded bg-white/90 shadow border border-gray-200 disabled:opacity-30"
                            aria-label="Bajar en el carrusel"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => void eliminarFoto(editando.id, f.id)}
                          className="absolute bottom-1 left-1 right-1 text-xs py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                  <label
                    className={`btn-secondary inline-flex items-center gap-2 cursor-pointer w-fit ${
                      fotosCount >= MAX_FOTOS_POR_SERVICIO || subiendoFotos ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {subiendoFotos ? 'Subiendo…' : 'Agregar fotos'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      disabled={fotosCount >= MAX_FOTOS_POR_SERVICIO || subiendoFotos}
                      onChange={e => {
                        // Copiar antes de vaciar: si no, el FileList se limpia y la subida queda en 0 archivos (silencioso).
                        const picked = e.target.files ? Array.from(e.target.files) : []
                        e.target.value = ''
                        if (picked.length && editando) void subirFotos(editando.id, picked)
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => void guardar()} disabled={guardando} className="btn-primary">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar y continuar'}
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
              onClick={() => puedeNuevoServicio && nuevoServicio()}
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
