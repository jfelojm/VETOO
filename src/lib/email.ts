/** Comparación estable de correos (trim + minúsculas). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function emailsIguales(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b)
}
