/** Evita que un PayPhone colgado consuma todo el presupuesto de tiempo de Vercel (~10s en Hobby). */
export const PAYPHONE_FETCH_TIMEOUT_MS = 6000

function abortSignalWithTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

export async function fetchPayPhone(
  url: string,
  token: string,
  payload: Record<string, string | number | boolean>
): Promise<{ res: Response; text: string; aborted?: boolean }> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[payphone] POST', url, JSON.stringify(payload))
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: abortSignalWithTimeout(PAYPHONE_FETCH_TIMEOUT_MS),
    })
    const text = await res.text()
    return { res, text }
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError' || name === 'TimeoutError') {
      return {
        res: new Response(null, { status: 408 }),
        text: '',
        aborted: true,
      }
    }
    throw e
  }
}
