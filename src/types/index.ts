// ============================================================
// TIPOS — Espejo exacto de la base de datos
// Cuando cambies algo en la DB, actualiza aquí también
// ============================================================

export type Plan = 'trial' | 'basic' | 'pro' | 'premium' | 'cancelled'
export type EstadoReserva = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_show'
export type CanceladaPor = 'cliente' | 'negocio'

export interface HorarioDia {
  abierto: boolean
  desde: string | null   // "08:00"
  hasta: string | null   // "18:00"
}

export interface Horario {
  lunes:     HorarioDia
  martes:    HorarioDia
  miercoles: HorarioDia
  jueves:    HorarioDia
  viernes:   HorarioDia
  sabado:    HorarioDia
  domingo:   HorarioDia
}

export interface Negocio {
  id:           string
  created_at:   string
  updated_at:   string
  nombre:       string
  slug:         string
  descripcion:  string | null
  telefono:     string | null
  email:        string
  direccion:    string | null
  ciudad:       string | null
  pais:         string
  logo_url:     string | null
  instagram_url: string | null
  whatsapp:     string | null
  horario:      Horario
  duracion_turno_min:   number
  anticipacion_min:     number
  max_dias_adelanto:    number
  cancelacion_permitida:         boolean
  cancelacion_horas_minimo:      number
  cancelacion_max_por_mes:       number
  cancelacion_mensaje:           string | null
  /** Recordatorios automáticos (~24h y ~2h antes) por email al cliente */
  recordatorio_email_cliente?:   boolean
  /** Recordatorios por WhatsApp/teléfono vía webhook (ver NOTIFICACIONES_WHATSAPP_WEBHOOK_URL) */
  recordatorio_whatsapp_cliente?: boolean
  stripe_customer_id:            string | null
  stripe_subscription_id:        string | null
  plan:                          Plan
  plan_expira_at:                string | null
  trial_expira_at:               string | null
  activo:       boolean
  owner_id:     string
  tipo_negocio?: string | null
}

export interface Barbero {
  id:         string
  created_at: string
  negocio_id: string
  nombre:     string
  foto_url:   string | null
  bio:        string | null
  email:      string | null
  activo:     boolean
  orden:      number
}

export interface Servicio {
  id:         string
  created_at: string
  negocio_id: string
  nombre:     string
  descripcion: string | null
  duracion:   number
  precio:     number | null
  activo:     boolean
  orden:      number
}

export interface Bloqueo {
  id:         string
  created_at: string
  negocio_id: string
  barbero_id: string | null
  fecha_desde: string
  fecha_hasta: string
  motivo:     string | null
}

export interface Cliente {
  id:          string
  created_at:  string
  negocio_id:  string
  nombre:      string
  telefono:    string | null
  email:       string | null
  cancelaciones_mes: number
  bloqueado:   boolean
  bloqueado_motivo: string | null
}

export interface Reserva {
  id:           string
  created_at:   string
  updated_at:   string
  negocio_id:   string
  barbero_id:   string | null
  servicio_id:  string | null
  cliente_id:   string
  fecha_hora:   string
  duracion:     number
  fecha_hora_fin: string
  estado:       EstadoReserva
  cancelada_por: CanceladaPor | null
  cancelada_at: string | null
  notas_cliente: string | null
  notas_interno: string | null
  politica_aceptada: boolean
  politica_texto_snapshot: string | null
  /** Nombre al crear la reserva (si null, usar relación cliente) */
  cliente_nombre_snapshot?: string | null
  // Relaciones (cuando se hace join)
  barbero?:  Barbero
  servicio?: Servicio
  cliente?:  Cliente
  negocio?:  Negocio
}

// Para el formulario de reserva (lo que envía el cliente)
export interface FormReserva {
  nombre:      string
  telefono?:   string
  email?:      string
  barbero_id:  string
  servicio_id: string
  fecha_hora:  string
  notas_cliente?: string
  politica_aceptada: boolean
}

// Slot de tiempo disponible
export interface SlotDisponible {
  hora:        string  // "09:00"
  disponible:  boolean
  /** Si la API se pide con ?detalle=1: por qué no está libre */
  motivo?:      'bloqueo' | 'ocupado'
}
