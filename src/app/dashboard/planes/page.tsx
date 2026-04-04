'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Check, Loader2, CreditCard } from 'lucide-react'
import { differenceInCalendarDays, isAfter, parseISO } from 'date-fns'

type PlanKey = 'basic' | 'pro'

const PLANES_UI: {
  id: PlanKey
  nombre: string
  precioBaseUsd: number
  totalConIvaUsd: number
  features: string[]
}[] = [
  {
    id: 'basic',
    nombre: 'Básico',
    precioBaseUsd: 19,
    totalConIvaUsd: 21.85,
    features: [
      'Hasta 2 profesionales activos',
      'Hasta 10 servicios',
      'Reservas online con tu link',
      'Recordatorios por correo',
      'Agenda y política de cancelación',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precioBaseUsd: 39,
    totalConIvaUsd: 44.85,
    features: [
      'Profesionales y servicios ilimitados',
      'Reportes avanzados e ingresos estimados',
      'Lista negra de clientes',
      'Marca en tu página de reservas',
      'Todo lo del plan Básico y más',
    ],
  },
]

function etiquetaPlan(plan: string | null | undefined): string {
  if (!plan) return '—'
  const p = plan.toLowerCase()
  if (p === 'trial') return 'Prueba'
  if (p === 'basic') return 'Básico'
  if (p === 'pro' || p === 'premium') return 'Pro'
  if (p === 'cancelled') return 'Cancelado'
  return plan
}

export default function PlanesPage() {
  const supabase = createClient()
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [planExpiraAt, setPlanExpiraAt] = useState<string | null>(null)
  const [trialExpiraAt, setTrialExpiraAt] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<PlanKey | null>(null)

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('negocios')
        .select('id, plan, plan_expira_at, trial_expira_at')
        .eq('owner_id', user.id)
        .single()
      if (data) {
        setNegocioId(data.id)
        setPlan(data.plan)
        setPlanExpiraAt(data.plan_expira_at)
        setTrialExpiraAt(data.trial_expira_at)
      }
      setCargando(false)
    }
    void cargar()
  }, [supabase])

  async function suscribir(planId: PlanKey) {
    if (!negocioId) return
    setCheckoutPlan(planId)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/suscripcion/pagar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ plan: planId, negocio_id: negocioId }),
      })
      const raw = await res.text()
      let data: { url?: string; error?: string }
      try {
        data = JSON.parse(raw) as { url?: string; error?: string }
      } catch {
        toast.error(
          'El servidor devolvió una respuesta no válida (¿HTML en lugar de JSON?). Revisa la consola de red.'
        )
        return
      }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'No se pudo crear el pago')
        return
      }
      window.location.assign(data.url)
    } catch {
      toast.error('Error de red al iniciar el pago')
    } finally {
      setCheckoutPlan(null)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
      </div>
    )
  }

  const ahora = new Date()
  let diasRestantes: number | null = null
  let activoPago = false

  if (plan === 'trial' && trialExpiraAt && isAfter(parseISO(trialExpiraAt), ahora)) {
    diasRestantes = differenceInCalendarDays(parseISO(trialExpiraAt), ahora)
    activoPago = true
  } else if (
    (plan === 'basic' || plan === 'pro' || plan === 'premium') &&
    planExpiraAt &&
    isAfter(parseISO(planExpiraAt), ahora)
  ) {
    diasRestantes = differenceInCalendarDays(parseISO(planExpiraAt), ahora)
    activoPago = true
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes y facturación</h1>
          <p className="text-gray-500 text-sm mt-1">
            Paga con PayPhone (tarjeta u otros medios habilitados). IVA Ecuador 15% incluido en el total.
          </p>
        </div>
      </div>

      <div className="card mb-8 border-brand-100 bg-brand-50/50">
        <p className="text-sm font-medium text-gray-900 mb-1">Tu suscripción</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-gray-700">
            Plan actual: <strong>{etiquetaPlan(plan)}</strong>
          </span>
          {plan === 'trial' && trialExpiraAt && (
            <span className="text-sm text-gray-600">
              · Trial hasta{' '}
              {new Date(trialExpiraAt).toLocaleDateString('es-EC', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          {(plan === 'basic' || plan === 'pro' || plan === 'premium') && planExpiraAt && (
            <span className="text-sm text-gray-600">
              · Vence el{' '}
              {new Date(planExpiraAt).toLocaleDateString('es-EC', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          {activoPago && diasRestantes !== null && (
            <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 border border-green-200">
              Activo · {diasRestantes}{' '}
              {diasRestantes === 1 ? 'día restante' : 'días restantes'}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Tras pagar, PayPhone notifica a Turnapp y tu plan se activa por 30 días. Si no ves el cambio al
          volver, espera unos segundos o actualiza la página.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {PLANES_UI.map(p => (
          <div
            key={p.id}
            className={`card flex flex-col border-2 ${
              plan === p.id ? 'border-brand-400 ring-1 ring-brand-100' : 'border-gray-100'
            }`}
          >
            <h2 className="text-lg font-bold text-gray-900">{p.nombre}</h2>
            <p className="text-sm text-gray-500 mt-1">
              ${p.precioBaseUsd.toFixed(2)} USD/mes + IVA 15%
            </p>
            <p className="text-2xl font-bold text-brand-700 mt-2">
              ${p.totalConIvaUsd.toFixed(2)}{' '}
              <span className="text-sm font-normal text-gray-500">USD total / mes</span>
            </p>
            <ul className="mt-4 space-y-2 flex-1">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={checkoutPlan !== null}
              onClick={() => void suscribir(p.id)}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              {checkoutPlan === p.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a PayPhone…
                </>
              ) : (
                'Suscribirse'
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-8">
        ¿Problemas con el cobro?{' '}
        <Link href="/dashboard/ajustes" className="text-brand-600 underline">
          Ajustes
        </Link>
      </p>
    </div>
  )
}
