import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { refreshDemoReservations } from '@/lib/demo-reservations'

/**
 * Renueva las reservas ficticias del negocio demo (próximos días, sin domingos).
 * Proteger con CRON_SECRET (mismo patrón que /api/recordatorios).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const result = await refreshDemoReservations(admin)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: result.message, inserted: result.inserted })
}
