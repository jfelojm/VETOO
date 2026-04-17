'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, ChevronLeft } from 'lucide-react'
import TurnAppLogo from '@/components/brand/TurnAppLogo'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { listTiposNegocio, type TipoNegocioId } from '@/lib/negocio-tipo'
import { trackTrialStart } from '@/lib/analytics'

const schema = z.object({
  nombre_negocio: z.string().min(2, 'Mínimo 2 caracteres'),
  ciudad:         z.string().min(2, 'Ingresa tu ciudad'),
  email:          z.string().email('Email inválido'),
  password:       z.string().min(6, 'Mínimo 6 caracteres'),
  password2:      z.string(),
}).refine(d => d.password === d.password2, {
  message: 'Las contraseñas no coinciden',
  path: ['password2'],
})
type FormData = z.infer<typeof schema>

const HORARIO_DEFAULT = {
  lunes:     { abierto: true,  desde: '08:00', hasta: '19:00' },
  martes:    { abierto: true,  desde: '08:00', hasta: '19:00' },
  miercoles: { abierto: true,  desde: '08:00', hasta: '19:00' },
  jueves:    { abierto: true,  desde: '08:00', hasta: '19:00' },
  viernes:   { abierto: true,  desde: '08:00', hasta: '19:00' },
  sabado:    { abierto: true,  desde: '09:00', hasta: '17:00' },
  domingo:   { abierto: false, desde: null,    hasta: null    },
} as const

function generarSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function payloadNegocio(
  nombre: string,
  slug: string,
  email: string,
  ciudad: string,
  ownerId: string,
  tipoNegocio: TipoNegocioId
) {
  return {
    nombre,
    slug,
    email,
    ciudad,
    owner_id: ownerId,
    tipo_negocio: tipoNegocio,
    horario: HORARIO_DEFAULT,
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [paso, setPaso] = useState<'tipo' | 'form' | 'exito'>('tipo')
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocioId | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    if (!tipoNegocio) {
      toast.error('Elige un tipo de negocio')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        toast.error('Este email ya está registrado. ¿Quieres iniciar sesión?')
      } else {
        toast.error('Error al crear cuenta: ' + authError.message)
      }
      return
    }

    if (!authData.user) {
      toast.error('No se pudo crear el usuario')
      return
    }

    const slug = generarSlug(data.nombre_negocio)
    const base = payloadNegocio(
      data.nombre_negocio,
      slug,
      data.email,
      data.ciudad,
      authData.user.id,
      tipoNegocio
    )

    const { error: negocioError } = await supabase.from('negocios').insert(base)

    if (negocioError) {
      if (negocioError.message.includes('unique')) {
        const slugConSufijo = `${slug}-${Math.floor(Math.random() * 9000) + 1000}`
        const { error: err2 } = await supabase
          .from('negocios')
          .insert(
            payloadNegocio(
              data.nombre_negocio,
              slugConSufijo,
              data.email,
              data.ciudad,
              authData.user.id,
              tipoNegocio
            )
          )
        if (err2) {
          toast.error('Error al crear el negocio')
          return
        }
      } else {
        toast.error('Error al crear el negocio')
        return
      }
    }

    trackTrialStart('register_complete')
    setPaso('exito')
  }

  if (paso === 'exito') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">¡Cuenta creada!</h1>
          <p className="text-gray-500 mb-6">
            Revisa tu email para confirmar tu cuenta. Después inicia sesión para configurar tu negocio.
          </p>
          <Link href="/auth/login" className="btn-primary w-full block text-center">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  if (paso === 'tipo') {
    const tipos = listTiposNegocio()
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="mb-2 flex justify-center">
              <TurnAppLogo variant="light" size="lg" href="/" />
            </div>
            <p className="text-gray-500 text-sm">14 días gratis · Sin tarjeta de crédito</p>
            <h2 className="text-lg font-semibold text-gray-900 mt-6">¿Qué tipo de negocio tienes?</h2>
            <p className="text-gray-500 text-sm mt-1">Elige la opción que mejor te representa</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tipos.map(t => {
              const Icon = t.Icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTipoNegocio(t.id)
                    setPaso('form')
                  }}
                  className="text-left p-4 rounded-2xl border border-gray-200 bg-white hover:border-brand-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.descripcion}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const tipoSel = tipoNegocio ? listTiposNegocio().find(t => t.id === tipoNegocio) : null
  const TipoIcon = tipoSel?.Icon

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center">
            <TurnAppLogo variant="light" size="lg" href="/" />
          </div>
          <p className="text-gray-500 text-sm">14 días gratis · Sin tarjeta de crédito</p>
        </div>

        <button
          type="button"
          onClick={() => setPaso('tipo')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Cambiar tipo de negocio
        </button>

        {tipoSel && TipoIcon && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-brand-50 border border-brand-100">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <TipoIcon className="w-5 h-5 text-brand-600" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs text-brand-700 font-medium uppercase tracking-wide">Tipo</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{tipoSel.label}</p>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Datos de tu negocio</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className="label">Nombre del negocio</label>
              <input {...register('nombre_negocio')} className="input" placeholder="El nombre de tu local" />
              {errors.nombre_negocio && <p className="text-red-500 text-xs mt-1">{errors.nombre_negocio.message}</p>}
            </div>

            <div>
              <label className="label">Ciudad</label>
              <input {...register('ciudad')} className="input" placeholder="Loja, Quito, Guayaquil..." />
              {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad.message}</p>}
            </div>

            <div>
              <label className="label">Email de contacto</label>
              <input {...register('email')} type="email" className="input" placeholder="tu@email.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input {...register('password')} type="password" className="input" placeholder="Mínimo 6 caracteres" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirmar contraseña</label>
              <input {...register('password2')} type="password" className="input" placeholder="Repite tu contraseña" />
              {errors.password2 && <p className="text-red-500 text-xs mt-1">{errors.password2.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>

          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
