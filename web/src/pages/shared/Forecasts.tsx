import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Layout from '../../components/Layout'
import { CropIcon } from '../../components/CropIcon'
import { DarkHero } from '../../components/ui'
import { WarningIcon } from '../../components/icons'
import api from '../../lib/api'
import {
  CHART, axisTick, gridProps, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, barCursor,
} from '../../lib/chartTheme'

interface ForecastDay {
  day: number; date: string; demand_kg: number; festival: boolean; day_of_week: string
}
interface CropForecast {
  crop_type: string; region: string; forecast: ForecastDay[]
  weekly_pred_w1: number; weekly_pred_w2: number; mape_pct: number
  model_used: string; cached: boolean; error?: string
  fallback?: boolean
}

// ─── Real Ghana Western Region farming areas ──────────────────────────────────
const CROPS   = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['Aowin', 'Bibiani', 'Juaboso', 'Sefwi Wiawso', 'Wasa Amenfi']

// Short region descriptions shown in allocation hints
const REGION_DESC: Record<string, string> = {
  'Aowin':        'plantain & pepper belt',
  'Bibiani':      'cassava & maize hub',
  'Juaboso':      'cassava/plantain surplus zone',
  'Sefwi Wiawso': 'rice valley & vegetable area',
  'Wasa Amenfi':  'maize & cassava area',
}

