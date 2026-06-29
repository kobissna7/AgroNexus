import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { CartIcon } from '../../components/icons'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import type { Order } from '../../types'

type RichOrder = Order & {
  produce_listings?: { crop_type: string; location: string; price_per_kg: number }
}

const STAT_COLORS = {
  total:      { bg: 'rgba(26,92,56,0.08)',  text: '#1A5C38' },
  pending:    { bg: 'rgba(201,168,76,0.1)', text: '#C9A84C' },
  in_transit: { bg: 'rgba(96,165,250,0.1)', text: '#60A5FA' },
  delivered:  { bg: 'rgba(52,211,153,0.1)', text: '#34D399' },
}

export default function ConsumerOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<RichOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const { data } = await api.get<RichOrder[]>('/api/v1/orders/mine')
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useRealtimeChannel(`orders:consumer-${user?.id ?? ''}`, 'status_update', () => { fetchOrders() })
  useRealtimeChannel(`orders:consumer-${user?.id ?? ''}`, 'order_placed',  () => { fetchOrders() })

  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.quantity_kg * (o.produce_listings?.price_per_kg ?? 0), 0)

  const stats = [
    { label: 'Total Orders', value: orders.length,   key: 'total' },
    { label: 'Pending',      value: orders.filter(o => o.status === 'pending').length, key: 'pending' },
    { label: 'In Transit',   value: orders.filter(o => o.status === 'in_transit').length, key: 'in_transit' },
    { label: 'Delivered',    value: orders.filter(o => o.status === 'delivered').length, key: 'delivered' },
  ]

  return (
    <Layout>
      {/* Dark hero */}
      <div style={{
        background: 'linear-gradient(135deg, #030B07 0%, #0D2B1F 60%, #071510 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 24,
        border: '1px solid rgba(46,125,82,0.25)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', bottom: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ADE80', marginBottom: 8 }}>Order History</p>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.02em' }}>My Orders</h1>
        <p style={{ fontSize: 14, color: '#4A6B58', marginTop: 6 }}>Track all your produce orders in one place</p>
        <div style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {stats.map(({ label, value, key }) => {
            const s = STAT_COLORS[key as keyof typeof STAT_COLORS]
            return (
              <div key={key} style={{ padding: '10px 16px', borderRadius: 12, background: s.bg, border: `1px solid ${s.text}28` }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: '#7BA892', marginTop: 4, fontWeight: 500 }}>{label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Orders table */}
      <div className="card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(46,125,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Order History</h2>
          <span style={{ fontSize: 13, color: '#6B8A7A' }}>Total spent: <strong style={{ color: '#111827' }}>GH₵ {totalSpent.toFixed(2)}</strong></span>
        </div>

        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map((i) => <div key={i} style={{ height: 52, background: '#F3F4F6', borderRadius: 10 }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#D1D5DB' }}>
              <CartIcon className="w-14 h-14" />
            </div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No orders yet</p>
            <p style={{ fontSize: 13, color: '#6B8A7A', marginTop: 6 }}>Browse listings and place your first order</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Total (GH₵)</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B8A7A' }}>{o.id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                      {o.produce_listings?.crop_type ?? '—'}
                    </td>
                    <td>{o.quantity_kg} kg</td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>
                      {o.produce_listings ? (o.quantity_kg * o.produce_listings.price_per_kg).toFixed(2) : '—'}
                    </td>
                    <td style={{ color: '#6B8A7A' }}>{o.produce_listings?.location ?? '—'}</td>
                    <td style={{ color: '#6B8A7A' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
