import type { NextRequest } from 'next/server'

/**
 * Valida `Authorization: Bearer <token>` contra `CRON_SECRET`.
 * - Acepta header `authorization` o `Authorization` (Next ya normaliza, pero por si acaso).
 * - Trim en token y secreto; regex case-insensitive para "Bearer".
 * - CRON_AUTH_DEBUG=1 loguea longitudes y si coincide (no imprime el secreto).
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET ?? '').trim()
  if (!secret) {
    if (process.env.CRON_AUTH_DEBUG === '1') {
      console.warn('[cron-auth] CRON_SECRET no está definido o está vacío en process.env')
    }
    return false
  }

  const raw =
    req.headers.get('authorization') ??
    req.headers.get('Authorization') ??
    ''
  const auth = raw.trim()

  const m = auth.match(/^Bearer\s+(\S+)$/i)
  const token = (m?.[1] ?? '').trim()

  const debug = process.env.CRON_AUTH_DEBUG === '1'
  if (debug) {
    const expected = `Bearer ${secret}`
    console.log('[cron-auth]', {
      authHeaderRawLength: raw.length,
      tokenLength: token.length,
      secretLength: secret.length,
      match: token === secret,
      expectedPrefix: expected.slice(0, 12) + '…',
    })
  }

  return token === secret
}
