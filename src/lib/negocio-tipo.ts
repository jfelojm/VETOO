import type { LucideIcon } from 'lucide-react'
import {
  Scissors,
  Sparkles,
  Crown,
  Hand,
  Palette,
  Users,
  Droplets,
} from 'lucide-react'

/** Término único para profesionales en toda la app. */
export const ETIQUETA_STAFF = 'Staff'

export const TIPOS_NEGOCIO_IDS = [
  'barberia',
  'peluqueria',
  'salon_belleza',
  'manicure',
  'maquillaje',
  'unisex',
  'spa',
] as const

export type TipoNegocioId = (typeof TIPOS_NEGOCIO_IDS)[number]

const DEFAULT_TIPO: TipoNegocioId = 'barberia'

type EntradaTipo = {
  label: string
  descripcion: string
  Icon: LucideIcon
}

const CONFIG: Record<TipoNegocioId, EntradaTipo> = {
  barberia: {
    label: 'Barbería / Barber Shop',
    descripcion: 'Cortes, barba y estilo clásico o moderno.',
    Icon: Scissors,
  },
  peluqueria: {
    label: 'Peluquería',
    descripcion: 'Cortes, color y cuidado del cabello.',
    Icon: Sparkles,
  },
  salon_belleza: {
    label: 'Salón de Belleza',
    descripcion: 'Servicios integrales de imagen y cuidado.',
    Icon: Crown,
  },
  manicure: {
    label: 'Manicure & Pedicure',
    descripcion: 'Uñas, esmaltado y cuidado de manos y pies.',
    Icon: Hand,
  },
  maquillaje: {
    label: 'Maquillaje & Estética',
    descripcion: 'Maquillaje profesional y tratamientos de estética.',
    Icon: Palette,
  },
  unisex: {
    label: 'Peluquería Unisex',
    descripcion: 'Atención para todo tipo de clientes en un solo lugar.',
    Icon: Users,
  },
  spa: {
    label: 'Spa & Bienestar',
    descripcion: 'Relajación, tratamientos y bienestar integral.',
    Icon: Droplets,
  },
}

export type TipoNegocioConfig = EntradaTipo & { id: TipoNegocioId }

function normalizarTipo(tipo: string | null | undefined): TipoNegocioId {
  if (!tipo) return DEFAULT_TIPO
  return (TIPOS_NEGOCIO_IDS as readonly string[]).includes(tipo)
    ? (tipo as TipoNegocioId)
    : DEFAULT_TIPO
}

/** Fuente única de verdad para label, icono y descripción por tipo de negocio. */
export function getTipoConfig(tipo: string | null | undefined): TipoNegocioConfig {
  const id = normalizarTipo(tipo)
  return { id, ...CONFIG[id] }
}

/** Lista ordenada para selects y cards de registro. */
export function listTiposNegocio(): TipoNegocioConfig[] {
  return TIPOS_NEGOCIO_IDS.map(id => ({ id, ...CONFIG[id] }))
}
