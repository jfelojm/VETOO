import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailInvitacionStaff } from '@/lib/emails'
 
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
 
    // Obtener nombre del negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('nombre')
      .eq('id', negocio_id)
      .single()
 
    const negocioNombre = negocio?.nombre ?? 'tu barbería'
 
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/barbero/setup`
 
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
 
      // Generar magic link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          data: {
            barbero_id,
            negocio_id,
            rol: 'barbero',
          },
          redirectTo,
        }
      })
 
      if (linkError || !linkData?.properties?.action_link) {
        console.error('Error generando link:', linkError)
        return NextResponse.json({ error: 'Error al enviar invitación' }, { status: 500 })
      }
 
      // Enviar email con el link
      await emailInvitacionStaff({
        email,
        nombre: barbero.nombre,
        negocioNombre,
        linkInvitacion: linkData.properties.action_link,
      })
 
      // Actualizar barbero
      await supabase
        .from('barberos')
        .update({ email, user_id: usuarioExistente.id })
        .eq('id', barbero_id)
 
      return NextResponse.json({ ok: true })
    }
 
    // Usuario nuevo — invitar normalmente
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