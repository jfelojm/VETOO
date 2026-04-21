'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        router.replace('/auth/login?next=/dashboard')
        return
      }
      if (!mounted) return
      setEmail(user.email ?? null)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [router, supabase])

  if (loading) return <p style={{ color: 'rgba(229,231,235,0.72)' }}>Cargando…</p>

  return (
    <div className="card" style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Dashboard</h1>
      <p style={{ marginTop: 8, color: 'rgba(229,231,235,0.78)' }}>
        Sesión activa{email ? `: ${email}` : ''}.
      </p>
    </div>
  )
}

