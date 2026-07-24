import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { DarkHero } from '../../components/ui'
import { TruckIcon as TruckStatusIcon, CheckIcon, PackageIcon, MapPinIcon } from '../../components/icons'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import type { TransportRequest } from '../../types'

type RichRequest = TransportRequest & {
  orders?: { status: string; quantity_kg: number }
}

export default function TransporterDeliveries() {
  const { user } = useAuth()
  const [mine, setMine]         = useState<RichRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<RichRequest[]>('/api/v1/transport/mine')
      setMine(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeChannel(`transport:transporter-${user?.id ?? ''}`, 'status_update', () => { fetchData() })

  const handleStatus = async (id: string, status: 'in_transit' | 'delivered') => {
    setUpdating(id)
    try { await api.put(`/api/v1/transport/${id}/status`, { status }); fetchData() }
    finally { setUpdating(null) }
  }

  const active    = mine.filter((r) => ['accepted', 'in_transit'].includes(r.status))
  const completed = mine.filter((r) => r.status === 'delivered')

  return (
    <Layout title="Deliveries">
      <DarkHero
        eyebrow="My Deliveries"
        title="Active Jobs"
        sub="Track and update the status of deliveries you've accepted"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 9999,
              background: 'rgba(96,165,250,0.18)', color: '#93c5fd',
              border: '1px solid rgba(96,165,250,0.3)', flexShrink: 0,
            }}>
              {active.length} ACTIVE
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 9999,
              background: 'rgba(52,211,153,0.15)', color: '#6ee7b7',
              border: '1px solid rgba(52,211,153,0.25)', flexShrink: 0,
            }}>
              {completed.length} DONE
            </span>
          </div>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Active" value={active.length} sub="Accepted or in transit" trend={active.length > 0 ? `${active.length} active` : undefined} icon={<TruckMetricIcon />} />
        <MetricCard label="Completed" value={completed.length} sub="All time" icon={<CheckIcon className="w-5 h-5" />} />
        <MetricCard label="Total Jobs" value={mine.length} sub="Accepted by you" icon={<PackageIcon className="w-5 h-5" />} />
      </div>

      {/* Active deliveries */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink-strong)', marginBottom: 20 }}>Active Deliveries</h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map((i) => <div key={i} style={{ height: 112, background: 'var(--surface-2)', borderRadius: 12 }} />)}
          </div>
        ) : active.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--ink-faint)' }}><TruckStatusIcon className="w-14 h-14" /></div>
            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No active deliveries</p>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>Go to the Feed tab to accept new requests</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map((r) => (
              <div key={r.id} style={{ border: '1px solid var(--edge)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-strong)', textTransform: 'capitalize', marginBottom: 4 }}>{r.crop_type}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <PackageIcon className="w-3.5 h-3.5" /> {r.quantity_kg} kg
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <MapPinIcon className="w-3.5 h-3.5" /> {r.pickup_location}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Progress timeline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
                  {(['accepted', 'in_transit', 'delivered'] as const).map((step, i) => {
                    const stepIdx = ['accepted', 'in_transit', 'delivered'].indexOf(r.status)
                    const thisIdx = i
                    const done = thisIdx <= stepIdx
                    const labels = ['Accepted', 'In Transit', 'Delivered']
                    return (
                      <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: done ? 'var(--brand)' : 'var(--surface-2)',
                            border: done ? 'none' : '2px solid var(--edge)',
                            color: done ? 'var(--on-brand)' : 'var(--ink-faint)',
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {done ? '✓' : i + 1}
                          </div>
                          <p style={{ fontSize: 10, color: done ? 'var(--brand-ink)' : 'var(--ink-faint)', marginTop: 4, fontWeight: done ? 700 : 400, whiteSpace: 'nowrap' }}>{labels[i]}</p>
                        </div>
                        {i < 2 && <div style={{ flex: 1, height: 2, background: done && thisIdx < stepIdx ? 'var(--brand)' : 'var(--edge)', margin: '0 4px', marginBottom: 18 }} />}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {r.status === 'accepted' && (
                    <button
                      onClick={() => handleStatus(r.id, 'in_transit')}
                      disabled={updating === r.id}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 9999, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {updating === r.id ? '…' : <><TruckStatusIcon className="w-4 h-4" /> Mark In Transit</>}
                    </button>
                  )}
                  {r.status === 'in_transit' && (
                    <button
                      onClick={() => handleStatus(r.id, 'delivered')}
                      disabled={updating === r.id}
                      className="btn-primary"
                      style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {updating === r.id ? '…' : <><CheckIcon className="w-4 h-4" /> Mark Delivered</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed history */}
      {completed.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink-strong)', marginBottom: 16 }}>
            Completed Deliveries <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>({completed.length})</span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 100 }}>Crop</th>
                  <th style={{ minWidth: 80 }}>Quantity</th>
                  <th style={{ minWidth: 120 }}>Pickup Location</th>
                  <th style={{ minWidth: 100 }}>Date</th>
                  <th style={{ minWidth: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink-strong)' }}>{r.crop_type}</td>
                    <td>{r.quantity_kg} kg</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{r.pickup_location}</td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}

function TruckMetricIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zm0 0l2 1h3l1-4-3-3h-3v6z" /></svg>
}
