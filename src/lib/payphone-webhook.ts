import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { PayPhonePlanKey } from '@/lib/payphone-config'

export type PayPhoneNotificacionBody = {
  Amount?: number
  AuthorizationCode?: string
  ClientTransactionId?: string
  StatusCode?: number
  TransactionStatus?: string
  StoreId?: string
  Reference?: string
  AdditionalData?: string | null
  TransactionId?: number
  [key: string]: unknown
}

function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

function parsePlanDesdeAdditionalData(
  raw: string | null | undefined
): { negocioId: string; plan: PayPhonePlanKey } | null {
  if (!raw || typeof raw !== 'string') return null
  const [negocioId, plan] = raw.split('|')
  if (negocioId && plan && (plan === 'basic' || plan === 'pro')) {
    return { negocioId, plan }
  }
  try {
    const o = JSON.parse(raw) as { n?: string; p?: string }
    if (o.n && (o.p === 'basic' || o.p === 'pro')) {
      return { negocioId: o.n, plan: o.p }
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Respuesta que exige PayPhone Notificación Externa */
export async function procesarNotificacionPayPhone(
  body: PayPhoneNotificacionBody
): Promise<NextResponse<{ Response: boolean; ErrorCode: string }>> {
  const fail = (code: string) =>
    NextResponse.json({ Response: false, ErrorCode: code }, { status: 200 })

  const ok = () => NextResponse.json({ Response: true, ErrorCode: '000' }, { status: 200 })

  if (
    body.TransactionId == null ||
    body.ClientTransactionId == null ||
    body.ClientTransactionId === ''
  ) {
    return fail('444')
  }

  const statusOk =
    body.StatusCode === 3 ||
    (typeof body.TransactionStatus === 'string' &&
      body.TransactionStatus.toLowerCase() === 'approved')

  if (!statusOk) {
    return ok()
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return fail('222')
  }

  let parsed = parsePlanDesdeAdditionalData(body.AdditionalData ?? null)

  if (!parsed?.negocioId && body.ClientTransactionId) {
    const { data: sesion } = await supabase
      .from('payphone_link_sessions')
      .select('negocio_id, plan')
      .eq('client_transaction_id', body.ClientTransactionId)
      .maybeSingle()
    if (sesion?.negocio_id && (sesion.plan === 'basic' || sesion.plan === 'pro')) {
      parsed = { negocioId: sesion.negocio_id, plan: sesion.plan }
    }
  }

  if (!parsed?.negocioId) {
    return fail('444')
  }

  const negocioId = parsed.negocioId

  const txId = String(body.TransactionId)

  const { data: yaProcesada } = await supabase
    .from('negocios')
    .select('id')
    .eq('payphone_transaction_id', txId)
    .maybeSingle()

  if (yaProcesada) {
    return ok()
  }

  const expira = new Date()
  expira.setDate(expira.getDate() + 30)

  const { data: actualizados, error } = await supabase
    .from('negocios')
    .update({
      plan: parsed.plan,
      plan_expira_at: expira.toISOString(),
      payphone_transaction_id: txId,
    })
    .eq('id', negocioId)
    .select('id')

  if (error) {
    return fail('222')
  }
  if (!actualizados?.length) {
    return fail('444')
  }

  await supabase.from('payphone_link_sessions').delete().eq('client_transaction_id', body.ClientTransactionId)

  return ok()
}
