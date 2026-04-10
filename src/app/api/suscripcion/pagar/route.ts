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
import { fetchPayPhone } from '@/lib/payphone-fetch'
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

/**
 * PayPhone puede devolver: URL plana, JSON `"https://…"` (string), u objeto `{ url }` / `{ paymentUrl }`.
 */
function extraerUrlPayPhone(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed === 'string') {
      const u = parsed.trim()
      if (u.startsWith('http://') || u.startsWith('https://')) return u
      return null
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>
      const url =
        (typeof o.url === 'string' && o.url) ||
        (typeof o.paymentUrl === 'string' && o.paymentUrl) ||
        (typeof o.payment_url === 'string' && o.payment_url) ||
        (typeof o.linkUrl === 'string' && o.linkUrl)
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) return url
    }
  } catch {
    /* ignore */
  }
  return null
}

function logPagarPhase(label: string, t0: number) {
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL) {
    console.log(`[pagar] ${label} +${Date.now() - t0}ms`)
  }
}

/** Respuesta JSON de error de la API Links (ej. 404 con errorCode 2088). */
function mensajeErrorPayPhoneJson(err: {
  message?: string
  errorCode?: number
}): { error: string; detalle: string } {
  const code = err.errorCode
  const base = err.message?.trim() || 'Error PayPhone'
  if (code === 2088) {
    return {
      error: `${base} (PayPhone ${code})`,
      detalle:
        'Link inválido: en el portal PayPhone (Developer) activa la API de Links para tu comercio y usa TOKEN + StoreId del mismo entorno (pruebas o producción). Si PAYPHONE_LINKS_API_URL apunta a otra base URL, debe ser la que indique la documentación de tu cuenta.',
    }
  }
  return {
    error: code != null ? `${base} (PayPhone ${code})` : base,
    detalle: JSON.stringify(err),
  }
}

