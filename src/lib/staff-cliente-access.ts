import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'

type UserLike = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

/** Usuario con acceso al panel del negocio (dueño o profesional). */
export async function usuarioTieneAccesoNegocio(
  supabase: SupabaseClient,
  user: UserLike,
  negocioId: string
): Promise<boolean> {
  const { data: n } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (n) return true

  const barberoId = await resolveMiBarberoId(supabase, user)
  if (barberoId) {
    const { data: b } = await supabase.from('barberos').select('negocio_id').eq('id', barberoId).single()
    return b?.negocio_id === negocioId
  }

  const metaId = user.user_metadata?.barbero_id as string | undefined
  if (!metaId) return false
  const { data: b } = await supabase
    .from('barberos')
    .select('negocio_id, user_id')
    .eq('id', metaId)
    .eq('activo', true)
    .maybeSingle()
  if (!b || b.negocio_id !== negocioId) return false
  if (b.user_id != null && b.user_id !== user.id) return false
  return true
}

/**
 * ID del barbero vinculado a la sesión actual.
 * 1) Por `barberos.user_id` (caso ideal).
 * 2) Si no, por `user_metadata.barbero_id` y se repara `user_id` en BD si estaba vacío
 *    (invitaciones o cuentas creadas antes de vincular bien la fila).
 */
export async function resolveMiBarberoId(
  supabase: SupabaseClient,
  user: UserLike
): Promise<string | null> {
  const { data: byUser } = await supabase
    .from('barberos')
    .select('id')
    .eq('user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  if (byUser?.id) return byUser.id

  const metaId = user.user_metadata?.barbero_id as string | undefined
  let b: { id: string; user_id: string | null } | null = null

  if (metaId) {
    const { data } = await supabase
      .from('barberos')
      .select('id, user_id')
      .eq('id', metaId)
      .eq('activo', true)
      .maybeSingle()
    b = data
  }

  if (!b && user.email?.trim()) {
    const { data: rows } = await supabase
      .from('barberos')
      .select('id, user_id')
      .ilike('email', user.email.trim())
      .eq('activo', true)
    if (rows?.length === 1) {
      b = rows[0]
    }
  }

  if (!b) return null

  if (b.user_id != null && b.user_id !== user.id) {
    return null
  }

  if (b.user_id == null) {
    const admin = createAdminClient()
    const { error } = await admin.from('barberos').update({ user_id: user.id }).eq('id', b.id)
    if (error) {
      console.error('[resolveMiBarberoId] no se pudo vincular user_id al barbero', error)
      return null
    }
  }

  return b.id
}
