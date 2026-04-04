import { createAdminClient } from '@/lib/supabase/server'
import type { PayPhonePlanKey } from '@/lib/payphone-config'

export async function guardarPayphoneLinkSession(
  clientTransactionId: string,
  negocioId: string,
  plan: PayPhonePlanKey
): Promise<{ ok: true } | { ok: false; message: string }> {
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
