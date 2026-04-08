import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { resolveMiBarberoId, usuarioTieneAccesoNegocio } from '@/lib/staff-cliente-access'

const BUCKET = 'client-notes'
const MAX_BYTES = 5 * 1024 * 1024
const MAX_PHOTOS = 3
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

type RouteParams = { params: Promise<{ noteId: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { noteId } = await params
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  const miBarberoId = await resolveMiBarberoId(supabase, user)
  if (!miBarberoId) {
    return jsonWithCookies({ error: 'Sin permiso' }, 403, cookiesToSet)
  }

  const { data: note, error: nErr } = await supabase
    .from('client_notes')
    .select('id, staff_id, negocio_id')
    .eq('id', noteId)
    .single()

  if (nErr || !note) {
    return jsonWithCookies({ error: 'Nota no encontrada' }, 404, cookiesToSet)
  }

  if (note.staff_id !== miBarberoId) {
    return jsonWithCookies({ error: 'Solo puedes añadir fotos a tus notas' }, 403, cookiesToSet)
  }

  const ok = await usuarioTieneAccesoNegocio(supabase, user, note.negocio_id)
  if (!ok) {
    return jsonWithCookies({ error: 'Sin acceso' }, 403, cookiesToSet)
  }

  const { count } = await supabase
    .from('client_note_photos')
    .select('*', { count: 'exact', head: true })
    .eq('note_id', noteId)

  if (count != null && count >= MAX_PHOTOS) {
    return jsonWithCookies({ error: `Máximo ${MAX_PHOTOS} fotos por nota` }, 400, cookiesToSet)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonWithCookies({ error: 'FormData inválido' }, 400, cookiesToSet)
  }

  const file = form.get('file')
  if (!file || !(file instanceof File)) {
    return jsonWithCookies({ error: 'Falta archivo (campo file)' }, 400, cookiesToSet)
  }

  if (!ALLOWED.has(file.type)) {
    return jsonWithCookies({ error: 'Solo JPG, PNG o WEBP' }, 400, cookiesToSet)
  }

  if (file.size > MAX_BYTES) {
    return jsonWithCookies({ error: 'Máximo 5 MB por foto' }, 400, cookiesToSet)
  }

  if (count != null && count + 1 > MAX_PHOTOS) {
    return jsonWithCookies({ error: `Máximo ${MAX_PHOTOS} fotos por nota` }, 400, cookiesToSet)
  }

  const ext =
    file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : 'webp'
  const storagePath = `${note.negocio_id}/${noteId}/${randomUUID()}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: file.type,
    upsert: false,
  })

  if (upErr) {
    return jsonWithCookies({ error: upErr.message }, 400, cookiesToSet)
  }

  const { data: row, error: insErr } = await supabase
    .from('client_note_photos')
    .insert({ note_id: noteId, storage_path: storagePath })
    .select('id, storage_path')
    .single()

  if (insErr || !row) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    return jsonWithCookies({ error: insErr?.message ?? 'Error al guardar foto' }, 400, cookiesToSet)
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)

  return jsonWithCookies(
    { foto: { id: row.id, storage_path: row.storage_path, signedUrl: signed?.signedUrl ?? null } },
    201,
    cookiesToSet
  )
}
