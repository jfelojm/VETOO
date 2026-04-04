import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import {
  PAYPHONE_LINKS_URL,
  PAYPHONE_PLANES,
  additionalDataPago,
  clientTransactionIdPayPhone,
  type PayPhonePlanKey,
} from '@/lib/payphone-config'

/** Igual que en api/auth/callback: cookies leídas del request + setAll que acumula para el NextResponse final */
function createSupabaseRouteClient(req: NextRequest) {
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(toSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            toSet.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options: options ?? {} })
            })
          } catch {
            /* ignore */
          }
        },
      },
    }
  )

  return { supabase, cookiesToSet }
}

function jsonWithCookies(
  body: object,
  status: number,
  cookiesToSet: { name: string; value: string; options: CookieOptions }[]
) {
  const res = NextResponse.json(body, { status })
  cookiesToSet.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options)
  })
  return res
}

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (!token || !storeId) {
    return NextResponse.json({ error: 'PayPhone no configurado en el servidor' }, { status: 500 })
  }
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no configurada' }, { status: 500 })
  }

  const notifyUrl = `${appUrl}/api/suscripcion/webhook/NotificacionPago`

  const { supabase, cookiesToSet } = createSupabaseRouteClient(req)

  let {
    data: { user },
  } = await supabase.auth.getUser()

  // Cliente con flowType implicit suele guardar sesión sin cookies HTTP; el navegador envía Bearer
  if (!user) {
    const auth = req.headers.get('authorization')
    const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (accessToken) {
      const { data } = await supabase.auth.getUser(accessToken)
      user = data.user ?? null
    }
  }

  if (!user) {
    return jsonWithCookies({ error: 'No autorizado' }, 401, cookiesToSet)
  }

  const { data: negocio, error: negErr } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (negErr || !negocio) {
    return jsonWithCookies({ error: 'Negocio no encontrado' }, 403, cookiesToSet)
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
    notifyUrl,
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
      return jsonWithCookies(
        { error: errJson.message ?? 'Error PayPhone', detail: errJson },
        502,
        cookiesToSet
      )
    } catch {
      return jsonWithCookies({ error: text || 'Error PayPhone' }, 502, cookiesToSet)
    }
  }

  const trimmed = text.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return jsonWithCookies({ url: trimmed }, 200, cookiesToSet)
  }

  try {
    const parsed = JSON.parse(text) as { url?: string; message?: string }
    if (parsed.url) {
      return jsonWithCookies({ url: parsed.url }, 200, cookiesToSet)
    }
  } catch {
    /* ignore */
  }

  return jsonWithCookies(
    { error: 'Respuesta PayPhone inesperada', detail: text.slice(0, 500) },
    502,
    cookiesToSet
  )
}
