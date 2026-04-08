import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Cliente Supabase para rutas API.
 * Si el navegador envía `Authorization: Bearer` (sesión en localStorage / implicit),
 * todas las consultas usan ese JWT; si no, se usan cookies (SSR).
 */
export function createSupabaseRouteClient(req: NextRequest) {
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (bearer) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${bearer}` },
        },
      }
    )
    return { supabase, cookiesToSet }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(toSet: { name: string; value: string; options?: CookieOptions }[]) {
          toSet.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options: options ?? {} })
          })
        },
      },
    }
  )

  return { supabase, cookiesToSet }
}

export function jsonWithCookies<T extends object>(
  body: T,
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
