import { NextRequest } from 'next/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { assertOwnerServicio, BUCKET } from '@/lib/servicio-fotos-api'

type RouteParams = { params: Promise<{ servicioId: string; photoId: string }> }

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { servicioId, photoId } = await params
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

  const { data: row, error: fErr } = await supabase
    .from('servicio_fotos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('servicio_id', servicioId)
    .maybeSingle()

  if (fErr || !row) {
    return jsonWithCookies({ error: 'Foto no encontrada' }, 404, cookiesToSet)
  }

  await supabase.storage.from(BUCKET).remove([row.storage_path])
  const { error: delErr } = await supabase.from('servicio_fotos').delete().eq('id', photoId)

  if (delErr) {
    return jsonWithCookies({ error: delErr.message }, 400, cookiesToSet)
  }

  const { data: restantes } = await supabase
    .from('servicio_fotos')
    .select('id')
    .eq('servicio_id', servicioId)
    .order('orden', { ascending: true })

  if (restantes?.length) {
    for (let i = 0; i < restantes.length; i++) {
      await supabase.from('servicio_fotos').update({ orden: i }).eq('id', restantes[i].id)
    }
  }

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
