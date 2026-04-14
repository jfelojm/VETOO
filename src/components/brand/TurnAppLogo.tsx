'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export type TurnAppVariant = 'light' | 'dark' | 'icon-only'
export type TurnAppLogoSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<TurnAppLogoSize, { icon: number; text: number }> = {
  sm: { icon: 24, text: 14 },
  md: { icon: 32, text: 18 },
  lg: { icon: 40, text: 22 },
}

function palette(variant: 'light' | 'dark') {
  if (variant === 'dark') {
    return { sym: '#2ED8A3', turn: '#FAFAF9', app: '#2ED8A3' }
  }
  return { sym: '#0D9B6A', turn: '#0A0A0F', app: '#0D9B6A' }
}

/** Símbolo: arco (stroke-dasharray) + flecha + punto central */
export function TurnAppSymbol({
  size,
  color,
  className,
  'aria-hidden': ariaHidden = true,
}: {
  size: number
  color: string
  className?: string
  'aria-hidden'?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
    >
      <g transform="rotate(-90 28 28)">
        <circle
          cx="28"
          cy="28"
          r="22"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray="110 28"
          strokeLinecap="round"
        />
      </g>
      <polygon points="44.2,12.8 38.2,9.8 38.2,16.2" fill={color} />
      <circle cx="28" cy="28" r="5" fill={color} />
    </svg>
  )
}

export type TurnAppLogoProps = {
  variant?: TurnAppVariant
  size?: TurnAppLogoSize
  className?: string
  href?: string
  /** Ej. cerrar menú móvil al navegar */
  onClick?: () => void
  'aria-label'?: string
}

export default function TurnAppLogo({
  variant = 'light',
  size = 'md',
  className,
  href,
  onClick,
  'aria-label': ariaLabel = 'TurnApp',
}: TurnAppLogoProps) {
  const { icon: iconPx, text: textPx } = SIZE_MAP[size]
  const colorMode = variant === 'dark' ? 'dark' : 'light'
  const colors = palette(colorMode)
  const symColor = variant === 'icon-only' ? palette('light').sym : colors.sym

  const mark = (
    <>
      <TurnAppSymbol size={iconPx} color={symColor} aria-hidden />
      {variant !== 'icon-only' && (
        <span
          className="font-heading font-extrabold leading-none"
          style={{ fontSize: textPx, letterSpacing: '-1.2px' }}
        >
          <span style={{ color: colors.turn }}>Turn</span>
          <span style={{ color: colors.app }}>App</span>
        </span>
      )}
    </>
  )

  const body = (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        variant === 'icon-only' && 'gap-0',
        className
      )}
    >
      {mark}
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center"
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {body}
      </Link>
    )
  }

  return (
    <span className="inline-flex shrink-0 items-center" role="img" aria-label={ariaLabel}>
      {body}
    </span>
  )
}
