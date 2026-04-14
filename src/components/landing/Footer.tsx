import Link from 'next/link'
import Logo from '@/components/landing/Logo'

const FOOTER_LINKS = [
  { href: '#problemas', label: 'Problemas' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'FAQ' },
  { href: '/auth/login', label: 'Iniciar sesión' },
] as const

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink py-12 md:py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Logo variant="dark" size="md" />
          <p className="mt-4 max-w-xs text-sm text-white/50">
            Reservas online para barberías, peluquerías y salones. Hecho en Ecuador.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70" aria-label="Pie">
          {FOOTER_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-4 pt-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} TurnApp · Hecho en Ecuador 🇪🇨
      </div>
    </footer>
  )
}
