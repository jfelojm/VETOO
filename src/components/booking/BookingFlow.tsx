'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays, startOfDay, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import Image from 'next/image'
import { ChevronLeft, CheckCircle, Clock, Scissors, User, Calendar } from 'lucide-react'
import type { Negocio, Barbero, Servicio, SlotDisponible } from '@/types'
import { formatPrecio } from '@/lib/utils'
import CalendarioMes from '@/components/calendario/CalendarioMes'

type ServicioConFoto = Servicio & { photoSignedUrl?: string | null }

interface Props {
  negocio: Negocio & { horario: any }
  barberos: Barbero[]
  servicios: ServicioConFoto[]
}

function telDigitos(s: string) {
  return s.replace(/\D/g, '').length
}

const clienteSchema = z
  .object({
    nombre:   z.string().min(2, 'Ingresa tu nombre completo'),
    telefono: z.string().optional().default(''),
    email:    z.union([z.string().email('Email inválido'), z.literal('')]).optional().default(''),
    notas:    z.string().optional(),
    politica: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar la política' }) }),
  })
  .refine(d => telDigitos(d.telefono ?? '') >= 7 || (d.email ?? '').trim().length > 0, {
    message: 'Indica un teléfono válido (mín. 7 dígitos) o un correo electrónico',
    path:    ['telefono'],
  })
  .refine(d => {
    const em = (d.email ?? '').trim()
    if (!em) return true
    return z.string().email().safeParse(em).success
  }, { message: 'El correo no es válido', path: ['email'] })
type ClienteData = z.infer<typeof clienteSchema>

type Paso = 'servicio' | 'barbero' | 'fecha' | 'hora' | 'datos' | 'confirmado'

