'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function getSearchParam(name: string) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const err = getSearchParam('error')
    if (err) setErrorMsg(decodeURIComponent(err))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setCargando(true)
    try {
      const next = getSearchParam('next') || '/dashboard'
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setErrorMsg(error.message || 'No se pudo iniciar sesión')
        setCargando(false)
        return
      }
      // Asegura que la sesión se haya establecido antes de entrar a rutas protegidas
      await supabase.auth.getSession()
      window.location.href = next
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#FBF7F4' }}
    >
      <div
        className="w-full max-w-[420px]"
        style={{
          backgroundColor: '#fff',
          border: '1px solid #EDE4DC',
          borderRadius: 16,
          padding: 40,
        }}
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="" width={40} height={40} priority />
            <span
              className="font-serif"
              style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#2C2420' }}
            >
              Vetoo
            </span>
          </div>
          <p style={{ color: '#7A6A62', fontSize: 14, margin: 0 }}>
            Accede al panel de tu clínica
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, color: '#2C2420', marginBottom: 6 }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full outline-none"
              style={{
                border: '1px solid #EDE4DC',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                color: '#2C2420',
              }}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, color: '#2C2420', marginBottom: 6 }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full outline-none"
              style={{
                border: '1px solid #EDE4DC',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                color: '#2C2420',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full border-0 font-medium text-white"
            style={{
              backgroundColor: '#E8845A',
              borderRadius: 10,
              height: 44,
              fontWeight: 500,
              cursor: cargando ? 'wait' : 'pointer',
              opacity: cargando ? 0.85 : 1,
            }}
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        {errorMsg ? (
          <p className="mt-3 text-center" style={{ color: '#D95C5C', fontSize: 13 }}>
            {errorMsg}
          </p>
        ) : null}

        <p className="mt-6 text-center" style={{ fontSize: 14, color: '#7A6A62' }}>
          ¿Aún no tienes cuenta?{' '}
          <Link href="/auth/registro" style={{ color: '#E8845A', fontWeight: 500 }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
