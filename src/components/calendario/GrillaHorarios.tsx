'use client'

import type { SlotDisponible } from '@/types'
import { cn } from '@/lib/utils'

type Props = {
  slots: SlotDisponible[]
  cargando?: boolean
  mostrarMotivoBloqueo?: boolean
  /** Reserva: un solo slot */
  horaSeleccionada?: string | null
  onElegirHoraReserva?: (hora: string) => void
  /** Bloqueo: dos toques (inicio y fin del último slot incluido) */
  bloqueoHoraInicio?: string | null
  bloqueoHoraFin?: string | null
  onElegirHoraBloqueo?: (hora: string) => void
}

export default function GrillaHorarios({
  slots,
  cargando,
  mostrarMotivoBloqueo,
  horaSeleccionada,
  onElegirHoraReserva,
  bloqueoHoraInicio,
  bloqueoHoraFin,
  onElegirHoraBloqueo,
}: Props) {
  if (cargando) {
    return <div className="text-center py-8 text-gray-400 text-sm">Cargando horarios…</div>
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay horarios configurados para este día.
      </div>
    )
  }

  const modoBloqueo = !!onElegirHoraBloqueo

  return (
    <div className="space-y-3">
      {mostrarMotivoBloqueo && (
        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-white border border-gray-200" /> Libre
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Bloqueado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Ocupado
          </span>
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map(s => {
          const idx = (h: string) => slots.findIndex(x => x.hora === h)
          const i0 = bloqueoHoraInicio != null ? idx(bloqueoHoraInicio) : -1
          const i1 = bloqueoHoraFin != null ? idx(bloqueoHoraFin) : -1
          const i = idx(s.hora)
          const enRangoBloqueo =
            modoBloqueo && i0 >= 0 && i1 >= 0 && i >= Math.min(i0, i1) && i <= Math.max(i0, i1)

          const esReservaSel = horaSeleccionada === s.hora
          const esBloqueInicio = bloqueoHoraInicio === s.hora
          const esBloqueFin = bloqueoHoraFin === s.hora

          let cls =
            'py-2.5 rounded-xl text-sm font-medium transition-all border '

          if (!s.disponible) {
            if (mostrarMotivoBloqueo && s.motivo === 'bloqueo') {
              cls += 'bg-amber-50 text-amber-800 border-amber-200 cursor-not-allowed '
            } else {
              cls += 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed '
            }
          } else if (modoBloqueo) {
            cls +=
              enRangoBloqueo && bloqueoHoraInicio && bloqueoHoraFin
                ? 'bg-brand-100 text-brand-800 border-brand-300 '
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400 '
            if (esBloqueInicio || esBloqueFin) cls += 'ring-2 ring-brand-500 ring-offset-1 '
          } else {
            cls += esReservaSel
              ? 'bg-brand-600 text-white border-brand-600 '
              : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400 hover:text-brand-600 '
          }

          return (
            <button
              key={s.hora}
              type="button"
              disabled={modoBloqueo ? !s.disponible : !s.disponible}
              onClick={() => {
                if (!s.disponible) return
                if (modoBloqueo) onElegirHoraBloqueo?.(s.hora)
                else onElegirHoraReserva?.(s.hora)
              }}
              className={cls}
            >
              {s.hora}
            </button>
          )
        })}
      </div>
    </div>
  )
}
