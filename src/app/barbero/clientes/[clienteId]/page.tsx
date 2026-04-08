'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Calendar, LogOut, Mail, Phone, Scissors, User } from 'lucide-react'
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

export default function BarberoClienteFichaPage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.clienteId as string
  const supabase = createClient()

  const [miNegocioId, setMiNegocioId] = useState<string | null>(null)
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
      const barberoId = user.user_metadata?.barbero_id as string | undefined
      if (!barberoId) {
        router.replace('/auth/login')
        return
      }

      const { data: b } = await supabase
        .from('barberos')
        .select('id, negocio_id')
        .eq('id', barberoId)
        .single()

      if (!b) {
        setError('Perfil no encontrado')
        setCargando(false)
        return
      }

      setMiNegocioId(b.negocio_id)

      const { data: c, error: errC } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .eq('negocio_id', b.negocio_id)
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
        .eq('negocio_id', b.negocio_id)
        .order('fecha_hora', { ascending: false })
        .limit(200)

      setReservas((r as unknown as ReservaHist[]) ?? [])
      setCargando(false)
    }
    void cargar()
  }, [clienteId, router, supabase])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Scissors className="w-8 h-8 text-brand-600 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-400 text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  if (error || !cliente || !miNegocioId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="card max-w-lg mx-auto text-center py-12">
          <p className="text-gray-600 mb-4">{error ?? 'No encontrado'}</p>
          <Link href="/barbero/dashboard" className="text-brand-700 font-medium text-sm">
            Volver al panel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Scissors className="w-6 h-6 text-brand-600 shrink-0" />
          <span className="font-semibold text-gray-900 truncate">Ficha cliente</span>
        </div>
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <Link
          href="/barbero/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" /> Agenda
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg shrink-0">
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{cliente.nombre}</h1>
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
                Desde {format(parseISO(cliente.created_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>
          </div>
        </div>

        <div className="card border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600" />
            Historial de citas
          </h2>
          {reservas.length === 0 ? (
            <p className="text-sm text-gray-400">No hay reservas registradas.</p>
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
    </div>
  )
}
