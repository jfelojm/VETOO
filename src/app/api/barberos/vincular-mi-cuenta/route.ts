import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient, jsonWithCookies } from '@/lib/supabase-route'

/**
 * El dueño vincula su propia cuenta de administrador a un profesional del listado
 * (misma persona, mismo correo — sin invitación por email).
 */
export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  let body: { barbero_id?: string; negocio_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonWithCookies({ error: 'JSON inválido' }, 400, cookiesToSet)
  }

  const barbero_id = body.barbero_id?.trim()
  const negocio_id = body.negocio_id?.trim()
  if (!barbero_id || !negocio_id) {
    return jsonWithCookies({ error: 'Parámetros requeridos' }, 400, cookiesToSet)
  }

  const { data: neg } = await supabase
    .from('negocios')
    .select('id, owner_id')
    .eq('id', negocio_id)
    .single()

  if (!neg || neg.owner_id !== user.id) {
    return jsonWithCookies({ error: 'Solo el dueño puede vincular su cuenta.' }, 403, cookiesToSet)
  }

  const { data: barbero } = await supabase
    .from('barberos')
    .select('id, user_id, negocio_id')
    .eq('id', barbero_id)
    .single()

  if (!barbero || barbero.negocio_id !== negocio_id) {
    return jsonWithCookies({ error: 'Profesional no encontrado' }, 404, cookiesToSet)
  }

  if (barbero.user_id && barbero.user_id !== user.id) {
    return jsonWithCookies(
      { error: 'Este profesional ya tiene otra cuenta vinculada.' },
      409,
      cookiesToSet
    )
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: upErr } = await admin
    .from('barberos')
    .update({ user_id: user.id, email: user.email })
    .eq('id', barbero_id)

  if (upErr) {
    return jsonWithCookies({ error: upErr.message }, 400, cookiesToSet)
  }

  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const prevMeta = (authUser.user?.user_metadata ?? {}) as Record<string, unknown>
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...prevMeta,
      barbero_id,
      negocio_id,
      rol: 'barbero',
    },
  })

  return jsonWithCookies({ ok: true }, 200, cookiesToSet)
}
