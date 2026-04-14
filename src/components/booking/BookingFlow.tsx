'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays, startOfDay, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, Clock, User, Calendar } from 'lucide-react'
import { TurnAppSymbol } from '@/components/brand/TurnAppLogo'
import ServicioCarousel from '@/components/booking/ServicioCarousel'
import type { Negocio, Barbero, Servicio, SlotDisponible } from '@/types'
import { formatPrecio, inicialesNombre } from '@/lib/utils'
import Link from 'next/link'
import CalendarioMes from '@/components/calendario/CalendarioMes'

type ServicioConFoto = Servicio & { fotoCarouselUrls?: string[] }

interface Props {
  negocio: Negocio & { horario: any; is_demo?: boolean }
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
  const [demoModalAbierto, setDemoModalAbierto] = useState(false)

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
      <div className="px-0 py-2 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
          <CheckCircle className="h-10 w-10 text-brand-glow" strokeWidth={2} aria-hidden />
        </div>
        <h2 className="font-heading text-xl font-bold text-ink">Reserva confirmada</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Te esperamos en {negocio.nombre}.
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-left text-sm text-ink">
          <div className="space-y-2.5">
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted">Servicio</span>
              <span className="text-right font-medium">{servicioSeleccionado?.nombre ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted">Barbero</span>
              <span className="text-right font-medium">{barberoConfirmadoNombre || barberoSeleccionado?.nombre || 'Cualquiera'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted">Fecha</span>
              <span className="text-right font-medium">{fecha ? format(fecha, "PPP", { locale: es }) : '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted">Hora</span>
              <span className="text-right font-medium">{hora}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPaso('servicio')
            setServicioId('')
            setBarberoId('')
            setFecha(null)
            setHora('')
            setBarberoConfirmadoNombre('')
          }}
          className="btn-ghost mt-6 w-full text-sm"
        >
          Hacer otra reserva
        </button>
      </div>
    )
  }

  const PASOS: Paso[] = ['servicio','barbero','fecha','hora','datos']
  const pasoIdx = PASOS.indexOf(paso)

  return (
    <div className="relative">
      {demoModalAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
        >
          <div className="max-w-md rounded-2xl border border-border bg-chalk p-6 shadow-lg">
            <h2 id="demo-modal-title" className="font-heading text-lg font-bold text-ink">
              Demostración TurnApp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Esta es una demostración. ¿Te gustó? Crea tu cuenta gratis y configura tu propio negocio en 5 minutos.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDemoModalAbierto(false)}
                className="btn-secondary w-full sm:w-auto"
              >
                Seguir explorando
              </button>
              <Link
                href="/auth/register"
                className="btn-primary w-full text-center sm:w-auto"
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-center gap-0 px-1 sm:gap-1">
        {PASOS.map((p, i) => (
          <div key={p} className="flex items-center">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                i < pasoIdx
                  ? 'bg-brand-primary text-white'
                  : i === pasoIdx
                    ? 'bg-brand-primary text-white ring-2 ring-brand-primary/25'
                    : 'bg-surface text-ink-muted'
              }`}
            >
              {i < pasoIdx ? '✓' : i + 1}
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`mx-0.5 h-0.5 w-5 shrink-0 rounded-full sm:mx-1 sm:w-10 md:w-14 ${i < pasoIdx ? 'bg-brand-primary' : 'bg-border'}`}
              />
            )}
          </div>
        ))}
      </div>

      {paso === 'servicio' && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <TurnAppSymbol size={20} color="#0D9B6A" className="shrink-0" aria-hidden /> Elige el servicio
          </h2>
          <div className="space-y-3">
            {servicios.map(s => {
              const selected = servicioId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServicioId(s.id)
                    setPaso('barbero')
                  }}
                  className={`w-full overflow-hidden rounded-[16px] border-2 bg-chalk text-left transition-all duration-200 ease-out touch-manipulation ${
                    selected
                      ? 'border-brand-primary bg-brand-light shadow-sm'
                      : 'border-border hover:border-brand-primary hover:bg-brand-light'
                  }`}
                >
                  <ServicioCarousel urls={s.fotoCarouselUrls ?? []} nombre={s.nombre} />
                  <div className="flex items-start justify-between gap-3 border-t border-border p-4">
                    <div className="min-w-0">
                      <p className="font-heading text-base font-semibold leading-snug text-ink">{s.nombre}</p>
                      {s.descripcion && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{s.descripcion}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1 text-sm text-ink-muted">
                        <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {s.duracion} min
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-heading text-lg font-bold text-brand-primary">{formatPrecio(s.precio)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {paso === 'barbero' && (
        <div>
          <button
            type="button"
            onClick={() => setPaso('servicio')}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <User className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} /> Elige el barbero
          </h2>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setBarberoId('')
                setPaso('fecha')
              }}
              className="w-full rounded-[16px] border-2 border-border bg-chalk p-4 text-left transition-all duration-200 hover:border-brand-primary hover:bg-brand-light touch-manipulation"
            >
              <p className="font-heading font-semibold text-ink">Sin preferencia</p>
              <p className="mt-0.5 text-sm text-ink-muted">Primer barbero disponible</p>
            </button>
            {barberos.map(b => {
              const selected = barberoId === b.id
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBarberoId(b.id)
                    setPaso('fecha')
                  }}
                  className={`w-full rounded-[16px] border-2 bg-chalk p-4 text-left transition-all duration-200 touch-manipulation ${
                    selected
                      ? 'border-brand-primary bg-brand-light shadow-sm'
                      : 'border-border hover:border-brand-primary hover:bg-brand-light'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {b.foto_url ? (
                      <img
                        src={b.foto_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">
                        {inicialesNombre(b.nombre)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-ink">{b.nombre}</p>
                      {b.bio && <p className="mt-0.5 text-sm text-ink-muted line-clamp-2">{b.bio}</p>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {paso === 'fecha' && (
        <div>
          <button
            type="button"
            onClick={() => setPaso('barbero')}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Calendar className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} /> Elige el día
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
          <button
            type="button"
            onClick={() => setPaso('fecha')}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Clock className="h-5 w-5 shrink-0 text-brand-primary" strokeWidth={2} /> Elige la hora
          </h2>
          {fecha && (
            <p className="mb-4 text-sm capitalize text-ink-muted">
              {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          )}
          {cargandoSlots ? (
            <div className="py-10 text-center text-sm text-ink-muted">Cargando horarios...</div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-muted">
              No hay horarios disponibles para este día.
              <button
                type="button"
                onClick={() => setPaso('fecha')}
                className="mx-auto mt-3 block font-medium text-brand-primary hover:underline"
              >
                Elegir otro día
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map(s => (
                <button
                  key={s.hora}
                  type="button"
                  disabled={!s.disponible}
                  onClick={() => {
                    setHora(s.hora)
                    setPaso('datos')
                  }}
                  className={`min-h-[44px] rounded-full border px-2 text-sm font-medium transition-all duration-200 ease-out touch-manipulation ${
                    !s.disponible
                      ? 'cursor-not-allowed border-transparent bg-surface/50 text-ink opacity-30'
                      : hora === s.hora
                        ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
                        : 'border-border bg-surface text-ink-soft hover:border-brand-primary/40 hover:bg-brand-light hover:text-brand-dark'
                  }`}
                >
                  {s.hora}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === 'datos' && (
        <div>
          <button
            type="button"
            onClick={() => setPaso('hora')}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <div className="mb-5 rounded-2xl border border-border bg-surface p-4 text-sm text-ink">
            <p className="mb-2 font-heading font-semibold text-ink">Resumen de tu reserva</p>
            <div className="space-y-1.5 text-ink-soft">
              {servicioSeleccionado && (
                <p>
                  <span className="text-ink-muted">Servicio:</span> {servicioSeleccionado.nombre} ({servicioSeleccionado.duracion} min)
                </p>
              )}
              {barberoSeleccionado && (
                <p>
                  <span className="text-ink-muted">Barbero:</span> {barberoSeleccionado.nombre}
                </p>
              )}
              {!barberoSeleccionado && (
                <p>
                  <span className="text-ink-muted">Barbero:</span> Sin preferencia
                </p>
              )}
              {fecha && (
                <p>
                  <span className="text-ink-muted">Día:</span> {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              )}
              <p>
                <span className="text-ink-muted">Hora:</span> {hora}
              </p>
            </div>
          </div>
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Tus datos</h2>
          <form onSubmit={handleSubmit(onSubmitDatos)} className="space-y-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input {...register('nombre')} className="input" placeholder="Tu nombre" />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <p className="-mt-2 mb-2 text-xs text-ink-muted">
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
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" {...register('politica')} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary" />
              <span className="text-sm text-ink-soft">
                Acepto la política de reservas y cancelación de {negocio.nombre}
              </span>
            </label>
            {errors.politica && <p className="-mt-2 text-xs text-red-600">{errors.politica.message}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-primary py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-brand-glow hover:shadow-brand disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
            >
              {isSubmitting ? 'Confirmando reserva...' : 'Confirmar reserva'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
