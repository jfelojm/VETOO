import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'
import {
  assertOwnerServicio,
  BUCKET,
  MAX_FOTOS_POR_SERVICIO,
  SIGNED_URL_SECONDS_24H,
} from '@/lib/servicio-fotos-api'

const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

type RouteParams = { params: Promise<{ servicioId: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
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
  const { data: rows, error } = await admin
    .from('servicio_fotos')
    .select('id, servicio_id, negocio_id, storage_path, orden, created_at')
    .eq('servicio_id', servicioId)
    .order('orden', { ascending: true })

  if (error) {
    return jsonWithCookies({ error: error.message }, 400, cookiesToSet)
  }

  const fotos = await Promise.all(
    (rows ?? []).map(async r => {
      const { data: signed } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, SIGNED_URL_SECONDS_24H)
      return {
        ...r,
        signedUrl: signed?.signedUrl ?? null,
      }
    })
  )

  return jsonWithCookies({ fotos }, 200, cookiesToSet)
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
  const { negocioId } = gate
  const admin = createAdminClient()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonWithCookies({ error: 'FormData inválido' }, 400, cookiesToSet)
  }

  const rawFiles = form.getAll('files')
  const files = rawFiles.filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    const one = form.get('file')
    if (one instanceof File) files.push(one)
  }
  if (files.length === 0) {
    return jsonWithCookies({ error: 'Falta archivo (campo files o file)' }, 400, cookiesToSet)
  }

  const { count: countAntes } = await admin
    .from('servicio_fotos')
    .select('*', { count: 'exact', head: true })
    .eq('servicio_id', servicioId)

  const n0 = countAntes ?? 0
  if (n0 >= MAX_FOTOS_POR_SERVICIO) {
    return jsonWithCookies({ error: `Máximo ${MAX_FOTOS_POR_SERVICIO} fotos por servicio` }, 400, cookiesToSet)
  }
  if (n0 + files.length > MAX_FOTOS_POR_SERVICIO) {
    return jsonWithCookies(
      {
        error: `Solo puedes subir ${MAX_FOTOS_POR_SERVICIO - n0} foto(s) más (${MAX_FOTOS_POR_SERVICIO} máx.)`,
      },
      400,
      cookiesToSet
    )
  }

  const { data: maxOrden } = await admin
    .from('servicio_fotos')
    .select('orden')
    .eq('servicio_id', servicioId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextOrden = (maxOrden?.orden ?? -1) + 1
  const creadas: {
    id: string
    servicio_id: string
    negocio_id: string
    storage_path: string
    orden: number
    created_at: string
    signedUrl: string | null
  }[] = []

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      for (const c of creadas) {
        await admin.storage.from(BUCKET).remove([c.storage_path])
        await admin.from('servicio_fotos').delete().eq('id', c.id)
      }
      return jsonWithCookies({ error: 'Solo JPG, PNG o WEBP' }, 400, cookiesToSet)
    }
    if (file.size > MAX_BYTES) {
      for (const c of creadas) {
        await admin.storage.from(BUCKET).remove([c.storage_path])
        await admin.from('servicio_fotos').delete().eq('id', c.id)
      }
      return jsonWithCookies({ error: 'Máximo 3 MB por foto' }, 400, cookiesToSet)
    }

    const ext =
      file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
    const storagePath = `${negocioId}/${servicioId}/${randomUUID()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: file.type,
      upsert: false,
    })
    if (upErr) {
      for (const c of creadas) {
        await admin.storage.from(BUCKET).remove([c.storage_path])
        await admin.from('servicio_fotos').delete().eq('id', c.id)
      }
      return jsonWithCookies({ error: upErr.message }, 400, cookiesToSet)
    }

    const { data: row, error: insErr } = await admin
      .from('servicio_fotos')
      .insert({
        servicio_id: servicioId,
        negocio_id: negocioId,
        storage_path: storagePath,
        orden: nextOrden,
      })
      .select('id, servicio_id, negocio_id, storage_path, orden, created_at')
      .single()

    if (insErr || !row) {
      await admin.storage.from(BUCKET).remove([storagePath])
      for (const c of creadas) {
        await admin.storage.from(BUCKET).remove([c.storage_path])
        await admin.from('servicio_fotos').delete().eq('id', c.id)
      }
      return jsonWithCookies({ error: insErr?.message ?? 'Error al guardar' }, 400, cookiesToSet)
    }

    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS_24H)

    creadas.push({
      ...row,
      signedUrl: signed?.signedUrl ?? null,
    })
    nextOrden += 1
  }

  return jsonWithCookies({ fotos: creadas }, 201, cookiesToSet)
}
