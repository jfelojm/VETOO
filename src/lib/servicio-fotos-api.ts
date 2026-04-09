import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'service-photos'

export const MAX_FOTOS_POR_SERVICIO = 5
export const SIGNED_URL_SECONDS_24H = 60 * 60 * 24

export async function assertOwnerServicio(
  supabase: SupabaseClient,
  userId: string,
  servicioId: string
): Promise<
  | { ok: true; negocioId: string }
  | { ok: false; status: number; message: string }
> {
  const { data: svc, error } = await supabase
    .from('servicios')
    .select('id, negocio_id')
    .eq('id', servicioId)
    .maybeSingle()

  if (error || !svc) {
    return { ok: false, status: 404, message: 'Servicio no encontrado' }
  }

  const { data: neg } = await supabase
    .from('negocios')
    .select('owner_id')
    .eq('id', svc.negocio_id)
    .maybeSingle()

  if (!neg || neg.owner_id !== userId) {
    return { ok: false, status: 403, message: 'Solo el dueño del negocio puede gestionar las fotos' }
  }

  return { ok: true, negocioId: svc.negocio_id }
}

export { BUCKET }
