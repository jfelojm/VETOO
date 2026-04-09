import { createAdminClient } from '@/lib/supabase/server'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_TTL_HOURS = 24
const MAX_CONTEXT_MESSAGES = 20

function buildSessionId(negocioId: string, clientPhone: string): string {
  return `${negocioId}:${clientPhone}`
}

/**
 * Get or create a conversation session. Starts a new session if TTL expired.
 */
export async function getOrCreateSession(
  negocioId: string,
  clientPhone: string
): Promise<{ sessionId: string; messages: Message[] }> {
  const supabase = createAdminClient()
  const sessionId = buildSessionId(negocioId, clientPhone)

  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('session_id, messages_json, updated_at, state')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    const lastActivity = new Date(existing.updated_at)
    const hoursInactive = (Date.now() - lastActivity.getTime()) / 3_600_000

    // Expire old sessions — create fresh
    if (hoursInactive > SESSION_TTL_HOURS) {
      await supabase
        .from('ai_conversations')
        .update({ messages_json: [], state: 'active', escalated_at: null })
        .eq('session_id', sessionId)
      return { sessionId, messages: [] }
    }

    const messages: Message[] = Array.isArray(existing.messages_json)
      ? (existing.messages_json as Message[]).slice(-MAX_CONTEXT_MESSAGES)
      : []
    return { sessionId, messages }
  }

  // Insert new session
  await supabase.from('ai_conversations').insert({
    session_id: sessionId,
    negocio_id: negocioId,
    client_phone: clientPhone,
    messages_json: [],
    state: 'active',
  })

  return { sessionId, messages: [] }
}

/**
 * Append messages to the conversation and persist.
 */
export async function appendMessages(
  sessionId: string,
  newMessages: Message[]
): Promise<void> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('messages_json')
    .eq('session_id', sessionId)
    .single()

  const current: Message[] = Array.isArray(existing?.messages_json)
    ? (existing.messages_json as Message[])
    : []

  const updated = [...current, ...newMessages].slice(-MAX_CONTEXT_MESSAGES * 2)

  await supabase
    .from('ai_conversations')
    .update({ messages_json: updated })
    .eq('session_id', sessionId)
}

/**
 * Mark conversation as escalated.
 */
export async function escalateSession(sessionId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('ai_conversations')
    .update({ state: 'escalated', escalated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
}
