import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon'
  /**
   * En App Router + middleware SSR, usar PKCE (default) para que la sesión se
   * sincronice correctamente vía cookies y el middleware no “pierda” la sesión.
   */
  return createBrowserClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}