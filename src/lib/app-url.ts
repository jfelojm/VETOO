/**
 * URL pública de la app (invitaciones, enlaces en correo).
 * En Vercel, si falta NEXT_PUBLIC_APP_URL, usa VERCEL_URL.
 */
export function getPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (explicit) return explicit
  const v = process.env.VERCEL_URL?.trim()
  if (v) {
    const host = v.replace(/^https?:\/\//, '')
    return `https://${host}`
  }
  return 'http://localhost:3000'
}
