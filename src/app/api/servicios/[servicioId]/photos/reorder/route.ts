import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { assertOwnerServicio } from '@/lib/servicio-fotos-api'

type RouteParams = { params: Promise<{ servicioId: string }> }

export async function PUT(req: NextRequest, { params }: RouteParams) {
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

  const admin = createAdminClient()

  let body: { ids?: string[] }
  try {
    body = await req.json()
  } catch {
    return jsonWithCookies({ error: 'JSON inválido' }, 400, cookiesToSet)
  }

  const ids = body.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return jsonWithCookies({ error: 'ids debe ser un array de UUIDs' }, 400, cookiesToSet)
  }

  const { data: actuales, error: qErr } = await admin
    .from('servicio_fotos')
    .select('id')
    .eq('servicio_id', servicioId)

  if (qErr) {
    return jsonWithCookies({ error: qErr.message }, 400, cookiesToSet)
  }

  const setIds = new Set((actuales ?? []).map(r => r.id))
  if (ids.length !== setIds.size || ids.some(id => !setIds.has(id))) {
    return jsonWithCookies({ error: 'La lista debe incluir todas las fotos del servicio, sin duplicados' }, 400, cookiesToSet)
  }

  for (let i = 0; i < ids.length; i++) {
    const { error } = await admin.from('servicio_fotos').update({ orden: i }).eq('id', ids[i])
    if (error) {
      return jsonWithCookies({ error: error.message }, 400, cookiesToSet)
    }
  }

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
