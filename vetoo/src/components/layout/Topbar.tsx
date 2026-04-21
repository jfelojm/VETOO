'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function Topbar() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.replace('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.12)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'rgba(229,231,235,0.72)' }}>
          Vetoo
        </div>
        <button className="btn" type="button" onClick={() => void logout()} disabled={loading}>
          {loading ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
    </header>
  )
}

