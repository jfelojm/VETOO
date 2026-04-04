import { createAdminClient } from '@/lib/supabase/server'
import type { PayPhonePlanKey } from '@/lib/payphone-config'

export async function guardarPayphoneLinkSession(
  clientTransactionId: string,
  negocioId: string,
  plan: PayPhonePlanKey
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor' }
  }
  const admin = createAdminClient()
  const { error } = await admin.from('payphone_link_sessions').insert({
    client_transaction_id: clientTransactionId,
    negocio_id: negocioId,
    plan,
  })
  if (error) {
    console.error('[payphone_link_sessions]', error)
    return { ok: false, message: error.message }
  }
  return { ok: true }
}
