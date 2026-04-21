import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon'
  return createBrowserClient(
    url,
    anon,
    {
      auth: {
        flowType: 'implicit',
      },
    }
  )
}