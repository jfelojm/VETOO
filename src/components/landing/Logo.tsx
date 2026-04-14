import { cn } from '@/lib/utils'

export type LandingLogoVariant = 'light' | 'dark' | 'icon'

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 28,
  md: 36,
  lg: 44,
}

/** Logo landing con SVG de referencia (60×60) + wordmark opcional */
export default function Logo({
  variant,
  size = 'md',
  className,
}: {
  variant: LandingLogoVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const px = SIZE_PX[size]
  const showWordmark = variant !== 'icon'

  const symClass =
    variant === 'dark' ? 'text-[#2ED8A3]' : 'text-[#0D9B6A]'
  const turnClass = variant === 'dark' ? 'text-white' : 'text-ink'
  const appClass = variant === 'dark' ? 'text-brand-glow' : 'text-brand-primary'

  const textPx = size === 'sm' ? 14 : size === 'md' ? 18 : 22

  return (
    <span
      className={cn('inline-flex items-center gap-2.5', showWordmark && 'gap-3', className)}
      role="img"
      aria-label="TurnApp"
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 60 60"
        fill="none"
        className={cn('shrink-0', symClass)}
        aria-hidden
      >
        <g transform="rotate(-90 30 30)">
          <circle
            cx="30"
            cy="30"
            r="22"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="110 28"
            strokeLinecap="round"
          />
        </g>
        <polygon points="46,14 55,17 49,25" fill="currentColor" />
        <circle cx="30" cy="30" r="5.5" fill="currentColor" />
      </svg>
      {showWordmark && (
        <span
          className="font-heading font-extrabold leading-none tracking-[-1.2px]"
          style={{ fontSize: textPx }}
        >
          <span className={turnClass}>Turn</span>
          <span className={appClass}>App</span>
        </span>
      )}
    </span>
  )
}
