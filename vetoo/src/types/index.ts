export type Plan = 'trial' | 'basic' | 'pro' | 'premium' | 'cancelled'

export interface Clinica {
  id: string
  created_at: string
  updated_at: string
  nombre: string
  slug: string
  email: string
  telefono: string | null
  ciudad: string | null
  pais: string
  owner_id: string | null
  plan: Plan
  activo: boolean
}

