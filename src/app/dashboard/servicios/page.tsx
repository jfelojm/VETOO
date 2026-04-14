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
  Scissors,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import RequierePlanOperativo from '@/components/dashboard/RequierePlanOperativo'
import type { Servicio, ServicioFoto } from '@/types'
import { MAX_FOTOS_POR_SERVICIO } from '@/lib/servicio-fotos-api'
import { inferImageMime } from '@/lib/servicio-fotos-mime'
import { cn, formatPrecio } from '@/lib/utils'

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
  const [fotoDropOver, setFotoDropOver] = useState(false)

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

  if (cargando) return <div className="text-sm text-ink-muted">Cargando...</div>

  const topeServ = capacidades?.maxServicios ?? 999
  const puedeNuevoServicio = capacidades?.puedeOperarNegocio && servicios.length < topeServ
  const fotosCount = editando ? fotosEdit.length : 0

  return (
    <RequierePlanOperativo>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-ink-muted text-sm mt-0">
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
              className="btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={2} /> Agregar servicio
            </button>
          )}
        </div>

        {mostrarForm && (
          <div className="card mb-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-ink">
              {editando ? 'Editar servicio' : 'Nuevo servicio'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre del servicio *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="input-r12"
                  placeholder="Ej: Corte clásico, Barba, Keratina..."
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input-r12 h-20 resize-none"
                  placeholder="Descripción opcional del servicio"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Duración (minutos) *</label>
                  <select
                    value={form.duracion}
                    onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))}
                    className="input-r12"
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
                    className="input-r12"
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="Ej: 8.00"
                  />
                  <p className="mt-1 text-xs text-ink-muted">El pago se realiza en el local</p>
                </div>
              </div>

              {editando && (
                <div className="border-t border-border pt-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="label mb-0">Fotos del servicio</label>
                    <span className="text-xs font-medium text-ink-muted">
                      {fotosCount}/{MAX_FOTOS_POR_SERVICIO} fotos
                    </span>
                  </div>
                  <p className="mb-4 text-xs text-ink-muted">JPG, PNG o WEBP · máx. 3 MB cada una</p>

                  <div
                    onDragEnter={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFotoDropOver(true)
                    }}
                    onDragLeave={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFotoDropOver(false)
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFotoDropOver(false)
                      if (!editando) return
                      const files = e.dataTransfer.files
                      if (files.length) void subirFotos(editando.id, files)
                    }}
                    className={cn(
                      'rounded-xl border-2 border-dashed p-4 transition-colors duration-200',
                      fotoDropOver
                        ? 'border-brand-primary bg-brand-light'
                        : 'border-border bg-chalk hover:border-border-hover hover:bg-brand-light'
                    )}
                  >
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {fotosEdit.map((f, idx) => (
                        <div
                          key={f.id}
                          className="relative aspect-square min-h-[120px] overflow-hidden rounded-[12px] border border-border bg-surface"
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
                            <div className="flex h-full w-full items-center justify-center">
                              <Scissors className="h-8 w-8 text-ink-muted/40" />
                            </div>
                          )}
                          <div className="absolute left-1.5 top-1.5 flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moverFoto(editando.id, f.id, -1)}
                              className="rounded-md border border-border bg-chalk/95 p-1 shadow-sm backdrop-blur-sm disabled:opacity-30"
                              aria-label="Subir en el carrusel"
                            >
                              <ChevronUp className="h-3.5 w-3.5 text-ink-soft" />
                            </button>
                            <button
                              type="button"
                              disabled={idx >= fotosEdit.length - 1}
                              onClick={() => moverFoto(editando.id, f.id, 1)}
                              className="rounded-md border border-border bg-chalk/95 p-1 shadow-sm backdrop-blur-sm disabled:opacity-30"
                              aria-label="Bajar en el carrusel"
                            >
                              <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => void eliminarFoto(editando.id, f.id)}
                            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/75 text-white shadow-md transition-colors hover:bg-ink"
                            aria-label="Eliminar foto"
                          >
                            <X className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <label
                      className={cn(
                        'inline-flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-chalk/50 px-4 py-6 text-center transition-colors hover:border-brand-primary/50 hover:bg-brand-light sm:py-8',
                        fotosCount >= MAX_FOTOS_POR_SERVICIO || subiendoFotos ? 'pointer-events-none opacity-50' : ''
                      )}
                    >
                      <ImageIcon className="h-8 w-8 text-brand-primary" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-ink-soft">
                        {subiendoFotos ? 'Subiendo…' : 'Arrastra fotos aquí o toca para elegir'}
                      </span>
                      <span className="text-xs text-ink-muted">Hasta {MAX_FOTOS_POR_SERVICIO} fotos por servicio</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        disabled={fotosCount >= MAX_FOTOS_POR_SERVICIO || subiendoFotos}
                        onChange={e => {
                          const picked = e.target.files ? Array.from(e.target.files) : []
                          e.target.value = ''
                          if (picked.length && editando) void subirFotos(editando.id, picked)
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void guardar()}
                  disabled={guardando}
                  className="btn-primary w-full sm:w-auto"
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar y continuar'}
                </button>
                <button type="button" onClick={cancelar} className="btn-secondary w-full sm:w-auto">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {servicios.length === 0 ? (
          <div className="card py-12 text-center">
            <Scissors className="mx-auto mb-3 h-12 w-12 text-ink-muted/40" strokeWidth={1.25} />
            <p className="mb-4 text-sm text-ink-muted">No tienes servicios agregados todavía</p>
            <button
              type="button"
              disabled={!puedeNuevoServicio}
              onClick={() => puedeNuevoServicio && nuevoServicio()}
              className="btn-primary w-full max-w-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="mr-2 inline h-4 w-4" strokeWidth={2} /> Agregar el primero
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {servicios.map(s => (
              <li key={s.id}>
                <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 md:p-6">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[12px] border border-border bg-surface">
                      {thumbUrls[s.id] ? (
                        <Image
                          src={thumbUrls[s.id]}
                          alt={s.nombre}
                          width={160}
                          height={160}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Scissors className="h-8 w-8 text-brand-primary/50" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-base font-semibold leading-snug text-ink">{s.nombre}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                          {s.duracion} min
                        </span>
                        {s.precio != null && (
                          <span className="font-heading text-lg font-bold text-brand-primary">
                            {formatPrecio(Number(s.precio))}
                          </span>
                        )}
                      </div>
                      {s.descripcion && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{s.descripcion}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.activo}
                      onClick={() => void toggleActivo(s)}
                      className={cn(
                        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35',
                        s.activo ? 'bg-brand-primary' : 'bg-border'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-out',
                          s.activo ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEditar(s)}
                        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                        aria-label="Editar servicio"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void eliminar(s.id)}
                        className="rounded-lg p-2 text-danger/80 transition-colors hover:bg-red-50 hover:text-danger"
                        aria-label="Eliminar servicio"
                      >
                        <Trash2 className="h-4 w-4" />
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
