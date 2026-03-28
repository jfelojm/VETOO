'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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

// Genera un slug limpio desde el nombre del negocio
function generarSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [paso, setPaso] = useState<'form' | 'exito'>('form')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    // 1. Crear usuario en Supabase Auth
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

    // 2. Crear el negocio vinculado al usuario
    const slug = generarSlug(data.nombre_negocio)
    const { error: negocioError } = await supabase
      .from('negocios')
      .insert({
        nombre:   data.nombre_negocio,
        slug:     slug,
        email:    data.email,
        ciudad:   data.ciudad,
        owner_id: authData.user.id,
        // Horario por defecto: lun–sáb 8am–7pm
        horario: {
          lunes:     { abierto: true,  desde: '08:00', hasta: '19:00' },
          martes:    { abierto: true,  desde: '08:00', hasta: '19:00' },
          miercoles: { abierto: true,  desde: '08:00', hasta: '19:00' },
          jueves:    { abierto: true,  desde: '08:00', hasta: '19:00' },
          viernes:   { abierto: true,  desde: '08:00', hasta: '19:00' },
          sabado:    { abierto: true,  desde: '09:00', hasta: '17:00' },
          domingo:   { abierto: false, desde: null,    hasta: null    },
        },
      })

    if (negocioError) {
      // Si el slug ya existe, intentar con sufijo numérico
      if (negocioError.message.includes('unique')) {
        const slugConSufijo = `${slug}-${Math.floor(Math.random() * 9000) + 1000}`
        const { error: err2 } = await supabase
          .from('negocios')
          .insert({ nombre: data.nombre_negocio, slug: slugConSufijo, email: data.email, ciudad: data.ciudad, owner_id: authData.user.id })
        if (err2) {
          toast.error('Error al crear el negocio')
          return
        }
      } else {
        toast.error('Error al crear el negocio')
        return
      }
    }

    setPaso('exito')
  }

  if (paso === 'exito') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">¡Cuenta creada!</h1>
          <p className="text-gray-500 mb-6">
            Revisa tu email para confirmar tu cuenta. Después inicia sesión para configurar tu barbería.
          </p>
          <Link href="/auth/login" className="btn-primary w-full block text-center">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Scissors className="w-7 h-7 text-brand-600" />
            <span className="text-xl font-bold">BarberApp</span>
          </div>
          <p className="text-gray-500 text-sm">14 días gratis · Sin tarjeta de crédito</p>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Registra tu barbería</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className="label">Nombre de tu barbería</label>
              <input {...register('nombre_negocio')} className="input" placeholder="El Fader Barbershop" />
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
