'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import TurnAppLogo from '@/components/brand/TurnAppLogo'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const errorUrl = searchParams.get('error')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setCargando(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        toast.error('Email o contraseña incorrectos')
        setCargando(false)
        return
      }
      if (authData.session && authData.user) {
        toast.success('Bienvenido')
        const user = authData.user
        const { data: negocioPropio } = await supabase
          .from('negocios')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()

        const meta = user.user_metadata as Record<string, unknown> | undefined
        const esStaff =
          meta?.rol === 'barbero' || meta?.barbero_id != null

        let dest = '/dashboard'
        if (!negocioPropio && esStaff) dest = '/barbero/dashboard'
        if (!negocioPropio && !esStaff) dest = '/auth/register'

        setTimeout(() => {
          window.location.replace(dest)
        }, 500)
      }
    } catch {
      toast.error('Error al iniciar sesión')
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center">
            <TurnAppLogo variant="light" size="lg" href="/" />
          </div>
          <p className="text-gray-500 text-sm">Inicia sesión en tu panel</p>
        </div>

        <div className="card">
          {errorUrl && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {decodeURIComponent(errorUrl)}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="tu@email.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input {...register('password')} type={verPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
          <div className="text-center mt-4">
            <Link
              href="/auth/recuperar"
              className="text-sm text-brand-600 font-medium hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
            Registra tu negocio
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando…</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}