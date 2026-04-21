export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Buenos días</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Cargando datos...</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Citas hoy" value={0} />
        <MetricCard label="Pacientes activos" value={0} />
        <MetricCard label="Vacunas próximas" value={0} />
        <MetricCard label="Dueños en portal" value={0} />
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #EDE4DC',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13, color: '#7A6A62' }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: '#2C2420' }}>
        {value}
      </div>
    </div>
  )
}