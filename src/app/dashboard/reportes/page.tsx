'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, CheckCircle2, XCircle, UserX, DollarSign } from 'lucide-react'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import { cn } from '@/lib/utils'

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
  const { capacidades } = usePlanAcceso()
  const [stats, setStats] = useState<Stats | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date())

  useEffect(() => {
    if (!capacidades?.reportesAvanzados) {
      setCargando(false)
      setStats(null)
      return
    }
    void cargar(mesSeleccionado)
  }, [mesSeleccionado, capacidades?.reportesAvanzados])

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

    const servicioCount: Record<string, number> = {}
    activas.forEach(r => {
      const nombre = (r.servicio as any)?.nombre ?? 'Sin servicio'
      servicioCount[nombre] = (servicioCount[nombre] ?? 0) + 1
    })
    const servicioTop = Object.entries(servicioCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    const barberoCount: Record<string, number> = {}
    activas.forEach(r => {
      const nombre = (r.barbero as any)?.nombre ?? 'Sin asignar'
      barberoCount[nombre] = (barberoCount[nombre] ?? 0) + 1
    })
    const barberoTop = Object.entries(barberoCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    const horaCount: Record<string, number> = {}
    activas.forEach(r => {
      const hora = new Date(r.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
      horaCount[hora] = (horaCount[hora] ?? 0) + 1
    })
    const horaPico = Object.entries(horaCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

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

  const pctCompletadas = stats && stats.totalMes > 0
    ? Math.round((stats.completadas / stats.totalMes) * 100)
    : 0
  const pctCancelacion = stats && stats.totalMes + stats.canceladas > 0
    ? Math.round((stats.canceladas / (stats.totalMes + stats.canceladas)) * 100)
    : 0

  if (!capacidades?.reportesAvanzados) {
    return (
      <div className="max-w-lg">
        <p className="mb-6 text-sm text-ink-muted">
          Ingresos estimados, servicio y profesional más reservados, hora pico y comparativa mes a mes están
          incluidos en el plan Pro (y en tu periodo de prueba).
        </p>
        <div className="card space-y-4">
          <p className="text-sm text-ink-soft">
            Con el plan Básico sigues teniendo agenda, reservas y clientes; al subir de plan desbloqueas este
            panel sin perder datos.
          </p>
          <Link href="/#planes" className="btn-primary inline-block w-full text-center sm:w-auto">
            Ver planes y mejorar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm capitalize text-ink-muted">{mesLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMesSeleccionado(m => subMonths(m, 1))}
            className="rounded-full border border-border bg-chalk px-3 py-2 text-sm text-ink-soft transition-colors hover:border-border-hover hover:bg-surface"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMesSeleccionado(new Date())}
            className="rounded-full border border-border bg-chalk px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand-primary/40 hover:bg-brand-light"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => setMesSeleccionado(m => {
              const next = new Date(m)
              next.setMonth(next.getMonth() + 1)
              return next > new Date() ? m : next
            })}
            className="rounded-full border border-border bg-chalk px-3 py-2 text-sm text-ink-soft transition-colors hover:border-border-hover hover:bg-surface"
          >
            →
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="py-12 text-center text-sm text-ink-muted">Cargando reportes...</div>
      ) : !stats || stats.totalMes === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm text-ink-muted">No hay reservas en este período</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="flex flex-col rounded-[20px] border border-border bg-chalk p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight text-ink-muted">Total reservas</span>
                <Calendar className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} aria-hidden />
              </div>
              <p className="font-heading text-[32px] font-extrabold leading-none tracking-tight text-ink">
                {stats.totalMes}
              </p>
              {crecimiento !== null && (
                <span
                  className={cn(
                    'mt-2 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                    crecimiento >= 0
                      ? 'bg-success/12 text-success'
                      : 'bg-danger/12 text-danger'
                  )}
                >
                  {crecimiento >= 0 ? '↑' : '↓'} {Math.abs(crecimiento)}% vs mes anterior
                </span>
              )}
            </div>

            <div className="flex flex-col rounded-[20px] border border-border bg-chalk p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight text-ink-muted">Completadas</span>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} aria-hidden />
              </div>
              <p className="font-heading text-[32px] font-extrabold leading-none tracking-tight text-ink">
                {stats.completadas}
              </p>
              <span className="mt-2 inline-flex w-fit rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted">
                {pctCompletadas}% del total
              </span>
            </div>

            <div className="flex flex-col rounded-[20px] border border-border bg-chalk p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight text-ink-muted">Canceladas</span>
                <XCircle className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} aria-hidden />
              </div>
              <p className="font-heading text-[32px] font-extrabold leading-none tracking-tight text-ink">
                {stats.canceladas}
              </p>
              <span className="mt-2 inline-flex w-fit rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted">
                {pctCancelacion}% tasa cancelación
              </span>
            </div>

            <div className="flex flex-col rounded-[20px] border border-border bg-chalk p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight text-ink-muted">No asistió</span>
                <UserX className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} aria-hidden />
              </div>
              <p className="font-heading text-[32px] font-extrabold leading-none tracking-tight text-ink">
                {stats.noShow}
              </p>
              <span className="mt-2 inline-flex w-fit rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted">
                clientes no show
              </span>
            </div>
          </div>

          <div className="mb-6 rounded-[20px] border border-border bg-chalk p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-ink-muted">Ingreso estimado del mes</p>
                <p className="mt-1 font-heading text-[32px] font-extrabold tracking-tight text-ink">
                  ${stats.ingresoEstimado.toFixed(2)}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Basado en los precios referenciales de tus servicios. El pago real es en el local.
                </p>
              </div>
              <DollarSign className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} aria-hidden />
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-border">
            <h2 className="border-b border-border bg-chalk px-4 py-3 font-heading text-base font-semibold text-ink md:px-5">
              Insights del mes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-ink-muted md:px-5">
                      Indicador
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-ink-muted md:px-5">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-chalk transition-colors hover:bg-brand-light">
                    <td className="px-4 py-3 text-[12px] text-ink-muted md:px-5">Servicio más pedido</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink md:px-5">{stats.servicioTop}</td>
                  </tr>
                  <tr className="border-b border-border bg-chalk transition-colors hover:bg-brand-light">
                    <td className="px-4 py-3 text-[12px] text-ink-muted md:px-5">Barbero más reservado</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink md:px-5">{stats.barberoTop}</td>
                  </tr>
                  <tr className="bg-chalk transition-colors hover:bg-brand-light">
                    <td className="px-4 py-3 text-[12px] text-ink-muted md:px-5">Hora con más reservas</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink md:px-5">{stats.horaPico}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
