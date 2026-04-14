import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Problems from '@/components/landing/Problems'
import Features from '@/components/landing/Features'
import TrialBanner from '@/components/landing/TrialBanner'
import Comparison from '@/components/landing/Comparison'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import FinalCTA from '@/components/landing/FinalCTA'
import Footer from '@/components/landing/Footer'

const siteUrl = 'https://turnapp.lat'

export const metadata: Metadata = {
  title: 'TurnApp | Reservas Online para Negocios de Belleza — Ecuador',
  description:
    'Sistema de reservas online para barberías, peluquerías y salones. Sin comisiones. Los clientes son tuyos. Desde $19/mes. 14 días gratis.',
  alternates: {
    canonical: siteUrl,
    languages: {
      'es-EC': siteUrl,
    },
  },
  openGraph: {
    title: 'TurnApp | Reservas Online para Negocios de Belleza — Ecuador',
    description:
      'Sistema de reservas online para barberías, peluquerías y salones. Sin comisiones. Los clientes son tuyos. Desde $19/mes. 14 días gratis.',
    url: siteUrl,
    siteName: 'TurnApp',
    locale: 'es_EC',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'TurnApp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TurnApp | Reservas Online para Negocios de Belleza — Ecuador',
    description:
      'Sistema de reservas online para barberías, peluquerías y salones. Sin comisiones. Los clientes son tuyos.',
    images: ['/twitter-image'],
  },
  robots: { index: true, follow: true },
}

export default function HomePage() {
  return (
    <div className="landing-grain min-h-screen bg-chalk">
      <div className="relative z-[1]">
        <Navbar />
        <main>
          <Hero />
          <Problems />
          <Features />
          <TrialBanner />
          <Comparison />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  )
}
