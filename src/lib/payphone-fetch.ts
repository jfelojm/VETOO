import axios from 'axios'

/** Evita que un PayPhone colgado consuma todo el presupuesto de tiempo de Vercel (~10s en Hobby). */
export const PAYPHONE_FETCH_TIMEOUT_MS = 6000

export async function fetchPayPhone(
  url: string,
  token: string,
  payload: Record<string, string | number | boolean>
): Promise<{ res: Response; text: string; aborted?: boolean }> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[payphone] POST', url, JSON.stringify(payload))
  }
  try {
    const response = await axios.post<string>(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: PAYPHONE_FETCH_TIMEOUT_MS,
      responseType: 'text',
      // Igual que fetch: no lanzar por 4xx/5xx; el cuerpo sigue disponible.
      validateStatus: () => true,
    })
    const text = response.data ?? ''
    console.log('[payphone] response status:', response.status)
    console.log('[payphone] response body:', text.substring(0, 500))
    const res = new Response(text, { status: response.status })
    return { res, text }
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const timedOut =
        e.code === 'ECONNABORTED' ||
        e.code === 'ETIMEDOUT' ||
        (typeof e.message === 'string' && e.message.toLowerCase().includes('timeout'))
      if (timedOut) {
        return {
          res: new Response(null, { status: 408 }),
          text: '',
          aborted: true,
        }
      }
      if (e.response) {
        const raw = e.response.data
        const text = typeof raw === 'string' ? raw : String(raw ?? '')
        console.log('[payphone] response status:', e.response.status)
        console.log('[payphone] response body:', text.substring(0, 500))
        const res = new Response(text, { status: e.response.status })
        return { res, text }
      }
    }
    throw e
  }
}
