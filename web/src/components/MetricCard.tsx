import { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: string
  icon: ReactNode
  accent?: string // legacy prop, ignored — tokens drive color now
}

export default function MetricCard({ label, value, sub, trend, icon }: Props) {
  return (
    <div className="card card-lift" style={{ padding: 16, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--brand-soft)',
          border: '1px solid var(--edge)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--brand-ink)',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {trend && <span className="badge badge-soft" style={{ fontSize: 11 }}>{trend}</span>}
      </div>

      <div>
        <p className="stat-label" style={{ marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>{sub}</p>}
      </div>
    </div>
  )
}
