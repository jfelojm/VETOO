import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'

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

/** Cliente Supabase para middleware (`@supabase/ssr`): mantiene la sesión en cookies. */
export function createMiddlewareSupabaseClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon'
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        headers?: Record<string, string>
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Mantener request/response sincronizados (recomendado por Supabase para middleware)
          try {
            request.cookies.set(name, value)
          } catch {
            // ignore (algunas runtimes no permiten mutar request)
          }
          response.cookies.set(name, value, options)
        })
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            response.headers.set(k, v)
          }
        }
      },
    },
  })
}