import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  PAYPHONE_LINKS_URL,
  PAYPHONE_PLANES,
  additionalDataPago,
  clientTransactionIdPayPhone,
  type PayPhonePlanKey,
} from '@/lib/payphone-config'

export async function POST(req: NextRequest) {
  let body: { plan?: string; negocio_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const plan = body.plan as PayPhonePlanKey | undefined
  const negocioId = body.negocio_id

  if (plan !== 'basic' && plan !== 'pro') {
    return NextResponse.json({ error: 'plan debe ser basic o pro' }, { status: 400 })
  }
  if (!negocioId || typeof negocioId !== 'string') {
    return NextResponse.json({ error: 'negocio_id requerido' }, { status: 400 })
  }

  const token = process.env.PAYPHONE_TOKEN
  const storeId = process.env.PAYPHONE_STORE_ID
  if (!token || !storeId) {
    return NextResponse.json({ error: 'PayPhone no configurado en el servidor' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as never)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: negocio, error: negErr } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (negErr || !negocio) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 403 })
  }

  const montos = PAYPHONE_PLANES[plan]
  const clientTransactionId = clientTransactionIdPayPhone(negocioId)
  const additionalData = additionalDataPago(negocioId, plan)

  const payload = {
    amount: montos.amount,
    amountWithTax: montos.amountWithTax,
    tax: montos.tax,
    currency: 'USD',
    reference: montos.reference,
    clientTransactionId,
    storeId,
    additionalData,
    oneTime: true,
    expireIn: 0,
    isAmountEditable: false,
  }

  const res = await fetch(PAYPHONE_LINKS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()

  if (!res.ok) {
    try {
      const errJson = JSON.parse(text) as { message?: string }
      return NextResponse.json(
        { error: errJson.message ?? 'Error PayPhone', detail: errJson },
        { status: 502 }
      )
    } catch {
      return NextResponse.json({ error: text || 'Error PayPhone' }, { status: 502 })
    }
  }

  const trimmed = text.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return NextResponse.json({ url: trimmed })
  }

  try {
    const parsed = JSON.parse(text) as { url?: string; message?: string }
    if (parsed.url) {
      return NextResponse.json({ url: parsed.url })
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json(
    { error: 'Respuesta PayPhone inesperada', detail: text.slice(0, 500) },
    { status: 502 }
  )
}
