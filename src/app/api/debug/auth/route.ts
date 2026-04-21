import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createHash } from 'crypto'

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

  const [{ data: userData, error }, { data: claimsData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])

  const cookieNames = cookieStore.getAll().map(c => c.name).sort()
  const supabaseCookies = cookieNames.filter(n => n.startsWith('sb-'))
  const cookieInfo = cookieStore
    .getAll()
    .filter(c => c.name.startsWith('sb-'))
    .map(c => {
      const v = c.value ?? ''
      const len = v.length
      const looksJwt = v.split('.').length === 3
      const hash = createHash('sha256').update(v).digest('hex').slice(0, 12)
      return { name: c.name, len, looksJwt, hash }
    })

  return NextResponse.json({
    ok: true,
    user: userData.user ? { id: userData.user.id, email: userData.user.email } : null,
    claimsSub: claimsData?.claims?.sub ?? null,
    error: error?.message ?? null,
    cookies: supabaseCookies,
    cookieInfo,
  })
}

