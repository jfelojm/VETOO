import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { planActivo } from '@/lib/utils'
import { getTipoConfig } from '@/lib/negocio-tipo'
import BookingFlow from '@/components/booking/BookingFlow'
import { Scissors, MapPin, Clock, Instagram } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = createClient()
  const { data } = await supabase
    .from('negocios')
    .select('nombre, descripcion, ciudad, tipo_negocio')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Negocio no encontrado' }

  const tipo = getTipoConfig(data.tipo_negocio)
  return {
    title: `Reservar en ${data.nombre}`,
    description:
      data.descripcion ??
      `Reserva tu turno en ${data.nombre} (${tipo.label}), ${data.ciudad}`,
  }
}

export default async function ReservarPage({ params }: Props) {
  const { slug } = await params
  const supabase = createClient()

  // Cargar negocio con barberos y servicios
  const admin = createAdminClient()
  const { data: negocio } = await admin
    .from('negocios')
    .select(`
      *,
      barberos(id, nombre, foto_url, bio, activo, orden),
      servicios(
        id, nombre, descripcion, duracion, precio, activo, orden, photo_url,
        servicio_fotos(id, storage_path, orden, created_at)
      )
    `)
    .eq('slug', slug)
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
  const rawServicios = (negocio.servicios as any[]).filter((s: any) => s.activo).sort((a: any, b: any) => a.orden - b.orden)
  const servicios = await Promise.all(
    rawServicios.map(async (s: any) => {
      const rows = [...(s.servicio_fotos ?? [])].sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden)
      const fotoCarouselUrls: string[] = []
      for (const row of rows) {
        const { data } = await admin.storage.from('service-photos').createSignedUrl(row.storage_path, 60 * 60 * 24)
        if (data?.signedUrl) fotoCarouselUrls.push(data.signedUrl)
      }
      if (fotoCarouselUrls.length === 0 && s.photo_url) {
        const { data } = await admin.storage.from('service-photos').createSignedUrl(s.photo_url, 60 * 60 * 24)
        if (data?.signedUrl) fotoCarouselUrls.push(data.signedUrl)
      }
      const { servicio_fotos: _sf, ...rest } = s
      return { ...rest, fotoCarouselUrls }
    })
  )
  const tipoCfg = getTipoConfig((negocio as { tipo_negocio?: string | null }).tipo_negocio)
  const TipoHeaderIcon = tipoCfg.Icon

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
                <TipoHeaderIcon className="w-8 h-8 text-brand-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h1 className="text-xl font-bold text-gray-900">{negocio.nombre}</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-800 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5">
                  <TipoHeaderIcon className="w-3 h-3" />
                  {tipoCfg.label}
                </span>
              </div>
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
        Reservas online por <span className="font-medium">Turnapp</span>
      </div>

    </div>
  )
}
