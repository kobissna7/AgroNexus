import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { DarkHero } from '../../components/ui'
import { InboxIcon, PackageIcon, MapPinIcon } from '../../components/icons'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import api from '../../lib/api'
import type { TransportRequest } from '../../types'

type RichRequest = TransportRequest & {
  orders?: { status: string; quantity_kg: number }
}

export default function TransporterFeed() {
  const [open, setOpen]           = useState<RichRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<RichRequest[]>('/api/v1/transport')
      setOpen(data)
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

  return (
    <Layout title="Feed">
      <DarkHero
        eyebrow="Transporter Dashboard"
        title="Delivery Requests"
        sub="Open requests in your region — accept to claim"
        right={
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 9999,
            background: 'rgba(255,255,255,0.12)', color: 'rgba(134,239,172,0.9)',
            border: '1px solid rgba(255,255,255,0.18)', flexShrink: 0,
          }}>
            {open.length} OPEN
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Open Requests" value={open.length} sub="Available in your region" icon={<BoxIcon />} />
        <MetricCard
          label="Newest Request"
          value={open[0]?.crop_type ?? '—'}
          sub={open[0] ? `${open[0].quantity_kg} kg · ${open[0].pickup_location}` : 'No requests yet'}
          icon={<InboxIcon className="w-5 h-5" />}
        />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink-strong)' }}>Open Requests</h2>
          <button onClick={fetchData} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 9999, border: '1px solid var(--edge)', background: 'transparent', color: 'var(--brand-ink)', cursor: 'pointer', fontWeight: 600 }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map((i) => <div key={i} style={{ height: 96, background: 'var(--surface-2)', borderRadius: 12 }} />)}
          </div>
        ) : open.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--ink-faint)' }}><InboxIcon className="w-14 h-14" /></div>
            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No open requests right now</p>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>New requests appear here when consumers place orders in your region</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {open.map((r) => (
              <div key={r.id}
                style={{ border: '1px solid var(--edge)', borderRadius: 14, padding: 16, transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--edge)'}
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
                      <p style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAccept(r.id)}
                    disabled={accepting === r.id}
                    className="btn-primary"
                    style={{ marginLeft: 12, padding: '8px 16px', fontSize: 12, flexShrink: 0 }}
                  >
                    {accepting === r.id ? 'Accepting…' : 'Accept →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function BoxIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
}
