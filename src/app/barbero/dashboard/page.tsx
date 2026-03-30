'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Scissors, LogOut, Clock, Phone, X, CheckCircle, Plus } from 'lucide-react'

interface Reserva {
  id: string
  fecha_hora: string
  duracion: number
  estado: string
  notas_cliente: string | null
  servicio: { nombre: string } | null
  cliente: { nombre: string; telefono: string } | null
}

export default function BarberoDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [barbero, setBarbero] = useState<any>(null)
  const [fecha, setFecha] = useState(new Date())
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarBloqueo, setMostrarBloqueo] = useState(false)
  const [bloqueoDesde, setBloqueoDesde] = useState('')
  const [bloqueoHasta, setBloqueoHasta] = useState('')
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const barberoId = user.user_metadata?.barbero_id
      if (!barberoId) { router.replace('/auth/login'); return }

      const { data: b } = await supabase
        .from('barberos')
        .select('id, nombre, negocio_id, negocio:negocios(nombre)')
        .eq('id', barberoId)
        .single()

      if (!b) { router.replace('/auth/login'); return }
      setBarbero(b)
      await cargarReservas(barberoId, fecha)
      setCargando(false)
    }
    cargar()
  }, [])

  async function cargarReservas(barberoId: string, dia: Date) {
    const { data } = await supabase
      .from('reservas')
      .select('*, servicio:servicios(nombre), cliente:clientes(nombre, telefono)')
      .eq('barbero_id', barberoId)
      .gte('fecha_hora', startOfDay(dia).toISOString())
      .lte('fecha_hora', endOfDay(dia).toISOString())
      .neq('estado', 'cancelada')
      .order('fecha_hora', { ascending: true })
    setReservas(data ?? [])
  }

  async function cambiarEstado(reservaId: string, estado: string) {
    const { error } = await supabase.from('reservas').update({ estado }).eq('id', reservaId)
    if (error) { toast.error('Error al actualizar'); return }
    setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado } : r))
    toast.success('Estado actualizado')
  }

  async function crearBloqueo() {
    if (!bloqueoDesde || !bloqueoHasta) { toast.error('Ingresa fecha y hora'); return }
    const { error } = await supabase.from('bloqueos').insert({
      negocio_id: barbero.negocio_id,
      barbero_id: barbero.id,
      fecha_desde: new Date(bloqueoDesde).toISOString(),
      fecha_hasta: new Date(bloqueoHasta).toISOString(),
      motivo: bloqueoMotivo || 'No disponible',
    })
    if (error) { toast.error('Error al crear bloqueo'); return }
    toast.success('Horario bloqueado')
    setMostrarBloqueo(false)
    setBloqueoDesde(''); setBloqueoHasta(''); setBloqueoMotivo('')
  }

  function cambiarDia(dias: number) {
    const nueva = dias > 0 ? addDays(fecha, dias) : subDays(fecha, Math.abs(dias))
    setFecha(nueva)
    if (barbero) cargarReservas(barbero.id, nueva)
  }

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Scissors className="w-8 h-8 text-brand-600 animate-pulse" />
    </div>
  )

  const fechaLabel = format(fecha, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-brand-600" />
            <span className="font-bold text-sm">BarberApp</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{(barbero?.negocio as any)?.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700">{barbero?.nombre}</p>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/auth/login') }}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Navegación de días */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => cambiarDia(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900 capitalize">{fechaLabel}</p>
            <p className="text-xs text-gray-400">{reservas.length} reservas</p>
          </div>
          <button onClick={() => cambiarDia(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Botón bloquear horario */}
        <button onClick={() => setMostrarBloqueo(!mostrarBloqueo)}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors">
          <Plus className="w-4 h-4" />
          Bloquear horario
        </button>

        {/* Formulario de bloqueo */}
        {mostrarBloqueo && (
          <div className="card mb-4">
            <p className="font-medium text-gray-900 mb-3">Bloquear horario</p>
            <div className="space-y-3">
              <div>
                <label className="label">Desde</label>
                <input type="datetime-local" value={bloqueoDesde}
                  onChange={e => setBloqueoDesde(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input type="datetime-local" value={bloqueoHasta}
                  onChange={e => setBloqueoHasta(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Motivo (opcional)</label>
                <input value={bloqueoMotivo} onChange={e => setBloqueoMotivo(e.target.value)}
                  className="input" placeholder="Ej: Vacaciones, cita médica..." />
              </div>
              <div className="flex gap-2">
                <button onClick={crearBloqueo} className="btn-primary flex-1">Bloquear</button>
                <button onClick={() => setMostrarBloqueo(false)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de reservas */}
        {reservas.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-gray-400 text-sm">No tienes reservas para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-lg font-bold text-brand-600">
                      {new Date(r.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    <p className="text-xs text-gray-400">{r.duracion} min</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{r.cliente?.nombre}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
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
                    </div>
                    {r.notas_cliente && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{r.notas_cliente}"</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {r.estado === 'confirmada' && (
                      <>
                        <button onClick={() => cambiarEstado(r.id, 'completada')}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg">
                          <CheckCircle className="w-3 h-3" /> Listo
                        </button>
                        <button onClick={() => cambiarEstado(r.id, 'no_show')}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg">
                          <X className="w-3 h-3" /> No vino
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
    </div>
  )
}