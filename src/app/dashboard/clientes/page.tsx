'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, AlertTriangle } from 'lucide-react'
import { usePlanAcceso } from '@/app/dashboard/PlanAccesoContext'
import { cn, formatPrecio } from '@/lib/utils'

interface Cliente {
  id: string
  nombre: string
  telefono: string
  email: string | null
  cancelaciones_mes: number
  bloqueado: boolean
  bloqueado_motivo: string | null
  created_at: string
}

type ClienteStats = { visitas: number; ultima: string | null; gasto: number }

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0]!.slice(0, 1) + p[1]!.slice(0, 1)).toUpperCase()
  return nombre.trim().slice(0, 2).toUpperCase() || '?'
}

export default function ClientesPage() {
  const supabase = createClient()
  const { capacidades } = usePlanAcceso()
  const [negocioId, setNegocioId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [statsPorCliente, setStatsPorCliente] = useState<Record<string, ClienteStats>>({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: neg } = await supabase.from('negocios').select('id').eq('owner_id', user.id).single()
      if (!neg) return
      setNegocioId(neg.id)

      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('negocio_id', neg.id)
        .order('created_at', { ascending: false })

      setClientes((data ?? []) as Cliente[])
      setCargando(false)
    }
    cargar()
  }, [supabase])

  useEffect(() => {
    if (!negocioId || clientes.length === 0) {
      setStatsPorCliente({})
      return
    }
    let cancelled = false
    void (async () => {
      const ids = clientes.map(c => c.id)
      const { data } = await supabase
        .from('reservas')
        .select('cliente_id, fecha_hora, estado, servicio:servicios(precio)')
        .eq('negocio_id', negocioId)
        .in('cliente_id', ids)

      if (cancelled || !data) return

      const map: Record<string, ClienteStats> = {}
      for (const c of clientes) {
        map[c.id] = { visitas: 0, ultima: null, gasto: 0 }
      }
      for (const r of data) {
        const cid = r.cliente_id as string
        if (!map[cid]) continue
        const est = r.estado as string
        if (est === 'cancelada') continue
        map[cid].visitas += 1
        const fh = r.fecha_hora as string
        if (!map[cid].ultima || fh > map[cid].ultima!) map[cid].ultima = fh
        if (est === 'completada') {
          const p = (r.servicio as { precio?: number } | null)?.precio
          if (typeof p === 'number') map[cid].gasto += p
        }
      }
      setStatsPorCliente(map)
    })()
    return () => {
      cancelled = true
    }
  }, [negocioId, clientes, supabase])

  async function toggleBloqueo(cliente: Cliente) {
    if (!capacidades?.listaNegraClientes) {
      return
    }
    const { error } = await supabase
      .from('clientes')
      .update({ bloqueado: !cliente.bloqueado })
      .eq('id', cliente.id)
    if (error) return
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, bloqueado: !c.bloqueado } : c))
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda) ||
    (c.email ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  if (cargando) return <div className="text-sm text-ink-muted">Cargando...</div>

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mt-0 text-sm text-ink-muted">{clientes.length} clientes registrados</p>
          {!capacidades?.listaNegraClientes && (
            <p className="mt-2 max-w-xl text-xs text-amber-800">
              Bloquear o desbloquear clientes manualmente es parte del plan Pro.{' '}
              <Link href="/#planes" className="font-medium text-brand-primary underline">
                Ver planes
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" strokeWidth={2} aria-hidden />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input-r12 w-full py-3 pl-11"
          placeholder="Buscar por nombre, teléfono o email..."
          type="search"
          autoComplete="off"
        />
      </div>

      {clientesFiltrados.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm text-ink-muted">
            {busqueda ? 'No se encontraron clientes con esa búsqueda' : 'Aún no tienes clientes registrados'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Los clientes aparecen aquí cuando hacen su primera reserva
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {clientesFiltrados.map(c => {
            const st = statsPorCliente[c.id]
            return (
              <li key={c.id}>
                <div
                  className={cn(
                    'card relative overflow-hidden p-4 md:p-5',
                    c.bloqueado && 'ring-1 ring-danger/25'
                  )}
                >
                  {c.bloqueado && (
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-danger/12 px-2.5 py-1 text-xs font-semibold text-danger">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        Lista negra
                      </span>
                      {c.bloqueado_motivo ? (
                        <p className="text-xs text-ink-soft sm:text-right">{c.bloqueado_motivo}</p>
                      ) : null}
                    </div>
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-dark">
                        {iniciales(c.nombre)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/clientes/${c.id}`}
                            className="text-[15px] font-medium leading-snug text-ink hover:text-brand-primary"
                          >
                            {c.nombre}
                          </Link>
                          {c.cancelaciones_mes >= 2 && !c.bloqueado && (
                            <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                              {c.cancelaciones_mes} cancelaciones
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[14px] text-ink-muted">
                          Última visita:{' '}
                          {st?.ultima
                            ? format(parseISO(st.ultima), "d MMM yyyy", { locale: es })
                            : '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="font-heading text-base font-semibold text-brand-primary">
                            {st && st.gasto > 0 ? formatPrecio(st.gasto) : '—'}
                            <span className="ml-1 text-xs font-normal text-ink-muted">total</span>
                          </span>
                          <span className="inline-flex rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                            {st?.visitas ?? 0} visitas
                          </span>
                        </div>
                      </div>
                    </div>

                    {capacidades?.listaNegraClientes ? (
                      <button
                        type="button"
                        onClick={() => void toggleBloqueo(c)}
                        className={cn(
                          'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:self-center',
                          c.bloqueado
                            ? 'border border-border bg-chalk text-ink-soft hover:bg-brand-light hover:text-brand-dark'
                            : 'bg-danger/10 text-danger hover:bg-danger/15'
                        )}
                      >
                        {c.bloqueado ? 'Quitar de lista negra' : 'Añadir a lista negra'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
