'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  'badge badge-amber',
  confirmada: 'badge badge-blue',
  completada: 'badge badge-green',
  no_show:    'badge badge-red',
}

export default function DashboardPage() {
  const supabase = createClient()
  const [negocio, setNegocio] = useState<any>(null)
  const [reservasHoy, setReservasHoy] = useState<any[]>([])
  const [totalMes, setTotalMes] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.replace('/auth/login'); return }

      const { data: neg } = await supabase
        .from('negocios').select('*').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocio(neg)

      const hoy = new Date()
      const inicioHoy = new Date(hoy); inicioHoy.setHours(0,0,0,0)
      const finHoy    = new Date(hoy); finHoy.setHours(23,59,59,999)

      const { data: res } = await supabase
        .from('reservas')
        .select('*, barbero:barberos(nombre), servicio:servicios(nombre,duracion), cliente:clientes(nombre,telefono)')
        .eq('negocio_id', neg.id)
        .gte('fecha_hora', inicioHoy.toISOString())
        .lte('fecha_hora', finHoy.toISOString())
        .neq('estado', 'cancelada')
        .order('fecha_hora', { ascending: true })
      setReservasHoy(res ?? [])

      const { count: c1 } = await supabase
        .from('reservas').select('*', { count: 'exact', head: true })
        .eq('negocio_id', neg.id)
        .gte('fecha_hora', new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString())
        .neq('estado', 'cancelada')
      setTotalMes(c1 ?? 0)

      const { count: c2 } = await supabase
        .from('reservas').select('*', { count: 'exact', head: true })
        .eq('negocio_id', neg.id).eq('estado', 'pendiente')
        .gte('fecha_hora', hoy.toISOString())
      setPendientes(c2 ?? 0)

      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">Cargando agenda...</p>
    </div>
  )

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{fechaHoy}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Agenda de hoy — {negocio?.nombre}</p>
        </div>
        <div className="flex gap-3">
          <a href={`/reservar/${negocio?.slug}`} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-sm flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Mi página de reservas
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Turnos hoy</p>
          <p className="text-3xl font-bold text-gray-900">{reservasHoy.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Este mes</p>
          <p className="text-3xl font-bold text-gray-900">{totalMes}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Pendientes</p>
          <p className="text-3xl font-bold text-brand-600">{pendientes}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Turnos de hoy</h2>
        </div>
        {reservasHoy.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay turnos para hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reservasHoy.map((r: any) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-1.5 text-brand-600 font-semibold text-sm w-16 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(r.fecha_hora), 'HH:mm')}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                    {r.cliente?.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{r.cliente?.nombre}</p>
                    <p className="text-xs text-gray-400">{r.cliente?.telefono}</p>
                  </div>
                </div>
                <div className="hidden md:block flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{r.servicio?.nombre ?? 'Sin servicio'}</p>
                  <p className="text-xs text-gray-400">{r.barbero?.nombre ?? 'Sin barbero'}</p>
                </div>
                <span className={ESTADO_BADGE[r.estado] ?? 'badge badge-gray'}>{r.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}