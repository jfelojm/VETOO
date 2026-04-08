import type { SupabaseClient } from '@supabase/supabase-js'

/** Usuario con acceso al panel del negocio (dueño o profesional con user_id). */
export async function usuarioTieneAccesoNegocio(
  supabase: SupabaseClient,
  userId: string,
  negocioId: string
): Promise<boolean> {
  const { data: n } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('owner_id', userId)
    .maybeSingle()
  if (n) return true
  const { data: b } = await supabase
    .from('barberos')
    .select('id')
    .eq('negocio_id', negocioId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!b
}

export async function getMiBarberoId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('barberos')
    .select('id')
    .eq('user_id', userId)
    .eq('activo', true)
    .maybeSingle()
  return data?.id ?? null
}
