import { createAdminClient } from '@/lib/supabase/server'

export interface BusinessContext {
  negocioId: string
  nombre: string
  telefono: string | null
  horario: Record<string, unknown>
  servicios: Array<{ id: string; nombre: string; duracion_min: number; precio: number }>
  staff: Array<{ id: string; nombre: string }>
  instrucciones: string | null
}

// In-memory cache: negocioId → { context, expiresAt }
const cache = new Map<string, { context: BusinessContext; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function getBusinessContext(negocioId: string): Promise<BusinessContext | null> {
  const cached = cache.get(negocioId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.context
  }

  const supabase = createAdminClient()

  const [negocioRes, serviciosRes, staffRes] = await Promise.all([
    supabase
      .from('negocios')
      .select('id, nombre, telefono, horario, ai_instrucciones')
      .eq('id', negocioId)
      .eq('activo', true)
      .single(),
    supabase
      .from('servicios')
      .select('id, nombre, duracion_min, precio')
      .eq('negocio_id', negocioId)
      .eq('activo', true),
    supabase
      .from('barberos')
      .select('id, nombre')
      .eq('negocio_id', negocioId)
      .eq('activo', true),
  ])

  if (!negocioRes.data) return null

  const context: BusinessContext = {
    negocioId,
    nombre: negocioRes.data.nombre,
    telefono: negocioRes.data.telefono,
    horario: negocioRes.data.horario ?? {},
    servicios: (serviciosRes.data ?? []) as BusinessContext['servicios'],
    staff: (staffRes.data ?? []) as BusinessContext['staff'],
    instrucciones: negocioRes.data.ai_instrucciones ?? null,
  }

  cache.set(negocioId, { context, expiresAt: Date.now() + CACHE_TTL_MS })
  return context
}

export function buildSystemPrompt(ctx: BusinessContext): string {
  const serviciosText = ctx.servicios
    .map(s => `  - ${s.nombre} (${s.duracion_min} min, $${s.precio})`)
    .join('\n')

  const staffText = ctx.staff.map(b => `  - ${b.nombre} (id: ${b.id})`).join('\n')

  const horarioText = JSON.stringify(ctx.horario, null, 2)

  return `Eres el asistente virtual de "${ctx.nombre}", una barbería/peluquería que usa TurnApp.
Tu rol es ayudar a los clientes a reservar, modificar o cancelar citas, y responder preguntas sobre el negocio.

## Servicios disponibles:
${serviciosText || '  (Sin servicios configurados)'}

## Staff disponible:
${staffText || '  (Sin staff configurado)'}

## Horario:
${horarioText}

## Instrucciones especiales del negocio:
${ctx.instrucciones || 'Ninguna.'}

## Reglas:
- Responde siempre en español, de forma amigable y concisa (máximo 2-3 oraciones).
- Para reservar, modificar o cancelar citas SIEMPRE usa las herramientas disponibles — nunca inventes disponibilidad.
- Si el cliente tiene una consulta que no puedes resolver, usa la herramienta escalate_to_owner.
- No inventes servicios, precios ni disponibilidad. Usa solo los datos reales de las herramientas.
- Si el cliente quiere hacer una reserva, primero confirma el servicio, el staff (si tiene preferencia), y la fecha/hora deseada.`
}
