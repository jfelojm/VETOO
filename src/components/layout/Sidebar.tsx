'use client'

import Image from 'next/image'
import Link from 'next/link'

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}

type ItemId = 'agenda' | 'pacientes' | 'vacunacion' | 'miweb' | 'configuracion'

export default function Sidebar({
  clinicaName,
  planName,
  activeItem,
}: {
  clinicaName: string
  planName: string
  activeItem: ItemId | string
}) {
  const itemBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 10,
    fontSize: 13,
    color: '#B8A89E',
  }

  const itemActive: React.CSSProperties = {
    backgroundColor: '#3D3028',
    color: '#fff',
  }

  const itemHoverClass =
    'transition-colors hover:bg-[#342820] hover:text-white'

  const initials = initialsFromName(clinicaName)

  return (
    <aside
      style={{
        width: 220,
        position: 'fixed',
        inset: '0 auto 0 0',
        backgroundColor: '#2C2420',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Image src="/logo.svg" alt="Vetoo" width={32} height={32} priority />
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontFamily: 'Georgia, serif', color: '#fff', fontSize: 18 }}>
            Vetoo
          </div>
        </div>
      </div>

      <nav style={{ padding: '4px 10px 10px', overflowY: 'auto' }}>
        <div style={{ padding: '10px 10px 6px', color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 0.8 }}>
          PRINCIPAL
        </div>

        <Link
          href="/dashboard"
          className={itemHoverClass}
          style={{ ...itemBase, ...(activeItem === 'agenda' ? itemActive : undefined) }}
        >
          <Dot color="#E8845A" />
          Agenda del día
        </Link>

        <Link
          href="/dashboard/pacientes"
          className={itemHoverClass}
          style={{ ...itemBase, ...(activeItem === 'pacientes' ? itemActive : undefined) }}
        >
          <Dot color="#3AAFA9" />
          Pacientes
        </Link>

        <Link
          href="/dashboard/vacunacion"
          className={itemHoverClass}
          style={{ ...itemBase, ...(activeItem === 'vacunacion' ? itemActive : undefined) }}
        >
          <Dot color="#5BAD6A" />
          Vacunación
        </Link>

        <div style={{ padding: '14px 10px 6px', color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 0.8 }}>
          CLÍNICA
        </div>

        <Link
          href="/dashboard/mi-web"
          className={itemHoverClass}
          style={{ ...itemBase, ...(activeItem === 'miweb' ? itemActive : undefined) }}
        >
          <Dot color="#9CA3AF" />
          Mi web
        </Link>

        <Link
          href="/dashboard/configuracion"
          className={itemHoverClass}
          style={{ ...itemBase, ...(activeItem === 'configuracion' ? itemActive : undefined) }}
        >
          <Dot color="#9CA3AF" />
          Configuración
        </Link>
      </nav>

      <div style={{ marginTop: 'auto', padding: 12 }}>
        <div
          style={{
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: 'rgba(232,132,90,0.18)',
              color: '#E8845A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clinicaName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {planName}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

