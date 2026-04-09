import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'

const BUCKET = 'service-photos'
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

type RouteParams = { params: Promise<{ servicioId: string }> }

async function assertOwnerServicio(
  supabase: ReturnType<typeof createSupabaseRouteClient>['supabase'],
  userId: string,
  servicioId: string
): Promise<
  | { ok: true; servicio: { id: string; negocio_id: string; photo_url: string | null } }
  | { ok: false; status: number; message: string }
> {
  const { data: svc, error } = await supabase
    .from('servicios')
    .select('id, negocio_id, photo_url')
    .eq('id', servicioId)
    .maybeSingle()

  if (error || !svc) {
    return { ok: false, status: 404, message: 'Servicio no encontrado' }
  }

  const { data: neg } = await supabase
    .from('negocios')
    .select('owner_id')
    .eq('id', svc.negocio_id)
    .maybeSingle()

  if (!neg || neg.owner_id !== userId) {
    return { ok: false, status: 403, message: 'Solo el dueño del negocio puede gestionar la foto' }
  }

  return { ok: true, servicio: svc }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { servicioId } = await params
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  const gate = await assertOwnerServicio(supabase, user.id, servicioId)
  if (!gate.ok) {
    return jsonWithCookies({ error: gate.message }, gate.status, cookiesToSet)
  }
  const { servicio } = gate

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
    return jsonWithCookies({ error: 'Máximo 3 MB' }, 400, cookiesToSet)
  }

  const ext =
    file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
  const storagePath = `${servicio.negocio_id}/${servicioId}/${randomUUID()}.${ext}`

  if (servicio.photo_url) {
    await supabase.storage.from(BUCKET).remove([servicio.photo_url])
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: file.type,
    upsert: false,
  })

  if (upErr) {
    return jsonWithCookies({ error: upErr.message }, 400, cookiesToSet)
  }

  const { error: updErr } = await supabase
    .from('servicios')
    .update({ photo_url: storagePath })
    .eq('id', servicioId)

  if (updErr) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    return jsonWithCookies({ error: updErr.message }, 400, cookiesToSet)
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)

  return jsonWithCookies(
    { photo_url: storagePath, signedUrl: signed?.signedUrl ?? null },
    200,
    cookiesToSet
  )
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { servicioId } = await params
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  const gate = await assertOwnerServicio(supabase, user.id, servicioId)
  if (!gate.ok) {
    return jsonWithCookies({ error: gate.message }, gate.status, cookiesToSet)
  }
  const { servicio } = gate

  if (servicio.photo_url) {
    await supabase.storage.from(BUCKET).remove([servicio.photo_url])
  }

  const { error } = await supabase.from('servicios').update({ photo_url: null }).eq('id', servicioId)

  if (error) {
    return jsonWithCookies({ error: error.message }, 400, cookiesToSet)
  }

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
