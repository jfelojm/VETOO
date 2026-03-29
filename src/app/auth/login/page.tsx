'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const supabase = createClient()
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
      if (authData.session) {
        toast.success('Bienvenido')
        setTimeout(() => {
          window.location.replace('/dashboard')
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
          <div className="inline-flex items-center gap-2 mb-2">
            <Scissors className="w-7 h-7 text-brand-600" />
            <span className="text-xl font-bold">BarberApp</span>
          </div>
          <p className="text-gray-500 text-sm">Inicia sesión en tu panel</p>
        </div>

        <div className="card">
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
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
            Registra tu barbería
          </Link>
        </p>
      </div>
    </div>
  )
}