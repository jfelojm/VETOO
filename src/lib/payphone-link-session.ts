import { createAdminClient } from '@/lib/supabase/server'
import type { PayPhonePlanKey } from '@/lib/payphone-config'

async function guardarLegacyDeleteInsert(
  clientTransactionId: string,
  negocioId: string,
  plan: PayPhonePlanKey
): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminClient()
  const { error: delErr } = await admin
    .from('payphone_link_sessions')
    .delete()
    .eq('negocio_id', negocioId)
  if (delErr) {
    console.error('[payphone_link_sessions] delete previas', delErr)
    return { ok: false, message: delErr.message }
  }
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

export async function guardarPayphoneLinkSession(
  clientTransactionId: string,
  negocioId: string,
  plan: PayPhonePlanKey
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor' }
  }
  const admin = createAdminClient()

  const { error } = await admin.rpc('replace_payphone_link_session', {
    p_client_transaction_id: clientTransactionId,
    p_negocio_id: negocioId,
    p_plan: plan,
  })

  if (!error) {
    return { ok: true }
  }

  const msg = error.message ?? ''
  const rpcMissing =
    msg.includes('replace_payphone_link_session') ||
    msg.includes('schema cache') ||
    (error as { code?: string }).code === '42883'

  if (rpcMissing) {
    console.warn('[payphone_link_sessions] RPC no disponible; migración 010. Fallback delete+insert.')
    return guardarLegacyDeleteInsert(clientTransactionId, negocioId, plan)
  }

  console.error('[payphone_link_sessions] RPC', error)
  return { ok: false, message: msg }
}
