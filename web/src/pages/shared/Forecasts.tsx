import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Layout from '../../components/Layout'
import { CropIcon } from '../../components/CropIcon'
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
}

const CROPS   = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']

export default function ForecastsPage() {
  const [forecasts, setForecasts] = useState<CropForecast[]>([])
  const [loading, setLoading]     = useState(true)
  const [crop, setCrop]           = useState('maize')
  const [region, setRegion]       = useState('Tarkwa')

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
    ? { bg: 'rgba(52,211,153,0.15)', text: '#34D399', border: 'rgba(52,211,153,0.25)' }
    : trend === 'down'
    ? { bg: 'rgba(248,113,113,0.15)', text: '#F87171', border: 'rgba(248,113,113,0.25)' }
    : { bg: 'rgba(201,168,76,0.15)', text: '#C9A84C', border: 'rgba(201,168,76,0.25)' }

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ADE80', marginBottom: 8 }}>ML Forecasting</p>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.02em' }}>Demand Forecast</h1>
            <p style={{ fontSize: 14, color: '#4A6B58', marginTop: 6 }}>
              7-day demand projections · MLP neural network · Ghana Western Region
            </p>
          </div>
          {selected && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#4A6B58', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Accuracy</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', letterSpacing: '-0.02em', marginTop: 4 }}>
                {selected.mape_pct.toFixed(1)}% MAPE
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ display: 'flex', gap: 4, padding: 6 }}>
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              style={{
                fontSize: 12, padding: '7px 12px', borderRadius: 8,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                textTransform: 'capitalize', cursor: 'pointer', fontWeight: 600,
                background: crop === c ? '#0D2B1F' : 'transparent',
                color: crop === c ? '#E8F0EB' : '#6B7280',
                border: crop === c ? '1px solid rgba(46,125,82,0.4)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <CropIcon type={c} className="w-3.5 h-3.5" /> {c}
            </button>
          ))}
        </div>
        <div className="card" style={{ display: 'flex', gap: 4, padding: 6 }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                fontSize: 12, padding: '7px 14px', borderRadius: 8,
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                background: region === r ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))' : 'transparent',
                color: region === r ? '#C9A84C' : '#6B7280',
                border: region === r ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
        {/* Stat cards */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-dark" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, color: '#4A6B58', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Week 1 (next 7 days)</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {w1 ? Math.round(w1).toLocaleString() : '—'} <span style={{ fontSize: 14, fontWeight: 400 }}>kg</span>
            </p>
            <p style={{ fontSize: 12, color: '#4A6B58', marginTop: 6, textTransform: 'capitalize' }}>{crop} · {region}</p>
          </div>
          <div className="card-dark" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, color: '#4A6B58', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Week 2 Outlook</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {w2 ? Math.round(w2).toLocaleString() : '—'} <span style={{ fontSize: 14, fontWeight: 400 }}>kg</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, background: tStyle.bg, color: tStyle.text, border: `1px solid ${tStyle.border}` }}>
                {trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Falling' : '→ Stable'}
              </span>
              {w1 && w2 ? <span style={{ fontSize: 11, color: '#4A6B58' }}>{((w2 - w1) / w1 * 100).toFixed(1)}% vs w1</span> : null}
            </div>
          </div>
          {selected && (
            <div className="card-dark" style={{ padding: 20 }}>
              <p style={{ fontSize: 11, color: '#4A6B58', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Model Info</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F0EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{selected.model_used}</p>
              <p style={{ fontSize: 12, color: '#4A6B58', marginTop: 4 }}>MAPE: {selected.mape_pct.toFixed(2)}%</p>
              {selected.cached && <p style={{ fontSize: 11, color: '#4A6B58', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><span className="live-dot" style={{ background: '#C9A84C' } as React.CSSProperties} /> cached result</p>}
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="card" style={{ flex: '2 1 420px', padding: 24, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Daily Demand · Next 7 Days</h2>
              <p style={{ fontSize: 12, color: '#6B8A7A', marginTop: 3, marginBottom: 16 }}>projected kg per day</p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ c: CHART.green, l: 'Regular day' }, { c: CHART.gold, l: 'Festival day' }].map(({ c, l }) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', fontWeight: 600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} /> {l}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 220, background: '#F3F4F6', borderRadius: 12 }} />
          ) : !selected ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: '#6B8A7A' }}>No forecast available for this selection</p>
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

      {/* Summary table */}
      <div className="card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(46,125,82,0.08)' }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>All Crops · {region} · Week 1 Forecast</h2>
        </div>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 40, background: '#F3F4F6', borderRadius: 8 }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Crop</th>
                  <th style={{ textAlign: 'right' }}>Forecast (kg/wk)</th>
                  <th style={{ textAlign: 'right' }}>Week 2</th>
                  <th style={{ textAlign: 'right' }}>Trend</th>
                  <th style={{ textAlign: 'right' }}>MAPE</th>
                </tr>
              </thead>
              <tbody>
                {CROPS.map((c) => {
                  const fc = forecasts.find((f) => f.crop_type === c && f.region === region && !f.error)
                  if (!fc) return (
                    <tr key={c}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                          <CropIcon type={c} className="w-4 h-4" />{c}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#6B8A7A' }} colSpan={4}>—</td>
                    </tr>
                  )
                  const t = fc.weekly_pred_w2 > fc.weekly_pred_w1 * 1.03 ? 'up'
                    : fc.weekly_pred_w2 < fc.weekly_pred_w1 * 0.97 ? 'down' : 'stable'
                  const pill = t === 'up'
                    ? { bg: '#D1FAE5', text: '#065F46' }
                    : t === 'down'
                    ? { bg: '#FEE2E2', text: '#991B1B' }
                    : { bg: '#FEF3C7', text: '#92400E' }
                  return (
                    <tr key={c}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                          <CropIcon type={c} className="w-4 h-4" />{c}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>{Math.round(fc.weekly_pred_w1).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#6B8A7A' }}>{Math.round(fc.weekly_pred_w2).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999,
                          background: pill.bg, color: pill.text, textTransform: 'capitalize',
                        }}>
                          {t === 'up' ? '↑' : t === 'down' ? '↓' : '→'} {t}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#6B8A7A' }}>{fc.mape_pct.toFixed(1)}%</td>
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
