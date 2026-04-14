'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Clock, User, Scissors, Phone, X, CheckCircle } from 'lucide-react'
import { nombreClienteReservaRow } from '@/lib/utils'

interface Reserva {
  id: string
  fecha_hora: string
  duracion: number
  estado: string
  notas_cliente: string | null
  cliente_nombre_snapshot?: string | null
  barbero: { nombre: string } | null
  servicio: { nombre: string; duracion: number } | null
  cliente: { nombre: string; telefono: string; email: string | null } | null
}

const ESTADOS: Record<string, { label: string; clase: string }> = {
  pendiente:  { label: 'Pendiente',  clase: 'badge-amber' },
  confirmada: { label: 'Confirmada', clase: 'badge-blue'  },
  completada: { label: 'Completada', clase: 'badge-green' },
  cancelada:  { label: 'Cancelada',  clase: 'badge-red'   },
  no_show:    { label: 'No asistió', clase: 'badge-gray'  },
}

export default function ReservasPage() {
  const supabase = createClient()
  const [negocioId, setNegocioId] = useState('')
  const [fecha, setFecha] = useState(new Date())
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')

  useEffect(() => {
    async function cargarNegocio() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (neg) { setNegocioId(neg.id); cargarReservas(neg.id, fecha) }
    }
    cargarNegocio()
  }, [])

  async function cargarReservas(nid: string, dia: Date) {
    setCargando(true)
    const { data } = await supabase
      .from('reservas')
      .select(`*, barbero:barberos(nombre), servicio:servicios(nombre,duracion), cliente:clientes(nombre,telefono,email)`)
      .eq('negocio_id', nid)
      .gte('fecha_hora', startOfDay(dia).toISOString())
      .lte('fecha_hora', endOfDay(dia).toISOString())
      .order('fecha_hora', { ascending: true })
    setReservas(data ?? [])
    setCargando(false)
  }

  async function cambiarEstado(reservaId: string, nuevoEstado: string) {
    const { error } = await supabase
      .from('reservas').update({ estado: nuevoEstado }).eq('id', reservaId)
    if (error) { toast.error('Error al actualizar'); return }
    setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: nuevoEstado } : r))
    toast.success('Estado actualizado')
  }

  function cambiarDia(dias: number) {
    const nuevaFecha = dias > 0 ? addDays(fecha, dias) : subDays(fecha, Math.abs(dias))
    setFecha(nuevaFecha)
    if (negocioId) cargarReservas(negocioId, nuevaFecha)
  }

  const reservasFiltradas = filtroEstado === 'todos'
    ? reservas
    : reservas.filter(r => r.estado === filtroEstado)

  const fechaLabel = format(fecha, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-500 text-sm mt-1 capitalize">{fechaLabel}</p>
        </div>
        {/* Navegación de días */}
        <div className="flex items-center gap-2">
          <button onClick={() => cambiarDia(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => { setFecha(new Date()); if (negocioId) cargarReservas(negocioId, new Date()) }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Hoy
          </button>
          <button onClick={() => cambiarDia(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['todos', 'pendiente', 'confirmada', 'completada', 'cancelada', 'no_show'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filtroEstado === e
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {e === 'todos' ? 'Todos' : ESTADOS[e]?.label}
          </button>
        ))}
      </div>

      {/* Lista de reservas */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando reservas...</div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">
            {filtroEstado === 'todos' ? 'No hay reservas para este día' : `No hay reservas con estado "${ESTADOS[filtroEstado]?.label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservasFiltradas.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start gap-4">
                {/* Hora */}
                <div className="text-center shrink-0 w-14">
                <p className="text-lg font-bold text-brand-600">{new Date(r.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                  <p className="text-xs text-gray-400">{r.duracion} min</p>
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{nombreClienteReservaRow(r)}</p>
                    <span className={`badge ${ESTADOS[r.estado]?.clase ?? 'badge-gray'}`}>
                      {ESTADOS[r.estado]?.label ?? r.estado}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {r.cliente?.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {r.cliente.telefono}
                      </span>
                    )}
                    {r.servicio && (
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3 h-3" /> {r.servicio.nombre}
                      </span>
                    )}
                    {r.barbero && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {r.barbero.nombre}
                      </span>
                    )}
                  </div>
                  {r.notas_cliente && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{r.notas_cliente}"</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {r.estado === 'confirmada' && (
                    <>
                      <button onClick={() => cambiarEstado(r.id, 'completada')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                        <CheckCircle className="w-3 h-3" /> Completada
                      </button>
                      <button onClick={() => cambiarEstado(r.id, 'no_show')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-3 h-3" /> No asistió
                      </button>
                      <button onClick={() => cambiarEstado(r.id, 'cancelada')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    </>
                  )}
                  {r.estado === 'pendiente' && (
                    <>
                      <button onClick={() => cambiarEstado(r.id, 'confirmada')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                        <CheckCircle className="w-3 h-3" /> Confirmar
                      </button>
                      <button onClick={() => cambiarEstado(r.id, 'cancelada')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
