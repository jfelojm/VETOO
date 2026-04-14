'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TurnAppSymbol } from '@/components/brand/TurnAppLogo'

type Props = {
  urls: string[]
  nombre: string
}

export default function ServicioCarousel({ urls, nombre }: Props) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const n = urls.length

  const go = (delta: number) => {
    if (n <= 1) return
    setIdx(i => (i + delta + n) % n)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || n <= 1) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx > 56) go(-1)
    else if (dx < -56) go(1)
  }

  if (n === 0) {
    return (
      <div
        className="w-full"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex h-[200px] w-full items-center justify-center rounded-t-md border-b border-border bg-surface">
          <TurnAppSymbol size={48} color="rgba(107,107,118,0.4)" aria-hidden />
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        className="relative h-[200px] w-full overflow-hidden rounded-t-md border-b border-border bg-surface touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={urls[idx]}
          alt={`${nombre} · foto ${idx + 1} de ${n}`}
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
          priority={idx === 0}
        />
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-chalk/95 text-ink-soft shadow-sm backdrop-blur-sm hover:bg-chalk"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-chalk/95 text-ink-soft shadow-sm backdrop-blur-sm hover:bg-chalk"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="flex justify-center gap-2 mt-2.5" role="tablist" aria-label="Fotos del servicio">
          {urls.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Ir a foto ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx ? 'h-2.5 w-2.5 bg-brand-primary' : 'h-2 w-2 bg-border hover:bg-ink-muted/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
