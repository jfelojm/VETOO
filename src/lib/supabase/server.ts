import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon'
  return createSupabaseClient(
    url,
    anon
  )
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service_role'
  return createSupabaseClient(
    url,
    service
  )
}