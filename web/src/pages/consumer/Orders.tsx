import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { DarkHero } from '../../components/ui'
import { CartIcon } from '../../components/icons'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import type { Order } from '../../types'

type RichOrder = Order & {
  produce_listings?: { crop_type: string; location: string; price_per_kg: number }
}

const STAT_COLORS = {
  total:      { bg: 'var(--brand-soft)', text: 'var(--brand-ink)' },
  pending:    { bg: 'var(--surface-2)',  text: 'var(--ink-muted)' },
  in_transit: { bg: 'var(--brand-soft)', text: 'var(--ink)' },
  delivered:  { bg: 'var(--brand-soft)', text: 'var(--brand-ink)' },
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
    { label: 'Total Orders', value: orders.length,   key: 'total', color: '#ffffff' },
    { label: 'Pending',      value: orders.filter(o => o.status === 'pending').length, key: 'pending', color: '#fcd34d' },
    { label: 'In Transit',   value: orders.filter(o => o.status === 'in_transit').length, key: 'in_transit', color: '#60a5fa' },
    { label: 'Delivered',    value: orders.filter(o => o.status === 'delivered').length, key: 'delivered', color: '#34d399' },
  ]

  return (
    <Layout title="My Orders">
      <DarkHero
        eyebrow="Order History"
        title="My Orders"
        sub="Track all your produce orders in one place"
        padding="24px"
        glow={{ bottom: -50, right: -50, size: 160 }}
      >
        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {stats.map(({ label, value, color }) => (
            <div key={label} style={{ flex: '1 1 100px', padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      </DarkHero>

      {/* Orders table */}
      <div className="card">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink-strong)' }}>Order History</h2>
            <span className="badge badge-outline">Total spent: GH₵ {totalSpent.toFixed(2)}</span>
          </div>
          <a href="/consumer/browse" className="btn-primary" style={{ textDecoration: 'none', minHeight: 36, fontSize: 13, padding: '0 16px', display: 'inline-flex', alignItems: 'center' }}>
            Browse Market
          </a>
        </div>

        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map((i) => <div key={i} style={{ height: 52, background: 'var(--surface-2)', borderRadius: 10 }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--ink-faint)' }}>
              <CartIcon className="w-14 h-14" />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No orders yet</p>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>Browse listings and place your first order</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 90 }}>Order ID</th>
                  <th style={{ minWidth: 100 }}>Crop</th>
                  <th style={{ minWidth: 80 }}>Quantity</th>
                  <th style={{ minWidth: 90 }}>Total (GH₵)</th>
                  <th style={{ minWidth: 100 }}>Location</th>
                  <th style={{ minWidth: 90 }}>Date</th>
                  <th style={{ minWidth: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-muted)' }}>{o.id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>
                      {o.produce_listings?.crop_type ?? '—'}
                    </td>
                    <td>{o.quantity_kg} kg</td>
                    <td style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>
                      {o.produce_listings ? (o.quantity_kg * o.produce_listings.price_per_kg).toFixed(2) : '—'}
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>{o.produce_listings?.location ?? '—'}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
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
