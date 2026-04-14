'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  format,
  addDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addMinutes,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { z } from 'zod'
import Link from 'next/link'
import {
  LogOut,
  Phone,
  Mail,
  X,
  CheckCircle,
  Calendar,
  Lock,
  UserPlus,
  ChevronLeft,
  Trash2,
  User,
  Scissors,
} from 'lucide-react'
import TurnAppLogo, { TurnAppSymbol } from '@/components/brand/TurnAppLogo'
import type { SlotDisponible, Servicio } from '@/types'
import CalendarioMes from '@/components/calendario/CalendarioMes'
import GrillaHorarios from '@/components/calendario/GrillaHorarios'
import { formatPrecio, nombreClienteReservaRow } from '@/lib/utils'

interface Reserva {
  id: string
  cliente_id: string
  fecha_hora: string
  duracion: number
  estado: string
  notas_cliente: string | null
  cliente_nombre_snapshot?: string | null
  servicio: { nombre: string } | null
  cliente: { nombre: string; telefono: string | null; email: string | null } | null
}

type NegocioHorario = {
  id: string
  nombre: string
  horario: Record<string, { abierto?: boolean }>
  duracion_turno_min: number
  max_dias_adelanto: number
  cancelacion_mensaje: string | null
}

type Panel = null | 'bloquear' | 'nueva-reserva'

const DIAS_KEY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

