import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | TurnApp',
  description: 'Novedades y consejos para negocios de belleza en Ecuador.',
  alternates: { canonical: 'https://turnapp.lat/blog' },
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-chalk px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-bold text-ink md:text-3xl">Blog</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-muted">
        Próximamente: artículos y guías para sacarle partido a TurnApp.
      </p>
      <p className="mt-10">
        <a href="/" className="text-sm font-medium text-brand-primary hover:underline">
          Volver al inicio
        </a>
      </p>
    </div>
  )
}
