import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { planActivo } from '@/lib/utils'
import { getTipoConfig } from '@/lib/negocio-tipo'
import BookingFlow from '@/components/booking/BookingFlow'
import { MapPin, Clock, Instagram } from 'lucide-react'
import TurnAppLogo, { TurnAppSymbol } from '@/components/brand/TurnAppLogo'

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
      <div className="min-h-screen bg-chalk flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <TurnAppSymbol size={48} color="#6b6b76" className="mx-auto mb-4 opacity-70" aria-hidden />
          <h1 className="font-heading text-xl font-bold text-ink mb-2">{negocio.nombre}</h1>
          <p className="text-ink-muted text-sm">
            Las reservas online no están disponibles en este momento.
            Contacta directamente al negocio.
          </p>
          {negocio.telefono && (
            <a
              href={`https://wa.me/${negocio.telefono.replace(/\D/g,'')}`}
              className="mt-4 inline-block bg-brand-primary text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-brand transition-all hover:bg-brand-glow hover:shadow-brand"
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
    <div className="min-h-screen bg-chalk">

      {/* Header del negocio */}
      <header className="border-b border-border bg-chalk">
        <div className="max-w-lg mx-auto px-4 py-5 md:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-[1.5px] border-border bg-brand-light">
              {negocio.logo_url ? (
                <img src={negocio.logo_url} alt={negocio.nombre} className="h-16 w-16 object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <TipoHeaderIcon className="h-8 w-8 text-brand-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-xl font-bold leading-snug tracking-tight text-ink">
                {negocio.nombre}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] leading-tight text-ink-muted">
                <span>Powered by</span>
                <TurnAppLogo variant="icon-only" size="sm" className="scale-90 origin-left" />
              </div>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                <TipoHeaderIcon className="h-3 w-3 shrink-0 text-brand-primary" />
                {tipoCfg.label}
              </span>
              {negocio.descripcion && (
                <p className="mt-2 text-sm text-ink-muted line-clamp-2">{negocio.descripcion}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {negocio.ciudad && (
                  <span className="flex items-center gap-1 text-xs text-ink-muted">
                    <MapPin className="h-3 w-3 shrink-0" /> {negocio.ciudad}
                  </span>
                )}
                {negocio.instagram_url && (
                  <a
                    href={negocio.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                  >
                    <Instagram className="h-3 w-3 shrink-0" /> Instagram
                  </a>
                )}
                <span className="flex items-center gap-1 text-xs text-ink-muted">
                  <Clock className="h-3 w-3 shrink-0" /> Turnos de {negocio.duracion_turno_min} min
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Flujo de reserva */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-8 sm:py-6">
        <BookingFlow
          negocio={negocio}
          barberos={barberos}
          servicios={servicios}
        />
      </div>

      <footer className="border-t border-border bg-chalk py-6 text-center text-[11px] text-ink-muted">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>Reservas online con</span>
          <TurnAppLogo variant="light" size="sm" className="inline-flex" />
        </div>
      </footer>

    </div>
  )
}
