'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verificar() {
      // Esperar a que Supabase procese el hash
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const barberoId = session.user.user_metadata?.barbero_id
        if (barberoId) {
          window.location.replace('/barbero/setup')
        } else {
          window.location.replace('/dashboard')
        }
      } else {
        window.location.replace('/auth/login?error=link_invalido')
      }
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