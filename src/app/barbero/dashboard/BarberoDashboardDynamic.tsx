'use client'

import dynamic from 'next/dynamic'

const BarberoDashboardInner = dynamic(
  () => import('./BarberoDashboardInner'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div
          className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin"
          aria-hidden
        />
      </div>
    ),
  }
)

export default function BarberoDashboardDynamic() {
  return <BarberoDashboardInner />
}
