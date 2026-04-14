'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  format,
  addDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  addMinutes,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Lock, Users, Trash2 } from 'lucide-react'
import type { SlotDisponible } from '@/types'
import CalendarioMes from '@/components/calendario/CalendarioMes'
import GrillaHorarios from '@/components/calendario/GrillaHorarios'
import RequierePlanOperativo from '@/components/dashboard/RequierePlanOperativo'

type NegocioHorario = {
  id: string
  horario: Record<string, { abierto?: boolean }>
  duracion_turno_min: number
  max_dias_adelanto: number
}

type BarberoOpt = { id: string; nombre: string }

const DIAS_KEY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

export default function BloqueosDashboardPage() {
  const supabase = createClient()
  const [negocio, setNegocio] = useState<NegocioHorario | null>(null)
  const [barberos, setBarberos] = useState<BarberoOpt[]>([])
  const [barberoId, setBarberoId] = useState<string>('')
  const [mesVisible, setMesVisible] = useState(() => startOfMonth(new Date()))
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => startOfDay(new Date()))
  const [bloqueosDia, setBloqueosDia] = useState<
    { id: string; fecha_desde: string; fecha_hasta: string; motivo: string | null; barbero_id: string | null }[]
  >([])

  const [mostrarPanelBloqueo, setMostrarPanelBloqueo] = useState(false)
  const [slotsBloqueo, setSlotsBloqueo] = useState<SlotDisponible[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState<string | null>(null)
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState<string | null>(null)
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')
  const [cargando, setCargando] = useState(true)

  const diaEsLaborable = useCallback(
    (d: Date) => {
      const h = negocio?.horario
      if (!h) return false
      const key = DIAS_KEY[d.getDay()]
      return !!(h as any)[key]?.abierto
    },
    [negocio?.horario]
  )

  const fechaMax = negocio
    ? addDays(startOfDay(new Date()), negocio.max_dias_adelanto)
    : undefined

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase
        .from('negocios')
        .select('id, horario, duracion_turno_min, max_dias_adelanto')
        .eq('owner_id', user.id)
        .single()
      if (!neg) return
      setNegocio(neg as NegocioHorario)
      const { data: staff } = await supabase
        .from('barberos')
        .select('id, nombre')
        .eq('negocio_id', neg.id)
        .eq('activo', true)
        .order('orden')
      setBarberos((staff as BarberoOpt[]) ?? [])
      if (staff?.[0]) setBarberoId((staff[0] as BarberoOpt).id)
      setCargando(false)
    }
    void cargar()
  }, [supabase])

  const cargarBloqueosDia = useCallback(
    async (negocioId: string, dia: Date, bId: string) => {
      const { data } = await supabase
        .from('bloqueos')
        .select('id, fecha_desde, fecha_hasta, motivo, barbero_id')
        .eq('negocio_id', negocioId)
        .eq('barbero_id', bId)
        .gte('fecha_hasta', startOfDay(dia).toISOString())
        .lte('fecha_desde', endOfDay(dia).toISOString())
      setBloqueosDia(data ?? [])
    },
    [supabase]
  )

  useEffect(() => {
    if (!negocio || !barberoId) return
    void cargarBloqueosDia(negocio.id, diaSeleccionado, barberoId)
  }, [negocio, barberoId, diaSeleccionado, cargarBloqueosDia])

  async function fetchSlots(negocioId: string, dia: Date, bId: string) {
    const anio = dia.getFullYear()
    const mes = String(dia.getMonth() + 1).padStart(2, '0')
    const d = String(dia.getDate()).padStart(2, '0')
    const fechaIso = `${anio}-${mes}-${d}`
    const params = new URLSearchParams({
      negocio_id: negocioId,
      fecha_iso: fechaIso,
      barbero_id: bId,
      detalle: '1',
    })
    const res = await fetch(`/api/reservas/slots?${params}`)
    const json = await res.json()
    return (json.slots ?? []) as SlotDisponible[]
  }

  useEffect(() => {
    if (!mostrarPanelBloqueo || !negocio || !barberoId) return
    let cancel = false
    setCargandoSlots(true)
    setBloqueoHoraInicio(null)
    setBloqueoHoraFin(null)
    void (async () => {
      const slots = await fetchSlots(negocio.id, diaSeleccionado, barberoId)
      if (!cancel) {
        setSlotsBloqueo(slots)
        setCargandoSlots(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [mostrarPanelBloqueo, negocio, barberoId, diaSeleccionado])

  function onElegirHoraBloqueo(hora: string) {
    const i = slotsBloqueo.findIndex(x => x.hora === hora)
    if (bloqueoHoraInicio == null) {
      setBloqueoHoraInicio(hora)
      setBloqueoHoraFin(null)
      return
    }
    const i0 = slotsBloqueo.findIndex(x => x.hora === bloqueoHoraInicio)
    if (i < i0) {
      setBloqueoHoraInicio(hora)
      setBloqueoHoraFin(null)
      return
    }
    setBloqueoHoraFin(hora)
  }

  async function eliminarBloqueo(bloqueoId: string) {
    if (
      !confirm(
        '¿Quitar este bloqueo? Esas horas volverán a estar disponibles para reservas.'
      )
    ) {
      return
    }
    const { error } = await supabase.from('bloqueos').delete().eq('id', bloqueoId)
    if (error) {
      toast.error('No se pudo quitar el bloqueo')
      return
    }
    toast.success('Bloqueo eliminado')
    setBloqueosDia(prev => prev.filter(b => b.id !== bloqueoId))
    if (mostrarPanelBloqueo && negocio && barberoId) {
      const slots = await fetchSlots(negocio.id, diaSeleccionado, barberoId)
      setSlotsBloqueo(slots)
    }
  }

  async function crearBloqueo() {
    if (!negocio || !barberoId || !bloqueoHoraInicio || !bloqueoHoraFin) {
      toast.error('Elige hora de inicio y fin del bloqueo')
      return
    }
    const dur = negocio.duracion_turno_min
    const i0 = slotsBloqueo.findIndex(s => s.hora === bloqueoHoraInicio)
    const i1 = slotsBloqueo.findIndex(s => s.hora === bloqueoHoraFin)
    if (i0 < 0 || i1 < 0) return
    const desdeIdx = Math.min(i0, i1)
    const hastaIdx = Math.max(i0, i1)
    const horaIni = slotsBloqueo[desdeIdx].hora
    const horaFinSlot = slotsBloqueo[hastaIdx].hora
    const [h0, m0] = horaIni.split(':').map(Number)
    const [h1, m1] = horaFinSlot.split(':').map(Number)
    const fecha_desde = new Date(diaSeleccionado)
    fecha_desde.setHours(h0, m0, 0, 0)
    const inicioFinSlot = new Date(diaSeleccionado)
    inicioFinSlot.setHours(h1, m1, 0, 0)
    const fecha_hasta = addMinutes(inicioFinSlot, dur)

    const { error } = await supabase.from('bloqueos').insert({
      negocio_id: negocio.id,
      barbero_id: barberoId,
      fecha_desde: fecha_desde.toISOString(),
      fecha_hasta: fecha_hasta.toISOString(),
      motivo: bloqueoMotivo.trim() || 'No disponible',
    })
    if (error) {
      toast.error('Error al crear bloqueo')
      return
    }
    toast.success('Bloqueo guardado')
    setMostrarPanelBloqueo(false)
    setBloqueoMotivo('')
    setBloqueoHoraInicio(null)
    setBloqueoHoraFin(null)
    void cargarBloqueosDia(negocio.id, diaSeleccionado, barberoId)
  }

  if (cargando) return <div className="text-gray-400 text-sm">Cargando…</div>
  if (!negocio) return null

  const barberoNombre = barberos.find(b => b.id === barberoId)?.nombre ?? 'Staff'
  const subtituloDia = format(diaSeleccionado, "EEEE d 'de' MMMM yyyy", { locale: es })

  return (
    <RequierePlanOperativo>
    <div className="max-w-3xl">
      <p className="text-gray-500 text-sm mb-6">
        Visualiza y configura horarios no disponibles por cada persona del staff (misma vista que en
        reservas).
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Profesional</span>
        </div>
        <select
          value={barberoId}
          onChange={e => {
            setBarberoId(e.target.value)
            setMostrarPanelBloqueo(false)
          }}
          className="input max-w-md"
        >
          {barberos.map(b => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </div>

      {barberos.length === 0 ? (
        <p className="text-sm text-gray-500">Agrega primero miembros del equipo en Staff.</p>
      ) : (
        <>
          <CalendarioMes
            mesVisible={mesVisible}
            onCambiarMes={setMesVisible}
            diaSeleccionado={diaSeleccionado}
            onSeleccionarDia={d => {
              setDiaSeleccionado(startOfDay(d))
              setMostrarPanelBloqueo(false)
            }}
            diaEsLaborable={diaEsLaborable}
            fechaMax={fechaMax}
          />

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 capitalize">{barberoNombre}</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{subtituloDia}</p>
            {bloqueosDia.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {bloqueosDia.map(b => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-100 rounded-lg pl-3 pr-2 py-2 text-amber-950"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span className="flex-1 min-w-0">
                      {format(new Date(b.fecha_desde), 'HH:mm')} –{' '}
                      {format(new Date(b.fecha_hasta), 'HH:mm')}
                      {b.motivo ? ` · ${b.motivo}` : ''}
                    </span>
                    <button
                      type="button"
                      title="Quitar bloqueo"
                      onClick={() => void eliminarBloqueo(b.id)}
                      className="p-1.5 rounded-lg hover:bg-amber-200/80 text-amber-950/70 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 mt-3">Sin bloqueos este día.</p>
            )}

            <button
              type="button"
              onClick={() => setMostrarPanelBloqueo(!mostrarPanelBloqueo)}
              className={`mt-4 w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                mostrarPanelBloqueo
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-gray-300 text-gray-700 hover:border-brand-400'
              }`}
            >
              {mostrarPanelBloqueo ? 'Ocultar editor' : 'Bloquear horario (calendario de turnos)'}
            </button>
          </div>

          {mostrarPanelBloqueo && (
            <div className="mt-6 card space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-600" />
                Nuevo bloqueo para {barberoNombre}
              </h3>
              <p className="text-xs text-gray-500">
                Elige dos horas libres: inicio y fin del rango (como al reservar).
              </p>
              <GrillaHorarios
                slots={slotsBloqueo}
                cargando={cargandoSlots}
                mostrarMotivoBloqueo
                bloqueoHoraInicio={bloqueoHoraInicio}
                bloqueoHoraFin={bloqueoHoraFin}
                onElegirHoraBloqueo={onElegirHoraBloqueo}
              />
              <div>
                <label className="label">Motivo (opcional)</label>
                <input
                  value={bloqueoMotivo}
                  onChange={e => setBloqueoMotivo(e.target.value)}
                  className="input"
                  placeholder="Ej.: Vacaciones, feriado…"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => void crearBloqueo()} className="btn-primary">
                  Guardar bloqueo
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarPanelBloqueo(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </RequierePlanOperativo>
  )
}
