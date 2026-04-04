import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import {
  payphoneLinksUrlCandidates,
  PAYPHONE_PLANES,
  additionalDataPago,
  clientTransactionIdPayPhone,
  payphoneNotifyUrlDesdeEnv,
  type PayPhonePlanKey,
} from '@/lib/payphone-config'
import { guardarPayphoneLinkSession } from '@/lib/payphone-link-session'

function sanitizarCredencialPayPhone(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().replace(/^['"]|['"]$/g, '')
}

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
      /* ignore */
    }
  })
  return res
}

function respuestaPareceHtml(text: string): boolean {
  const t = text.trimStart()
  return t.startsWith('<!DOCTYPE') || t.startsWith('<html') || t.startsWith('<HTML')
}

function extraerUrlPayPhone(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  try {
    const parsed = JSON.parse(text) as { url?: string }
    if (parsed.url) return parsed.url
  } catch {
    /* ignore */
  }
  return null
}

async function postPayPhone(
  url: string,
  token: string,
  payload: Record<string, string | number | boolean>
): Promise<{ res: Response; text: string }> {
  console.log('PayPhone request body:', JSON.stringify(payload, null, 2))
  console.log('PayPhone token (primeros 10 chars):', process.env.PAYPHONE_TOKEN?.substring(0, 10))
  console.log('PayPhone storeId:', process.env.PAYPHONE_STORE_ID)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  return { res, text }
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

    const guardado = await guardarPayphoneLinkSession(clientTransactionId, negocioId, plan)
    const sesionGuardada = guardado.ok
    if (!sesionGuardada) {
      console.warn(
        '[payphone] payphone_link_sessions:',
        guardado.message,
        '— se sigue con payload completo; reintento mínimo desactivado hasta migrar 008.'
      )
    }

    const payloadCompleto: Record<string, string | number | boolean> = {
      amount: montos.amount,
      amountWithTax: montos.amountWithTax,
      tax: montos.tax,
      currency: 'USD',
      reference: montos.reference,
      clientTransactionId,
      storeId: String(storeId),
      additionalData,
      oneTime: true,
    }
    if (notifyUrlOpcional) {
      payloadCompleto.notifyUrl = notifyUrlOpcional
    }

    // Cuerpo mínimo oficial (sin additionalData / oneTime / notifyUrl) si el servidor devuelve HTML 500
    const payloadMinimo: Record<string, string | number | boolean> = {
      amount: montos.amount,
      amountWithTax: montos.amountWithTax,
      tax: montos.tax,
      currency: 'USD',
      reference: montos.reference,
      clientTransactionId,
      storeId: String(storeId),
    }

    const candidatosUrl = payphoneLinksUrlCandidates()
    let payphoneRes: Response
    let text: string
    let linksUrlUsada = candidatosUrl[0]

    let intentoUrl = 0
    for (;;) {
      linksUrlUsada = candidatosUrl[intentoUrl] ?? linksUrlUsada
      const r = await postPayPhone(linksUrlUsada, token, payloadCompleto)
      payphoneRes = r.res
      text = r.text
      const url = extraerUrlPayPhone(text)
      if (payphoneRes.ok && url) {
        return jsonWithCookies({ url }, 200, cookiesToSet)
      }
      if (payphoneRes.status === 401 || payphoneRes.status === 403) {
        break
      }
      const siguiente =
        respuestaPareceHtml(text) &&
        payphoneRes.status >= 500 &&
        intentoUrl + 1 < candidatosUrl.length
      if (siguiente) {
        intentoUrl += 1
        continue
      }
      break
    }

    let url = extraerUrlPayPhone(text)

    const reintentarMinimo =
      !url &&
      payphoneRes.status !== 401 &&
      payphoneRes.status !== 403 &&
      (respuestaPareceHtml(text) ||
        payphoneRes.status >= 500 ||
        (payphoneRes.ok && !url))

    if (reintentarMinimo && sesionGuardada) {
      const segundo = await postPayPhone(linksUrlUsada, token, payloadMinimo)
      url = extraerUrlPayPhone(segundo.text)
      if (segundo.res.ok && url) {
        return jsonWithCookies({ url }, 200, cookiesToSet)
      }
      payphoneRes = segundo.res
      text = segundo.text
    }

    if (respuestaPareceHtml(text)) {
      let hint: string
      if (payphoneRes.status === 401 || payphoneRes.status === 403) {
        hint =
          'Token o storeId incorrectos, o entorno distinto (pruebas vs producción).'
      } else if (payphoneRes.status >= 500) {
        hint =
          'Error en PayPhone: confirma permiso API Links en Developer, token vigente y storeId. Si sigue igual, escribe a soporte PayPhone con hora y storeId.'
        if (!sesionGuardada) {
          hint += ' Migración 008 + SUPABASE_SERVICE_ROLE_KEY activan el reintento con cuerpo mínimo.'
        }
      } else {
        hint = 'Prueba sin PAYPHONE_LINKS_NOTIFY_URL; el webhook se configura en el panel PayPhone.'
      }
      return jsonWithCookies(
        {
          error: `PayPhone devolvió HTML (${payphoneRes.status}). ${hint}`,
          payphoneStatus: payphoneRes.status,
          payphoneUrl: linksUrlUsada,
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
