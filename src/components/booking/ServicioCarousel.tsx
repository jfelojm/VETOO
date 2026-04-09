'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Scissors } from 'lucide-react'

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
        <div className="h-[200px] w-full rounded-xl bg-gray-100 flex items-center justify-center border border-gray-100">
          <Scissors className="w-12 h-12 text-gray-300" aria-hidden />
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
        className="relative h-[200px] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-100 touch-pan-y"
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white"
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
                i === idx ? 'w-2.5 h-2.5 bg-brand-600' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
