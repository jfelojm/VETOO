import Anthropic from '@anthropic-ai/sdk'
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createAdminClient } from '@/lib/supabase/server'
import { buildSystemPrompt, getBusinessContext } from './business-context'
import { appendMessages, escalateSession } from './conversation-manager'
import type { Message } from './conversation-manager'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Tool[] = [
  {
    name: 'get_availability',
    description: 'Consulta los slots de horario disponibles para un servicio y fecha.',
    input_schema: {
      type: 'object' as const,
      properties: {
        negocio_id: { type: 'string', description: 'UUID del negocio' },
        servicio_id: { type: 'string', description: 'UUID del servicio' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        barbero_id: { type: 'string', description: 'UUID del barbero (opcional)' },
      },
      required: ['negocio_id', 'servicio_id', 'fecha'],
    },
  },
  {
    name: 'create_booking',
    description: 'Crea una reserva para el cliente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        negocio_id: { type: 'string' },
        servicio_id: { type: 'string' },
        barbero_id: { type: 'string', description: 'UUID del barbero (opcional)' },
        fecha_hora: { type: 'string', description: 'ISO datetime, ej: 2026-04-10T14:00:00' },
        nombre_cliente: { type: 'string' },
        telefono_cliente: { type: 'string' },
      },
      required: ['negocio_id', 'servicio_id', 'fecha_hora', 'nombre_cliente', 'telefono_cliente'],
    },
  },
  {
    name: 'modify_booking',
    description: 'Modifica la fecha/hora de una reserva existente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reserva_id: { type: 'string', description: 'UUID de la reserva' },
        nueva_fecha_hora: { type: 'string', description: 'ISO datetime nuevo' },
      },
      required: ['reserva_id', 'nueva_fecha_hora'],
    },
  },
  {
    name: 'cancel_booking',
    description: 'Cancela una reserva existente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reserva_id: { type: 'string', description: 'UUID de la reserva' },
      },
      required: ['reserva_id'],
    },
  },
  {
    name: 'get_client_history',
    description: 'Obtiene el historial de reservas del cliente por teléfono.',
    input_schema: {
      type: 'object' as const,
      properties: {
        negocio_id: { type: 'string' },
        telefono: { type: 'string' },
      },
      required: ['negocio_id', 'telefono'],
    },
  },
  {
    name: 'escalate_to_owner',
    description: 'Escala la conversación al dueño del negocio cuando el agente no puede resolver.',
    input_schema: {
      type: 'object' as const,
      properties: {
        mensaje: { type: 'string', description: 'Resumen de por qué se escala' },
      },
      required: ['mensaje'],
    },
  },
]

async function executeTool(
  toolName: string,
  input: Record<string, string>,
  sessionId: string
): Promise<string> {
  const supabase = createAdminClient()

  switch (toolName) {
    case 'get_availability': {
      const { data: slots } = await supabase.rpc('get_available_slots', {
        p_negocio_id: input.negocio_id,
        p_servicio_id: input.servicio_id,
        p_fecha: input.fecha,
        p_barbero_id: input.barbero_id ?? null,
      })
      if (!slots || slots.length === 0) {
        return 'No hay horarios disponibles para esa fecha.'
      }
      const times = (slots as Array<{ slot: string }>).map(s => s.slot).slice(0, 8)
      return `Horarios disponibles: ${times.join(', ')}`
    }

    case 'create_booking': {
      const { data: reserva, error } = await supabase
        .from('reservas')
        .insert({
          negocio_id: input.negocio_id,
          servicio_id: input.servicio_id,
          barbero_id: input.barbero_id ?? null,
          fecha_hora: input.fecha_hora,
          nombre: input.nombre_cliente,
          telefono: input.telefono_cliente,
          estado: 'confirmada',
          politica_aceptada: true,
        })
        .select('id')
        .single()
      if (error) return `Error al crear la reserva: ${error.message}`
      return `Reserva creada exitosamente. ID: ${reserva.id}`
    }

    case 'modify_booking': {
      const { error } = await supabase
        .from('reservas')
        .update({ fecha_hora: input.nueva_fecha_hora })
        .eq('id', input.reserva_id)
      if (error) return `Error al modificar: ${error.message}`
      return 'Reserva modificada exitosamente.'
    }

    case 'cancel_booking': {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: 'cancelada' })
        .eq('id', input.reserva_id)
      if (error) return `Error al cancelar: ${error.message}`
      return 'Reserva cancelada exitosamente.'
    }

    case 'get_client_history': {
      const { data: reservas } = await supabase
        .from('reservas')
        .select('id, fecha_hora, estado, servicios(nombre)')
        .eq('negocio_id', input.negocio_id)
        .eq('telefono', input.telefono)
        .order('fecha_hora', { ascending: false })
        .limit(5)
      if (!reservas || reservas.length === 0) return 'No hay reservas anteriores.'
      const lines = reservas.map(
        (r: { id: string; fecha_hora: string; estado: string; servicios: { nombre: string } | null }) =>
          `- ${r.fecha_hora} | ${r.servicios?.nombre ?? 'Servicio'} | ${r.estado} (ID: ${r.id})`
      )
      return `Últimas reservas:\n${lines.join('\n')}`
    }

    case 'escalate_to_owner': {
      await escalateSession(sessionId)
      return `Escalado al dueño: "${input.mensaje}". El dueño será notificado.`
    }

    default:
      return 'Herramienta desconocida.'
  }
}

export async function runAgent(
  negocioId: string,
  sessionId: string,
  history: Message[],
  userMessage: string
): Promise<string> {
  const ctx = await getBusinessContext(negocioId)
  if (!ctx) return 'Lo siento, no encontré información del negocio.'

  const systemPrompt = buildSystemPrompt(ctx)

  // Convert history to Anthropic format
  const anthropicMessages: MessageParam[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    temperature: 0.7,
    system: systemPrompt,
    tools: TOOLS,
    messages: anthropicMessages,
  })

  // Agentic loop: handle tool calls
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
    const toolResults: MessageParam = {
      role: 'user',
      content: await Promise.all(
        toolUseBlocks.map(async block => {
          if (block.type !== 'tool_use') return { type: 'tool_result' as const, tool_use_id: '', content: '' }
          const result = await executeTool(
            block.name,
            block.input as Record<string, string>,
            sessionId
          )
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
          }
        })
      ),
    }

    anthropicMessages.push({ role: 'assistant', content: response.content })
    anthropicMessages.push(toolResults)

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      temperature: 0.7,
      system: systemPrompt,
      tools: TOOLS,
      messages: anthropicMessages,
    })
  }

  const textBlock = response.content.find(b => b.type === 'text')
  const assistantReply = textBlock && textBlock.type === 'text' ? textBlock.text : 'No pude generar una respuesta.'

  // Persist the new exchange
  await appendMessages(sessionId, [
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantReply },
  ])

  return assistantReply
}
