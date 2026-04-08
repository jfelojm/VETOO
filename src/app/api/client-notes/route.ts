import { NextRequest } from 'next/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { resolveMiBarberoId, usuarioTieneAccesoNegocio } from '@/lib/staff-cliente-access'

const BUCKET = 'client-notes'

async function firmarFotos(
  supabase: ReturnType<typeof createSupabaseRouteClient>['supabase'],
  paths: string[]
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    paths.map(async path => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      if (!error && data?.signedUrl) out[path] = data.signedUrl
    })
  )
  return out
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  const clienteId = req.nextUrl.searchParams.get('cliente_id')
  if (!clienteId) {
    return jsonWithCookies({ error: 'Falta cliente_id' }, 400, cookiesToSet)
  }

  const { data: cliente, error: errCliente } = await supabase
    .from('clientes')
    .select('id, negocio_id')
    .eq('id', clienteId)
    .single()

  if (errCliente || !cliente) {
    return jsonWithCookies({ error: 'Cliente no encontrado' }, 404, cookiesToSet)
  }

  const ok = await usuarioTieneAccesoNegocio(supabase, user, cliente.negocio_id)
  if (!ok) {
    return jsonWithCookies({ error: 'Sin acceso' }, 403, cookiesToSet)
  }

  const miBarberoId = await resolveMiBarberoId(supabase, user)

  const { data: notes, error: errNotes } = await supabase
    .from('client_notes')
    .select('id, content, created_at, updated_at, staff_id, negocio_id, client_id')
    .eq('client_id', clienteId)
    .order('created_at', { ascending: false })

  if (errNotes) {
    return jsonWithCookies({ error: 'Error al cargar notas' }, 500, cookiesToSet)
  }

  const staffIds = [...new Set((notes ?? []).map(n => n.staff_id))]
  const { data: barberos } =
    staffIds.length > 0
      ? await supabase.from('barberos').select('id, nombre').in('id', staffIds)
      : { data: [] as { id: string; nombre: string }[] }

  const nombrePorStaff = Object.fromEntries((barberos ?? []).map(b => [b.id, b.nombre]))

  const noteIds = (notes ?? []).map(n => n.id)
  const { data: photoRows } =
    noteIds.length > 0
      ? await supabase.from('client_note_photos').select('id, note_id, storage_path').in('note_id', noteIds)
      : { data: [] as { id: string; note_id: string; storage_path: string }[] }

  const paths = [...new Set((photoRows ?? []).map(p => p.storage_path))]
  const signed = await firmarFotos(supabase, paths)

  const photosByNote: Record<string, { id: string; storage_path: string; signedUrl: string | null }[]> = {}
  for (const p of photoRows ?? []) {
    if (!photosByNote[p.note_id]) photosByNote[p.note_id] = []
    photosByNote[p.note_id].push({
      id: p.id,
      storage_path: p.storage_path,
      signedUrl: signed[p.storage_path] ?? null,
    })
  }

  const notas = (notes ?? []).map(n => ({
    ...n,
    autor_nombre: nombrePorStaff[n.staff_id] ?? 'Profesional',
    photos: photosByNote[n.id] ?? [],
    es_mia: miBarberoId != null && n.staff_id === miBarberoId,
  }))

  return jsonWithCookies({ notas, miBarberoId }, 200, cookiesToSet)
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  let body: { client_id?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return jsonWithCookies({ error: 'JSON inválido' }, 400, cookiesToSet)
  }

  const client_id = body.client_id?.trim()
  const content = (body.content ?? '').trim()
  if (!client_id) {
    return jsonWithCookies({ error: 'Falta client_id' }, 400, cookiesToSet)
  }
  if (!content) {
    return jsonWithCookies({ error: 'Escribe el contenido de la nota' }, 400, cookiesToSet)
  }

  const miBarberoId = await resolveMiBarberoId(supabase, user)
  if (!miBarberoId) {
    return jsonWithCookies(
      {
        error:
          'No se encontró tu perfil de profesional. Pide al dueño que te invite desde Equipo o que confirme que tu usuario tiene asignado el profesional correcto.',
      },
      403,
      cookiesToSet
    )
  }

  const { data: cliente, error: errCliente } = await supabase
    .from('clientes')
    .select('id, negocio_id')
    .eq('id', client_id)
    .single()

  if (errCliente || !cliente) {
    return jsonWithCookies({ error: 'Cliente no encontrado' }, 404, cookiesToSet)
  }

  const { data: barbero } = await supabase
    .from('barberos')
    .select('negocio_id')
    .eq('id', miBarberoId)
    .single()

  if (!barbero || barbero.negocio_id !== cliente.negocio_id) {
    return jsonWithCookies({ error: 'Sin acceso a este cliente' }, 403, cookiesToSet)
  }

  const { data: inserted, error: insErr } = await supabase
    .from('client_notes')
    .insert({
      client_id,
      negocio_id: cliente.negocio_id,
      staff_id: miBarberoId,
      content,
    })
    .select('id, content, created_at, updated_at, staff_id, negocio_id, client_id')
    .single()

  if (insErr || !inserted) {
    return jsonWithCookies({ error: insErr?.message ?? 'No se pudo crear la nota' }, 400, cookiesToSet)
  }

  return jsonWithCookies({ nota: { ...inserted, photos: [] } }, 201, cookiesToSet)
}