export default function BarberoDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [barbero, setBarbero] = useState<{
    id: string
    nombre: string
    negocio_id: string
    negocio: NegocioHorario | null
  } | null>(null)
  const [mesVisible, setMesVisible] = useState(() => startOfMonth(new Date()))
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => startOfDay(new Date()))
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [conteosMes, setConteosMes] = useState<Record<string, number>>({})
  const [bloqueosDia, setBloqueosDia] = useState<
    { id: string; fecha_desde: string; fecha_hasta: string; motivo: string | null }[]
  >([])
  const [cargando, setCargando] = useState(true)

  const [panel, setPanel] = useState<Panel>(null)
  const [slotsBloqueo, setSlotsBloqueo] = useState<SlotDisponible[]>([])
  const [cargandoSlotsBloqueo, setCargandoSlotsBloqueo] = useState(false)
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState<string | null>(null)
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState<string | null>(null)
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [nuevaPaso, setNuevaPaso] = useState<'servicio' | 'hora' | 'datos'>('servicio')
  const [servicioId, setServicioId] = useState<string>('')
  const [slotsReserva, setSlotsReserva] = useState<SlotDisponible[]>([])
  const [cargandoSlotsReserva, setCargandoSlotsReserva] = useState(false)
  const [horaReserva, setHoraReserva] = useState<string | null>(null)
  const [nrNombre, setNrNombre] = useState('')
  const [nrTelefono, setNrTelefono] = useState('')
  const [nrEmail, setNrEmail] = useState('')
  const [nrNotas, setNrNotas] = useState('')
  const [nrPolitica, setNrPolitica] = useState(false)
  const [nrCargando, setNrCargando] = useState(false)

  const diaEsLaborable = useCallback(
    (d: Date) => {
      const h = barbero?.negocio?.horario
      if (!h) return false
      const key = DIAS_KEY[d.getDay()]
      return !!(h as any)[key]?.abierto
    },
    [barbero?.negocio?.horario]
  )

  const fechaMax = barbero?.negocio
    ? addDays(startOfDay(new Date()), barbero.negocio.max_dias_adelanto)
    : undefined

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }

      const barberoId = user.user_metadata?.barbero_id as string | undefined
      if (!barberoId) {
        router.replace('/auth/login')
        return
      }

      const { data: b } = await supabase
        .from('barberos')
        .select(
          `id, nombre, negocio_id,
          negocio:negocios(id, nombre, horario, duracion_turno_min, max_dias_adelanto, cancelacion_mensaje)`
        )
        .eq('id', barberoId)
        .single()

      if (!b) {
        router.replace('/auth/login')
        return
      }

      const rawNeg = b.negocio
      const n = (Array.isArray(rawNeg) ? rawNeg[0] : rawNeg) as NegocioHorario | null | undefined
      setBarbero({
        id: b.id,
        nombre: b.nombre,
        negocio_id: b.negocio_id,
        negocio: n ?? null,
      })

      const { data: servs } = await supabase
        .from('servicios')
        .select('*')
        .eq('negocio_id', b.negocio_id)
        .eq('activo', true)
        .order('orden')

      setServicios((servs as Servicio[]) ?? [])
      setCargando(false)
    }
    void cargar()
  }, [router, supabase])

  const cargarReservasRango = useCallback(
    async (barberoId: string, desde: Date, hasta: Date) => {
      const { data } = await supabase
        .from('reservas')
        .select('*, servicio:servicios(nombre), cliente:clientes(nombre, telefono, email)')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', startOfDay(desde).toISOString())
        .lte('fecha_hora', endOfDay(hasta).toISOString())
        .neq('estado', 'cancelada')
        .order('fecha_hora', { ascending: true })
      setReservas((data as Reserva[]) ?? [])
    },
    [supabase]
  )

  const cargarConteosMes = useCallback(
    async (barberoId: string, mes: Date) => {
      const ini = startOfMonth(mes)
      const fin = endOfMonth(mes)
      const { data } = await supabase
        .from('reservas')
        .select('fecha_hora')
        .eq('barbero_id', barberoId)
        .gte('fecha_hora', startOfDay(ini).toISOString())
        .lte('fecha_hora', endOfDay(fin).toISOString())
        .neq('estado', 'cancelada')
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        const d = new Date(row.fecha_hora as string)
        const key = format(d, 'yyyy-MM-dd')
        map[key] = (map[key] ?? 0) + 1
      }
      setConteosMes(map)
    },
    [supabase]
  )

  const refrescarVistaAgenda = useCallback(async () => {
    if (!barbero) return
    await cargarReservasRango(barbero.id, diaSeleccionado, diaSeleccionado)
    void cargarConteosMes(barbero.id, mesVisible)
  }, [barbero, diaSeleccionado, mesVisible, cargarReservasRango, cargarConteosMes])

  const cargarBloqueosDia = useCallback(
    async (barberoId: string, negocioId: string, dia: Date) => {
      const { data } = await supabase
        .from('bloqueos')
        .select('id, fecha_desde, fecha_hasta, motivo')
        .eq('barbero_id', barberoId)
        .eq('negocio_id', negocioId)
        .gte('fecha_hasta', startOfDay(dia).toISOString())
        .lte('fecha_desde', endOfDay(dia).toISOString())
      setBloqueosDia(data ?? [])
    },
    [supabase]
  )

  useEffect(() => {
    void refrescarVistaAgenda()
  }, [refrescarVistaAgenda])

  useEffect(() => {
    if (!barbero) return
    void cargarBloqueosDia(barbero.id, barbero.negocio_id, diaSeleccionado)
  }, [barbero, diaSeleccionado, cargarBloqueosDia])

  useEffect(() => {
    if (!barbero) return
    void cargarConteosMes(barbero.id, mesVisible)
  }, [barbero, mesVisible, cargarConteosMes])

  async function fetchSlotsDetalle(negocioId: string, dia: Date, barberoId: string) {
    const anio = dia.getFullYear()
    const mes = String(dia.getMonth() + 1).padStart(2, '0')
    const d = String(dia.getDate()).padStart(2, '0')
    const fechaIso = `${anio}-${mes}-${d}`
    const params = new URLSearchParams({
      negocio_id: negocioId,
      fecha_iso: fechaIso,
      barbero_id: barberoId,
      detalle: '1',
    })
    const res = await fetch(`/api/reservas/slots?${params}`)
    const json = await res.json()
    return (json.slots ?? []) as SlotDisponible[]
  }

  useEffect(() => {
    if (panel !== 'bloquear' || !barbero?.negocio) return
    let cancel = false
    setCargandoSlotsBloqueo(true)
    setBloqueoHoraInicio(null)
    setBloqueoHoraFin(null)
    void (async () => {
      const slots = await fetchSlotsDetalle(barbero.negocio!.id, diaSeleccionado, barbero.id)
      if (!cancel) {
        setSlotsBloqueo(slots)
        setCargandoSlotsBloqueo(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [panel, barbero, diaSeleccionado])

  useEffect(() => {
    if (
      panel !== 'nueva-reserva' ||
      nuevaPaso !== 'hora' ||
      !barbero?.negocio ||
      !servicioId
    )
      return
    let cancel = false
    setCargandoSlotsReserva(true)
    setHoraReserva(null)
    void (async () => {
      const slots = await fetchSlotsDetalle(barbero.negocio!.id, diaSeleccionado, barbero.id)
      if (!cancel) {
        const ahora = new Date()
        const esHoy = diaSeleccionado.toDateString() === ahora.toDateString()
        if (esHoy) {
          const ajustados = slots.map(s => {
            const [h, m] = s.hora.split(':').map(Number)
            const slotTime = new Date(diaSeleccionado)
            slotTime.setHours(h, m, 0, 0)
            return {
              ...s,
              disponible: s.disponible && slotTime > ahora,
            }
          })
          setSlotsReserva(ajustados)
        } else {
          setSlotsReserva(slots)
        }
        setCargandoSlotsReserva(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [panel, nuevaPaso, barbero, diaSeleccionado, servicioId])

  const rangoTitulo = format(diaSeleccionado, "EEEE d 'de' MMMM yyyy", { locale: es })
  const diaReservaEtiqueta = rangoTitulo

  async function crearBloqueo() {
    if (!barbero?.negocio || !bloqueoHoraInicio || !bloqueoHoraFin) {
      toast.error('Elige hora de inicio y fin del bloqueo')
      return
    }
    const dur = barbero.negocio.duracion_turno_min
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
      negocio_id: barbero.negocio_id,
      barbero_id: barbero.id,
      fecha_desde: fecha_desde.toISOString(),
      fecha_hasta: fecha_hasta.toISOString(),
      motivo: bloqueoMotivo.trim() || 'No disponible',
    })
    if (error) {
      toast.error('Error al crear bloqueo')
      return
    }
    toast.success('Horario bloqueado')
    setPanel(null)
    setBloqueoMotivo('')
    void cargarBloqueosDia(barbero.id, barbero.negocio_id, diaSeleccionado)
    const slots = await fetchSlotsDetalle(barbero.negocio.id, diaSeleccionado, barbero.id)
    setSlotsBloqueo(slots)
    setBloqueoHoraInicio(null)
    setBloqueoHoraFin(null)
  }

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

  async function crearReservaManual() {
    if (!barbero?.negocio || !horaReserva || !servicioId) return
    const telOk = nrTelefono.replace(/\D/g, '').length >= 7
    const emOk =
      nrEmail.trim().length > 0 && z.string().email().safeParse(nrEmail.trim()).success
    if (!nrNombre.trim() || (!telOk && !emOk)) {
      toast.error('Nombre y un contacto válido: teléfono (mín. 7 dígitos) o correo')
      return
    }
    if (!nrPolitica) {
      toast.error('Debes aceptar la política de reservas')
      return
    }
    const [h, m] = horaReserva.split(':').map(Number)
    const fechaHora = new Date(diaSeleccionado)
    fechaHora.setHours(h, m, 0, 0)
    setNrCargando(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch('/api/reservas', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        negocio_id: barbero.negocio_id,
        barbero_id: barbero.id,
        servicio_id: servicioId,
        nombre: nrNombre.trim(),
        telefono: nrTelefono.trim() || '',
        email: nrEmail.trim() || null,
        fecha_hora: fechaHora.toISOString(),
        notas_cliente: nrNotas.trim() || null,
        politica_aceptada: true,
      }),
    })
    setNrCargando(false)
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'Error al crear reserva')
      return
    }
    toast.success('Reserva creada')
    setPanel(null)
    setNuevaPaso('servicio')
    setServicioId('')
    setHoraReserva(null)
    setNrNombre('')
    setNrTelefono('')
    setNrEmail('')
    setNrNotas('')
    setNrPolitica(false)
    void refrescarVistaAgenda()
    void fetchSlotsDetalle(barbero.negocio.id, diaSeleccionado, barbero.id).then(setSlotsBloqueo)
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
    if (barbero && panel === 'bloquear' && barbero.negocio) {
      const slots = await fetchSlotsDetalle(barbero.negocio.id, diaSeleccionado, barbero.id)
      setSlotsBloqueo(slots)
    }
  }

  async function cambiarEstado(reservaId: string, estado: string) {
    const { error } = await supabase.from('reservas').update({ estado }).eq('id', reservaId)
    if (error) {
      toast.error('Error al actualizar')
      return
    }
    toast.success('Estado actualizado')
    void refrescarVistaAgenda()
  }

  if (cargando || !barbero?.negocio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <TurnAppSymbol size={36} color="#0D9B6A" className="animate-pulse" aria-hidden />
      </div>
    )
  }

  const neg = barbero.negocio

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TurnAppLogo variant="light" size="sm" href="/barbero/dashboard" />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{neg.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700">{barbero.nombre}</p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              router.replace('/auth/login')
            }}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <CalendarioMes
          mesVisible={mesVisible}
          onCambiarMes={setMesVisible}
          diaSeleccionado={diaSeleccionado}
          onSeleccionarDia={d => {
            setDiaSeleccionado(startOfDay(d))
            setPanel(null)
          }}
          diaEsLaborable={diaEsLaborable}
          fechaMax={fechaMax}
          permitirPasado
          citasEnDia={d => conteosMes[format(d, 'yyyy-MM-dd')] ?? 0}
        />

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-2 mb-1">
            <Calendar className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900 capitalize">{rangoTitulo}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {reservas.length} reserva{reservas.length !== 1 ? 's' : ''}
                {bloqueosDia.length > 0 &&
                  ` · ${bloqueosDia.length} bloqueo${bloqueosDia.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {bloqueosDia.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {bloqueosDia.map(b => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg pl-2 pr-1 py-1"
                >
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>
                    {format(new Date(b.fecha_desde), 'HH:mm')} –{' '}
                    {format(new Date(b.fecha_hasta), 'HH:mm')}
                    {b.motivo ? ` · ${b.motivo}` : ''}
                  </span>
                  <button
                    type="button"
                    title="Quitar bloqueo"
                    onClick={() => void eliminarBloqueo(b.id)}
                    className="p-1 rounded-md hover:bg-amber-200/80 text-amber-900/80 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setPanel(panel === 'bloquear' ? null : 'bloquear')
                setNuevaPaso('servicio')
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                panel === 'bloquear'
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-dashed border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              Bloquear horario
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel(panel === 'nueva-reserva' ? null : 'nueva-reserva')
                setNuevaPaso('servicio')
                setServicioId('')
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                panel === 'nueva-reserva'
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-dashed border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Nueva reserva
            </button>
          </div>
        </div>

        {panel === 'bloquear' && (
          <div className="card space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-600" /> Bloquear horario
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Toca la primera hora libre y luego la última hora del rango a bloquear (igual que elegir
                turno en reservas).
              </p>
            </div>
            <GrillaHorarios
              slots={slotsBloqueo}
              cargando={cargandoSlotsBloqueo}
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
                placeholder="Ej.: Descanso, cita médica…"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={crearBloqueo} className="btn-primary flex-1">
                Guardar bloqueo
              </button>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="btn-secondary flex-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {panel === 'nueva-reserva' && (
          <div className="card space-y-4">
            {nuevaPaso === 'servicio' && (
              <>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-brand-600" /> Nueva reserva
                </h3>
                <p className="text-xs text-gray-500 capitalize">Día: {diaReservaEtiqueta}</p>
                <p className="text-xs text-gray-500 mb-3">
                  La reserva queda en <span className="font-medium text-gray-700">tu agenda</span>.
                </p>
                <p className="text-sm text-gray-600 mb-2">Elige el servicio</p>
                {servicios.length === 0 && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-3">
                    No hay servicios activos. El dueño debe configurarlos en el panel.
                  </p>
                )}
                {servicios.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {servicios.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setServicioId(s.id)
                          setNuevaPaso('hora')
                        }}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-brand-400 bg-white transition-colors"
                      >
                        <p className="font-medium text-gray-900">{s.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {s.duracion} min · {formatPrecio(s.precio)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setPanel(null)} className="btn-secondary w-full">
                  Cancelar
                </button>
              </>
            )}

            {nuevaPaso === 'hora' && (
              <>
                <button
                  type="button"
                  onClick={() => setNuevaPaso('servicio')}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" /> Elegir otro servicio
                </button>
                <h3 className="font-semibold text-gray-900">Elige la hora</h3>
                <p className="text-xs text-gray-500 capitalize mb-2">{diaReservaEtiqueta}</p>
                <GrillaHorarios
                  slots={slotsReserva}
                  cargando={cargandoSlotsReserva}
                  mostrarMotivoBloqueo
                  horaSeleccionada={horaReserva}
                  onElegirHoraReserva={h => {
                    setHoraReserva(h)
                    setNuevaPaso('datos')
                  }}
                />
              </>
            )}

            {nuevaPaso === 'datos' && (
              <>
                <button
                  type="button"
                  onClick={() => setNuevaPaso('hora')}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" /> Cambiar hora
                </button>
                <h3 className="font-semibold text-gray-900">Datos del cliente</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      className="input"
                      value={nrNombre}
                      onChange={e => setNrNombre(e.target.value)}
                      placeholder="Cliente"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Al menos uno: teléfono (mín. 7 dígitos) o correo válido.
                  </p>
                  <div>
                    <label className="label">Teléfono / WhatsApp</label>
                    <input
                      className="input"
                      value={nrTelefono}
                      onChange={e => setNrTelefono(e.target.value)}
                      type="tel"
                    />
                  </div>
                  <div>
                    <label className="label">Correo electrónico</label>
                    <input
                      className="input"
                      value={nrEmail}
                      onChange={e => setNrEmail(e.target.value)}
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="label">Notas</label>
                    <textarea
                      className="input resize-none h-16"
                      value={nrNotas}
                      onChange={e => setNrNotas(e.target.value)}
                    />
                  </div>
                  {neg.cancelacion_mensaje && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                      {neg.cancelacion_mensaje}
                    </div>
                  )}
                  <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nrPolitica}
                      onChange={e => setNrPolitica(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-brand-600"
                    />
                    Acepto la política de reservas
                  </label>
                </div>
                <button
                  type="button"
                  disabled={nrCargando}
                  onClick={() => void crearReservaManual()}
                  className="btn-primary w-full"
                >
                  {nrCargando ? 'Guardando…' : 'Confirmar reserva'}
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Reservas del día</h3>
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
                        {new Date(r.fecha_hora).toLocaleTimeString('es-EC', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </p>
                      <p className="text-xs text-gray-400">{r.duracion} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{nombreClienteReservaRow(r)}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                        {r.cliente?.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" /> {r.cliente.telefono}
                          </span>
                        )}
                        {r.cliente?.email && (
                          <span className="flex items-center gap-1 min-w-0">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{r.cliente.email}</span>
                          </span>
                        )}
                        {r.servicio && (
                          <span className="flex items-center gap-1">
                            <Scissors className="w-3 h-3" /> {r.servicio.nombre}
                          </span>
                        )}
                      </div>
                      {r.notas_cliente && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          &quot;{r.notas_cliente}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      <Link
                        href={`/barbero/clientes/${r.cliente_id}`}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 mb-1"
                      >
                        <User className="w-3 h-3" /> Ficha
                      </Link>
                      {r.estado === 'confirmada' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void cambiarEstado(r.id, 'completada')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg"
                          >
                            <CheckCircle className="w-3 h-3" /> Listo
                          </button>
                          <button
                            type="button"
                            onClick={() => void cambiarEstado(r.id, 'no_show')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg"
                          >
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
    </div>
  )
}
