'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Calendar, Mail, Phone } from 'lucide-react'
import NotasStaffCliente from '@/components/clientes/NotasStaffCliente'
import { formatPrecio } from '@/lib/utils'

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_show: 'No asistió',
}

interface ClienteRow {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  negocio_id: string
  bloqueado: boolean
  bloqueado_motivo: string | null
  cancelaciones_mes: number
  created_at: string
}

interface ReservaHist {
  id: string
  fecha_hora: string
  estado: string
  duracion: number
  cliente_nombre_snapshot?: string | null
  servicio: { nombre: string; precio?: number | null } | null
  barbero: { nombre: string } | null
  cliente: { nombre: string } | null
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0]!.slice(0, 1) + p[1]!.slice(0, 1)).toUpperCase()
  return nombre.trim().slice(0, 2).toUpperCase() || '?'
}

export default function ClienteFichaPage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.clienteId as string
  const supabase = createClient()

  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [cliente, setCliente] = useState<ClienteRow | null>(null)
  const [reservas, setReservas] = useState<ReservaHist[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) {
        router.replace('/dashboard')
        return
      }
      setNegocioId(neg.id)

      const { data: c, error: errC } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .eq('negocio_id', neg.id)
        .single()

      if (errC || !c) {
        setError('Cliente no encontrado')
        setCargando(false)
        return
      }

      setCliente(c as ClienteRow)

      const { data: r } = await supabase
        .from('reservas')
        .select(
          `id, fecha_hora, estado, duracion, cliente_nombre_snapshot,
          servicio:servicios(nombre, precio), barbero:barberos(nombre), cliente:clientes(nombre)`
        )
        .eq('cliente_id', clienteId)
        .eq('negocio_id', neg.id)
        .order('fecha_hora', { ascending: false })
        .limit(200)

      setReservas((r as unknown as ReservaHist[]) ?? [])
      setCargando(false)
    }
    void cargar()
  }, [clienteId, router, supabase])

  if (cargando) {
    return (
      <div className="py-12 text-center text-sm text-ink-muted">Cargando ficha…</div>
    )
  }

  if (error || !cliente || !negocioId) {
    return (
      <div className="card py-12 text-center">
        <p className="mb-4 text-ink-soft">{error ?? 'No encontrado'}</p>
        <Link href="/dashboard/clientes" className="text-sm font-medium text-brand-primary hover:underline">
          Volver a clientes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/clientes"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-xl font-bold text-brand-dark">
            {iniciales(cliente.nombre)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">{cliente.nombre}</h1>
            <div className="mt-3 flex flex-col gap-2 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              {cliente.telefono && (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2} />
                  {cliente.telefono}
                </span>
              )}
              {cliente.email && (
                <span className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2} />
                  <span className="truncate">{cliente.email}</span>
                </span>
              )}
              <span className="flex items-center gap-2 text-ink-muted">
                <Calendar className="h-4 w-4 shrink-0" strokeWidth={2} />
                Cliente desde {format(parseISO(cliente.created_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>
            {cliente.bloqueado && (
              <div className="mt-4 rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger">
                <p className="font-semibold">Lista negra</p>
                {cliente.bloqueado_motivo ? (
                  <p className="mt-1 text-xs text-ink-soft">{cliente.bloqueado_motivo}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-muted">Cliente bloqueado en el sistema.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-6 font-heading text-lg font-semibold text-ink">Historial de visitas</h2>
        {reservas.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay reservas registradas aún.</p>
        ) : (
          <div className="relative ml-3">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-border" aria-hidden />
            <ul className="space-y-6">
              {reservas.map(r => {
                const precio = r.servicio?.precio
                const precioTxt =
                  typeof precio === 'number' && precio > 0 ? formatPrecio(precio) : '—'
                return (
                  <li key={r.id} className="relative pl-6">
                    <span
                      className="absolute left-0 top-1.5 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-primary ring-4 ring-chalk"
                      aria-hidden
                    />
                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {format(parseISO(r.fecha_hora), "EEE d MMM yyyy · HH:mm", { locale: es })}
                        </p>
                        <p className="mt-1 text-[13px] text-ink-muted">
                          <span className="font-medium text-ink-soft">{r.servicio?.nombre ?? 'Servicio'}</span>
                          {' · '}
                          {r.barbero?.nombre ?? '—'}
                          {' · '}
                          <span className="font-heading font-semibold text-brand-primary">{precioTxt}</span>
                        </p>
                      </div>
                      <span className="mt-1 inline-flex w-fit rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted sm:mt-0">
                        {ESTADO_LABEL[r.estado] ?? r.estado}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <NotasStaffCliente clienteId={cliente.id} />
    </div>
  )
}
