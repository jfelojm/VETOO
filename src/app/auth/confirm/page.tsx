'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function verificar() {
      const url = new URL(window.location.href)

      // Flujo PKCE: código en query (sin fragmento con tokens)
      const code = url.searchParams.get('code')
      if (code) {
        const qs = new URLSearchParams(url.search)
        if (!qs.has('next')) qs.set('next', '/dashboard')
        window.location.replace(`/api/auth/callback?${qs.toString()}`)
        return
      }

      const hash = url.hash ? url.hash.slice(1) : ''
      const params = new URLSearchParams(hash)
      const errorCode = params.get('error')
      const errorDesc = params.get('error_description')
      if (errorCode || errorDesc) {
        const msg = encodeURIComponent(errorDesc || errorCode || 'error')
        window.location.replace(`/auth/login?error=${msg}`)
        return
      }

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (!accessToken || !refreshToken) {
        window.location.replace('/auth/login?error=link_invalido')
        return
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        window.location.replace('/auth/login?error=sesion_invalida')
        return
      }

      if (type === 'recovery') {
        window.location.replace('/auth/restablecer-contrasena')
        return
      }

      const meta = data.session.user.user_metadata as Record<string, unknown> | undefined
      const barberoFromMeta = meta?.barbero_id != null
      const isStaffInvite =
        type === 'invite' ||
        type === 'signup' ||
        meta?.rol === 'barbero' ||
        barberoFromMeta

      if (isStaffInvite) {
        window.location.replace('/barbero/setup')
        return
      }

      const { data: barberoData } = await supabase
        .from('barberos')
        .select('id')
        .eq('user_id', data.session.user.id)
        .maybeSingle()

      if (barberoData) {
        window.location.replace('/barbero/setup')
      } else {
        window.location.replace('/dashboard')
      }
    }

    void verificar()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Scissors className="w-8 h-8 text-brand-600 mx-auto mb-3 animate-pulse" />
        <p className="text-gray-400 text-sm">Verificando tu acceso...</p>
      </div>
    </div>
  )
}