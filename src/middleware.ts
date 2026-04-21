import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createMiddlewareSupabaseClient(request, response)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (path.startsWith('/dashboard') || path === '/portal' || path.startsWith('/portal/')) {
    if (!user) {
      const login = new URL('/auth/login', request.url)
      const nextPath = `${path}${request.nextUrl.search}`
      if (nextPath && nextPath !== '/auth/login') {
        login.searchParams.set('next', nextPath)
      }
      return NextResponse.redirect(login)
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/portal', '/portal/:path*'],
}
