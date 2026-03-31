import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
 
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'
  console.log('CALLBACK PARAMS:', Object.fromEntries(searchParams.entries()))
 
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
 
  // Manejar token de invitación (type=invite) o magic link
  if (token && (type === 'invite' || type === 'magiclink')) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'invite' ? 'invite' : 'magiclink',
    })
 
    if (!error && data?.user) {
      const barberoId = data.user.user_metadata?.barbero_id
      if (barberoId) {
        return NextResponse.redirect(`${origin}/barbero/setup`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
 
  // Manejar code (OAuth flow)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
 
    if (!error && data?.user) {
      const barberoId = data.user.user_metadata?.barbero_id
      if (barberoId) {
        return NextResponse.redirect(`${origin}/barbero/setup`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
 
  return NextResponse.redirect(`${origin}/auth/login?error=link_invalido`)
}