export default function BookingFlow({ negocio, barberos, servicios }: Props) {
  const [paso, setPaso] = useState<Paso>('servicio')
  const [servicioId, setServicioId] = useState<string>('')
  const [barberoId, setBarberoId] = useState<string>('')
  const [fecha, setFecha] = useState<Date | null>(null)
  const [hora, setHora] = useState<string>('')
  const [slots, setSlots] = useState<SlotDisponible[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [mesCalendarioReserva, setMesCalendarioReserva] = useState(() => startOfMonth(new Date()))
  /** Nombre del barbero guardado en servidor (incluye asignación automática en “sin preferencia”). */
  const [barberoConfirmadoNombre, setBarberoConfirmadoNombre] = useState<string>('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClienteData>({
    resolver: zodResolver(clienteSchema),
  })

  const servicioSeleccionado = servicios.find(s => s.id === servicioId)
  const barberoSeleccionado  = barberos.find(b => b.id === barberoId)

  const DIAS_SEM = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'] as const

  const diaEsLaborableBooking = (d: Date) => {
    const nombre = DIAS_SEM[d.getDay()]
    return !!(negocio.horario as any)[nombre]?.abierto
  }

  const fechaMaxReserva = addDays(startOfDay(new Date()), negocio.max_dias_adelanto)

  async function cargarSlots(diaSeleccionado: Date) {
    setCargandoSlots(true)
    setSlots([])
    try {
      const anio = diaSeleccionado.getFullYear()
      const mes  = String(diaSeleccionado.getMonth() + 1).padStart(2, '0')
      const dia  = String(diaSeleccionado.getDate()).padStart(2, '0')
      const fechaIso = `${anio}-${mes}-${dia}`

      const params = new URLSearchParams({
        negocio_id: negocio.id,
        fecha_iso:  fechaIso,
        barbero_id: barberoId,
      })
      const res  = await fetch(`/api/reservas/slots?${params}`)
      const data = await res.json()
      const slotsRaw: SlotDisponible[] = data.slots ?? []

      // Filtrar slots pasados en el CLIENTE (zona horaria correcta del usuario)
      const ahora = new Date()
      const esHoy = diaSeleccionado.toDateString() === ahora.toDateString()

      if (esHoy) {
        setSlots(slotsRaw.map(s => {
          const [h, m] = s.hora.split(':').map(Number)
          const slotTime = new Date(diaSeleccionado)
          slotTime.setHours(h, m, 0, 0)
          return { ...s, disponible: s.disponible && slotTime > ahora }
        }))
      } else {
        setSlots(slotsRaw)
      }
    } catch {
      toast.error('Error al cargar horarios disponibles')
    }
    setCargandoSlots(false)
  }

  async function onSubmitDatos(data: ClienteData) {
    if (!fecha || !hora) return

    const [h, m] = hora.split(':').map(Number)
    const fechaHora = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
      h, m, 0, 0
    )
    const fechaUTC = fechaHora

    const payload = {
      negocio_id:        negocio.id,
      barbero_id:        barberoId || null,
      servicio_id:       servicioId || null,
      nombre:            data.nombre,
      telefono:          (data.telefono ?? '').trim(),
      email:             (data.email ?? '').trim() || null,
      fecha_hora:        fechaUTC.toISOString(),
      notas_cliente:     data.notas || null,
      politica_aceptada: true,
    }

    const res = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'Error al crear la reserva')
      return
    }

    const ok = await res.json() as { barbero_id?: string }
    const asignado = ok.barbero_id
      ? barberos.find(b => b.id === ok.barbero_id)?.nombre
      : undefined
    setBarberoConfirmadoNombre(asignado ?? barberoSeleccionado?.nombre ?? '')

    setPaso('confirmado')
  }

  if (paso === 'confirmado') {
    return (
      <div className="card text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Reserva confirmada!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Te esperamos en {negocio.nombre}.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">Servicio</span>
            <span className="font-medium">{servicioSeleccionado?.nombre ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Barbero</span>
            <span className="font-medium">{barberoConfirmadoNombre || barberoSeleccionado?.nombre || 'Cualquiera'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Fecha</span>
            <span className="font-medium">{fecha ? format(fecha, "PPP", { locale: es }) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Hora</span>
            <span className="font-medium">{hora}</span>
          </div>
        </div>
        <button
          onClick={() => {
            setPaso('servicio')
            setServicioId('')
            setBarberoId('')
            setFecha(null)
            setHora('')
            setBarberoConfirmadoNombre('')
          }}
          className="btn-secondary text-sm"
        >
          Hacer otra reserva
        </button>
      </div>
    )
  }

  const PASOS: Paso[] = ['servicio','barbero','fecha','hora','datos']
  const pasoIdx = PASOS.indexOf(paso)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 px-1">
        {PASOS.map((p, i) => (
          <div key={p} className="flex items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < pasoIdx ? 'bg-green-500 text-white' : i === pasoIdx ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < pasoIdx ? '✓' : i + 1}
            </div>
            {i < PASOS.length - 1 && (
              <div className={`h-0.5 w-8 md:w-14 transition-colors ${i < pasoIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {paso === 'servicio' && (
        <div>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-brand-600" /> Elige el servicio
          </h2>
          <div className="space-y-2">
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setServicioId(s.id); setPaso('barbero') }}
                className={`w-full text-left p-4 rounded-xl border transition-all
                  ${servicioId === s.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center border border-gray-100">
                    {s.photoSignedUrl ? (
                      <Image
                        src={s.photoSignedUrl}
                        alt={s.nombre}
                        width={144}
                        height={144}
                        className="w-full h-full object-cover"
                        sizes="(max-width: 640px) 64px, 72px"
                        unoptimized
                      />
                    ) : (
                      <Scissors className="w-7 h-7 text-gray-300" aria-hidden />
                    )}
                  </div>
                  <div className="flex justify-between items-start flex-1 min-w-0 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{s.nombre}</p>
                      {s.descripcion && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{s.descripcion}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-700">{formatPrecio(s.precio)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" /> {s.duracion} min
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {paso === 'barbero' && (
        <div>
          <button onClick={() => setPaso('servicio')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600" /> Elige el barbero
          </h2>
          <div className="space-y-2">
            <button onClick={() => { setBarberoId(''); setPaso('fecha') }}
              className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all">
              <p className="font-medium text-gray-900">Sin preferencia</p>
              <p className="text-sm text-gray-500">Primer barbero disponible</p>
            </button>
            {barberos.map(b => (
              <button key={b.id} onClick={() => { setBarberoId(b.id); setPaso('fecha') }}
                className={`w-full text-left p-4 rounded-xl border transition-all
                  ${barberoId === b.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-sm shrink-0">
                    {b.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{b.nombre}</p>
                    {b.bio && <p className="text-sm text-gray-500">{b.bio}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {paso === 'fecha' && (
        <div>
          <button onClick={() => setPaso('barbero')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" /> Elige el día
          </h2>
          <CalendarioMes
            mesVisible={mesCalendarioReserva}
            onCambiarMes={setMesCalendarioReserva}
            diaSeleccionado={fecha ?? startOfDay(new Date())}
            onSeleccionarDia={d => {
              const dia = startOfDay(d)
              setFecha(dia)
              setHora('')
              void cargarSlots(dia)
              setPaso('hora')
            }}
            diaEsLaborable={diaEsLaborableBooking}
            fechaMax={fechaMaxReserva}
          />
        </div>
      )}

      {paso === 'hora' && (
        <div>
          <button onClick={() => setPaso('fecha')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" /> Elige la hora
          </h2>
          {fecha && (
            <p className="text-sm text-gray-500 mb-4 capitalize">
              {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          )}
          {cargandoSlots ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando horarios...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay horarios disponibles para este día.
              <button onClick={() => setPaso('fecha')} className="block mx-auto mt-2 text-brand-600 hover:underline">
                Elegir otro día
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map(s => (
                <button key={s.hora} disabled={!s.disponible}
                  onClick={() => { setHora(s.hora); setPaso('datos') }}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all
                    ${!s.disponible ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : hora === s.hora ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-400 hover:text-brand-600'}`}>
                  {s.hora}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === 'datos' && (
        <div>
          <button onClick={() => setPaso('hora')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5 text-sm">
            <p className="font-medium text-brand-800 mb-2">Resumen de tu reserva</p>
            <div className="space-y-1 text-brand-700">
              {servicioSeleccionado && <p>✂ {servicioSeleccionado.nombre} ({servicioSeleccionado.duracion} min)</p>}
              {barberoSeleccionado  && <p>👤 {barberoSeleccionado.nombre}</p>}
              {fecha && <p>📅 {format(fecha, "EEEE d 'de' MMMM", { locale: es })}</p>}
              <p>🕐 {hora}</p>
            </div>
          </div>
          <h2 className="font-bold text-gray-900 mb-4">Tus datos</h2>
          <form onSubmit={handleSubmit(onSubmitDatos)} className="space-y-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input {...register('nombre')} className="input" placeholder="Tu nombre" />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <p className="text-xs text-gray-500 -mt-2 mb-2">
              Debes indicar al menos uno: teléfono (mín. 7 dígitos) o correo electrónico.
            </p>
            <div>
              <label className="label">Teléfono / WhatsApp</label>
              <input {...register('telefono')} className="input" placeholder="+593 99 123 4567" type="tel" />
              {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input {...register('email')} className="input" placeholder="tu@email.com" type="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Notas adicionales</label>
              <textarea {...register('notas')} className="input resize-none h-16" placeholder="Algo que el barbero deba saber..." />
            </div>
            {negocio.cancelacion_mensaje && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-medium text-amber-800 mb-1">Política de cancelación</p>
                <p className="text-xs text-amber-700">{negocio.cancelacion_mensaje}</p>
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" {...register('politica')} className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0" />
              <span className="text-sm text-gray-600">
                Acepto la política de reservas y cancelación de {negocio.nombre}
              </span>
            </label>
            {errors.politica && <p className="text-red-500 text-xs -mt-2">{errors.politica.message}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
              {isSubmitting ? 'Confirmando reserva...' : 'Confirmar reserva'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
