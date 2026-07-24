import { useEffect, useState } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Layout from '../../components/Layout'
import {
  CHART, axisTick, gridProps, tooltipStyle, tooltipLabelStyle, tooltipItemStyle,
  tooltipCursor, barCursor, goldAreaGradient,
} from '../../lib/chartTheme'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { CropIcon } from '../../components/CropIcon'
import { DarkHero } from '../../components/ui'
import api from '../../lib/api'

interface MoaCropData {
  national_avg: number; trend_pct: number
  by_region: Record<string, number>
  monthly: { month: string; avg: number }[]
}
interface MoaData {
  source: string; lastUpdated: string
  crops: Record<string, MoaCropData>
}

interface PriceSeries {
  crop_type: string; current_price: number; region: string
  history: { recorded_date: string; price_per_kg: number }[]
}
interface SupplyItem  { crop_type: string; total_kg: number }
interface ActivityItem {
  id: string; status: string; quantity_kg: number; created_at: string
  produce_listings?: { crop_type: string; location: string }
}
interface ForecastDay { day: number; date: string; demand_kg: number; festival: boolean; day_of_week: string }
interface CropForecast {
  crop_type: string; region: string; forecast: ForecastDay[]
  weekly_pred_w1: number; weekly_pred_w2: number; mape_pct: number; model_used: string; error?: string
}

