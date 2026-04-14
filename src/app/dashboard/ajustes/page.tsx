'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Save, Copy, ExternalLink, Clock } from 'lucide-react'
import type { Negocio } from '@/types'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'

const DIAS = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
]

const HORAS = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2,'0')}:${m}`
})

const schema = z.object({
  nombre:       z.string().min(2),
  descripcion:  z.string().optional(),
  telefono:     z.string().optional(),
  direccion:    z.string().optional(),
  instagram_url: z.string().optional(),
  whatsapp:     z.string().optional(),
  duracion_turno_min:   z.coerce.number().min(15).max(120),
  anticipacion_min:     z.coerce.number().min(0),
  max_dias_adelanto:    z.coerce.number().min(1).max(90),
  cancelacion_permitida:      z.boolean(),
  cancelacion_horas_minimo:   z.coerce.number().min(0),
  cancelacion_max_por_mes:    z.coerce.number().min(1),
  cancelacion_mensaje:        z.string().optional(),
  recordatorio_email_cliente:     z.coerce.boolean(),
  recordatorio_whatsapp_cliente:  z.coerce.boolean(),
})
type FormData = z.infer<typeof schema>

interface HorarioDia {
  abierto: boolean
  desde: string | null
  hasta: string | null
}

type Horario = Record<string, HorarioDia>

const HORARIO_DEFAULT: Horario = {
  lunes:     { abierto: true,  desde: '08:00', hasta: '19:00' },
  martes:    { abierto: true,  desde: '08:00', hasta: '19:00' },
  miercoles: { abierto: true,  desde: '08:00', hasta: '19:00' },
  jueves:    { abierto: true,  desde: '08:00', hasta: '19:00' },
  viernes:   { abierto: true,  desde: '08:00', hasta: '19:00' },
  sabado:    { abierto: true,  desde: '09:00', hasta: '17:00' },
  domingo:   { abierto: false, desde: null,    hasta: null    },
}

export default function AjustesPage() {
  const supabase = createClient()
  const { capacidades } = usePlanAcceso()
  const soloLectura = !capacidades?.puedeOperarNegocio
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [horario, setHorario] = useState<Horario>(HORARIO_DEFAULT)
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const cancelacionPermitida = watch('cancelacion_permitida')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('negocios').select('*').eq('owner_id', user.id).single()
      if (data) {
        setNegocio(data)
        setHorario(data.horario ?? HORARIO_DEFAULT)
        reset({
          nombre:                     data.nombre,
          descripcion:                data.descripcion ?? '',
          telefono:                   data.telefono ?? '',
          direccion:                  data.direccion ?? '',
          instagram_url:              data.instagram_url ?? '',
          whatsapp:                   data.whatsapp ?? '',
          duracion_turno_min:         data.duracion_turno_min,
          anticipacion_min:           data.anticipacion_min,
          max_dias_adelanto:          data.max_dias_adelanto,
          cancelacion_permitida:      data.cancelacion_permitida,
          cancelacion_horas_minimo:   data.cancelacion_horas_minimo,
          cancelacion_max_por_mes:    data.cancelacion_max_por_mes,
          cancelacion_mensaje:        data.cancelacion_mensaje ?? '',
          recordatorio_email_cliente:     data.recordatorio_email_cliente !== false,
          recordatorio_whatsapp_cliente:  data.recordatorio_whatsapp_cliente === true,
        })
      }
      setLoading(false)
    }
    cargar()
  }, [])

  async function onSubmit(data: FormData) {
    if (!negocio) return
    if (soloLectura) {
      toast.error('Renueva tu plan para guardar cambios en la configuración.')
      return
    }
    const { error } = await supabase.from('negocios').update(data).eq('id', negocio.id)
    if (error) toast.error('Error al guardar')
    else toast.success('Cambios guardados')
  }

  async function guardarHorario() {
    if (!negocio) return
    if (soloLectura) {
      toast.error('Renueva tu plan para modificar el horario.')
      return
    }
    setGuardandoHorario(true)
    const { error } = await supabase.from('negocios').update({ horario }).eq('id', negocio.id)
    if (error) toast.error('Error al guardar horario')
    else toast.success('Horario guardado')
    setGuardandoHorario(false)
  }

  function toggleDia(dia: string) {
    setHorario(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        abierto: !prev[dia].abierto,
        desde: !prev[dia].abierto ? '08:00' : null,
        hasta: !prev[dia].abierto ? '19:00' : null,
      }
    }))
  }

  function setHora(dia: string, campo: 'desde' | 'hasta', valor: string) {
    setHorario(prev => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }))
  }

  // Copiar horario de un día a todos los días abiertos
  function copiarATodos(dia: string) {
    const origen = horario[dia]
    if (!origen.abierto) return
    const nuevo = { ...horario }
    DIAS.forEach(d => {
      if (d.key !== dia && nuevo[d.key].abierto) {
        nuevo[d.key] = { ...nuevo[d.key], desde: origen.desde, hasta: origen.hasta }
      }
    })
    setHorario(nuevo)
    toast.success('Horario copiado a todos los días abiertos')
  }

  const linkReservas = negocio ? `/reservar/${negocio.slug}` : ''

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="text-gray-500 text-sm mt-1">Configura tu negocio y tus reglas de reserva</p>
      </div>

      {soloLectura && (
        <div className="card mb-6 border-amber-200 bg-amber-50 text-amber-950">
          <p className="text-sm font-medium mb-1">Solo lectura</p>
          <p className="text-xs text-amber-900/90 mb-3">
            Tu suscripción no permite cambiar horarios ni datos del negocio. Sigue viendo tu link y la
            configuración actual.
          </p>
          <Link href="/#planes" className="text-sm font-medium text-brand-800 underline">
            Ver planes y reactivar
          </Link>
        </div>
      )}

      {/* Link de reservas */}
      {negocio && (
        <div className="card mb-6 bg-brand-50 border-brand-200">
          <p className="text-sm font-medium text-brand-800 mb-2">Tu link de reservas</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-brand-200 rounded-lg px-3 py-2 text-brand-700 truncate">
              {typeof window !== 'undefined' ? window.location.origin : ''}{linkReservas}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${linkReservas}`); toast.success('Link copiado') }}
              className="shrink-0 p-2 rounded-lg bg-white border border-brand-200 hover:bg-brand-50 transition-colors">
              <Copy className="w-4 h-4 text-brand-600" />
            </button>
            <a href={linkReservas} target="_blank" rel="noopener noreferrer"
              className="shrink-0 p-2 rounded-lg bg-white border border-brand-200 hover:bg-brand-50 transition-colors">
              <ExternalLink className="w-4 h-4 text-brand-600" />
            </a>
          </div>
        </div>
      )}

      {/* ===== HORARIO ===== */}
      <fieldset disabled={soloLectura} className="min-w-0 border-0 p-0 m-0 mb-6 block">
        <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Horario de atención</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Activa los días que atiendes y configura el horario. Usa el botón "Copiar a todos" para aplicar el mismo horario a todos los días abiertos.
        </p>

        <div className="space-y-3">
          {DIAS.map(({ key, label }) => (
            <div key={key} className={`rounded-xl border p-3 transition-colors ${horario[key]?.abierto ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                {/* Toggle día */}
                <label className="flex items-center gap-2 cursor-pointer w-28 shrink-0">
                  <input
                    type="checkbox"
                    checked={horario[key]?.abierto ?? false}
                    onChange={() => toggleDia(key)}
                    className="w-4 h-4 accent-brand-600"
                  />
                  <span className={`text-sm font-medium ${horario[key]?.abierto ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </label>

                {horario[key]?.abierto ? (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={horario[key]?.desde ?? '08:00'}
                        onChange={e => setHora(key, 'desde', e.target.value)}
                        className="input py-1.5 text-sm"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-gray-400 text-sm shrink-0">hasta</span>
                      <select
                        value={horario[key]?.hasta ?? '19:00'}
                        onChange={e => setHora(key, 'hasta', e.target.value)}
                        className="input py-1.5 text-sm"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => copiarATodos(key)}
                      title="Copiar este horario a todos los días abiertos"
                      className="shrink-0 text-xs text-brand-600 hover:text-brand-800 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      Copiar a todos
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Cerrado</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={guardarHorario}
          disabled={guardandoHorario}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {guardandoHorario ? 'Guardando...' : 'Guardar horario'}
        </button>
        </div>
      </fieldset>

      {/* ===== INFO GENERAL ===== */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={soloLectura} className="min-w-0 border-0 p-0 m-0 space-y-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Información del negocio</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre del negocio</label>
              <input {...register('nombre')} className="input" />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea {...register('descripcion')} className="input resize-none h-20" placeholder="Cuéntales a tus clientes quiénes son..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Teléfono</label>
                <input {...register('telefono')} className="input" placeholder="+593 99 123 4567" />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input {...register('direccion')} className="input" placeholder="Calle y número" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Instagram URL</label>
                <input {...register('instagram_url')} className="input" placeholder="https://instagram.com/tubarberia" />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input {...register('whatsapp')} className="input" placeholder="+593 99 123 4567" />
              </div>
            </div>
          </div>
        </div>

        {/* Recordatorios a clientes (cron ~24h y ~2h antes) */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Recordatorios a clientes</h2>
          <p className="text-xs text-gray-500 mb-4">
            El sistema envía avisos unas 24 horas y unas 2 horas antes del turno. El correo usa Resend; WhatsApp o SMS
            requiere configurar la variable <code className="text-gray-700">NOTIFICACIONES_WHATSAPP_WEBHOOK_URL</code> en
            el servidor (POST JSON con <code className="text-gray-700">telefono</code> y <code className="text-gray-700">mensaje</code>).
          </p>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('recordatorio_email_cliente')}
                className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
              />
              <span className="text-sm text-gray-700">
                Enviar recordatorio por <strong>correo</strong> cuando el cliente tenga email
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('recordatorio_whatsapp_cliente')}
                className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
              />
              <span className="text-sm text-gray-700">
                Enviar recordatorio por <strong>WhatsApp / teléfono</strong> cuando el cliente tenga número (vía webhook)
              </span>
            </label>
          </div>
        </div>

        {/* Config reservas */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Configuración de reservas</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Duración del turno</label>
              <select {...register('duracion_turno_min')} className="input">
                {[15,20,30,45,60,90,120].map(v => <option key={v} value={v}>{v} minutos</option>)}
              </select>
            </div>
            <div>
              <label className="label">Anticipación mínima</label>
              <select {...register('anticipacion_min')} className="input">
                <option value={0}>Sin límite</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
                <option value={1440}>1 día</option>
              </select>
            </div>
            <div>
              <label className="label">Días hacia adelante</label>
              <select {...register('max_dias_adelanto')} className="input">
                {[7,14,21,30,60,90].map(v => <option key={v} value={v}>{v} días</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Política cancelación */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Política de cancelación</h2>
          <p className="text-xs text-gray-400 mb-4">El cliente lee y acepta esto antes de confirmar</p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('cancelacion_permitida')} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm font-medium text-gray-700">Permitir cancelaciones</span>
            </label>
            {cancelacionPermitida && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Horas mínimas para cancelar</label>
                    <select {...register('cancelacion_horas_minimo')} className="input">
                      <option value={0}>Sin restricción</option>
                      <option value={1}>1 hora antes</option>
                      <option value={2}>2 horas antes</option>
                      <option value={4}>4 horas antes</option>
                      <option value={12}>12 horas antes</option>
                      <option value={24}>24 horas antes</option>
                      <option value={48}>48 horas antes</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Máx. cancelaciones por mes</label>
                    <select {...register('cancelacion_max_por_mes')} className="input">
                      {[1,2,3,5,10].map(v => <option key={v} value={v}>{v} por mes</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Mensaje de política</label>
                  <textarea {...register('cancelacion_mensaje')} className="input resize-none h-24"
                    placeholder="Ej: Puedes cancelar tu reserva con al menos 2 horas de anticipación." />
                </div>
              </>
            )}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
        </fieldset>
      </form>
    </div>
  )
}
