import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32, letterSpacing: -0.6 }}>Vetoo</h1>
        <p style={{ marginTop: 10, color: 'rgba(229,231,235,0.78)' }}>
          Gestión moderna para clínicas veterinarias en Ecuador.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" href="/auth/login">
            Iniciar sesión
          </Link>
          <Link className="btn" href="/portal">
            Portal
          </Link>
          <Link className="btn" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}

