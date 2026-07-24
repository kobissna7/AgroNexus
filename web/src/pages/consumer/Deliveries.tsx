import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import StatusBadge from '../../components/StatusBadge'
import { DarkHero } from '../../components/ui'
import { TruckIcon, MapPinIcon, InboxIcon, CheckIcon, UserIcon } from '../../components/icons'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import type { Order, TransportRequest } from '../../types'

type RichTransportRequest = TransportRequest & {
  users?: { full_name: string; phone: string } | null
}
type RichOrder = Order & {
  produce_listings?: { crop_type: string; location: string; price_per_kg: number }
  transport_requests?: RichTransportRequest[]
}

const STEPS = ['Order Placed', 'Transporter Assigned', 'In Transit', 'Delivered'] as const

// Steps completed so far, driven entirely by the transporter's own actions:
// accepting the job (→ assigned), then marking in_transit / delivered.
function completedSteps(status: TransportRequest['status']): number {
  if (status === 'delivered')  return 4
  if (status === 'in_transit') return 3
  if (status === 'accepted')   return 2
  return 1 // open — only "placed" is done
}

function DeliveryTracker({ status }: { status: TransportRequest['status'] }) {
  const done = completedSteps(status)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {STEPS.map((label, i) => {
        const isDone    = i < done
        const isCurrent = i === done && done < 4
        const color = isDone ? 'var(--brand)' : 'var(--ink-faint)'
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', flex: i === STEPS.length - 1 ? '0 0 auto' : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 84 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? 'var(--brand)' : 'var(--surface)',
                border: `2px solid ${isCurrent ? 'var(--brand)' : isDone ? 'var(--brand)' : 'var(--edge-strong)'}`,
                boxShadow: isCurrent ? '0 0 0 4px var(--brand-soft)' : 'none',
                color: isDone ? 'var(--on-brand)' : 'var(--ink-faint)',
              }}>
                {isDone ? <CheckIcon className="w-3 h-3" /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCurrent ? 'var(--brand)' : 'var(--ink-faint)' }} />}
              </div>
              <p style={{ fontSize: 10.5, fontWeight: isCurrent ? 700 : 600, color: isDone || isCurrent ? 'var(--ink-strong)' : 'var(--ink-faint)', textAlign: 'center', marginTop: 6, lineHeight: 1.25 }}>
                {label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: color, marginTop: 10, minWidth: 12 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ConsumerDeliveries() {
  const { user } = useAuth()
  const [orders, setOrders]   = useState<RichOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const { data } = await api.get<RichOrder[]>('/api/v1/orders/mine')
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useRealtimeChannel(`orders:consumer-${user?.id ?? ''}`, 'status_update', () => { fetchOrders() })
  useRealtimeChannel(`orders:consumer-${user?.id ?? ''}`, 'order_placed',  () => { fetchOrders() })

  // Only orders that actually generated a delivery job — pending_payment /
  // cancelled orders never get one.
  const deliveries = orders
    .map((o) => ({ order: o, request: o.transport_requests?.[0] }))
    .filter((d): d is { order: RichOrder; request: RichTransportRequest } => !!d.request)

  const openCount      = deliveries.filter((d) => d.request.status === 'open').length
  const activeCount    = deliveries.filter((d) => ['accepted', 'in_transit'].includes(d.request.status)).length
  const deliveredCount = deliveries.filter((d) => d.request.status === 'delivered').length

  return (
    <Layout title="My Deliveries">
      <DarkHero
        eyebrow="Delivery Tracking"
        title="My Deliveries"
        sub="Live status straight from the transporter handling your order"
        glow={{ bottom: -50, right: -50, size: 160 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Awaiting Transporter" value={openCount}      sub="Not yet claimed"      icon={<InboxIcon />} />
        <MetricCard label="En Route"             value={activeCount}    sub="Accepted or in transit" icon={<TruckIcon />} />
        <MetricCard label="Delivered"            value={deliveredCount} sub="All time"             icon={<CheckIcon />} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--ink-faint)' }}>
            <TruckIcon className="w-14 h-14" />
          </div>
          <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No deliveries yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>Deliveries appear here once an order is placed and paid for</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {deliveries.map(({ order, request }) => (
            <div key={request.id} className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>
                      {order.produce_listings?.crop_type ?? request.crop_type ?? 'Order'}
                    </h3>
                    <StatusBadge status={request.status} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'monospace' }}>{order.id.slice(0, 8)}… · {new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Pickup</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                      <MapPinIcon className="w-3.5 h-3.5" /> {request.pickup_location}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Delivery</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                      <MapPinIcon className="w-3.5 h-3.5" /> {request.delivery_location}
                    </span>
                  </div>
                  {request.users && (
                    <div>
                      <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Transporter</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                        <UserIcon className="w-3.5 h-3.5" /> {request.users.full_name}
                        {request.users.phone && <span style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>· {request.users.phone}</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <DeliveryTracker status={request.status} />
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
