import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D9B6A',
          borderRadius: '20%',
        }}
      >
        <svg width="60%" height="60%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="rotate(-90 28 28)">
            <circle
              cx="28"
              cy="28"
              r="22"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeDasharray="110 28"
              strokeLinecap="round"
            />
          </g>
          <polygon points="44.2,12.8 38.2,9.8 38.2,16.2" fill="#FFFFFF" />
          <circle cx="28" cy="28" r="5" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
