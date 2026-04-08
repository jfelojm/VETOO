'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ImagePlus, Loader2, Pencil, StickyNote, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { getAuthHeadersForApi } from '@/lib/api-client-auth'

export type NotaStaffApi = {
  id: string
  content: string
  created_at: string
  updated_at: string
  staff_id: string
  autor_nombre: string
  es_mia: boolean
  photos: { id: string; storage_path: string; signedUrl: string | null }[]
}

const MAX_FOTOS = 3
const MAX_BYTES = 5 * 1024 * 1024
const MIME_OK = ['image/jpeg', 'image/png', 'image/webp']

export default function NotasStaffCliente({ clienteId }: { clienteId: string }) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notas, setNotas] = useState<NotaStaffApi[]>([])
  const [miBarberoId, setMiBarberoId] = useState<string | null>(null)

  const [nuevo, setNuevo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [archivosPendientes, setArchivosPendientes] = useState<File[]>([])

  const [editId, setEditId] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const [preview, setPreview] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const auth = await getAuthHeadersForApi()
      const res = await fetch(`/api/client-notes?cliente_id=${encodeURIComponent(clienteId)}`, {
        credentials: 'include',
        headers: { ...auth },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          setError(
            'Sesión no reconocida por el servidor. Recarga la página o vuelve a iniciar sesión.'
          )
        } else {
          setError(data.error ?? 'No se pudieron cargar las notas')
        }
        setNotas([])
        setMiBarberoId(null)
        return
      }
      setNotas(data.notas ?? [])
      setMiBarberoId(data.miBarberoId ?? null)
    } catch {
      setError('Error de red')
      setNotas([])
      setMiBarberoId(null)
    } finally {
      setCargando(false)
    }
  }, [clienteId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    const next: File[] = [...archivosPendientes]
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (!MIME_OK.includes(f.type)) {
        toast.error('Solo JPG, PNG o WEBP')
        continue
      }
      if (f.size > MAX_BYTES) {
        toast.error('Máximo 5 MB por foto')
        continue
      }
      if (next.length >= MAX_FOTOS) {
        toast.error(`Máximo ${MAX_FOTOS} fotos por nota`)
        break
      }
      next.push(f)
    }
    setArchivosPendientes(next.slice(0, MAX_FOTOS))
  }

  async function crearNota() {
    const texto = nuevo.trim()
    if (!texto) {
      toast.error('Escribe la nota')
      return
    }
    if (!miBarberoId) {
      toast.error('Tu cuenta debe estar vinculada como profesional en Equipo para crear notas.')
      return
    }
    setEnviando(true)
    try {
      const auth = await getAuthHeadersForApi()
      const res = await fetch('/api/client-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clienteId, content: texto }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo guardar')
        return
      }
      const notaId = data.nota?.id as string | undefined
      setNuevo('')
      if (notaId && archivosPendientes.length > 0) {
        for (const file of archivosPendientes.slice(0, MAX_FOTOS)) {
          const fd = new FormData()
          fd.set('file', file)
          const authUp = await getAuthHeadersForApi()
          const up = await fetch(`/api/client-notes/${notaId}/photos`, {
            method: 'POST',
            credentials: 'include',
            headers: { ...authUp },
            body: fd,
          })
          if (!up.ok) {
            const err = await up.json().catch(() => ({}))
            toast.error(err.error ?? 'Error al subir una foto')
          }
        }
      }
      setArchivosPendientes([])
      toast.success('Nota guardada')
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  async function guardarEdicion() {
    if (!editId) return
    const t = editTexto.trim()
    if (!t) {
      toast.error('El texto no puede estar vacío')
      return
    }
    setGuardandoEdit(true)
    try {
      const auth = await getAuthHeadersForApi()
      const res = await fetch(`/api/client-notes/${editId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: t }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo guardar')
        return
      }
      setEditId(null)
      toast.success('Nota actualizada')
      await cargar()
    } finally {
      setGuardandoEdit(false)
    }
  }

  async function eliminarNota(id: string) {
    if (!confirm('¿Eliminar esta nota? Las fotos también se borrarán.')) return
    const auth = await getAuthHeadersForApi()
    const res = await fetch(`/api/client-notes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...auth },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo eliminar')
      return
    }
    toast.success('Nota eliminada')
    await cargar()
  }

  async function subirFotoExtra(notaId: string, files: FileList | null) {
    if (!files?.[0]) return
    const f = files[0]
    if (!MIME_OK.includes(f.type)) {
      toast.error('Solo JPG, PNG o WEBP')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('Máximo 5 MB')
      return
    }
    const nota = notas.find(n => n.id === notaId)
    if (nota && nota.photos.length >= MAX_FOTOS) {
      toast.error(`Máximo ${MAX_FOTOS} fotos`)
      return
    }
    const fd = new FormData()
    fd.set('file', f)
    const auth = await getAuthHeadersForApi()
    const res = await fetch(`/api/client-notes/${notaId}/photos`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...auth },
      body: fd,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo subir')
      return
    }
    toast.success('Foto añadida')
    await cargar()
  }

  async function quitarFoto(notaId: string, photoId: string) {
    const auth = await getAuthHeadersForApi()
    const res = await fetch(`/api/client-notes/${notaId}/photos/${photoId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...auth },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo eliminar')
      return
    }
    await cargar()
  }

  return (
    <div className="card border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="w-5 h-5 text-brand-600 shrink-0" />
        <div>
          <h2 className="font-semibold text-gray-900">Notas del staff</h2>
          <p className="text-xs text-gray-500">
            Solo visible para tu equipo. El cliente no ve este apartado.
          </p>
        </div>
      </div>

      {miBarberoId === null && !cargando && !error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
          No pudimos asociar tu usuario a un profesional del equipo. Pide al dueño que revise tu ficha en{' '}
          <span className="font-medium">Equipo</span> (correo coincidente o invitación). Cierra sesión y vuelve
          a entrar si acabas de ser dado de alta.
        </p>
      )}

      {cargando && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando notas…
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!cargando && miBarberoId && (
        <div className="mb-6 space-y-2">
          <label className="label">Nueva nota</label>
          <textarea
            className="input resize-none min-h-[88px]"
            placeholder="Ej. prefiere fade bajo, alérgico a cierto tinte…"
            value={nuevo}
            onChange={e => setNuevo(e.target.value)}
            disabled={enviando}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              Fotos (hasta {MAX_FOTOS}, 5 MB c/u)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={e => onPickFiles(e.target.files)}
                disabled={enviando}
              />
            </label>
            {archivosPendientes.length > 0 && (
              <span className="text-xs text-gray-500">
                {archivosPendientes.length} archivo(s) se subirán al guardar
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={enviando || !nuevo.trim()}
            onClick={() => void crearNota()}
          >
            {enviando ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {notas.length === 0 && !cargando && (
          <p className="text-sm text-gray-400 text-center py-6">Aún no hay notas internas.</p>
        )}
        {notas.map(n => (
          <div
            key={n.id}
            className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{n.autor_nombre}</p>
                <p className="text-xs text-gray-500">
                  {format(parseISO(n.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                  {n.updated_at !== n.created_at && ' · editada'}
                </p>
              </div>
              {n.es_mia && (
                <div className="flex items-center gap-1 shrink-0">
                  {editId !== n.id ? (
                    <>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-gray-800"
                        aria-label="Editar nota"
                        onClick={() => {
                          setEditId(n.id)
                          setEditTexto(n.content)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-white"
                        aria-label="Eliminar nota"
                        onClick={() => void eliminarNota(n.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-white"
                      onClick={() => setEditId(null)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {editId === n.id ? (
              <div className="space-y-2">
                <textarea
                  className="input resize-none min-h-[80px]"
                  value={editTexto}
                  onChange={e => setEditTexto(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={guardandoEdit}
                  onClick={() => void guardarEdicion()}
                >
                  {guardandoEdit ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</p>
            )}

            {n.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {n.photos.map(ph => (
                  <div key={ph.id} className="relative group">
                    {ph.signedUrl ? (
                      <button
                        type="button"
                        className="block rounded-lg overflow-hidden border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        onClick={() => setPreview(ph.signedUrl)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ph.signedUrl}
                          alt=""
                          className="w-20 h-20 object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                    )}
                    {n.es_mia && editId !== n.id && (
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Quitar foto"
                        onClick={() => void quitarFoto(n.id, ph.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {n.es_mia && editId !== n.id && n.photos.length < MAX_FOTOS && (
              <label className="inline-flex items-center gap-1 mt-2 text-xs text-brand-700 cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5" />
                Añadir foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    void subirFotoExtra(n.id, e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
          aria-label="Cerrar"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </button>
      )}
    </div>
  )
}
