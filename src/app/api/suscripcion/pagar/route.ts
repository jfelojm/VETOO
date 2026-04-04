import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import {
  payphoneLinksApiUrl,
  PAYPHONE_PLANES,
  additionalDataPago,
  clientTransactionIdPayPhone,
  payphoneNotifyUrlDesdeEnv,
  type PayPhonePlanKey,
} from '@/lib/payphone-config'

function sanitizarCredencialPayPhone(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().replace(/^['"]|['"]$/g, '')
}

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
    try {
      res.cookies.set(name, value, options)
    } catch {
      /* opciones de cookie inválidas no deben tumbar la ruta */
    }
  })
  return res
}

function respuestaPareceHtml(text: string): boolean {
  const t = text.trimStart()
  return t.startsWith('<!DOCTYPE') || t.startsWith('<html') || t.startsWith('<HTML')
}

export async function POST(req: NextRequest) {
  let body: { plan?: string; negocio_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const plan = body.plan as PayPhonePlanKey | undefined
    const negocioId = body.negocio_id

    if (plan !== 'basic' && plan !== 'pro') {
      return NextResponse.json({ error: 'plan debe ser basic o pro' }, { status: 400 })
    }
    if (!negocioId || typeof negocioId !== 'string') {
      return NextResponse.json({ error: 'negocio_id requerido' }, { status: 400 })
    }

    const token = sanitizarCredencialPayPhone(process.env.PAYPHONE_TOKEN)
    const storeId = sanitizarCredencialPayPhone(process.env.PAYPHONE_STORE_ID)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    if (!token || !storeId) {
      return NextResponse.json({ error: 'PayPhone no configurado en el servidor' }, { status: 500 })
    }
    if (!appUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no configurada' }, { status: 500 })
    }

    /** Solo si defines PAYPHONE_LINKS_NOTIFY_URL (la API Links a veces falla con HTML si el campo no aplica). */
    const notifyUrlOpcional = payphoneNotifyUrlDesdeEnv()

    const { supabase, cookiesToSet } = createSupabaseRouteClient(req)

    let {
      data: { user },
    } = await supabase.auth.getUser()

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

    const payload: Record<string, string | number | boolean> = {
      amount: montos.amount,
      amountWithTax: montos.amountWithTax,
      tax: montos.tax,
      currency: 'USD',
      reference: montos.reference,
      clientTransactionId,
      storeId: String(storeId),
      additionalData,
      oneTime: true,
      expireIn: 0,
      isAmountEditable: false,
    }
    if (notifyUrlOpcional) {
      payload.notifyUrl = notifyUrlOpcional
    }

    const payphoneRes = await fetch(payphoneLinksApiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Turnapp/1.0 (PayPhone Links)',
      },
      body: JSON.stringify(payload),
    })

    const text = await payphoneRes.text()

    if (respuestaPareceHtml(text)) {
      const hint =
        payphoneRes.status === 401 || payphoneRes.status === 403
          ? ' Revisa PAYPHONE_TOKEN y PAYPHONE_STORE_ID (sin comillas extra en Vercel).'
          : ' Si usas PAYPHONE_LINKS_NOTIFY_URL y sigue fallando, quítala y registra el webhook solo en el panel PayPhone.'
      return jsonWithCookies(
        {
          error: `PayPhone devolvió HTML (${payphoneRes.status}) en lugar del link.${hint}`,
          payphoneStatus: payphoneRes.status,
        },
        502,
        cookiesToSet
      )
    }

    if (!payphoneRes.ok) {
      try {
        const errJson = JSON.parse(text) as { message?: string }
        return jsonWithCookies(
          { error: errJson.message ?? 'Error PayPhone', detail: errJson },
          502,
          cookiesToSet
        )
      } catch {
        return jsonWithCookies(
          { error: text.slice(0, 200) || 'Error PayPhone' },
          502,
          cookiesToSet
        )
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
  } catch (e) {
    console.error('[api/suscripcion/pagar]', e)
    return NextResponse.json(
      { error: 'Error interno al preparar el pago' },
      { status: 500 }
    )
  }
}
