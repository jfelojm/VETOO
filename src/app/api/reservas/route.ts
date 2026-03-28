import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

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

    let clienteId: string
    const { data: clienteExistente } = await supabase
      .from('clientes').select('id, bloqueado')
      .eq('negocio_id', data.negocio_id)
      .eq('telefono', data.telefono)
      .single()

    if (clienteExistente) {
      if (clienteExistente.bloqueado) {
        return NextResponse.json({ error: 'Tu cuenta está bloqueada. Contacta al negocio.' }, { status: 403 })
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

    return NextResponse.json({ id: reserva.id, estado: reserva.estado }, { status: 201 })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}