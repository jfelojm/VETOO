import { createAdminClient } from '@/lib/supabase/server'

/**
 * Looks up the negocio_id by the WhatsApp number registered to that business.
 * The `negocios.whatsapp` field stores the business's WhatsApp number.
 * For Twilio MVP: a single Twilio number maps to one negocio via env var,
 * or the To field in the Twilio payload identifies the destination number.
 */
export async function resolveNegocioByPhone(toPhone: string): Promise<string | null> {
  // Strip "whatsapp:" prefix from Twilio payload if present
  const normalized = toPhone.replace(/^whatsapp:/, '').replace(/\D/g, '')

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('negocios')
    .select('id')
    .filter('whatsapp', 'ilike', `%${normalized}%`)
    .eq('activo', true)
    .limit(1)
    .single()

  return data?.id ?? null
}
