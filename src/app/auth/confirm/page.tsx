'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const barberoId = session.user.user_metadata?.barbero_id
        if (barberoId) {
          router.replace('/barbero/setup')
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/auth/login?error=link_invalido')
      }
    }

    // Pequeño delay para que Supabase procese el hash
    setTimeout(handleAuth, 500)
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
