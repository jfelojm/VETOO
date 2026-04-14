'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/landing/Logo'
import { trackRegisterIntent } from '@/lib/analytics'

const LINKS = [
  { href: '#problemas', label: 'Problemas' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'FAQ' },
] as const

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-out',
        scrolled
          ? 'border-b border-border/60 bg-[rgba(250,250,249,0.9)] backdrop-blur-[24px] shadow-sm'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[72px]">
        <Link href="/" className="shrink-0" aria-label="Inicio TurnApp">
          <Logo variant="light" size="md" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/auth/register"
            className="btn-primary px-4 py-2.5 text-sm md:px-5"
            onClick={() => trackRegisterIntent('navbar')}
          >
            Prueba Gratis
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-ink md:hidden"
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 top-16 z-[99] bg-chalk/98 backdrop-blur-md md:hidden">
          <nav className="flex flex-col gap-1 border-t border-border px-4 py-4" aria-label="Móvil">
            {LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/auth/register"
              className="btn-primary mt-4 text-center"
              onClick={() => {
                trackRegisterIntent('navbar_mobile')
                setOpen(false)
              }}
            >
              Prueba Gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