export default function ForecastsPage() {
  const [forecasts, setForecasts] = useState<CropForecast[]>([])
  const [loading, setLoading]     = useState(true)
  const [crop, setCrop]           = useState('maize')
  const [region, setRegion]       = useState('Bibiani')

  useEffect(() => {
    api.get<CropForecast[]>('/api/v1/forecasts/summary')
      .then((r) => setForecasts(r.data))
      .catch(() => setForecasts([]))
      .finally(() => setLoading(false))
  }, [])

  const selected = forecasts.find((f) => f.crop_type === crop && f.region === region && !f.error)

  const chartData = selected?.forecast.map((d) => ({
    label: d.day_of_week.slice(0, 3), demand: d.demand_kg, festival: d.festival,
  })) ?? []

  const w1 = selected?.weekly_pred_w1 ?? 0
  const w2 = selected?.weekly_pred_w2 ?? 0
  const trend = w2 > w1 * 1.03 ? 'up' : w2 < w1 * 0.97 ? 'down' : 'stable'
  const tStyle = trend === 'up'
    ? { bg: 'var(--brand-soft)', text: 'var(--brand-ink)', border: 'var(--edge)' }
    : trend === 'down'
    ? { bg: 'var(--surface-2)', text: 'var(--ink)', border: 'var(--edge)' }
    : { bg: 'var(--surface-2)', text: 'var(--ink-muted)', border: 'var(--edge)' }

  // ── Allocation insight for farmer: which region needs this crop most? ────────
  const allocationInsight = useMemo(() => {
    if (!crop || forecasts.length === 0) return null
    const cropRows = forecasts.filter((f) => f.crop_type === crop && !f.error)
    if (cropRows.length === 0) return null
    const sorted = [...cropRows].sort((a, b) => b.weekly_pred_w1 - a.weekly_pred_w1)
    const top    = sorted[0]
    const bottom = sorted[sorted.length - 1]
    const allSameish = sorted[0].weekly_pred_w1 / Math.max(sorted[sorted.length - 1].weekly_pred_w1, 1) < 1.1
    if (allSameish) return { type: 'balanced' as const, top, bottom }
    return { type: 'gap' as const, top, bottom }
  }, [crop, forecasts])

  return (
    <Layout>
      <DarkHero
        eyebrow="ML Forecasting"
        title="Demand Forecast"
        sub="7-day demand projections · MLP neural network · Ghana Western Region farming areas"
        right={selected && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Accuracy</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'rgba(134,239,172,0.9)', letterSpacing: '-0.02em', marginTop: 4 }}>
              {typeof selected.mape_pct === 'number' ? selected.mape_pct.toFixed(1) : '-'}% MAPE
            </p>
          </div>
        )}
      />

      {/* Selectors */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ display: 'flex', gap: 4, padding: 6, flexWrap: 'wrap' }}>
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              style={{
                fontSize: 12, padding: '7px 12px', borderRadius: 8,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                textTransform: 'capitalize', cursor: 'pointer', fontWeight: 600,
                background: crop === c ? 'var(--brand)' : 'transparent',
                color: crop === c ? 'var(--on-brand)' : 'var(--ink-muted)',
                border: crop === c ? '1px solid var(--edge)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <CropIcon type={c} className="w-3.5 h-3.5" /> {c}
            </button>
          ))}
        </div>
        <div className="card" style={{ display: 'flex', gap: 4, padding: 6, flexWrap: 'wrap' }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              title={REGION_DESC[r]}
              style={{
                fontSize: 12, padding: '7px 14px', borderRadius: 8,
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                background: region === r ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08))' : 'transparent',
                color: region === r ? 'var(--brand-ink)' : 'var(--ink-muted)',
                border: region === r ? '1px solid var(--edge)' : '1px solid transparent',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Allocation insight banner (farmer-facing) ── */}
      {!loading && allocationInsight && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 14,
          background: allocationInsight.type === 'gap'
            ? 'linear-gradient(135deg, rgba(11,46,20,0.18), rgba(11,46,20,0.08))'
            : 'var(--surface-2)',
          border: '1px solid var(--edge)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-strong)', margin: 0, marginBottom: 4 }}>
              {allocationInsight.type === 'gap'
                ? `Where to send your ${crop}:`
                : `All areas have similar demand for ${crop}`}
            </p>
            {allocationInsight.type === 'gap' ? (
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, lineHeight: 1.6 }}>
                <strong>{allocationInsight.top.region}</strong> ({REGION_DESC[allocationInsight.top.region]}) has the
                highest forecast demand: <strong>{Math.round(allocationInsight.top.weekly_pred_w1).toLocaleString()} kg/wk</strong>.
                Consider prioritising produce allocation there.
                {allocationInsight.bottom && allocationInsight.bottom.region !== allocationInsight.top.region && (
                  <> <strong>{allocationInsight.bottom.region}</strong> has lower demand (<strong>{Math.round(allocationInsight.bottom.weekly_pred_w1).toLocaleString()} kg/wk</strong>). It is better supplied or less active this week.</> 
                )}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0 }}>
                Demand is spread evenly. Distribute {crop} to the nearest market or where you have existing buyers.
              </p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
        {/* Stat cards */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Week 1 (next 7 days)</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {w1 ? Math.round(w1).toLocaleString() : '-'} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-muted)' }}>kg</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6, textTransform: 'capitalize' }}>{crop} · {region}</p>
            {selected && (
              <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                {REGION_DESC[region]}
              </p>
            )}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Week 2 Outlook</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {w2 ? Math.round(w2).toLocaleString() : '-'} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-muted)' }}>kg</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, background: tStyle.bg, color: tStyle.text, border: `1px solid ${tStyle.border}` }}>
                {trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Falling' : '→ Stable'}
              </span>
              {w1 && w2 ? <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{((w2 - w1) / w1 * 100).toFixed(1)}% vs w1</span> : null}
            </div>
          </div>
          {selected && (
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Model Info</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-strong)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{selected.model_used}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>MAPE: {typeof selected.mape_pct === 'number' ? selected.mape_pct.toFixed(2) : '-'}%</p>
              {selected.cached && <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><span className="live-dot" style={{ background: 'var(--brand-ink)' } as React.CSSProperties} /> cached result</p>}
              {selected.fallback && (
                <p style={{ fontSize: 11, color: '#b45309', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><WarningIcon className="w-3 h-3" /> MOFA baseline (ML offline)</p>
              )}
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="card" style={{ flex: '2 1 420px', padding: 24, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>Daily Demand · Next 7 Days</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3, marginBottom: 16 }}>projected kg per day · {region}</p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ c: CHART.green, l: 'Regular day' }, { c: CHART.gold, l: 'Festival day' }].map(({ c, l }) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} /> {l}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 220, background: 'var(--surface-2)', borderRadius: 12 }} />
          ) : !selected ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No forecast available for this selection</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={36}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `${v}kg`} />
                <Tooltip
                  formatter={(v, _n, item) => [`${Number(v)} kg${(item?.payload as { festival?: boolean })?.festival ? ' · festival' : ''}`, 'Demand']}
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  cursor={barCursor}
                />
                <Bar dataKey="demand" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.festival ? CHART.gold : CHART.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary table — all crops for selected region */}
      <div className="card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--edge)' }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>All Crops · {region} · Week 1 Forecast</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{REGION_DESC[region]}</p>
        </div>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 40, background: 'var(--surface-2)', borderRadius: 8 }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: 90 }}>Crop</th>
                  <th style={{ textAlign: 'right', minWidth: 100 }}>Forecast (kg/wk)</th>
                  <th style={{ textAlign: 'right', minWidth: 72 }}>Week 2</th>
                  <th style={{ textAlign: 'right', minWidth: 80 }}>Trend</th>
                  <th style={{ textAlign: 'right', minWidth: 60 }}>MAPE</th>
                  <th style={{ textAlign: 'left', minWidth: 200 }}>Allocation Hint</th>
                </tr>
              </thead>
              <tbody>
                {CROPS.map((c) => {
                  const fc = forecasts.find((f) => f.crop_type === c && f.region === region && !f.error)
                  if (!fc) return (
                    <tr key={c}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>
                          <CropIcon type={c} className="w-4 h-4" />{c}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--ink-muted)' }} colSpan={5}>-</td>
                    </tr>
                  )
                  const t = fc.weekly_pred_w2 > fc.weekly_pred_w1 * 1.03 ? 'up'
                    : fc.weekly_pred_w2 < fc.weekly_pred_w1 * 0.97 ? 'down' : 'stable'
                  const pill = t === 'up'
                    ? { bg: 'var(--brand-soft)', text: 'var(--brand-ink)' }
                    : t === 'down'
                    ? { bg: 'var(--invert-bg)', text: 'var(--invert-ink)' }
                    : { bg: 'var(--surface-2)', text: 'var(--ink-muted)' }

                  // Allocation hint: compare this region to all others for this crop
                  const cropAllRows = forecasts.filter((f) => f.crop_type === c && !f.error)
                  const maxRegion = cropAllRows.reduce((best, f) => f.weekly_pred_w1 > best.weekly_pred_w1 ? f : best, cropAllRows[0])
                  const isHighestRegion = maxRegion?.region === region
                  const hint = isHighestRegion
                    ? `Highest demand area — prioritise allocation here`
                    : maxRegion
                    ? `→ Higher demand in ${maxRegion.region} (${Math.round(maxRegion.weekly_pred_w1).toLocaleString()} kg/wk)`
                    : ''

                  return (
                    <tr key={c}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>
                          <CropIcon type={c} className="w-4 h-4" />{c}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink-strong)' }}>{Math.round(fc.weekly_pred_w1).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--ink-muted)' }}>{Math.round(fc.weekly_pred_w2).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999,
                          background: pill.bg, color: pill.text,
                          whiteSpace: 'nowrap',
                        }}>
                          {t === 'up' ? '↑ Up' : t === 'down' ? '↓ Down' : '→ Stable'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--ink-muted)' }}>{typeof fc.mape_pct === 'number' ? fc.mape_pct.toFixed(1) : '-'}%</td>
                      <td style={{ fontSize: 12, color: isHighestRegion ? 'var(--brand-ink)' : 'var(--ink-muted)', fontWeight: isHighestRegion ? 600 : 400 }}>
                        {hint}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
