import { useCallback, useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
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
      {/* Dark hero */}
      <div style={{
        background: 'linear-gradient(135deg, #030B07 0%, #0D2B1F 60%, #071510 100%)',
        borderRadius: 20, padding: 32, marginBottom: 24,
        border: '1px solid rgba(46,125,82,0.25)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,92,56,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ADE80', marginBottom: 8 }}>Farmer Dashboard</p>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Welcome back, {user?.full_name?.split(' ')[0]}
            </h1>
            <p style={{ fontSize: 14, color: '#4A6B58', marginTop: 6 }}>Manage listings, track orders and view demand forecasts</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setEditListing(null); setShowModal(true) }}
                className="btn-primary"
                style={{ padding: '10px 22px', fontSize: 13 }}
              >
                + Add Listing
              </button>
              <Link to="/forecasts" style={{
                padding: '10px 22px', fontSize: 13, fontWeight: 600, borderRadius: 9999,
                background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
                border: '1px solid rgba(201,168,76,0.3)', textDecoration: 'none', display: 'inline-block',
              }}>
                View Forecasts
              </Link>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#4A6B58', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Region</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F0EB', marginTop: 4 }}>{(user as unknown as { region?: string })?.region ?? '—'}</p>
            {liveOrders > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 9999,
                background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)',
              }}>
                <span className="live-dot" /> {liveOrders} new order{liveOrders > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Active Listings" value={activeListings} sub="Currently available" icon={<ListSvg />} />
        <MetricCard label="Pending Orders" value={pendingOrders} sub="Awaiting confirmation" icon={<OrderSvg />} accent="#C9A84C" />
        <MetricCard label="Confirmed Revenue" value={`GH₵ ${totalRevenue.toFixed(0)}`} sub="Confirmed + delivered" icon={<CoinSvg />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Forecast chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Demand Forecast — Next 7 Days</h2>
              <p style={{ fontSize: 12, color: '#6B8A7A', marginTop: 3 }}>
                {activeFc ? `${activeFc.crop_type} · ${w1.toFixed(0)} kg/wk · ${activeFc.mape_pct.toFixed(1)}% MAPE` : 'kg demand per day'}
              </p>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 220, background: '#F3F4F6', borderRadius: 12, animation: 'pulse 2s infinite' }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}kg`} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)} kg`, 'Forecast']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="forecast" stroke="#C9A84C" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent orders */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 16 }}>Recent Orders</h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 48, background: '#F3F4F6', borderRadius: 10 }} />)}
            </div>
          ) : orders.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6B8A7A', textAlign: 'center', padding: '32px 0' }}>No orders yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
              {orders.slice(0, 8).map((o) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(46,125,82,0.06)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{(o as Order & { produce_listings?: { crop_type: string } }).produce_listings?.crop_type ?? '—'}</p>
                    <p style={{ fontSize: 11, color: '#6B8A7A', marginTop: 2 }}>{o.quantity_kg} kg · {new Date(o.created_at).toLocaleDateString()}</p>
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
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>My Listings</h2>
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
            {[1,2,3].map(i => <div key={i} style={{ height: 40, background: '#F3F4F6', borderRadius: 10 }} />)}
          </div>
        ) : listings.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6B8A7A', textAlign: 'center', padding: '48px 0' }}>No listings yet. Add your first one!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderRadius: '10px 0 0 0' }}>Crop</th>
                  <th>Quantity</th>
                  <th>Price / kg</th>
                  <th>Location</th>
                  <th>Available From</th>
                  <th>Status</th>
                  <th style={{ borderRadius: '0 10px 0 0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>{l.crop_type}</td>
                    <td>{l.quantity_kg} kg</td>
                    <td>GH₵ {l.price_per_kg}</td>
                    <td>{l.location}</td>
                    <td style={{ color: '#6B8A7A' }}>{new Date(l.available_from).toLocaleDateString()}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setEditListing(l); setShowModal(true) }}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: '1px solid #D1E0D8', background: 'transparent', color: '#2E7D52', cursor: 'pointer' }}
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: 'none', background: 'transparent', color: '#F87171', cursor: 'pointer' }}
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
