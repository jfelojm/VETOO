import type { MetadataRoute } from 'next'

const SITE = 'https://turnapp.lat'

/** Páginas públicas (sin /dashboard ni /api). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${SITE}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/planes`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/reservar/demo`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/blog`, lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/login`, lastModified, changeFrequency: 'never', priority: 0.3 },
    { url: `${SITE}/registro`, lastModified, changeFrequency: 'never', priority: 0.5 },
  ]
}