export default function MarketDashboard() {
  const [prices, setPrices]       = useState<PriceSeries[]>([])
  const [supply, setSupply]       = useState<SupplyItem[]>([])
  const [activity, setActivity]   = useState<ActivityItem[]>([])
  const [forecasts, setForecasts] = useState<CropForecast[]>([])
  const [moaData, setMoaData]     = useState<MoaData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeCrop, setActiveCrop]   = useState<string>('maize')
  const [activeMoaCrop, setActiveMoaCrop] = useState<string>('maize')

  useEffect(() => {
    Promise.all([
      api.get<PriceSeries[]>('/api/v1/dashboard/prices'),
      api.get<SupplyItem[]>('/api/v1/dashboard/supply'),
      api.get<ActivityItem[]>('/api/v1/dashboard/activity'),
      api.get<CropForecast[]>('/api/v1/forecasts/summary').catch(() => ({ data: [] as CropForecast[] })),
      api.get<MoaData>('/api/v1/prices/moa').catch(() => ({ data: null })),
    ]).then(([p, s, a, f, m]) => {
      setPrices(p.data); setSupply(s.data); setActivity(a.data); setForecasts(f.data)
      if (m.data) setMoaData(m.data)
      if (p.data.length > 0) setActiveCrop(p.data[0].crop_type)
    }).finally(() => setLoading(false))
  }, [])

  const activeSeries = prices.find((p) => p.crop_type === activeCrop)
  const priceChartData = activeSeries?.history.map((h) => ({
    date: h.recorded_date.slice(5), price: h.price_per_kg,
  })) ?? []

  const totalListings = supply.reduce((s, r) => s + r.total_kg, 0)
  const cropsTracked  = prices.length
  const todayOrders   = activity.filter((a) =>
    a.created_at.startsWith(new Date().toISOString().slice(0, 10))
  ).length

  const cropForecasts = prices.map((p) => {
    const fc = forecasts.find((f) => f.crop_type === p.crop_type && f.region === 'Tarkwa' && !f.error)
    if (!fc) return { crop_type: p.crop_type, current_price: p.current_price, trend: 'stable' as const, weeklyKg: null }
    const trend: 'up' | 'down' | 'stable' =
      fc.weekly_pred_w2 > fc.weekly_pred_w1 * 1.03 ? 'up'
      : fc.weekly_pred_w2 < fc.weekly_pred_w1 * 0.97 ? 'down' : 'stable'
    return { crop_type: p.crop_type, current_price: p.current_price, trend, weeklyKg: fc.weekly_pred_w1 }
  })

  return (
    <Layout>
      <DarkHero
        eyebrow="Market Intelligence"
        title="Market Dashboard"
        sub="Real-time prices and regional supply · Western Region, Ghana"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <span className="live-dot" style={{ background: 'rgba(134,239,172,0.9)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(134,239,172,0.9)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
          </div>
        }
      />

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Crops Tracked" value={cropsTracked} sub="Western Region markets" icon={<LeafIcon />} />
        <MetricCard label="Active Supply" value={`${totalListings.toLocaleString()}kg`} sub="available across listings" icon={<BoxIcon />} />
        <MetricCard label="Orders Today" value={todayOrders} sub="Platform-wide" icon={<OrderIcon />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Price trend chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>Price Trends</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3 }}>GH₵ per kg · last 30 days</p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {prices.map((p) => (
                <button
                  key={p.crop_type}
                  onClick={() => setActiveCrop(p.crop_type)}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 9999,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    textTransform: 'capitalize', transition: 'all 0.15s',
                    background: activeCrop === p.crop_type ? 'var(--brand)' : 'var(--surface-2)',
                    color: activeCrop === p.crop_type ? '#fff' : '#6B7280',
                    border: activeCrop === p.crop_type ? '1px solid var(--edge)' : '1px solid transparent',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  <CropIcon type={p.crop_type} className="w-3.5 h-3.5" /> {p.crop_type}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 220, background: 'var(--surface-2)', borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={priceChartData}>
                <defs>{goldAreaGradient('priceGold')}</defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `₵${v}`} />
                <Tooltip
                  formatter={(v) => [`GH₵ ${Number(v).toFixed(2)}`, 'Price']}
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  cursor={tooltipCursor}
                />
                <Area type="monotone" dataKey="price" stroke={CHART.gold} strokeWidth={2} fill="url(#priceGold)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)', marginBottom: 16 }}>Recent Activity</h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 48, background: 'var(--surface-2)', borderRadius: 10 }} />)}
            </div>
          ) : activity.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center', padding: '32px 0' }}>No activity yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
              {activity.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--edge)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--brand-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CropIcon type={a.produce_listings?.crop_type ?? ''} className="w-5 h-5" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.produce_listings?.crop_type ?? 'Order'} — {a.quantity_kg} kg
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{a.produce_listings?.location} · {new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Supply bar chart */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>Active Supply by Crop</h2>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3, marginBottom: 16 }}>Total kg available across active listings</p>
        {loading ? (
          <div style={{ height: 192, background: 'var(--surface-2)', borderRadius: 12 }} />
        ) : supply.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center', padding: '32px 0' }}>No active listings yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={supply} barSize={36}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="crop_type" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}kg`} />
              <Tooltip
                formatter={(v) => [`${Number(v)} kg`, 'Available']}
                contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                cursor={barCursor}
              />
              <Bar dataKey="total_kg" fill={CHART.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Demand forecast cards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>7-Day Demand Forecast</h2>
          {forecasts.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              {forecasts[0]?.mape_pct?.toFixed(1)}% MAPE
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
          {loading
            ? [1,2,3,4,5,6].map(i => <div key={i} className="card" style={{ padding: 16, height: 120 }} />)
            : cropForecasts.map(({ crop_type, current_price, trend, weeklyKg }) => {
                const arrow  = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
                const tStyle = trend === 'up'
                  ? { bg: 'var(--brand-soft)', text: 'var(--brand-ink)' }
                  : trend === 'down'
                  ? { bg: 'var(--surface-2)', text: 'var(--ink)' }
                  : { bg: 'var(--surface-2)', text: 'var(--ink-muted)' }
                return (
                  <div key={crop_type} className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--brand-ink)' }}>
                      <CropIcon type={crop_type} className="w-7 h-7" />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{crop_type}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>GH₵ {current_price.toFixed(2)}/kg</p>
                    {weeklyKg !== null && (
                      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{Math.round(weeklyKg)} kg/wk</p>
                    )}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 8,
                      fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 9999,
                      background: tStyle.bg, color: tStyle.text,
                    }}>
                      {arrow} {trend}
                    </span>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Ministry of Agriculture National Benchmark */}
      {moaData && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>National Price Benchmarks</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3 }}>
                Source: {moaData.source} · Updated {moaData.lastUpdated}
              </p>
            </div>
            {/* Crop selector */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.keys(moaData.crops).map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveMoaCrop(c)}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 9999,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    textTransform: 'capitalize', transition: 'all 0.15s', cursor: 'pointer',
                    background: activeMoaCrop === c ? 'var(--brand)' : 'var(--surface-2)',
                    color: activeMoaCrop === c ? '#fff' : '#6B7280',
                    border: activeMoaCrop === c ? '1px solid var(--edge)' : '1px solid transparent',
                    fontWeight: 600,
                  }}
                >
                  <CropIcon type={c} className="w-3.5 h-3.5" /> {c}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const crop = moaData.crops[activeMoaCrop]
            if (!crop) return null
            const trendPositive = crop.trend_pct >= 0
            const chartData = crop.monthly.map(m => ({ month: m.month.slice(5), avg: m.avg }))
            const sortedRegions = Object.entries(crop.by_region).sort(([, a], [, b]) => b - a)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* Price trend chart */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{activeMoaCrop} — National Avg</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink-strong)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>GH₵ {crop.national_avg.toFixed(2)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-muted)' }}>/kg</span></p>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 9999,
                      background: trendPositive ? 'rgba(11,46,20,0.30)' : 'rgba(220,38,38,0.08)',
                      color: trendPositive ? 'var(--brand-ink)' : 'var(--ink)',
                    }}>
                      {trendPositive ? '↑' : '↓'} {Math.abs(crop.trend_pct)}% (Jul–Oct)
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={chartData}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => `₵${v}`} />
                      <Tooltip
                        formatter={(v) => [`GH₵ ${Number(v).toFixed(2)}`, 'Avg Price']}
                        contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                        cursor={tooltipCursor}
                      />
                      <Line type="monotone" dataKey="avg" stroke={CHART.green} strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Regional breakdown */}
                <div className="card" style={{ padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-strong)', marginBottom: 14 }}>Price by Region (Oct 2025)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {sortedRegions.map(([region, price], i) => {
                      const maxPrice = sortedRegions[0][1]
                      const barW = Math.round((price / maxPrice) * 100)
                      return (
                        <div key={region}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: i === 0 ? 700 : 400 }}>{region}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--brand-ink)' : 'var(--ink)' }}>GH₵ {price.toFixed(2)}</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 9999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${barW}%`, background: i === 0 ? 'var(--chart-1)' : 'var(--surface-2)', borderRadius: 9999, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </Layout>
  )
}

function LeafIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
}
function BoxIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
}
function OrderIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}
