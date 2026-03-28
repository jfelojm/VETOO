'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Phone, Mail, Calendar, AlertTriangle } from 'lucide-react'

interface Cliente {
  id: string
  nombre: string
  telefono: string
  email: string | null
  cancelaciones_mes: number
  bloqueado: boolean
  created_at: string
  total_reservas?: number
  ultima_reserva?: string
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return

      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('negocio_id', neg.id)
        .order('created_at', { ascending: false })

      setClientes(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  async function toggleBloqueo(cliente: Cliente) {
    const { error } = await supabase
      .from('clientes')
      .update({ bloqueado: !cliente.bloqueado })
      .eq('id', cliente.id)
    if (error) return
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, bloqueado: !c.bloqueado } : c))
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda) ||
    (c.email ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  if (cargando) return <div className="text-gray-400 text-sm">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clientes.length} clientes registrados</p>
        </div>
      </div>

      {/* Buscador */}
      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="input mb-6"
        placeholder="Buscar por nombre, teléfono o email..."
      />

      {clientesFiltrados.length === 0 ? (
        <div className="card text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {busqueda ? 'No se encontraron clientes con esa búsqueda' : 'Aún no tienes clientes registrados'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Los clientes aparecen aquí cuando hacen su primera reserva
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientesFiltrados.map(c => (
            <div key={c.id} className={`card ${c.bloqueado ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  c.bloqueado ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-700'
                }`}>
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{c.nombre}</p>
                    {c.bloqueado && (
                      <span className="badge badge-red flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Bloqueado
                      </span>
                    )}
                    {c.cancelaciones_mes >= 2 && !c.bloqueado && (
                      <span className="badge badge-amber">{c.cancelaciones_mes} cancelaciones</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.telefono}
                    </span>
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {c.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Desde {format(parseISO(c.created_at), "d 'de' MMM yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleBloqueo(c)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    c.bloqueado
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}>
                  {c.bloqueado ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
