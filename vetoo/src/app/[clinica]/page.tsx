interface Props {
  params: { clinica: string }
}

export default function ClinicaPublicPage({ params }: Props) {
  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Clínica: {params.clinica}</h1>
        <p style={{ marginTop: 8, color: 'rgba(229,231,235,0.78)' }}>
          Esta ruta será la página pública de la clínica (reservas, información, contacto, etc.).
        </p>
      </div>
    </main>
  )
}

