/** JPG/PNG/WEBP. En Windows el explorador a veces envía type vacío o application/octet-stream. */
export const ALLOWED_SERVICE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function inferImageMime(file: { type: string; name: string }): string | null {
  const t = file.type?.trim()
  if (t && ALLOWED_SERVICE_IMAGE_TYPES.has(t)) return t
  if (t && t !== 'application/octet-stream') return null
  const n = file.name.toLowerCase()
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg'
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.webp')) return 'image/webp'
  return null
}

export function extFromMime(mime: string): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}
