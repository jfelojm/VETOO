'use client'

import type { ReactNode } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import Topbar from '../../components/layout/Topbar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <main className="container" style={{ paddingTop: 18, paddingBottom: 32, flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

