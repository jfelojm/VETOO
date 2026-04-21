import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            } catch {}
          })
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const cookieNames = cookieStore.getAll().map(c => c.name).sort()
  const supabaseCookies = cookieNames.filter(n => n.startsWith('sb-'))

  return NextResponse.json({
    ok: true,
    user: user ? { id: user.id, email: user.email } : null,
    error: error?.message ?? null,
    cookies: supabaseCookies,
  })
}

