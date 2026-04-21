'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { slugifyClinica } from '@/lib/slugify'

export default function RegistroPage() {
  const supabase = createClient()
  const [nombreClinica, setNombreClinica] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setCargando(true)
    try {
      const { data: authData, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { nombre: nombreUsuario.trim() },
        },
      })
      if (signErr) {
        setErrorMsg(signErr.message)
        setCargando(false)
        return
      }
      const user = authData.user
      if (!user) {
        setErrorMsg('No se pudo crear la cuenta')
        setCargando(false)
        return
      }

      if (!authData.session) {
        setErrorMsg(
          'Revisa tu correo para confirmar la cuenta. Luego podrás iniciar sesión.'
        )
        setCargando(false)
        return
      }

      const base = slugifyClinica(nombreClinica)
      let clinicaId: string | null = null
      for (let attempt = 0; attempt < 20; attempt++) {
        const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
        const { data: ins, error: cErr } = await supabase
          .from('clinicas')
          .insert({
            nombre: nombreClinica.trim(),
            slug,
            email: email.trim().toLowerCase(),
            owner_id: user.id,
          })
          .select('id')
          .single()

        if (!cErr && ins) {
          clinicaId = ins.id
          break
        }
        if (cErr && cErr.code !== '23505') {
          setErrorMsg(cErr.message || 'No se pudo crear la clínica')
          setCargando(false)
          return
        }
      }

      if (!clinicaId) {
        setErrorMsg('No se pudo generar un identificador único para la clínica')
        setCargando(false)
        return
      }

      const { error: uErr } = await supabase.from('usuarios').insert({
        id: user.id,
        clinica_id: clinicaId,
        nombre: nombreUsuario.trim(),
        rol: 'admin',
      })

      if (uErr) {
        setErrorMsg(uErr.message || 'No se pudo guardar tu perfil')
        setCargando(false)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setErrorMsg('Error inesperado. Intenta de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#FBF7F4' }}
    >
      <div
        className="w-full max-w-[420px]"
        style={{
          backgroundColor: '#fff',
          border: '1px solid #EDE4DC',
          borderRadius: 16,
          padding: 40,
        }}
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="" width={40} height={40} priority />
            <span
              className="font-serif"
              style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#2C2420' }}
            >
              Vetoo
            </span>
          </div>
          <p style={{ color: '#7A6A62', fontSize: 14, margin: 0 }}>
            Crea el espacio digital de tu clínica
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nombreClinica"
              style={{ display: 'block', fontSize: 13, color: '#2C2420', marginBottom: 6 }}
            >
              Nombre de la clínica
            </label>
            <input
              id="nombreClinica"
              required
              value={nombreClinica}
              onChange={e => setNombreClinica(e.target.value)}
              className="w-full outline-none"
              style={{
                border: '1px solid #EDE4DC',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                color: '#2C2420',
              }}
            />
          </div>
          <div>
            <label
              htmlFor="nombreUsuario"
              style={{ display: 'block', fontSize: 13, color: '#2C2420', marginBottom: 6 }}
            >
              Tu nombre (del veterinario/admin)
            </label>
            <input
              id="nombreUsuario"
              required
              value={nombreUsuario}
              onChange={e => setNombreUsuario(e.target.value)}
              className="w-full outline-none"
              style={{
                border: '1px solid #EDE4DC',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                color: '#2C2420',
              }}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, color: '#2C2420', marginBottom: 6 }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full outline-none"
              style={{
                border: '1px solid #EDE4DC',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                color: '#2C2420',
              }}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, color: '#2C2420', marginBottom: 6 }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full outline-none"
              style={{
                border: '1px solid #EDE4DC',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                color: '#2C2420',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full border-0 font-medium text-white"
            style={{
              backgroundColor: '#E8845A',
              borderRadius: 10,
              height: 44,
              fontWeight: 500,
              cursor: cargando ? 'wait' : 'pointer',
              opacity: cargando ? 0.85 : 1,
            }}
          >
            {cargando ? 'Creando…' : 'Crear mi clínica'}
          </button>
        </form>

        {errorMsg ? (
          <p className="mt-3 text-center" style={{ color: '#D95C5C', fontSize: 13 }}>
            {errorMsg}
          </p>
        ) : null}

        <p className="mt-6 text-center" style={{ fontSize: 14, color: '#7A6A62' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" style={{ color: '#E8845A', fontWeight: 500 }}>
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  )
}
