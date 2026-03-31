import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Crear usuario en Supabase Auth con magic link
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        barbero_id: barbero_id,
        negocio_id: negocio_id,
        rol: 'barbero',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/barbero/setup`,
    })

    if (inviteError) {
      console.error('Error invitando:', inviteError)
      return NextResponse.json({ error: 'Error al enviar invitación' }, { status: 500 })
    }

    // Guardar email en el barbero
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