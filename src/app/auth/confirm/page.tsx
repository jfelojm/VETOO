'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const barberoId = session.user.user_metadata?.barbero_id
        if (barberoId) {
          router.replace('/barbero/setup')
        } else {
          router.replace('/dashboard')
        }
      }
    })

    return () => subscription.unsubscribe()
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