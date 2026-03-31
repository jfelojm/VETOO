'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function verificar() {
      const url = new URL(window.location.href)
      const hashRaw = url.hash?.startsWith('#') ? url.hash.slice(1) : ''
      const hashParams = new URLSearchParams(hashRaw)

      // PKCE: Supabase a veces pone ?code= y a veces #code= en el fragmento
      const code =
        url.searchParams.get('code') ||
        hashParams.get('code')
      if (code) {
        // PKCE: el code_verifier está en este navegador; el servidor no puede intercambiar el código.
        const { error: errExchange } = await supabase.auth.exchangeCodeForSession(code)
        if (errExchange) {
          window.location.replace(
            `/auth/login?error=${encodeURIComponent(
              errExchange.message ||
                'Enlace inválido o caducado. Pide uno nuevo desde “Olvidé mi contraseña” (mismo navegador).'
            )}`
          )
          return
        }
        const nextRaw =
          url.searchParams.get('next') ||
          hashParams.get('next') ||
          '/dashboard'
        const next =
          nextRaw.startsWith('/') && !nextRaw.startsWith('//') && !nextRaw.includes(':')
            ? nextRaw
            : '/dashboard'
        window.location.replace(next)
        return
      }

      // Token en query o en hash (plantillas de correo)
      const tokenOtp =
        url.searchParams.get('token_hash') ||
        url.searchParams.get('token') ||
        hashParams.get('token_hash') ||
        hashParams.get('token')
      const typeOtp =
        url.searchParams.get('type') ||
        hashParams.get('type')
      if (tokenOtp && typeOtp === 'recovery') {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenOtp,
          type: 'recovery',
        })
        if (error || !data.session) {
          window.location.replace(
            `/auth/login?error=${encodeURIComponent(error?.message || 'enlace_expirado')}`
          )
          return
        }
        window.location.replace('/auth/restablecer-contrasena')
        return
      }

      const params = hashParams
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
        window.location.replace(
          `/auth/login?error=${encodeURIComponent(
            'Enlace inválido o incompleto. Si pediste recuperar la contraseña, abre el enlace en el mismo navegador donde lo solicitaste (PKCE). Si usas otro dispositivo, pide un correo nuevo allí.'
          )}`
        )
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