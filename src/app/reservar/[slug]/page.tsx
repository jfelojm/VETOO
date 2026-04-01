import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { planActivo } from '@/lib/utils'
import BookingFlow from '@/components/booking/BookingFlow'
import { Scissors, MapPin, Clock, Instagram } from 'lucide-react'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = createClient()
  const { data } = await supabase
    .from('negocios')
    .select('nombre, descripcion, ciudad')
    .eq('slug', params.slug)
    .single()

  if (!data) return { title: 'Barbería no encontrada' }

  return {
    title: `Reservar en ${data.nombre}`,
    description: data.descripcion ?? `Reserva tu turno en ${data.nombre}, ${data.ciudad}`,
  }
}

export default async function ReservarPage({ params }: Props) {
  const supabase = createClient()

  // Cargar negocio con barberos y servicios
  const { data: negocio } = await supabase
    .from('negocios')
    .select(`
      *,
      barberos(id, nombre, foto_url, bio, activo, orden),
      servicios(id, nombre, descripcion, duracion, precio, activo, orden)
    `)
    .eq('slug', params.slug)
    .eq('activo', true)
    .single()

  if (!negocio) notFound()

  // Verificar que el plan esté activo
  if (!planActivo(negocio)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">{negocio.nombre}</h1>
          <p className="text-gray-500 text-sm">
            Las reservas online no están disponibles en este momento.
            Contacta directamente al negocio.
          </p>
          {negocio.telefono && (
            <a
              href={`https://wa.me/${negocio.telefono.replace(/\D/g,'')}`}
              className="mt-4 inline-block bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>
    )
  }

  const barberos = (negocio.barberos as any[]).filter((b: any) => b.activo).sort((a: any, b: any) => a.orden - b.orden)
  const servicios = (negocio.servicios as any[]).filter((s: any) => s.activo).sort((a: any, b: any) => a.orden - b.orden)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header del negocio */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Logo / Icono */}
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
              {negocio.logo_url ? (
                <img src={negocio.logo_url} alt={negocio.nombre} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <Scissors className="w-8 h-8 text-brand-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{negocio.nombre}</h1>
              {negocio.descripcion && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{negocio.descripcion}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {negocio.ciudad && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" /> {negocio.ciudad}
                  </span>
                )}
                {negocio.instagram_url && (
                  <a
                    href={negocio.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    <Instagram className="w-3 h-3" /> Instagram
                  </a>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" /> Turnos de {negocio.duracion_turno_min} min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flujo de reserva */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <BookingFlow
          negocio={negocio}
          barberos={barberos}
          servicios={servicios}
        />
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-300">
        Reservas online por <span className="font-medium">BarberApp</span>
      </div>

    </div>
  )
}
