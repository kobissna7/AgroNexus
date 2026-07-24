import { useCallback, useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import {
  CHART, axisTick, gridProps, tooltipStyle, tooltipLabelStyle, tooltipItemStyle,
  tooltipCursor, goldAreaGradient,
} from '../../lib/chartTheme'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { DarkHero } from '../../components/ui'
import ListingModal from './ListingModal'
import { useAuth } from '../../hooks/useAuth'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import api from '../../lib/api'
import type { ProduceListing, Order } from '../../types'

interface ForecastDay { day: number; date: string; demand_kg: number }
interface CropFc { crop_type: string; forecast: ForecastDay[]; weekly_pred_w1: number; mape_pct: number }

export default function FarmerDashboard() {
  const { user } = useAuth()
  const [listings, setListings]     = useState<ProduceListing[]>([])
  const [orders, setOrders]         = useState<Order[]>([])
  const [forecasts, setForecasts]   = useState<CropFc[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editListing, setEditListing] = useState<ProduceListing | null>(null)
  const [liveOrders, setLiveOrders] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [l, o, f] = await Promise.all([
        api.get<ProduceListing[]>('/api/v1/listings/mine'),
        api.get<Order[]>('/api/v1/listings/orders'),
        api.get<CropFc[]>('/api/v1/forecasts/summary').catch(() => ({ data: [] as CropFc[] })),
      ])
      setListings(l.data)
      setOrders(o.data)
      setForecasts(f.data.filter((fc: CropFc & { error?: string }) => !fc.error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeChannel(`orders:farmer-${user?.id ?? ''}`, 'new_order', () => {
    setLiveOrders(c => c + 1)
    fetchData()
  })

  type RichOrder = Order & { produce_listings?: { crop_type: string; price_per_kg: number } }
  const activeListings  = listings.filter((l) => l.status === 'active').length
  const pendingOrders   = orders.filter((o) => o.status === 'pending').length
  const totalRevenue    = (orders as RichOrder[])
    .filter((o) => ['confirmed', 'in_transit', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.quantity_kg * (o.produce_listings?.price_per_kg ?? 0), 0)

  const handleDelete = async (id: string) => {
    await api.delete(`/api/v1/listings/${id}`)
    fetchData()
  }

  const activeFc = forecasts.find(fc => fc.crop_type === 'maize') ?? forecasts[0]
  const chartData = activeFc?.forecast.map(d => ({ day: d.date.slice(5), forecast: d.demand_kg })) ?? []
  const w1 = activeFc?.weekly_pred_w1 ?? 0

  return (
    <Layout>
      <DarkHero
        eyebrow="Farmer Dashboard"
        title={`Welcome back, ${user?.full_name?.split(' ')[0] ?? ''}`}
        sub="Manage listings, track orders and view demand forecasts"
        glow={{ color: 'rgba(11,46,20,0.30)' }}
        right={
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Region</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginTop: 4 }}>{user?.region ?? '—'}</p>
            {liveOrders > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 9999,
                background: 'rgba(255,255,255,0.12)', color: 'rgba(134,239,172,0.9)', border: '1px solid rgba(255,255,255,0.18)',
              }}>
                <span className="live-dot" style={{ background: 'rgba(134,239,172,0.9)' }} /> {liveOrders} new order{liveOrders > 1 ? 's' : ''}
              </span>
            )}
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setEditListing(null); setShowModal(true) }}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: 13 }}
          >
            + Add Listing
          </button>
          <Link to="/forecasts" style={{
            padding: '10px 22px', fontSize: 13, fontWeight: 600, borderRadius: 9999,
            background: 'rgba(255,255,255,0.12)', color: 'rgba(134,239,172,0.9)',
            border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none', display: 'inline-block',
          }}>
            View Forecasts
          </Link>
        </div>
      </DarkHero>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Active Listings" value={activeListings} sub="Currently available" icon={<ListSvg />} />
        <MetricCard label="Pending Orders" value={pendingOrders} sub="Awaiting confirmation" icon={<OrderSvg />} />
        <MetricCard label="Confirmed Revenue" value={`GH₵ ${totalRevenue.toFixed(0)}`} sub="Confirmed + delivered" icon={<CoinSvg />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Forecast chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>Demand Forecast — Next 7 Days</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3 }}>
                {activeFc ? `${activeFc.crop_type} · ${w1.toFixed(0)} kg/wk · ${activeFc.mape_pct.toFixed(1)}% MAPE` : 'kg demand per day'}
              </p>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 220, background: 'var(--surface-2)', borderRadius: 12, animation: 'pulse 2s infinite' }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>{goldAreaGradient('forecastGold')}</defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}kg`} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)} kg`, 'Forecast']}
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  cursor={tooltipCursor}
                />
                <Area type="monotone" dataKey="forecast" stroke={CHART.gold} strokeWidth={2} fill="url(#forecastGold)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent orders */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)', marginBottom: 16 }}>Recent Orders</h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 48, background: 'var(--surface-2)', borderRadius: 10 }} />)}
            </div>
          ) : orders.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center', padding: '32px 0' }}>No orders yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
              {orders.slice(0, 8).map((o) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--edge)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)' }}>{(o as Order & { produce_listings?: { crop_type: string } }).produce_listings?.crop_type ?? '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{o.quantity_kg} kg · {new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Listings table */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>My Listings</h2>
          <button
            onClick={() => { setEditListing(null); setShowModal(true) }}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            + Add Listing
          </button>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 40, background: 'var(--surface-2)', borderRadius: 10 }} />)}
          </div>
        ) : listings.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center', padding: '48px 0' }}>No listings yet. Add your first one!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderRadius: '10px 0 0 0', minWidth: 100 }}>Crop</th>
                  <th style={{ minWidth: 80 }}>Quantity</th>
                  <th style={{ minWidth: 90 }}>Price / kg</th>
                  <th style={{ minWidth: 100 }}>Location</th>
                  <th style={{ minWidth: 110 }}>Available From</th>
                  <th style={{ minWidth: 100 }}>Status</th>
                  <th style={{ borderRadius: '0 10px 0 0', minWidth: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{l.crop_type}</td>
                    <td>{l.quantity_kg} kg</td>
                    <td>GH₵ {l.price_per_kg}</td>
                    <td>{l.location}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{new Date(l.available_from).toLocaleDateString()}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setEditListing(l); setShowModal(true) }}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: '1px solid var(--edge)', background: 'transparent', color: 'var(--brand-ink)', cursor: 'pointer' }}
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: 'none', background: 'transparent', color: 'var(--ink)', cursor: 'pointer' }}
                        >Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ListingModal
          listing={editListing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
        />
      )}
    </Layout>
  )
}

function ListSvg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}
function OrderSvg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
}
function CoinSvg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
