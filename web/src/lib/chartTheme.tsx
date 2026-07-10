// AgroNexus chart theme — single source of truth for recharts styling.
// Brand duo per design system: gold line #C9A84C + green dashed #1A5C38.
// Role palette (map/admin) validated for CVD + contrast on light surface.

export const CHART = {
  gold:     '#C9A84C',
  goldDeep: '#A8842F',
  green:    '#1A5C38',
  greenMid: '#2E7D52',
  grid:     '#EEF2EF',
  ink:      '#111827',
  muted:    '#8A9B90',
} as const

export const ROLE_COLORS = {
  farmer:      '#2E7D52',
  buyer:       '#A8842F',
  transporter: '#2563EB',
  admin:       '#6B7280',
} as const

// Region series — fixed assignment, never reordered per chart.
// Validated (light surface #fff): CVD worst-pair ΔE 37; gold sits at 2.29:1
// so any chart using it must ship a legend + table view.
export const REGION_COLORS = {
  Tarkwa:  '#2E7D52',
  Bogoso:  '#C9A84C',
  Prestea: '#2563EB',
} as const

// Diverging poles for above/below-baseline charts (validated pair, ΔE 30)
export const DIVERGE = { up: '#2E7D52', down: '#A8842F', neutral: '#9CA3AF' } as const

export const axisTick = { fontSize: 11, fill: CHART.muted } as const

// Solid hairline — dashed grids read as thresholds/projections
export const gridProps = {
  stroke: CHART.grid,
  vertical: false,
} as const

// Dark glass tooltip — matches the dark hero cards
export const tooltipStyle: React.CSSProperties = {
  background: 'rgba(13,43,31,0.92)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(46,125,82,0.35)',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  fontSize: 12,
  padding: '8px 12px',
}
export const tooltipLabelStyle: React.CSSProperties = {
  color: '#7BA892',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
}
export const tooltipItemStyle: React.CSSProperties = {
  color: '#E8F0EB',
  fontWeight: 700,
}

export const tooltipCursor = { stroke: 'rgba(26,92,56,0.25)', strokeWidth: 1 }
export const barCursor = { fill: 'rgba(26,92,56,0.06)' }

// Gradient defs for area-under-line fills. Render inside the chart:
//   <defs>{goldAreaGradient('goldFill')}</defs> … fill="url(#goldFill)"
export function goldAreaGradient(id: string) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={CHART.gold} stopOpacity={0.28} />
      <stop offset="100%" stopColor={CHART.gold} stopOpacity={0.02} />
    </linearGradient>
  )
}
export function greenAreaGradient(id: string) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={CHART.greenMid} stopOpacity={0.22} />
      <stop offset="100%" stopColor={CHART.greenMid} stopOpacity={0.02} />
    </linearGradient>
  )
}
