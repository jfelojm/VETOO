import { createClient } from '@/lib/supabase/client'

/** Cabeceras para rutas `/api/*` cuando la sesión está en localStorage (no en cookies). */
export async function getAuthHeadersForApi(): Promise<Record<string, string>> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}
