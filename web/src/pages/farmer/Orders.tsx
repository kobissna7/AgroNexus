import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { CropIcon } from '../../components/CropIcon'
import { ClipboardIcon } from '../../components/icons'
import api from '../../lib/api'
import type { Order } from '../../types'

type RichOrder = Order & {
  produce_listings?: { crop_type: string; location: string; price_per_kg: number }
}

export default function FarmerOrders() {
  const [orders, setOrders]   = useState<RichOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<RichOrder[]>('/api/v1/listings/orders')
      setOrders(data)
    } catch {
      setError('Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const revenue = orders
    .filter(o => ['confirmed', 'in_transit', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.quantity_kg * (o.produce_listings?.price_per_kg ?? 0), 0)

  return (
    <Layout>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-ink)', marginBottom: 4 }}>Incoming</p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.02em' }}>Orders Received</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
            {orders.length} orders &middot; GH₵ {revenue.toFixed(2)} confirmed revenue
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{ padding: '10px 18px', fontSize: 13, borderRadius: 9999, border: '1px solid var(--edge)', background: 'transparent', color: 'var(--brand-ink)', cursor: 'pointer', fontWeight: 600 }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--edge-strong)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--ink)' }}>
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Orders" value={orders.length} sub="All time" icon={<TotalIcon />} />
        <MetricCard label="Pending" value={orders.filter(o => o.status === 'pending').length} sub="Awaiting action" icon={<PendingIcon />} />
        <MetricCard label="In Transit" value={orders.filter(o => o.status === 'in_transit').length} sub="Being delivered" icon={<TransitIcon />} />
        <MetricCard label="Delivered" value={orders.filter(o => o.status === 'delivered').length} sub="Completed" icon={<DoneIcon />} />
      </div>

      <div className="card" style={{ padding: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 48, background: 'var(--surface-2)', borderRadius: 10 }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--ink-faint)' }}>
              <ClipboardIcon className="w-14 h-14" />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No orders yet</p>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>Orders from consumers will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orders.map((o) => {
              const crop = o.produce_listings?.crop_type ?? 'Order'
              const total = o.quantity_kg * (o.produce_listings?.price_per_kg ?? 0)
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--edge)' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--brand-soft)', color: 'var(--brand-ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CropIcon type={crop} className="w-5 h-5" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{crop}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                      {o.quantity_kg} kg &middot; GH₵ {total.toFixed(2)}
                      {o.produce_listings?.location && ` · ${o.produce_listings.location}`}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

function TotalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}
function PendingIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
}
function TransitIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zm0 0l2 1h3l1-4-3-3h-3v6z" /></svg>
}
function DoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
