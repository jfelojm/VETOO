'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Email inválido'),
})
type FormData = z.infer<typeof schema>

function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || ''
}

export default function RecuperarPasswordPage() {
  const supabase = createClient()
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setCargando(true)
    try {
      const origin = getAppOrigin()
      // Debe abrirse en el mismo navegador donde pediste el correo (PKCE). La página /auth/confirm hace exchangeCodeForSession en el cliente.
      const next = encodeURIComponent('/auth/restablecer-contrasena')
      const redirectTo = `${origin}/auth/confirm?next=${next}`

      const { error } = await supabase.auth.resetPasswordForEmail(data.email.trim(), {
        redirectTo,
      })
      if (error) {
        toast.error(error.message || 'No se pudo enviar el correo')
        setCargando(false)
        return
      }
      setEnviado(true)
      toast.success('Si el email está registrado, recibirás un enlace para restablecer tu contraseña.')
    } catch {
      toast.error('Error al enviar la solicitud')
    }
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al inicio de sesión
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Scissors className="w-7 h-7 text-brand-600" />
            <span className="text-xl font-bold">BarberApp</span>
          </div>
          <p className="text-gray-500 text-sm">Recuperar contraseña</p>
        </div>

        <div className="card">
          {enviado ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                Revisa tu bandeja de entrada (y spam). El enlace caduca en unos minutos.
              </p>
              <Link href="/auth/login" className="btn-primary w-full inline-block text-center">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-sm text-gray-600">
                Indica el email de tu cuenta (dueño o staff). Te enviaremos un enlace para elegir una
                nueva contraseña.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Importante: abre el enlace del correo en <strong>este mismo navegador</strong> (mismo
                equipo). Si lo abres en el móvil u otro navegador, el enlace puede fallar.
              </p>
              <div>
                <label className="label">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>
              <button type="submit" disabled={cargando} className="btn-primary w-full">
                {cargando ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
