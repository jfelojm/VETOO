import { NextRequest } from 'next/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { getMiBarberoId, usuarioTieneAccesoNegocio } from '@/lib/staff-cliente-access'

type RouteParams = { params: Promise<{ noteId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { noteId } = await params
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  let body: { content?: string }
  try {
    body = await req.json()
  } catch {
    return jsonWithCookies({ error: 'JSON inválido' }, 400, cookiesToSet)
  }

  const content = (body.content ?? '').trim()
  if (!content) {
    return jsonWithCookies({ error: 'El contenido no puede estar vacío' }, 400, cookiesToSet)
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
    return jsonWithCookies({ error: 'Solo puedes editar tus propias notas' }, 403, cookiesToSet)
  }

  const ok = await usuarioTieneAccesoNegocio(supabase, user.id, note.negocio_id)
  if (!ok) {
    return jsonWithCookies({ error: 'Sin acceso' }, 403, cookiesToSet)
  }

  const { data: updated, error: uErr } = await supabase
    .from('client_notes')
    .update({ content })
    .eq('id', noteId)
    .select('id, content, created_at, updated_at, staff_id')
    .single()

  if (uErr || !updated) {
    return jsonWithCookies({ error: uErr?.message ?? 'No se pudo actualizar' }, 400, cookiesToSet)
  }

  return jsonWithCookies({ nota: updated }, 200, cookiesToSet)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { noteId } = await params
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
    return jsonWithCookies({ error: 'Solo puedes eliminar tus propias notas' }, 403, cookiesToSet)
  }

  const ok = await usuarioTieneAccesoNegocio(supabase, user.id, note.negocio_id)
  if (!ok) {
    return jsonWithCookies({ error: 'Sin acceso' }, 403, cookiesToSet)
  }

  const { data: photos } = await supabase.from('client_note_photos').select('storage_path').eq('note_id', noteId)

  if (photos?.length) {
    const paths = photos.map(p => p.storage_path)
    await supabase.storage.from('client-notes').remove(paths)
  }

  const { error: delErr } = await supabase.from('client_notes').delete().eq('id', noteId)

  if (delErr) {
    return jsonWithCookies({ error: delErr.message }, 400, cookiesToSet)
  }

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
