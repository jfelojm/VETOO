'use client'

import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DIAS_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] // lunes primero

type Props = {
  mesVisible: Date
  onCambiarMes: (nuevoInicioMes: Date) => void
  diaSeleccionado: Date
  onSeleccionarDia: (dia: Date) => void
  /** Si el negocio abre ese día (horario JSON) */
  diaEsLaborable: (dia: Date) => boolean
  /** Límite superior (ej. hoy + max_dias_adelanto) */
  fechaMax?: Date
  /** Panel staff: permitir elegir días pasados para ver historial */
  permitirPasado?: boolean
  /** Número de citas ese día (p. ej. puntos en el calendario del barbero) */
  citasEnDia?: (d: Date) => number
}

export default function CalendarioMes({
  mesVisible,
  onCambiarMes,
  diaSeleccionado,
  onSeleccionarDia,
  diaEsLaborable,
  fechaMax,
  permitirPasado = false,
  citasEnDia,
}: Props) {
  const inicioMes = startOfMonth(mesVisible)
  const finMes = endOfMonth(mesVisible)
  const inicioGrid = startOfWeek(inicioMes, { weekStartsOn: 1 })
  const finGrid = endOfWeek(finMes, { weekStartsOn: 1 })
  const dias = eachDayOfInterval({ start: inicioGrid, end: finGrid })

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  function puedeElegir(d: Date): boolean {
    const t = new Date(d)
    t.setHours(0, 0, 0, 0)
    if (!permitirPasado && t < hoy) return false
    if (fechaMax) {
      const max = new Date(fechaMax)
      max.setHours(23, 59, 59, 999)
      if (t > max) return false
    }
    return diaEsLaborable(d)
  }

  return (
    <div className="rounded-2xl border border-border bg-chalk p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCambiarMes(subMonths(inicioMes, 1))}
          className="rounded-lg border border-border p-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-heading text-sm font-semibold capitalize text-ink">
          {format(inicioMes, 'MMMM yyyy', { locale: es })}
        </p>
        <button
          type="button"
          onClick={() => onCambiarMes(addMonths(inicioMes, 1))}
          className="rounded-lg border border-border p-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-ink-muted">
        {DIAS_CORTO.map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map(d => {
          const enMes = isSameMonth(d, inicioMes)
          const seleccionado = isSameDay(d, diaSeleccionado)
          const ok = puedeElegir(d)
          const today = isToday(d)

          if (!enMes) {
            return (
              <div
                key={d.toISOString()}
                className="flex aspect-square max-h-10 items-center justify-center text-xs text-ink-muted/25"
              >
                {format(d, 'd')}
              </div>
            )
          }

          const nCitas = citasEnDia?.(d) ?? 0

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!ok}
              onClick={() => ok && onSeleccionarDia(d)}
              className={cn(
                'relative aspect-square max-h-10 rounded-lg text-sm font-medium transition-colors',
                !ok && 'cursor-not-allowed bg-surface/80 text-ink-muted/35',
                ok && !seleccionado && 'border border-transparent text-ink hover:bg-brand-light',
                ok && seleccionado && 'border border-brand-primary bg-brand-primary text-white shadow-sm',
                today && !(ok && seleccionado) && ok && 'ring-1 ring-brand-primary/35'
              )}
            >
              {format(d, 'd')}
              {nCitas > 0 && (
                <span
                  className={cn(
                    'absolute bottom-0.5 left-1/2 -translate-x-1/2 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold leading-[14px] text-center',
                    ok && seleccionado ? 'bg-white/25 text-white' : 'bg-brand-primary text-white'
                  )}
                >
                  {nCitas > 9 ? '9+' : nCitas}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
