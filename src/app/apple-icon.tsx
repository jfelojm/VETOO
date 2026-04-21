import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Icono Apple (iOS): paleta Vetoo — naranja #E8845A y acento blanco */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E8845A',
          borderRadius: '22%',
        }}
      >
        <svg width="65%" height="65%" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16 18 C14 13 10 11 8.5 13.5 C7.5 16 9.5 20 13 22"
            fill="#E8845A"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M40 18 C42 13 46 11 47.5 13.5 C48.5 16 46.5 20 43 22"
            fill="#E8845A"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="34" r="19" fill="#E8845A" stroke="#fff" strokeWidth="2" />
          <circle cx="21" cy="29" r="3.2" fill="#fff" />
          <circle cx="35" cy="29" r="3.2" fill="#fff" />
          <ellipse cx="28" cy="36" rx="3" ry="2.2" fill="#fff" />
          <path d="M23 44 Q28 50 33 44" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
