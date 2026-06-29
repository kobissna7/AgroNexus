import { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: string
  icon: ReactNode
  accent?: string
}

export default function MetricCard({ label, value, sub, trend, icon, accent = '#1A5C38' }: Props) {
  return (
    <div className="card" style={{ padding: '20px', position: 'relative' }}>
      {/* Background wrapper for clipping the glow without breaking parent borders */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none' }}>
        {/* decorative glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
          border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent === '#1A5C38' ? '#2E7D52' : accent === '#C9A84C' ? '#C9A84C' : '#3B82F6',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999,
            background: 'rgba(52,211,153,0.12)', color: '#059669',
            border: '1px solid rgba(52,211,153,0.2)',
          }}>
            {trend}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6B7280', marginBottom: 6 }}>
          {label}
        </p>
        <p style={{ fontSize: '1.9rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{sub}</p>
        )}
      </div>
    </div>
  )
}
