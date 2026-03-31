'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

export default function AuthConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.replace('/barbero/setup')
        return
      }
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const { data: barberoData } = await supabase
          .from('barberos')
          .select('id')
          .eq('user_id', session.user.id)
          .single()
        if (barberoData) {
          window.location.replace('/barbero/setup')
        } else {
          window.location.replace('/dashboard')
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