'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'
import { toast } from 'sonner'

export default function BarberoSetupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const barberoId = user.user_metadata?.barbero_id
      if (!barberoId) return
      const { data } = await supabase.from('barberos').select('nombre').eq('id', barberoId).single()
      if (data) setNombre(data.nombre)
    }
    cargar()
  }, [])

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
      toast.error('Error al configurar contraseña')
      setCargando(false)
      return
    }
    toast.success('Contraseña configurada correctamente')
    setTimeout(() => router.replace('/barbero/dashboard'), 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Scissors className="w-7 h-7 text-brand-600" />
            <span className="text-xl font-bold">BarberApp</span>
          </div>
          <p className="text-gray-700 font-medium">Hola {nombre || 'profesional'}</p>
          <p className="text-gray-500 text-sm mt-1">Crea tu contraseña para acceder a tu panel</p>
        </div>
        <div className="card">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Repite tu contraseña"
                required
              />
            </div>
            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? 'Configurando...' : 'Crear contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}