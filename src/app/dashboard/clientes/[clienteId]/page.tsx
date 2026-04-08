'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Calendar, Mail, Phone, User } from 'lucide-react'
import NotasStaffCliente from '@/components/clientes/NotasStaffCliente'
import { nombreClienteReservaRow } from '@/lib/utils'

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
  cancelaciones_mes: number
  created_at: string
}

interface ReservaHist {
  id: string
  fecha_hora: string
  estado: string
  duracion: number
  cliente_nombre_snapshot?: string | null
  servicio: { nombre: string } | null
  barbero: { nombre: string } | null
  cliente: { nombre: string } | null
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
          servicio:servicios(nombre), barbero:barberos(nombre), cliente:clientes(nombre)`
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
      <div className="text-gray-400 text-sm py-12 text-center">Cargando ficha…</div>
    )
  }

  if (error || !cliente || !negocioId) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600 mb-4">{error ?? 'No encontrado'}</p>
        <Link href="/dashboard/clientes" className="text-brand-700 font-medium text-sm">
          Volver a clientes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Clientes
        </Link>
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
              cliente.bloqueado ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'
            }`}
          >
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
              {cliente.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4 shrink-0" /> {cliente.telefono}
                </span>
              )}
              {cliente.email && (
                <span className="flex items-center gap-1 min-w-0">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-4 h-4" />
                Cliente desde {format(parseISO(cliente.created_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>
            {cliente.bloqueado && (
              <p className="text-xs text-red-700 mt-2">Cliente bloqueado en el sistema.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-600" />
          Historial de citas
        </h2>
        {reservas.length === 0 ? (
          <p className="text-sm text-gray-400">No hay reservas registradas aún.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reservas.map(r => (
              <li key={r.id} className="py-3 first:pt-0 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(parseISO(r.fecha_hora), "EEE d MMM yyyy · HH:mm", { locale: es })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {nombreClienteReservaRow(r)} · {r.servicio?.nombre ?? 'Servicio'} ·{' '}
                    {r.barbero?.nombre ?? '—'}
                  </p>
                </div>
                <span className="text-xs badge badge-gray">{ESTADO_LABEL[r.estado] ?? r.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotasStaffCliente clienteId={cliente.id} />
    </div>
  )
}
