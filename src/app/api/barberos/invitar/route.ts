import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicAppUrl } from '@/lib/app-url'
import { emailsIguales, normalizeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { barbero_id, email, negocio_id } = await req.json()

    if (!barbero_id || !email || !negocio_id) {
      return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que el barbero pertenece al negocio
    const { data: barbero } = await supabase
      .from('barberos')
      .select('id, nombre, negocio_id')
      .eq('id', barbero_id)
      .eq('negocio_id', negocio_id)
      .single()

    if (!barbero) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const { data: neg } = await supabase
      .from('negocios')
      .select('owner_id')
      .eq('id', negocio_id)
      .single()

    if (!neg?.owner_id) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const { data: ownerAuth } = await supabase.auth.admin.getUserById(neg.owner_id)
    const ownerEmail = ownerAuth.user?.email
    if (ownerEmail && emailsIguales(email, ownerEmail)) {
      return NextResponse.json(
        {
          error:
            'El correo del administrador no puede usarse como cuenta de profesional invitado. Usa otro correo para cada miembro del staff, o en Equipo usa «Vincular mi cuenta» si tú eres ese profesional.',
        },
        { status: 400 }
      )
    }

    const { data: otrosBarberos } = await supabase
      .from('barberos')
      .select('id, email')
      .eq('negocio_id', negocio_id)
      .neq('id', barbero_id)

    const invitadoNorm = normalizeEmail(email)
    const correoDuplicadoEnStaff = (otrosBarberos ?? []).some(
      row => row.email && normalizeEmail(row.email) === invitadoNorm
    )
    if (correoDuplicadoEnStaff) {
      return NextResponse.json(
        { error: 'Ese correo ya está asignado a otro profesional de este negocio.' },
        { status: 400 }
      )
    }
 
    // Hash con tokens solo existe en el cliente → /auth/confirm (no /api/auth/callback).
    const redirectTo = `${getPublicAppUrl()}/auth/confirm?next=/barbero/setup`
 
    // Verificar si el usuario ya existe
    const { data: usuariosExistentes } = await supabase.auth.admin.listUsers()
    const usuarioExistente = usuariosExistentes?.users?.find(u => u.email === email)
 
    if (usuarioExistente) {
      // Actualizar metadatos del usuario existente
      await supabase.auth.admin.updateUserById(usuarioExistente.id, {
        user_metadata: {
          barbero_id,
          negocio_id,
          rol: 'barbero',
        }
      })
 
      // Eliminar y reinvitar para que Supabase envíe el email directamente
      await supabase.auth.admin.deleteUser(usuarioExistente.id)
    }
 
    // Invitar — Supabase envía el email automáticamente
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        barbero_id,
        negocio_id,
        rol: 'barbero',
      },
      redirectTo,
    })
 
    if (inviteError) {
      console.error('Error invitando:', inviteError)
      return NextResponse.json({ error: 'Error al enviar invitación' }, { status: 500 })
    }
 
    // Guardar email y user_id en el barbero
    await supabase
      .from('barberos')
      .update({ email, user_id: inviteData.user.id })
      .eq('id', barbero_id)
 
    return NextResponse.json({ ok: true })
 
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}