export async function POST(req: NextRequest) {
  let body: { plan?: string; negocio_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const t0 = Date.now()
  try {
    const plan = body.plan as PayPhonePlanKey | undefined
    const negocioId = body.negocio_id

    if (plan !== 'basic' && plan !== 'pro' && plan !== 'premium') {
      return NextResponse.json({ error: 'plan debe ser basic, pro o premium' }, { status: 400 })
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
    logPagarPhase('auth', t0)

    const { data: negocio, error: negErr } = await supabase
      .from('negocios')
      .select('id')
      .eq('id', negocioId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (negErr || !negocio) {
      return jsonWithCookies({ error: 'Negocio no encontrado' }, 403, cookiesToSet)
    }
    logPagarPhase('negocio', t0)

    const montos = PAYPHONE_PLANES[plan]
    const clientTransactionId = clientTransactionIdPayPhone()
    const additionalData = additionalDataPago(negocioId, plan)

    const guardado = await guardarPayphoneLinkSession(clientTransactionId, negocioId, plan)
    logPagarPhase('session', t0)
    const sesionGuardada = guardado.ok
    if (!sesionGuardada) {
      console.warn(
        '[payphone] payphone_link_sessions:',
        guardado.message,
        '— se sigue con payload completo; reintento mínimo desactivado hasta migrar 008.'
      )
    }

    /** Completo con additionalData + oneTime; sin notifyUrl (notifyUrl en API a veces provoca HTML 500). */
    const payloadCompletoSinNotify: Record<string, string | number | boolean> = {
      amount: montos.amount,
      amountWithTax: montos.amountWithTax,
      amountWithoutTax: montos.amountWithoutTax,
      tax: montos.tax,
      currency: 'USD',
      reference: montos.reference,
      clientTransactionId,
      storeId: String(storeId),
      additionalData,
      oneTime: true,
    }

    const payloadCompletoConNotify: Record<string, string | number | boolean> | null =
      notifyUrlOpcional
        ? { ...payloadCompletoSinNotify, notifyUrl: notifyUrlOpcional }
        : null

    // Cuerpo mínimo oficial (sin additionalData / oneTime / notifyUrl)
    const payloadMinimo: Record<string, string | number | boolean> = {
      amount: montos.amount,
      amountWithTax: montos.amountWithTax,
      amountWithoutTax: montos.amountWithoutTax,
      tax: montos.tax,
      currency: 'USD',
      reference: montos.reference,
      clientTransactionId,
      storeId: String(storeId),
    }

    const candidatosUrl = payphoneLinksUrlCandidates()
    let payphoneRes!: Response
    let text = ''
    let linksUrlUsada = candidatosUrl[0]
    let huboTimeoutPayPhone = false

    /**
     * Por URL: mínimo → completo sin notifyUrl → (opcional) completo con notifyUrl.
     * Así no hace falta borrar PAYPHONE_LINKS_NOTIFY_URL en Vercel para que funcione.
     */
    for (let intentoUrl = 0; intentoUrl < candidatosUrl.length; intentoUrl++) {
      linksUrlUsada = candidatosUrl[intentoUrl] ?? linksUrlUsada

      const intentoMin = await fetchPayPhone(linksUrlUsada, token, payloadMinimo)
      if (intentoMin.aborted) huboTimeoutPayPhone = true
      payphoneRes = intentoMin.res
      text = intentoMin.text
      let urlExtra = extraerUrlPayPhone(text)
      if (payphoneRes.ok && urlExtra) {
        logPagarPhase('payphone_ok', t0)
        return jsonWithCookies({ url: urlExtra }, 200, cookiesToSet)
      }
      if (payphoneRes.status === 401 || payphoneRes.status === 403) {
        break
      }

      const intentoFullSin = await fetchPayPhone(linksUrlUsada, token, payloadCompletoSinNotify)
      if (intentoFullSin.aborted) huboTimeoutPayPhone = true
      payphoneRes = intentoFullSin.res
      text = intentoFullSin.text
      urlExtra = extraerUrlPayPhone(text)
      if (payphoneRes.ok && urlExtra) {
        logPagarPhase('payphone_ok', t0)
        return jsonWithCookies({ url: urlExtra }, 200, cookiesToSet)
      }
      if (payphoneRes.status === 401 || payphoneRes.status === 403) {
        break
      }

      if (payloadCompletoConNotify) {
        const intentoFullNotify = await fetchPayPhone(linksUrlUsada, token, payloadCompletoConNotify)
        if (intentoFullNotify.aborted) huboTimeoutPayPhone = true
        payphoneRes = intentoFullNotify.res
        text = intentoFullNotify.text
        urlExtra = extraerUrlPayPhone(text)
        if (payphoneRes.ok && urlExtra) {
          logPagarPhase('payphone_ok', t0)
          return jsonWithCookies({ url: urlExtra }, 200, cookiesToSet)
        }
        if (payphoneRes.status === 401 || payphoneRes.status === 403) {
          break
        }
      }

      const intentarOtraRuta =
        respuestaPareceHtml(text) &&
        payphoneRes.status >= 500 &&
        intentoUrl + 1 < candidatosUrl.length
      if (intentarOtraRuta) {
        continue
      }
      break
    }

    if (payphoneRes.status === 408 || huboTimeoutPayPhone) {
      return jsonWithCookies(
        {
          error: 'PayPhone no respondió a tiempo. Reintenta en unos segundos.',
          detalle:
            'Timeout al llamar a la API de PayPhone (límite por petición en el servidor). Si persiste, revisa conectividad o el estado de PayPhone.',
          payphoneStatus: payphoneRes.status,
          payphoneUrl: linksUrlUsada,
        },
        502,
        cookiesToSet
      )
    }

    if (respuestaPareceHtml(text)) {
      let errorCorto: string
      let detalle: string
      if (payphoneRes.status === 401 || payphoneRes.status === 403) {
        errorCorto =
          'Credenciales PayPhone incorrectas o de otro entorno (pruebas vs producción). Revisa token y StoreId en Vercel.'
        detalle =
          'Token o StoreId incorrectos, o credenciales de prueba vs producción mezcladas.'
      } else if (payphoneRes.status >= 500) {
        errorCorto =
          'PayPhone no pudo crear el link de pago (error en su servidor). En el portal Developer activa API Links y usa token y StoreId del mismo entorno.'
        detalle =
          'PayPhone respondió HTML en lugar de JSON. Comprueba: API Links activa; token y StoreId sandbox/producción coherentes; notificación de pago en el panel PayPhone (no solo por variable de entorno). En la app: SUPABASE_SERVICE_ROLE_KEY + migración 008 si el webhook no recibe additionalData.'
        if (!sesionGuardada) {
          detalle += ' Sin fila en payphone_link_sessions, el webhook puede no resolver el plan.'
        }
      } else {
        errorCorto =
          'PayPhone respondió de forma inesperada. Revisa la configuración del comercio o quita PAYPHONE_LINKS_NOTIFY_URL en Vercel.'
        detalle =
          'Respuesta HTML con status distinto de 500; revisar notifyUrl y panel PayPhone.'
      }
      return jsonWithCookies(
        {
          error: errorCorto,
          detalle,
          payphoneStatus: payphoneRes.status,
          payphoneUrl: linksUrlUsada,
        },
        502,
        cookiesToSet
      )
    }

    if (!payphoneRes.ok) {
      try {
        const errJson = JSON.parse(text) as { message?: string; errorCode?: number }
        if (errJson.errorCode === 2088) {
          console.warn('[payphone] errorCode 2088 Link Inválido — revisar API Links y credenciales', {
            url: linksUrlUsada,
          })
        }
        const { error, detalle } = mensajeErrorPayPhoneJson(errJson)
        return jsonWithCookies(
          {
            error,
            detalle,
            payphoneErrorCode: errJson.errorCode,
            payphoneStatus: payphoneRes.status,
            payphoneUrl: linksUrlUsada,
          },
          502,
          cookiesToSet
        )
      } catch {
        return jsonWithCookies(
          {
            error: text.slice(0, 200) || 'Error PayPhone',
            payphoneStatus: payphoneRes.status,
            payphoneUrl: linksUrlUsada,
          },
          502,
          cookiesToSet
        )
      }
    }

    return jsonWithCookies(
      { error: 'Respuesta PayPhone inesperada', detalle: text.slice(0, 500) },
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
