// AgroNexus chart theme — single source of truth for recharts styling.
// Strict 3-color system: every series color is a lightness step of the brand
// green (#0b2e14) resolved per-theme via CSS variables (--chart-1..3).
// Because chroma is inherently low, series identity must NEVER rely on color
// alone: multi-series charts ship a legend, and secondary series use
// strokeDasharray (see SERIES_DASH) or direct labels.

export const CHART = {
  s1:    'var(--chart-1)',   // primary series
  s2:    'var(--chart-2)',   // secondary series (pair with dash)
  s3:    'var(--chart-3)',   // tertiary series
  grid:  'var(--chart-grid)',
  ink:   'var(--ink)',
  muted: 'var(--ink-muted)',
  // legacy aliases (pre-redesign call sites; remove after the page sweep)
  gold:     'var(--chart-2)',
  goldDeep: 'var(--chart-2)',
  green:    'var(--chart-1)',
  greenMid: 'var(--chart-2)',
} as const

// Dash assignment for line charts — fixed per slot, the secondary encoding
// that carries identity where the single-hue ramp cannot.
export const SERIES_DASH = ['0', '6 4', '2 4'] as const

export const ROLE_COLORS = {
  farmer:      'var(--chart-1)',
  buyer:       'var(--chart-2)',
  transporter: 'var(--chart-3)',
  admin:       'var(--ink-faint)',
} as const

// Region series — fixed assignment, never reordered per chart.
export const REGION_COLORS = {
  Tarkwa:  'var(--chart-1)',
  Bogoso:  'var(--chart-2)',
  Prestea: 'var(--chart-3)',
} as const

// Polarity without a second hue: solid dark step up, light step down.
export const DIVERGE = { up: 'var(--chart-1)', down: 'var(--chart-3)', neutral: 'var(--ink-faint)' } as const

export const axisTick = { fontSize: 11, fill: 'var(--ink-muted)' } as const

// Solid hairline — dashed grids read as thresholds/projections
export const gridProps = {
  stroke: 'var(--chart-grid)',
  vertical: false,
} as const

export const tooltipStyle: React.CSSProperties = {
  background: 'var(--invert-bg)',
  border: 'none',
  borderRadius: 12,
  boxShadow: 'var(--shadow-pop)',
  fontSize: 12,
  padding: '8px 12px',
}
export const tooltipLabelStyle: React.CSSProperties = {
  color: 'var(--invert-ink)',
  opacity: 0.6,
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
}
export const tooltipItemStyle: React.CSSProperties = {
  color: 'var(--invert-ink)',
  fontWeight: 700,
}

export const tooltipCursor = { stroke: 'var(--chart-cursor)', strokeWidth: 1 }
export const barCursor = { fill: 'var(--chart-cursor)' }

// Gradient defs for area-under-line fills. Render inside the chart:
//   <defs>{areaGradient('fill1', CHART.s1)}</defs> … fill="url(#fill1)"
export function areaGradient(id: string, color: string = 'var(--chart-1)') {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.25} />
      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
    </linearGradient>
  )
}
// legacy aliases (pre-redesign call sites)
export function goldAreaGradient(id: string) { return areaGradient(id, 'var(--chart-2)') }
export function greenAreaGradient(id: string) { return areaGradient(id, 'var(--chart-1)') }
