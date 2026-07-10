import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import { CropIcon } from '../../components/CropIcon'
import api from '../../lib/api'
import {
  CHART, REGION_COLORS, DIVERGE,
  axisTick, gridProps, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, tooltipCursor, barCursor,
} from '../../lib/chartTheme'

interface ForecastDay {
  day: number; date: string; demand_kg: number; festival: boolean; day_of_week: string
}
interface CropForecast {
  crop_type: string; region: string; forecast: ForecastDay[]
  weekly_pred_w1: number; weekly_pred_w2: number; mape_pct: number
  model_used: string; cached: boolean; error?: string
}
interface RegionStat { farmers: number; consumers: number; transporters: number; volume_listed_kg: number; volume_ordered_kg: number }
interface LocationData { users: unknown[]; regions: Record<string, RegionStat> }

const CROPS   = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea'] as const

function SectionHeader({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <h2 style={{
        fontSize: '0.75rem', fontWeight: 700, color: '#4A7C5E',
        textTransform: 'uppercase', letterSpacing: '0.09em',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span style={{ display: 'inline-block', width: 3, height: 13, backgroundColor: '#C9A84C', borderRadius: 2, flexShrink: 0 }} />
        {children}
      </h2>
      {sub && <p style={{ fontSize: 12, color: '#6B8A7A', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

function LegendChips({ items }: { items: { c: string; l: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {items.map(({ c, l }) => (
        <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', fontWeight: 600 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flexShrink: 0 }} /> {l}
        </span>
      ))}
    </div>
  )
}

const regionLegend = REGIONS.map((r) => ({ c: REGION_COLORS[r], l: r }))

const fmtKg = (v: number) => `${Math.round(v).toLocaleString()} kg`

export default function ForecastInsights() {
  const [forecasts, setForecasts] = useState<CropForecast[]>([])
  const [locData, setLocData]     = useState<LocationData | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<CropForecast[]>('/api/v1/forecasts/summary').then((r) => setForecasts(r.data.filter((f) => !f.error))).catch(() => setForecasts([])),
      api.get<LocationData>('/api/v1/admin/locations').then((r) => setLocData(r.data)).catch(() => setLocData(null)),
    ]).finally(() => setLoading(false))
  }, [])

  const {
    dailyByRegion, cropByRegion, demandVsSupply, weekChange,
    totalW1, totalW2, peakDay, mape, worstCoverage, tableRows,
  } = useMemo(() => {
    const byRegion = (region: string) => forecasts.filter((f) => f.region === region)

    // 7-day daily totals per region (summed across crops)
    const ref = forecasts.find((f) => f.forecast?.length === 7)
    const dailyByRegion = (ref?.forecast ?? []).map((d, i) => {
      const row: Record<string, string | number> = {
        label: `${d.day_of_week.slice(0, 3)} ${new Date(d.date).getDate()}`,
      }
      for (const r of REGIONS) {
        row[r] = Math.round(byRegion(r).reduce((s, f) => s + (f.forecast[i]?.demand_kg ?? 0), 0))
      }
      return row
    })

    // Week-1 forecast per crop × region
    const cropByRegion = CROPS.map((crop) => {
      const row: Record<string, string | number> = { crop }
      for (const r of REGIONS) {
        row[r] = Math.round(forecasts.find((f) => f.crop_type === crop && f.region === r)?.weekly_pred_w1 ?? 0)
      }
      return row
    })

    // Forecast demand vs currently listed supply, per region
    const demandVsSupply = REGIONS.map((r) => ({
      region: r,
      demand: Math.round(byRegion(r).reduce((s, f) => s + f.weekly_pred_w1, 0)),
      supply: Math.round(locData?.regions?.[r]?.volume_listed_kg ?? 0),
    }))
    const short = demandVsSupply
      .filter((d) => d.demand > 0)
      .map((d) => ({ ...d, coverage: d.supply / d.demand }))
      .sort((a, b) => a.coverage - b.coverage)[0]
    const worstCoverage = short && short.coverage < 1 ? short : null

    // Week-2 vs week-1 % change per crop (all regions combined)
    const weekChange = CROPS.map((crop) => {
      const rows = forecasts.filter((f) => f.crop_type === crop)
      const w1 = rows.reduce((s, f) => s + f.weekly_pred_w1, 0)
      const w2 = rows.reduce((s, f) => s + f.weekly_pred_w2, 0)
      return { crop, pct: w1 > 0 ? +((w2 - w1) / w1 * 100).toFixed(1) : 0 }
    })

    const totalW1 = forecasts.reduce((s, f) => s + f.weekly_pred_w1, 0)
    const totalW2 = forecasts.reduce((s, f) => s + f.weekly_pred_w2, 0)
    const peak = dailyByRegion
      .map((d) => ({ label: d.label as string, total: REGIONS.reduce((s, r) => s + (d[r] as number), 0) }))
      .sort((a, b) => b.total - a.total)[0]

    const tableRows = CROPS.map((crop) => {
      const cells = REGIONS.map((r) => Math.round(forecasts.find((f) => f.crop_type === crop && f.region === r)?.weekly_pred_w1 ?? 0))
      return { crop, cells, total: cells.reduce((a, b) => a + b, 0) }
    })

    return {
      dailyByRegion, cropByRegion, demandVsSupply, weekChange,
      totalW1, totalW2, peakDay: peak ?? null, mape: forecasts[0]?.mape_pct ?? null,
      worstCoverage, tableRows,
    }
  }, [forecasts, locData])

  const deltaPct = totalW1 > 0 ? (totalW2 - totalW1) / totalW1 * 100 : 0
  const changeMax = Math.max(5, Math.ceil(Math.max(...weekChange.map((c) => Math.abs(c.pct)), 0) / 5) * 5)

  return (
    <Layout>
      {/* Dark hero */}
      <div style={{
        background: 'linear-gradient(135deg, #030B07 0%, #0D2B1F 60%, #071510 100%)',
        borderRadius: 20, padding: 32, marginBottom: 24,
        border: '1px solid rgba(46,125,82,0.25)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ADE80', marginBottom: 8 }}>Admin · ML Forecasting</p>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.02em' }}>Forecast Insights</h1>
        <p style={{ fontSize: 14, color: '#4A6B58', marginTop: 6 }}>
          Cross-region demand analytics · next 14 days · all tracked crops
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
          </div>
          {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 16 }} />)}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>No forecast data available</p>
          <p style={{ fontSize: 13, color: '#6B8A7A' }}>
            The ML service (port 5000) may be down — check <code>/api/v1/forecasts/health</code>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── KPI row ── */}
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              <MetricCard
                label="Week-1 Demand" value={fmtKg(totalW1)}
                sub="all crops · all regions" icon={<ScaleIcon />} accent="#1A5C38"
              />
              <MetricCard
                label="Week-2 Outlook" value={fmtKg(totalW2)}
                sub={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs week 1`}
                icon={<TrendIcon />} accent="#C9A84C"
              />
              <MetricCard
                label="Peak Day" value={peakDay?.label ?? '—'}
                sub={peakDay ? `${peakDay.total.toLocaleString()} kg across regions` : undefined}
                icon={<CalendarIcon />} accent="#2563EB"
              />
              <MetricCard
                label="Model Accuracy" value={mape != null ? `${mape.toFixed(1)}%` : '—'}
                sub="MAPE · lower is better" icon={<ChipIcon />} accent="#1A5C38"
              />
            </div>
          </section>

          {/* ── Daily demand curve by region ── */}
          <section>
            <SectionHeader sub="Total forecast demand per day, all crops combined — where and when volume lands next week">
              Regional Demand · Next 7 Days
            </SectionHeader>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <LegendChips items={regionLegend} />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyByRegion} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${Number(v).toLocaleString()}kg`} />
                  <Tooltip
                    formatter={(v, name) => [fmtKg(Number(v)), String(name)]}
                    contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                    cursor={tooltipCursor}
                  />
                  {REGIONS.map((r) => (
                    <Line
                      key={r} type="monotone" dataKey={r}
                      stroke={REGION_COLORS[r]} strokeWidth={2} strokeLinecap="round"
                      dot={false} activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Crop × region grouped bars ── */}
          <section>
            <SectionHeader sub="Week-1 forecast per crop, split by region — which markets want which crops">
              Demand by Crop &amp; Region
            </SectionHeader>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <LegendChips items={regionLegend} />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cropByRegion} barSize={12} barGap={2} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="crop" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${Number(v).toLocaleString()}kg`} />
                  <Tooltip
                    formatter={(v, name) => [fmtKg(Number(v)), String(name)]}
                    contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                    cursor={barCursor}
                  />
                  {REGIONS.map((r) => (
                    <Bar key={r} dataKey={r} fill={REGION_COLORS[r]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Demand vs supply + week change, side by side ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <section style={{ flex: '1 1 380px', minWidth: 0 }}>
              <SectionHeader sub="Week-1 forecast vs kg currently listed — gaps show where supply falls short">
                Forecast Demand vs Listed Supply
              </SectionHeader>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <LegendChips items={[{ c: '#A8842F', l: 'Forecast demand' }, { c: '#2E7D52', l: 'Listed supply' }]} />
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={demandVsSupply} barSize={22} barGap={2} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="region" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${Number(v).toLocaleString()}kg`} />
                    <Tooltip
                      formatter={(v, name) => [fmtKg(Number(v)), name === 'demand' ? 'Forecast demand' : 'Listed supply']}
                      contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                      cursor={barCursor}
                    />
                    <Bar dataKey="demand" fill="#A8842F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="supply" fill="#2E7D52" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {worstCoverage && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, color: '#92621A', margin: 0 }}>
                      ⚠ {worstCoverage.region}: listed supply covers only{' '}
                      <strong>{Math.round(worstCoverage.coverage * 100)}%</strong> of next week's forecast demand.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section style={{ flex: '1 1 380px', minWidth: 0 }}>
              <SectionHeader sub="Week-2 vs week-1 forecast, all regions combined — what's heating up or cooling off">
                Week-over-Week Change by Crop
              </SectionHeader>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <LegendChips items={[{ c: DIVERGE.up, l: 'Rising' }, { c: DIVERGE.down, l: 'Falling' }, { c: DIVERGE.neutral, l: 'Stable (±3%)' }]} />
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weekChange} layout="vertical" barSize={14} margin={{ top: 8, right: 20, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} horizontal={false} />
                    <XAxis
                      type="number" domain={[-changeMax, changeMax]}
                      tick={axisTick} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                    />
                    <YAxis type="category" dataKey="crop" tick={axisTick} tickLine={false} axisLine={false} width={64} />
                    <ReferenceLine x={0} stroke="#D1D5DB" />
                    <Tooltip
                      formatter={(v) => [`${Number(v) > 0 ? '+' : ''}${Number(v)}%`, 'w2 vs w1']}
                      contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                      cursor={barCursor}
                    />
                    <Bar dataKey="pct">
                      {weekChange.map((c) => (
                        <Cell
                          key={c.crop}
                          fill={c.pct > 3 ? DIVERGE.up : c.pct < -3 ? DIVERGE.down : DIVERGE.neutral}
                          radius={(c.pct >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]) as unknown as number}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* ── Table view (accessibility twin of the charts) ── */}
          <section>
            <SectionHeader sub="Week-1 forecast in kg — the exact values behind the charts above">
              Forecast Table · Week 1
            </SectionHeader>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Crop</th>
                      {REGIONS.map((r) => <th key={r} style={{ textAlign: 'right' }}>{r} (kg)</th>)}
                      <th style={{ textAlign: 'right' }}>Total (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ crop, cells, total }) => (
                      <tr key={crop}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                            <CropIcon type={crop} className="w-4 h-4" />{crop}
                          </span>
                        </td>
                        {cells.map((v, i) => (
                          <td key={i} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString()}</td>
                        ))}
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      )}
    </Layout>
  )
}

/* ── Local icons (16×16 stroke style, matches MetricCard slots) ── */
function ScaleIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
}
function TrendIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
}
function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
function ChipIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
}
