import { ImageResponse } from 'next/og'

export const alt = 'TurnApp — Reservas online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
          background: '#0A0A0F',
        }}
      >
        <svg width="200" height="200" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="rotate(-90 28 28)">
            <circle
              cx="28"
              cy="28"
              r="22"
              stroke="#2ED8A3"
              strokeWidth="2.5"
              strokeDasharray="110 28"
              strokeLinecap="round"
            />
          </g>
          <polygon points="44.2,12.8 38.2,9.8 38.2,16.2" fill="#2ED8A3" />
          <circle cx="28" cy="28" r="5" fill="#2ED8A3" />
        </svg>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            letterSpacing: '-1.2px',
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: '#FAFAF9',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Turn
          </span>
          <span
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: '#2ED8A3',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            App
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
