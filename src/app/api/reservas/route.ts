import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { addDays, addMinutes } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import type { BloqueoSlotRow, ReservaSlotRow } from '@/lib/reservas-capacidad'
import {
  elegirBarberoParaSinPreferencia,
  slotDisponibleParaBarberoConcreto,
} from '@/lib/reservas-capacidad'

const TZ_NEGOCIO = process.env.NEGOCIO_TIMEZONE || 'America/Guayaquil'

function soloDigitosTel(s: string) {
  return (s ?? '').replace(/\D/g, '')
}

function telefonoValido(s: string | undefined) {
  return soloDigitosTel(s ?? '').length >= 7
}

function emailValido(s: string | null | undefined) {
  const t = (s ?? '').trim()
  return t.length > 0 && z.string().email().safeParse(t).success
}

const schema = z
  .object({
    negocio_id:        z.string().uuid(),
    barbero_id:        z.string().uuid().nullable().optional(),
    servicio_id:       z.string().uuid().nullable().optional(),
    nombre:            z.string().min(2),
    telefono:          z.string().optional().default(''),
    email:             z.union([z.string().email(), z.literal('')]).nullable().optional(),
    fecha_hora:        z.string().datetime(),
    notas_cliente:     z.string().nullable().optional(),
    politica_aceptada: z.boolean(),
  })
  .refine(d => telefonoValido(d.telefono) || emailValido(d.email), {
    message: 'Indica un teléfono válido (mín. 7 dígitos) o un correo electrónico válido',
    path:    ['telefono'],
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
          .eq('activo', true)
          .order('nombre'),
      ])

    const barberIdsActivos = (barberosRows ?? []).map((b: { id: string }) => b.id)
    const reservasArr = (reservasDia ?? []) as ReservaSlotRow[]
    const bloqueosArr = (bloqueosDia ?? []) as BloqueoSlotRow[]

    let barberoInsert: string

    if (!data.barbero_id) {
      const tieBreakSeed = `${data.negocio_id}-${formatInTimeZone(cursor, TZ_NEGOCIO, 'yyyy-MM-dd_HH:mm')}`
      const picked = elegirBarberoParaSinPreferencia(
        cursor,
        slotFin,
        barberIdsActivos,
        reservasArr,
        bloqueosArr,
        tieBreakSeed
      )
      if (!picked) {
        return NextResponse.json(
          { error: 'No hay disponibilidad en ese horario sin elegir barbero.' },
          { status: 409 }
        )
      }
      barberoInsert = picked
    } else {
      if (!barberIdsActivos.includes(data.barbero_id)) {
        return NextResponse.json(
          { error: 'El barbero indicado no pertenece a este negocio o está inactivo.' },
          { status: 400 }
        )
      }
      const dispo = slotDisponibleParaBarberoConcreto(
        data.barbero_id,
        cursor,
        slotFin,
        barberIdsActivos,
        reservasArr,
        bloqueosArr
      )
      if (!dispo.disponible) {
        const msg =
          dispo.motivo === 'bloqueo'
            ? 'Ese barbero tiene un bloqueo en el horario elegido.'
            : 'Ese barbero no está disponible en el horario elegido.'
        return NextResponse.json({ error: msg }, { status: 409 })
      }
      barberoInsert = data.barbero_id
    }

    const telTrim = (data.telefono ?? '').trim()
    const telefonoInsert = telefonoValido(telTrim) ? telTrim : null
    const emailTrim = (data.email ?? '').trim()
    const emailInsert = emailValido(emailTrim) ? emailTrim.toLowerCase() : null

    let clienteId: string
    let clienteExistente: { id: string; bloqueado: boolean } | null = null

    if (telefonoInsert) {
      const { data: porTel } = await supabase
        .from('clientes')
        .select('id, bloqueado')
        .eq('negocio_id', data.negocio_id)
        .eq('telefono', telefonoInsert)
        .maybeSingle()
      if (porTel) clienteExistente = porTel
    }
    if (!clienteExistente && emailInsert) {
      const { data: porEmail } = await supabase
        .from('clientes')
        .select('id, bloqueado')
        .eq('negocio_id', data.negocio_id)
        .eq('email', emailInsert)
        .maybeSingle()
      if (porEmail) clienteExistente = porEmail
    }

    if (clienteExistente) {
      if (clienteExistente.bloqueado) {
        return NextResponse.json({ error: 'Tu cuenta está bloqueada.' }, { status: 403 })
      }
      clienteId = clienteExistente.id
      const patch: { nombre: string; telefono?: string | null; email?: string | null } = {
        nombre: data.nombre,
      }
      if (telefonoValido(telTrim)) patch.telefono = telTrim
      if (emailValido(emailTrim)) patch.email = emailTrim.toLowerCase()
      await supabase.from('clientes').update(patch).eq('id', clienteId)
    } else {
      const { data: nuevoCliente, error: errCliente } = await supabase
        .from('clientes')
        .insert({
          negocio_id: data.negocio_id,
          nombre:     data.nombre,
          telefono:   telefonoInsert,
          email:      emailInsert,
        })
        .select('id')
        .single()
      if (errCliente || !nuevoCliente) {
        return NextResponse.json({ error: 'Error al registrar cliente' }, { status: 500 })
      }
      clienteId = nuevoCliente.id
    }

    const nombreReserva = data.nombre.trim()

    const { data: reserva, error: errReserva } = await supabase
      .from('reservas')
      .insert({
        negocio_id:               data.negocio_id,
        barbero_id:               barberoInsert,
        servicio_id:              data.servicio_id ?? null,
        cliente_id:               clienteId,
        fecha_hora:               data.fecha_hora,
        duracion:                 duracion,
        estado:                   'confirmada',
        notas_cliente:            data.notas_cliente ?? null,
        politica_aceptada:        data.politica_aceptada,
        politica_texto_snapshot:  negocio.cancelacion_mensaje,
        cliente_nombre_snapshot:  nombreReserva,
      })
      .select('id, estado').single()

    if (errReserva || !reserva) {
      console.error('Error creando reserva:', errReserva)
      return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
    }

    // Enviar emails directamente
    const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      let emailAdministrador = negocio.email?.trim() || null
      if (!emailAdministrador) {
        const admin = createAdminClient()
        const { data: ownerAuth } = await admin.auth.admin.getUserById(negocio.owner_id)
        emailAdministrador = ownerAuth?.user?.email?.trim() ?? null
      }
      const { data: cliente } = await supabase
        .from('clientes').select('nombre, telefono, email').eq('id', clienteId).single()
      const { data: barbero } = await supabase
        .from('barberos')
        .select('nombre, email')
        .eq('id', barberoInsert)
        .single()
      const { data: servicio } = data.servicio_id
        ? await supabase.from('servicios').select('nombre').eq('id', data.servicio_id).single()
        : { data: null }

      const fechaStr = new Date(data.fecha_hora).toLocaleString('es-EC', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'America/Guayaquil'
      })

      const telTxt = cliente?.telefono ? String(cliente.telefono) : '—'
      const mailTxt = cliente?.email ? String(cliente.email) : '—'

      if (emailAdministrador) {
        await resend.emails.send({
          from: FROM,
          to: emailAdministrador,
          subject: `Nueva reserva — ${nombreReserva}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#e05f10;">Nueva reserva recibida</h2>
            <p>Tienes una nueva reserva en <strong>${negocio.nombre}</strong>.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${nombreReserva}</p>
              <p style="margin:4px 0;"><strong>Teléfono:</strong> ${telTxt}</p>
              <p style="margin:4px 0;"><strong>Email:</strong> ${mailTxt}</p>
              ${servicio ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${(servicio as any).nombre}</p>` : ''}
              ${barbero ? `<p style="margin:4px 0;"><strong>Profesional:</strong> ${(barbero as any).nombre}</p>` : ''}
              <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaStr}</p>
            </div>
          </div>`,
        })
      }

      const barberoEmail = (barbero as { nombre?: string; email?: string | null } | null)?.email?.trim()
      if (barberoEmail) {
        await resend.emails.send({
          from: FROM,
          to: barberoEmail,
          subject: `Nueva cita en tu agenda — ${negocio.nombre}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#e05f10;">Tienes una nueva reserva</h2>
            <p>Hola <strong>${(barbero as any).nombre}</strong>, se agendó un turno contigo en <strong>${negocio.nombre}</strong>.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${nombreReserva}</p>
              <p style="margin:4px 0;"><strong>Teléfono:</strong> ${telTxt}</p>
              <p style="margin:4px 0;"><strong>Email:</strong> ${mailTxt}</p>
              ${servicio ? `<p style="margin:4px 0;"><strong>Servicio:</strong> ${(servicio as any).nombre}</p>` : ''}
              <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaStr}</p>
            </div>
          </div>`,
        })
      }

      if (cliente?.email) {
        await resend.emails.send({
          from: FROM,
          to: cliente.email,
          subject: `Reserva confirmada en ${negocio.nombre}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#e05f10;">¡Reserva confirmada!</h2>
            <p>Hola <strong>${nombreReserva}</strong>, tu reserva en <strong>${negocio.nombre}</strong> fue confirmada.</p>
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

    return NextResponse.json(
      { id: reserva.id, estado: reserva.estado, barbero_id: barberoInsert },
      { status: 201 }
    )

  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.issues[0]?.message ?? 'Datos inválidos'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error('Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}