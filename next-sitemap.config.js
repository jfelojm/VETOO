/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://turnapp.lat',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  /** Nota: `/*` no coincide con la ruta exacta (p. ej. hay que añadir `/dashboard`). */
  exclude: [
    '/api/*',
    '/auth/*',
    '/dashboard',
    '/dashboard/*',
    '/admin/*',
    '/barbero/*',
    '/reservar/demo',
    '/icon',
    '/apple-icon',
    '/opengraph-image',
    '/twitter-image',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dashboard/', '/admin/', '/barbero/'],
      },
    ],
  },
  transform: async (config, path) => {
    const priorities = {
      '/': 1.0,
      '/precios': 0.9,
    }
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: priorities[path] ?? config.priority,
      lastmod: new Date().toISOString(),
    }
  },
}
