/** Slug URL-safe a partir del nombre de la clínica (ej. "Clínica Méndez" → "clinica-mendez"). */
export function slugifyClinica(nombre: string): string {
  const s = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return s || 'clinica'
}
