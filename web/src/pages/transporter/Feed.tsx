import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { InboxIcon, TruckIcon as TruckStatusIcon, PackageIcon, MapPinIcon, CheckIcon } from '../../components/icons'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import api from '../../lib/api'
import type { TransportRequest } from '../../types'

type RichRequest = TransportRequest & {
  orders?: { status: string; quantity_kg: number }
}

export default function TransporterFeed() {
  const [open, setOpen]         = useState<RichRequest[]>([])
  const [mine, setMine]         = useState<RichRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [updating, setUpdating]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [openRes, mineRes] = await Promise.all([
        api.get<RichRequest[]>('/api/v1/transport'),
        api.get<RichRequest[]>('/api/v1/transport/mine'),
      ])
      setOpen(openRes.data); setMine(mineRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeChannel('transport:all', 'new_request', () => { fetchData() })

  const handleAccept = async (id: string) => {
    setAccepting(id)
    try { await api.put(`/api/v1/transport/${id}/accept`); fetchData() }
    finally { setAccepting(null) }
  }
  const handleStatus = async (id: string, status: 'in_transit' | 'delivered') => {
    setUpdating(id)
    try { await api.put(`/api/v1/transport/${id}/status`, { status }); fetchData() }
    finally { setUpdating(null) }
  }

  const active    = mine.filter((r) => ['accepted', 'in_transit'].includes(r.status))
  const completed = mine.filter((r) => r.status === 'delivered')

  return (
    <Layout>
      {/* Dark hero */}
      <div style={{
        background: 'linear-gradient(170deg, #000 0%, color-mix(in srgb, #0b2e14 55%, #000) 100%)',
        borderRadius: 20, padding: 32, marginBottom: 24,
        border: '1px solid var(--edge)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-ink)', marginBottom: 8 }}>Transporter Dashboard</p>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Delivery Requests</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-faint)', marginTop: 6 }}>Open requests in your region — accept to claim</p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 9999,
            background: 'var(--brand-soft)', color: 'var(--brand-ink)',
            border: '1px solid var(--edge)', flexShrink: 0,
          }}>
            {open.length} OPEN
          </span>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Open Requests" value={open.length} sub="Available in your region" icon={<BoxIcon />} />
        <MetricCard label="Active Deliveries" value={active.length} sub="Accepted or in transit" trend={active.length > 0 ? `${active.length} active` : undefined} icon={<TruckMetricIcon />} />
        <MetricCard label="Completed" value={completed.length} sub="All time" icon={<CheckIcon />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Open requests */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)' }}>Open Requests</h2>
            <button onClick={fetchData} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 9999, border: '1px solid var(--edge)', background: 'transparent', color: 'var(--brand-ink)', cursor: 'pointer', fontWeight: 600 }}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map((i) => <div key={i} style={{ height: 96, background: 'var(--surface-2)', borderRadius: 12 }} />)}
            </div>
          ) : open.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--ink-faint)' }}><InboxIcon className="w-12 h-12" /></div>
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No open requests</p>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>New requests appear when consumers place orders</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
              {open.map((r) => (
                <div key={r.id} style={{ border: '1px solid var(--edge)', borderRadius: 14, padding: 16, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(46,125,82,0.25)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(46,125,82,0.1)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{r.crop_type}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <p style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <PackageIcon className="w-3.5 h-3.5 shrink-0" /> {r.quantity_kg} kg
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> Pickup: {r.pickup_location}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAccept(r.id)}
                      disabled={accepting === r.id}
                      className="btn-primary"
                      style={{ marginLeft: 12, padding: '8px 16px', fontSize: 12, flexShrink: 0 }}
                    >
                      {accepting === r.id ? 'Accepting…' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active deliveries */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)', marginBottom: 20 }}>My Active Deliveries</h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2].map((i) => <div key={i} style={{ height: 112, background: 'var(--surface-2)', borderRadius: 12 }} />)}
            </div>
          ) : active.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--ink-faint)' }}><TruckStatusIcon className="w-12 h-12" /></div>
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No active deliveries</p>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>Accept a request to start</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
              {active.map((r) => (
                <div key={r.id} style={{ border: '1px solid var(--edge)', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{r.crop_type}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3 }}>{r.quantity_kg} kg · {r.pickup_location}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {r.status === 'accepted' && (
                      <button
                        onClick={() => handleStatus(r.id, 'in_transit')}
                        disabled={updating === r.id}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 9999, background: 'var(--brand-soft)', border: '1px solid var(--edge)', color: 'var(--brand-ink)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        {updating === r.id ? '…' : <><TruckStatusIcon className="w-4 h-4" /> Mark In Transit</>}
                      </button>
                    )}
                    {r.status === 'in_transit' && (
                      <button
                        onClick={() => handleStatus(r.id, 'delivered')}
                        disabled={updating === r.id}
                        className="btn-primary"
                        style={{ flex: 1, padding: '9px 0', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        {updating === r.id ? '…' : <><CheckIcon className="w-4 h-4" /> Mark Delivered</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--edge)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Completed ({completed.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {completed.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{r.crop_type}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{r.pickup_location} · {r.quantity_kg} kg</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function BoxIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
}
function TruckMetricIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zm0 0l2 1h3l1-4-3-3h-3v6z" /></svg>
}
