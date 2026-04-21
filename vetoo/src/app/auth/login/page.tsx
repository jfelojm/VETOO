'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message)
        return
      }
      router.replace(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="card" style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Iniciar sesión</h1>
        <p style={{ marginTop: 8, color: 'rgba(229,231,235,0.78)' }}>
          Accede al panel de tu clínica.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(229,231,235,0.78)' }}>Email</span>
            <input
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(229,231,235,0.78)' }}>Contraseña</span>
            <input
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <div className="card" style={{ padding: 12, borderColor: 'rgba(239,68,68,0.35)' }}>
              <p style={{ margin: 0, color: 'rgba(248,113,113,0.95)', fontSize: 13 }}>{error}</p>
            </div>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}

