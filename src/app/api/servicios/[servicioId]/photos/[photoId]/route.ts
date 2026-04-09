import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import { createAdminClient } from '@/lib/supabase/server'
import { assertOwnerServicio, BUCKET } from '@/lib/servicio-fotos-api'

type RouteParams = { params: Promise<{ servicioId: string; photoId: string }> }

/** Evita 404 en GET (prefetch, img): redirige a URL firmada de Storage. */
export async function GET(req: NextRequest, { params }: RouteParams) {
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

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('servicio_fotos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('servicio_id', servicioId)
    .maybeSingle()

  if (!row) {
    return jsonWithCookies({ error: 'Foto no encontrada' }, 404, cookiesToSet)
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 120)

  if (signErr || !signed?.signedUrl) {
    return jsonWithCookies({ error: 'No se pudo generar la URL de la imagen' }, 500, cookiesToSet)
  }

  return NextResponse.redirect(signed.signedUrl)
}

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

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('servicio_fotos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('servicio_id', servicioId)
    .maybeSingle()

  if (!row) {
    return jsonWithCookies({ error: 'Foto no encontrada' }, 404, cookiesToSet)
  }

  await admin.storage.from(BUCKET).remove([row.storage_path])
  const { error: delErr } = await admin.from('servicio_fotos').delete().eq('id', photoId)

  if (delErr) {
    return jsonWithCookies({ error: delErr.message }, 400, cookiesToSet)
  }

  const { data: restantes } = await admin
    .from('servicio_fotos')
    .select('id')
    .eq('servicio_id', servicioId)
    .order('orden', { ascending: true })

  if (restantes?.length) {
    for (let i = 0; i < restantes.length; i++) {
      await admin.from('servicio_fotos').update({ orden: i }).eq('id', restantes[i].id)
    }
  }

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
