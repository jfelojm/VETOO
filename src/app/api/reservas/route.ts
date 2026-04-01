import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, addMinutes } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import type { BloqueoSlotRow, ReservaSlotRow } from '@/lib/reservas-capacidad'
import { slotDisponibleSinPreferencia, solapa } from '@/lib/reservas-capacidad'

const TZ_NEGOCIO = process.env.NEGOCIO_TIMEZONE || 'America/Guayaquil'

const schema = z.object({
  negocio_id:        z.string().uuid(),
  barbero_id:        z.string().uuid().nullable().optional(),
  servicio_id:       z.string().uuid().nullable().optional(),
  nombre:            z.string().min(2),
  telefono:          z.string().min(7),
  email:             z.string().email().nullable().optional(),
  fecha_hora:        z.string().datetime(),
  notas_cliente:     z.string().nullable().optional(),
  politica_aceptada: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: negocio } = await supabase
      .from('negocios').select('*').eq('id', data.negocio_id).single()

    if (!negocio || !negocio.activo) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    let duracion = negocio.duracion_turno_min
    if (data.servicio_id) {
      const { data: servicio } = await supabase
        .from('servicios').select('duracion').eq('id', data.servicio_id).single()
      if (servicio) duracion = servicio.duracion
    }

    const cursor = new Date(data.fecha_hora)
    const slotFin = addMinutes(cursor, duracion)

    if (!data.barbero_id) {
      const fechaIso = formatInTimeZone(cursor, TZ_NEGOCIO, 'yyyy-MM-dd')
      const rangoInicio = fromZonedTime(`${fechaIso}T00:00:00`, TZ_NEGOCIO)
      const rangoFinExclusivo = addDays(rangoInicio, 1)

      const [{ data: reservasDia }, { data: bloqueosDia }, { data: barberosRows }] =
        await Promise.all([
          supabase
            .from('reservas')
            .select('barbero_id, fecha_hora, duracion, estado')
            .eq('negocio_id', data.negocio_id)
            .gte('fecha_hora', rangoInicio.toISOString())
            .lt('fecha_hora', rangoFinExclusivo.toISOString())
            .neq('estado', 'cancelada'),
          supabase
            .from('bloqueos')
            .select('barbero_id, fecha_desde, fecha_hasta')
            .eq('negocio_id', data.negocio_id)
            .lt('fecha_desde', rangoFinExclusivo.toISOString())
            .gt('fecha_hasta', rangoInicio.toISOString()),
          supabase
            .from('barberos')
            .select('id')
            .eq('negocio_id', data.negocio_id)
            .eq('activo', true),
        ])

      const barberIdsActivos = (barberosRows ?? []).map((b: { id: string }) => b.id)
      const cap = slotDisponibleSinPreferencia(
        cursor,
        slotFin,
        barberIdsActivos,
        (reservasDia ?? []) as ReservaSlotRow[],
        (bloqueosDia ?? []) as BloqueoSlotRow[]
      )
      if (!cap.disponible) {
        return NextResponse.json(
          { error: 'No hay disponibilidad en ese horario sin elegir barbero.' },
          { status: 409 }
        )
      }
    } else {
      const fechaIso = formatInTimeZone(cursor, TZ_NEGOCIO, 'yyyy-MM-dd')
      const rangoInicio = fromZonedTime(`${fechaIso}T00:00:00`, TZ_NEGOCIO)
      const rangoFinExclusivo = addDays(rangoInicio, 1)

      const [{ data: reservasDia }, { data: bloqueosDia }] = await Promise.all([
        supabase
          .from('reservas')
          .select('barbero_id, fecha_hora, duracion, estado')
          .eq('negocio_id', data.negocio_id)
          .gte('fecha_hora', rangoInicio.toISOString())
          .lt('fecha_hora', rangoFinExclusivo.toISOString())
          .neq('estado', 'cancelada'),
        supabase
          .from('bloqueos')
          .select('barbero_id, fecha_desde, fecha_hasta')
          .eq('negocio_id', data.negocio_id)
          .lt('fecha_desde', rangoFinExclusivo.toISOString())
          .gt('fecha_hasta', rangoInicio.toISOString()),
      ])

      const conflictoReserva = (reservasDia ?? []).find((r: ReservaSlotRow) => {
        if (r.barbero_id !== data.barbero_id) return false
        const rInicio = new Date(r.fecha_hora)
        const rFin = addMinutes(rInicio, r.duracion)
        return solapa(cursor, slotFin, rInicio, rFin)
      })
      const conflictoBloqueo = (bloqueosDia ?? []).find((b: BloqueoSlotRow) => {
        if (b.barbero_id && b.barbero_id !== data.barbero_id) return false
        const bInicio = new Date(b.fecha_desde)
        const bFin = new Date(b.fecha_hasta)
        return solapa(cursor, slotFin, bInicio, bFin)
      })
      if (conflictoReserva || conflictoBloqueo) {
        return NextResponse.json(
          { error: 'Ese barbero no está disponible en el horario elegido.' },
          { status: 409 }
        )
      }
    }

    let clienteId: string
    const { data: clienteExistente } = await supabase
      .from('clientes').select('id, bloqueado')
      .eq('negocio_id', data.negocio_id)
      .eq('telefono', data.telefono)
      .single()

    if (clienteExistente) {
      if (clienteExistente.bloqueado) {
        return NextResponse.json({ error: 'Tu cuenta está bloqueada.' }, { status: 403 })
      }
      clienteId = clienteExistente.id
    } else {
      const { data: nuevoCliente, error: errCliente } = await supabase
        .from('clientes')
        .insert({ negocio_id: data.negocio_id, nombre: data.nombre, telefono: data.telefono, email: data.email ?? null })
        .select('id').single()
      if (errCliente || !nuevoCliente) {
        return NextResponse.json({ error: 'Error al registrar cliente' }, { status: 500 })
      }
      clienteId = nuevoCliente.id
    }

    const { data: reserva, error: errReserva } = await supabase
      .from('reservas')
      .insert({
        negocio_id:              data.negocio_id,
        barbero_id:              data.barbero_id ?? null,
        servicio_id:             data.servicio_id ?? null,
        cliente_id:              clienteId,
        fecha_hora:              data.fecha_hora,
        duracion:                duracion,
        estado:                  'confirmada',
        notas_cliente:           data.notas_cliente ?? null,
        politica_aceptada:       data.politica_aceptada,
        politica_texto_snapshot: negocio.cancelacion_mensaje,
      })
      .select('id, estado').single()

    if (errReserva || !reserva) {
      console.error('Error creando reserva:', errReserva)
      return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
    }

    // Enviar emails directamente
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data: cliente } = await supabase
        .from('clientes').select('nombre, telefono, email').eq('id', clienteId).single()
      const { data: barbero } = data.barbero_id
        ? await supabase.from('barberos').select('nombre').eq('id', data.barbero_id).single()
        : { data: null }
      const { data: servicio } = data.servicio_id
        ? await supabase.from('servicios').select('nombre').eq('id', data.servicio_id).single()
        : { data: null }

      const fechaStr = new Date(data.fecha_hora).toLocaleString('es-EC', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'America/Guayaquil'
      })

      if (negocio.email) {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: negocio.email,
          subject: `Nueva reserva — ${cliente?.nombre}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#e05f10;">Nueva reserva recibida</h2>
            <p>Tienes una nueva reserva en <strong>${negocio.nombre}</strong>.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${cliente?.nombre}</p>
              <p style="margin:4px 0;"><strong>Teléfono:</strong> ${cliente?.telefono}</p>
              ${servicio ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${(servicio as any).nombre}</p>` : ''}
              ${barbero ? `<p style="margin:4px 0;"><strong>Barbero:</strong> ${(barbero as any).nombre}</p>` : ''}
              <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaStr}</p>
            </div>
          </div>`,
        })
      }

      if (cliente?.email) {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: cliente.email,
          subject: `Reserva confirmada en ${negocio.nombre}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#e05f10;">¡Reserva confirmada!</h2>
            <p>Hola <strong>${cliente.nombre}</strong>, tu reserva en <strong>${negocio.nombre}</strong> fue confirmada.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              ${servicio ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${(servicio as any).nombre}</p>` : ''}
              ${barbero ? `<p style="margin:4px 0;"><strong>Barbero:</strong> ${(barbero as any).nombre}</p>` : ''}
              <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaStr}</p>
            </div>
            <p style="color:#666;font-size:14px;">El pago se realiza en el local. ¡Te esperamos!</p>
          </div>`,
        })
      }
    } catch (e) {
      console.log('Email no enviado:', e)
    }

    return NextResponse.json({ id: reserva.id, estado: reserva.estado }, { status: 201 })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}