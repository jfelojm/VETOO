'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Si Supabase redirige solo al dominio (#tokens en hash), la landing no los procesa: enviamos a /auth/confirm. */
export default function AuthLandingHashRedirect() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('code')) {
      window.location.replace(`/auth/confirm${url.search}${url.hash}`)
      return
    }
    const h = window.location.hash
    if (!h || h.length < 8) return
    const p = new URLSearchParams(h.startsWith('#') ? h.slice(1) : h)
    const looksAuth =
      !!p.get('access_token') ||
      !!p.get('code') ||
      p.get('type') === 'invite' ||
      p.get('type') === 'signup' ||
      p.get('type') === 'recovery' ||
      !!p.get('token_hash')
    if (!looksAuth) return
    window.location.replace(`/auth/confirm${url.search}${h}`)
  }, [pathname])

  return null
}
