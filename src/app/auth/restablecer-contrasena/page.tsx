'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scissors, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function RestablecerContrasenaPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [verPassword, setVerPassword] = useState(false)
  const [verPassword2, setVerPassword2] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionOk, setSesionOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let authSub: { unsubscribe: () => void } | null = null

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user) {
        setSesionOk(true)
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (
          session?.user &&
          (event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'PASSWORD_RECOVERY')
        ) {
          setSesionOk(true)
          subscription.unsubscribe()
        }
      })
      authSub = subscription

      timeoutId = setTimeout(async () => {
        if (cancelled) return
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!s2?.user) {
          authSub?.unsubscribe()
          router.replace('/auth/login?error=sesion_recuperacion')
        }
      }, 6000)
    })()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      authSub?.unsubscribe()
    }
  }, [router, supabase])

  async function redirigirTrasExito() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/auth/login')
      return
    }
    const { data: negocioPropio } = await supabase
      .from('negocios')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    const meta = user.user_metadata as Record<string, unknown> | undefined
    const esStaff = meta?.rol === 'barbero' || meta?.barbero_id != null

    let dest = '/dashboard'
    if (!negocioPropio && esStaff) dest = '/barbero/dashboard'
    if (!negocioPropio && !esStaff) dest = '/dashboard'

    router.replace(dest)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setCargando(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message || 'No se pudo actualizar la contraseña')
      setCargando(false)
      return
    }
    toast.success('Contraseña actualizada')
    await redirigirTrasExito()
    setCargando(false)
  }

  if (!sesionOk) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Scissors className="w-8 h-8 text-brand-600 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Iniciar sesión
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Scissors className="w-7 h-7 text-brand-600" />
            <span className="text-xl font-bold">Turnapp</span>
          </div>
          <p className="text-gray-500 text-sm">Nueva contraseña</p>
        </div>

        <div className="card">
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Elige una contraseña nueva para tu cuenta (dueño o profesional).
            </p>
            <div>
              <label className="label">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={verPassword ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={verPassword2 ? 'text' : 'password'}
                  className="input pr-10"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword2(!verPassword2)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {verPassword2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
