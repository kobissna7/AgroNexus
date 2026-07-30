import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import { CropIcon } from '../../components/CropIcon'
import { DarkHero } from '../../components/ui'
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
  weekly_pred_w1: number; weekly_pred_w2: number; mape_pct: number | null
  model_used: string; cached: boolean; error?: string
  fallback?: boolean; fallback_reason?: string
}
interface RegionStat { farmers: number; consumers: number; transporters: number; volume_listed_kg: number; volume_ordered_kg: number }
interface LocationData { users: unknown[]; regions: Record<string, RegionStat> }

const CROPS   = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
// Real Ghana Western Region farming/market towns (MOFA district reports)
const REGIONS = ['Aowin', 'Bibiani', 'Juaboso', 'Sefwi Wiawso', 'Wasa Amenfi'] as const
const REGION_DESC: Record<string, string> = {
  'Aowin':        'plantain & pepper belt',
  'Bibiani':      'cassava & maize hub',
  'Juaboso':      'cassava/plantain surplus zone',
  'Sefwi Wiawso': 'rice valley & veg area',
  'Wasa Amenfi':  'maize & cassava area',
}

function SectionHeader({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <h2 style={{
        fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-muted)',
        textTransform: 'uppercase', letterSpacing: '0.09em',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span style={{ display: 'inline-block', width: 3, height: 13, backgroundColor: 'var(--brand)', borderRadius: 2, flexShrink: 0 }} />
        {children}
      </h2>
      {sub && <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

function LegendChips({ items }: { items: { c: string; l: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {items.map(({ c, l }) => (
        <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
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
      api.get<CropForecast[]>('/api/v1/forecasts/summary')
        .then((r) => setForecasts(r.data.filter((f) => !f.error)))
        .catch(() => setForecasts([])),
      api.get<LocationData>('/api/v1/admin/locations').then((r) => setLocData(r.data)).catch(() => setLocData(null)),
    ]).finally(() => setLoading(false))
  }, [])

  const isFallback = forecasts.length > 0 && forecasts.some((f) => f.fallback)

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
      <DarkHero
        eyebrow="Admin · ML Forecasting"
        title="Forecast Insights"
        sub="Cross-region demand analytics · next 14 days · all tracked crops"
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
          </div>
          {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 16 }} />)}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: 'var(--ink-strong)', marginBottom: 6 }}>No forecast data available</p>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            The forecast summary returned no results. Check <code>/api/v1/forecasts/health</code>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── Fallback notice ── */}
          {isFallback && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
            }}>
              <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>ML service offline. Showing MOFA baseline estimates.</p>
                <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>
                  The Flask ML service is not reachable. Charts display statistical baseline figures from Ministry of Agriculture data, not live AI predictions.
                  Deploy the ML service on Render and set <code>FLASK_SERVICE_URL</code> in the backend env to restore live forecasts.
                </p>
              </div>
            </div>
          )}

          {/* ── KPI row ── */}
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
              <MetricCard
                label="Week-1 Demand" value={fmtKg(totalW1)}
                sub="all crops · all regions" icon={<ScaleIcon />}
              />
              <MetricCard
                label="Week-2 Outlook" value={fmtKg(totalW2)}
                sub={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs week 1`}
                icon={<TrendIcon />}
              />
              <MetricCard
                label="Peak Day" value={peakDay?.label ?? '-'}
                sub={peakDay ? `${peakDay.total.toLocaleString()} kg across regions` : undefined}
                icon={<CalendarIcon />}
              />
              <MetricCard
                label={isFallback ? 'Model (Offline)' : 'Model Accuracy'}
                value={mape != null ? `${mape.toFixed(1)}%` : 'N/A'}
                sub={isFallback ? 'MOFA baseline · ML service down' : 'MAPE · lower is better'}
                icon={<ChipIcon />}
              />
            </div>
          </section>

          {/* ── Daily demand curve by region ── */}
          <section>
            <SectionHeader sub="Total forecast demand per day, all crops combined. Where and when volume lands next week.">
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
                      dot={false} activeDot={{ r: 4.5, stroke: 'var(--surface)', strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Crop × region grouped bars ── */}
          <section>
            <SectionHeader sub="Week-1 forecast per crop, split by region. Which markets want which crops.">
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
              <SectionHeader sub="Week-1 forecast vs kg currently listed. Gaps show where supply falls short.">
                Forecast Demand vs Listed Supply
              </SectionHeader>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <LegendChips items={[{ c: 'var(--chart-2)', l: 'Forecast demand' }, { c: 'var(--chart-1)', l: 'Listed supply' }]} />
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
                    <Bar dataKey="demand" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="supply" fill="var(--brand-ink)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {worstCoverage && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--brand-soft)', border: '1px solid var(--edge)', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, color: 'var(--brand-ink)', margin: 0 }}>
                      ⚠ {worstCoverage.region}: listed supply covers only{' '}
                      <strong>{Math.round(worstCoverage.coverage * 100)}%</strong> of next week's forecast demand.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section style={{ flex: '1 1 380px', minWidth: 0 }}>
              <SectionHeader sub="Week-2 vs week-1 forecast, all regions combined. What's heating up or cooling off.">
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
                    <ReferenceLine x={0} stroke="var(--chart-grid)" />
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


          {/* ── Admin allocation intelligence ── */}
          <section>
            <SectionHeader sub="Based on forecast demand vs listed supply. Tells admin where produce allocations are needed.">
              Area Allocation Intelligence
            </SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {demandVsSupply
                .map((d) => ({ ...d, coverage: d.demand > 0 ? d.supply / d.demand : 1 }))
                .sort((a, b) => a.coverage - b.coverage)
                .map((d) => {
                  const pct = Math.round(d.coverage * 100)
                  const isShort  = d.coverage < 0.5
                  const isMed    = d.coverage >= 0.5 && d.coverage < 0.9
                  const isGood   = d.coverage >= 0.9 && d.coverage < 1.3
                  const status = isShort ? 'critical' : isMed ? 'low' : isGood ? 'balanced' : 'surplus'
                  const colors = {
                    critical: { bar: 'rgba(220,38,38,0.75)', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.25)', text: '#b91c1c' },
                    low:      { bar: 'rgba(234,179,8,0.8)',  bg: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.3)',  text: '#92400e' },
                    balanced: { bar: 'var(--chart-1)',       bg: 'rgba(11,46,20,0.05)',   border: 'rgba(11,46,20,0.12)', text: 'var(--brand-ink)' },
                    surplus:  { bar: 'var(--ink-faint)',     bg: 'var(--surface-2)',      border: 'var(--edge)',         text: 'var(--ink-muted)' },
                  }[status]
                  const msg = {
                    critical: `🚨 Critical shortage — send farmers to list produce here urgently. Only ${pct}% of demand covered.`,
                    low:      `⚠ Supply running low — encourage more farmer listings in this area. ${pct}% covered.`,
                    balanced: `✓ Supply and demand are balanced in this area (${pct}% covered). Monitor for changes.`,
                    surplus:  `📦 Surplus area — supply exceeds demand by ${pct - 100}%. Redirect some produce to other areas.`,
                  }[status]
                  const width = Math.min(d.supply > 0 || d.demand > 0 ? pct : 0, 100)
                  return (
                    <div key={d.region} style={{ padding: '14px 18px', borderRadius: 14, background: colors.bg, border: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-strong)' }}>{d.region}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink-muted)', marginLeft: 8 }}>{REGION_DESC[d.region]}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{pct}% covered</span>
                      </div>
                      <div style={{ background: 'var(--surface)', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${width}%`, height: '100%', background: colors.bar, borderRadius: 6, transition: 'width 0.4s ease' }} />
                      </div>
                      <p style={{ fontSize: 12, color: colors.text, margin: 0 }}>{msg}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                        Forecast: <strong>{d.demand.toLocaleString()} kg</strong> · Listed: <strong>{d.supply.toLocaleString()} kg</strong>
                      </p>
                    </div>
                  )
                })}
            </div>
          </section>

          {/* ── Table view (accessibility twin of the charts) ── */}
          <section>
            <SectionHeader sub="Week-1 forecast in kg. The exact values behind the charts above.">
              Forecast Table · Week 1
            </SectionHeader>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: 90 }}>Crop</th>
                      {REGIONS.map((r) => <th key={r} style={{ textAlign: 'right', minWidth: 80 }}>{r} (kg)</th>)}
                      <th style={{ textAlign: 'right', minWidth: 90 }}>Total (kg)</th>
                      <th style={{ textAlign: 'left', minWidth: 140 }}>Highest Demand Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ crop, cells, total }) => {
                      const maxIdx = cells.indexOf(Math.max(...cells))
                      return (
                        <tr key={crop}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>
                              <CropIcon type={crop} className="w-4 h-4" />{crop}
                            </span>
                          </td>
                          {cells.map((v, i) => (
                            <td key={i} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: i === maxIdx ? 700 : 400, color: i === maxIdx ? 'var(--brand-ink)' : 'var(--ink)' }}>{v.toLocaleString()}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink-strong)', fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString()}</td>
                          <td style={{ fontSize: 12, color: 'var(--brand-ink)', fontWeight: 600 }}>
                            🔥 {REGIONS[maxIdx]}
                          </td>
                        </tr>
                      )
                    })}
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
