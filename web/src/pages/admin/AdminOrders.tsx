// /home/ekko-7/AgroNexus/web/src/pages/admin/AdminOrders.tsx
import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { CropIcon } from '../../components/CropIcon'
import api from '../../lib/api'

interface AdminOrder {
  id: string
  quantity_kg: number
  status: string
  created_at: string
  produce_listings: {
    crop_type: string
    location: string
    price_per_kg: number
    users: { full_name: string } | null
  } | null
  users: { full_name: string; email: string } | null
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders, setOrders]     = useState<AdminOrder[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<AdminOrder[]>('/api/v1/admin/orders')
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

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q
      || o.produce_listings?.crop_type.includes(q)
      || o.users?.full_name?.toLowerCase().includes(q)
      || o.users?.email?.toLowerCase().includes(q)
      || false
    return matchStatus && matchSearch
  })

  return (
    <Layout>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.01em' }}>
            All Orders
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>
            {orders.length} orders · GH₵ {revenue.toFixed(2)} confirmed revenue
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '9999px',
            border: '1px solid var(--edge)',
            background: 'var(--surface)', color: 'var(--ink)',
            fontSize: '0.8125rem', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* ── Status summary mini-cards ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3" style={{ marginBottom: '1.25rem' }}>
        {STATUS_OPTIONS.map(s => {
          const count = orders.filter(o => o.status === s).length
          const isActive = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              style={{
                background: 'linear-gradient(170deg, #000 0%, color-mix(in srgb, #0b2e14 55%, #000) 100%)',
                border: isActive
                  ? '1px solid var(--edge)'
                  : '1px solid var(--edge)',
                borderRadius: '0.875rem',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: isActive
                  ? '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)'
                  : '0 4px 16px rgba(0,0,0,0.2)',
                transition: 'all 0.18s',
                outline: 'none',
              }}
            >
              <p style={{ fontSize: '1.625rem', fontWeight: 800, color: isActive ? '#fff' : 'rgba(255,255,255,0.72)', lineHeight: 1 }}>
                {count}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize', marginTop: '0.25rem' }}>
                {s.replace('_', ' ')}
              </p>
            </button>
          )
        })}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
        <svg
          style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '0.9375rem', height: '0.9375rem', color: 'var(--ink-muted)', pointerEvents: 'none' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search crop, consumer name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
            borderRadius: '9999px',
            border: '1px solid var(--edge)',
            backgroundColor: 'var(--surface)',
            fontSize: '0.875rem', color: 'var(--ink)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--edge-strong)',
          borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem',
          fontSize: '0.875rem', color: 'var(--ink)',
        }}>
          {error}
        </div>
      )}

      {/* ── Table card ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(13,43,31,0.08)',
      }}>
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: '3.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface-2)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--ink-muted)' }}>No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--brand)' }}>
                  {['Crop', 'Consumer', 'Farmer', 'Qty / Value', 'Status', 'Date'].map(col => (
                    <th key={col} style={{
                      padding: '0.875rem 1.5rem', textAlign: 'left',
                      fontSize: '0.6875rem', fontWeight: 600,
                      color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      border: 'none',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const crop  = o.produce_listings?.crop_type ?? 'Unknown'
                  const total = o.quantity_kg * (o.produce_listings?.price_per_kg ?? 0)
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50"
                      style={{ borderBottom: '1px solid var(--edge)', transition: 'background 0.12s' }}
                    >
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: 'var(--ink-strong)' }}>
                          <CropIcon type={crop} className="w-4 h-4" />
                          <span style={{ textTransform: 'capitalize' }}>{crop}</span>
                        </span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.125rem' }}>
                          {o.produce_listings?.location}
                        </p>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <p style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{o.users?.full_name ?? '—'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.125rem' }}>{o.users?.email}</p>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--ink-muted)' }}>
                        {o.produce_listings?.users?.full_name ?? '—'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--ink-muted)' }}>
                        {o.quantity_kg} kg
                        <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>GH₵ {total.toFixed(2)}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        {new Date(o.created_at).toLocaleDateString()}
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
