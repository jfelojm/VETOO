'use client'

import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside
      style={{
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: 16,
        position: 'sticky',
        top: 0,
        height: '100vh',
        background: 'rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ padding: 10, borderRadius: 14 }} className="card">
        <div style={{ fontWeight: 700, letterSpacing: -0.2 }}>Vetoo</div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(229,231,235,0.72)' }}>
          Panel de clínica
        </div>
      </div>

      <nav style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        <Link className="btn" href="/dashboard">
          Dashboard
        </Link>
        <Link className="btn" href="/portal">
          Portal
        </Link>
      </nav>
    </aside>
  )
}

