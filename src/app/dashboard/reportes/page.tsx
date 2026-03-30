'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

interface Stats {
  totalMes: number
  totalMesAnterior: number
  completadas: number
  canceladas: number
  noShow: number
  servicioTop: string
  barberoTop: string
  horaPico: string
  ingresoEstimado: number
}

export default function ReportesPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date())

  useEffect(() => {
    cargar(mesSeleccionado)
  }, [mesSeleccionado])

  async function cargar(mes: Date) {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
    if (!neg) return

    const inicio = startOfMonth(mes).toISOString()
    const fin    = endOfMonth(mes).toISOString()
    const inicioAnterior = startOfMonth(subMonths(mes, 1)).toISOString()
    const finAnterior    = endOfMonth(subMonths(mes, 1)).toISOString()

    const { data: reservas } = await supabase
      .from('reservas')
      .select('*, servicio:servicios(nombre, precio), barbero:barberos(nombre)')
      .eq('negocio_id', neg.id)
      .gte('fecha_hora', inicio)
      .lte('fecha_hora', fin)

    const { count: totalAnterior } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', neg.id)
      .gte('fecha_hora', inicioAnterior)
      .lte('fecha_hora', finAnterior)
      .neq('estado', 'cancelada')

    if (!reservas) { setCargando(false); return }

    const activas     = reservas.filter(r => r.estado !== 'cancelada')
    const completadas = reservas.filter(r => r.estado === 'completada').length
    const canceladas  = reservas.filter(r => r.estado === 'cancelada').length
    const noShow      = reservas.filter(r => r.estado === 'no_show').length

    // Servicio más pedido
    const servicioCount: Record<string, number> = {}
    activas.forEach(r => {
      const nombre = (r.servicio as any)?.nombre ?? 'Sin servicio'
      servicioCount[nombre] = (servicioCount[nombre] ?? 0) + 1
    })
    const servicioTop = Object.entries(servicioCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Barbero más reservado
    const barberoCount: Record<string, number> = {}
    activas.forEach(r => {
      const nombre = (r.barbero as any)?.nombre ?? 'Sin asignar'
      barberoCount[nombre] = (barberoCount[nombre] ?? 0) + 1
    })
    const barberoTop = Object.entries(barberoCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Hora pico
    const horaCount: Record<string, number> = {}
    activas.forEach(r => {
      const hora = new Date(r.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
      horaCount[hora] = (horaCount[hora] ?? 0) + 1
    })
    const horaPico = Object.entries(horaCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Ingreso estimado
    const ingresoEstimado = activas.reduce((sum, r) => {
      return sum + ((r.servicio as any)?.precio ?? 0)
    }, 0)

    setStats({
      totalMes: activas.length,
      totalMesAnterior: totalAnterior ?? 0,
      completadas,
      canceladas,
      noShow,
      servicioTop,
      barberoTop,
      horaPico,
      ingresoEstimado,
    })
    setCargando(false)
  }

  const mesLabel = format(mesSeleccionado, "MMMM yyyy", { locale: es })
  const crecimiento = stats && stats.totalMesAnterior > 0
    ? Math.round(((stats.totalMes - stats.totalMesAnterior) / stats.totalMesAnterior) * 100)
    : null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMesSeleccionado(m => subMonths(m, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm">
            ←
          </button>
          <button onClick={() => setMesSeleccionado(new Date())}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Este mes
          </button>
          <button onClick={() => setMesSeleccionado(m => {
            const next = new Date(m)
            next.setMonth(next.getMonth() + 1)
            return next > new Date() ? m : next
          })}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm">
            →
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando reportes...</div>
      ) : !stats || stats.totalMes === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">No hay reservas en este período</p>
        </div>
      ) : (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Total reservas</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalMes}</p>
              {crecimiento !== null && (
                <p className={`text-xs mt-1 font-medium ${crecimiento >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {crecimiento >= 0 ? '↑' : '↓'} {Math.abs(crecimiento)}% vs mes anterior
                </p>
              )}
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Completadas</p>
              <p className="text-3xl font-bold text-green-600">{stats.completadas}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.totalMes > 0 ? Math.round((stats.completadas / stats.totalMes) * 100) : 0}% del total
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Canceladas</p>
              <p className="text-3xl font-bold text-red-500">{stats.canceladas}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.totalMes + stats.canceladas > 0 ? Math.round((stats.canceladas / (stats.totalMes + stats.canceladas)) * 100) : 0}% tasa cancelación
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">No asistió</p>
              <p className="text-3xl font-bold text-amber-500">{stats.noShow}</p>
              <p className="text-xs text-gray-400 mt-1">clientes no show</p>
            </div>
          </div>

          {/* Ingreso estimado */}
          <div className="card mb-6 bg-brand-50 border-brand-200">
            <p className="text-sm text-brand-700 mb-1">Ingreso estimado del mes</p>
            <p className="text-3xl font-bold text-brand-800">
              ${stats.ingresoEstimado.toFixed(2)}
            </p>
            <p className="text-xs text-brand-600 mt-1">
              Basado en los precios referenciales de tus servicios. El pago real es en el local.
            </p>
          </div>

          {/* Insights */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Insights del mes</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Servicio más pedido</span>
                <span className="text-sm font-medium text-gray-900">{stats.servicioTop}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Barbero más reservado</span>
                <span className="text-sm font-medium text-gray-900">{stats.barberoTop}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Hora con más reservas</span>
                <span className="text-sm font-medium text-gray-900">{stats.horaPico}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
