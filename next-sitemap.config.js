/**
 * @deprecated El sitemap lo genera `src/app/sitemap.ts` (Next.js App Router).
 * Se mantiene el archivo por si quieres regenerar robots con next-sitemap a mano.
 * `postbuild` ya no ejecuta next-sitemap para no sobrescribir `/sitemap.xml`.
 */
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://turnapp.lat',
  generateRobotsTxt: false,
  outDir: 'public',
}
