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
}

export default function CalendarioMes({
  mesVisible,
  onCambiarMes,
  diaSeleccionado,
  onSeleccionarDia,
  diaEsLaborable,
  fechaMax,
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
    if (t < hoy) return false
    if (fechaMax) {
      const max = new Date(fechaMax)
      max.setHours(23, 59, 59, 999)
      if (t > max) return false
    }
    return diaEsLaborable(d)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onCambiarMes(subMonths(inicioMes, 1))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-gray-900 capitalize">
          {format(inicioMes, 'MMMM yyyy', { locale: es })}
        </p>
        <button
          type="button"
          onClick={() => onCambiarMes(addMonths(inicioMes, 1))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-400 mb-2">
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
                className="aspect-square max-h-10 flex items-center justify-center text-xs text-gray-200"
              >
                {format(d, 'd')}
              </div>
            )
          }

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!ok}
              onClick={() => ok && onSeleccionarDia(d)}
              className={cn(
                'aspect-square max-h-10 rounded-lg text-sm font-medium transition-colors',
                !ok && 'text-gray-300 cursor-not-allowed bg-gray-50',
                ok && !seleccionado && 'text-gray-800 hover:bg-brand-50 border border-transparent',
                ok && seleccionado && 'bg-brand-600 text-white shadow-md border border-brand-600',
                today && !(ok && seleccionado) && ok && 'ring-1 ring-brand-300'
              )}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
