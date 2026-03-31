'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const supabase = createClient()

  useEffect(() => {
    async function verificar() {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!error && data.session) {
          const { data: barberoData } = await supabase
            .from('barberos')
            .select('id')
            .eq('user_id', data.session.user.id)
            .single()

          if (type === 'recovery' || barberoData) {
            window.location.replace('/barbero/setup')
          } else {
            window.location.replace('/dashboard')
          }
          return
        }
      }

      window.location.replace('/auth/login?error=link_invalido')
    }

    verificar()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Scissors className="w-8 h-8 text-brand-600 mx-auto mb-3 animate-pulse" />
        <p className="text-gray-400 text-sm">Verificando tu acceso...</p>
      </div>
    </div>
  )
}