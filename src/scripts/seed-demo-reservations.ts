/**
 * Pobla / renueva reservas demo sin pasar por HTTP.
 * Uso (desde la carpeta barberapp): npx tsx src/scripts/seed-demo-reservations.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { refreshDemoReservations } from '../lib/demo-reservations'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa .env.local)')
    process.exit(1)
  }

  const admin = createClient(url, key)
  const result = await refreshDemoReservations(admin)
  if (result.ok) {
    console.log('OK:', result.message, result.inserted != null ? `(${result.inserted} reservas)` : '')
    process.exit(0)
  }
  console.error('Error:', result.message)
  process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
