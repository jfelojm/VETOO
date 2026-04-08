import { NextRequest } from 'next/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { getMiBarberoId, usuarioTieneAccesoNegocio } from '@/lib/staff-cliente-access'

const BUCKET = 'client-notes'

type RouteParams = { params: Promise<{ noteId: string; photoId: string }> }

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { noteId, photoId } = await params
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  const miBarberoId = await getMiBarberoId(supabase, user.id)
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
    return jsonWithCookies({ error: 'Solo puedes quitar fotos de tus notas' }, 403, cookiesToSet)
  }

  const ok = await usuarioTieneAccesoNegocio(supabase, user.id, note.negocio_id)
  if (!ok) {
    return jsonWithCookies({ error: 'Sin acceso' }, 403, cookiesToSet)
  }

  const { data: photo, error: pErr } = await supabase
    .from('client_note_photos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('note_id', noteId)
    .single()

  if (pErr || !photo) {
    return jsonWithCookies({ error: 'Foto no encontrada' }, 404, cookiesToSet)
  }

  await supabase.storage.from(BUCKET).remove([photo.storage_path])
  const { error: delErr } = await supabase.from('client_note_photos').delete().eq('id', photoId)

  if (delErr) {
    return jsonWithCookies({ error: delErr.message }, 400, cookiesToSet)
  }

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
