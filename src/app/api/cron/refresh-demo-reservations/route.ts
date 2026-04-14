import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { refreshDemoReservations } from '@/lib/demo-reservations'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * Renueva las reservas ficticias del negocio demo (próximos días, sin domingos).
 * Proteger con CRON_SECRET (mismo patrón que /api/recordatorios).
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const result = await refreshDemoReservations(admin)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: result.message, inserted: result.inserted })
}
