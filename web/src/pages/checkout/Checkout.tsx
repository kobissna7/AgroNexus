import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import { track } from '../../lib/analytics'
import { useAuth } from '../../hooks/useAuth'
import PublicHeader from '../../components/PublicHeader'
import { CropIcon } from '../../components/CropIcon'
import { TruckIcon } from '../../components/icons'
import type { MarketListing } from '../../components/ListingCard'

interface Transporter { id: string; full_name: string; region: string; phone: string }
interface PaymentConfig { enabled: boolean; currency: string; provider?: 'rushpay' | 'paystack' | null }
interface RushPayWidget { script_url: string; api_base: string; session: Record<string, unknown> }
interface InitializeResponse {
  payment_required: boolean
  provider?: 'rushpay' | 'paystack'
  authorization_url?: string
  reference?: string
  notice?: string
  order?: { id: string; status: string }
  widget?: RushPayWidget
}

declare global {
  interface Window { RushPayV2?: { init: (opts: Record<string, unknown>) => void } }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load payment widget'))
    document.head.appendChild(s)
  })
}

/** Embedded RushPay checkout — the widget takes over in-page; whatever way it
    ends we land on /payment/callback where the server-side verify decides. */
async function launchRushPayWidget(widget: RushPayWidget, reference: string, onDone: () => void) {
  await loadScript(widget.script_url)
  if (!window.RushPayV2) throw new Error('Payment widget unavailable')
  const session = widget.session ?? {}
  const token = (session.widget_session_token ?? session.session_token ?? session.token) as string | undefined
  window.RushPayV2.init({
    apiBase: widget.api_base,       // required — widget cannot reach Core without it
    widgetSessionToken: token,
    ...session,
    onSuccess: onDone,
    onComplete: onDone,
    onClose: onDone,
  })
}

const MIN_BULK_KG = 50

export default function Checkout() {
  const { listingId } = useParams<{ listingId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isBulkBuyer = user?.role === 'retailer' || user?.role === 'wholesaler'
  const minQty = isBulkBuyer ? MIN_BULK_KG : 1

  const [listing, setListing] = useState<MarketListing | null>(null)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [transporterId, setTransporterId] = useState('')
  const [quantity, setQuantity] = useState<number>(() => {
    const q = Number(searchParams.get('qty'))
    return q > 0 ? q : minQty
  })
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
  const [skippedNotice, setSkippedNotice] = useState(false)

  useEffect(() => {
    api.get<MarketListing>(`/api/v1/marketplace/${listingId}`)
      .then(({ data }) => {
        if (data.status !== 'active') setNotFound(true)
        else {
          setListing(data)
          track('checkout_start', { listing_id: data.id, crop_type: data.crop_type, region: data.location })
        }
      })
      .catch(() => setNotFound(true))
    api.get<PaymentConfig>('/api/v1/payments/config').then(({ data }) => setConfig(data)).catch(() => setConfig({ enabled: false, currency: 'GHS' }))
    api.get<Transporter[]>('/api/v1/transport/available').then(({ data }) => setTransporters(data)).catch(() => {})
  }, [listingId])

  const total = useMemo(() => listing ? quantity * Number(listing.price_per_kg) : 0, [listing, quantity])

  const quantityValid = listing != null && quantity >= minQty && quantity <= Number(listing.quantity_kg)

  const handlePay = async () => {
    if (!listing) return
    setError('')
    if (!quantityValid) {
      setError(isBulkBuyer
        ? `Bulk buyers must order a minimum of ${MIN_BULK_KG} kg (max ${listing.quantity_kg} kg)`
        : `Enter a quantity between 1 and ${listing.quantity_kg} kg`)
      return
    }
    setPlacing(true)
    try {
      const { data } = await api.post<InitializeResponse>('/api/v1/payments/initialize', {
        listing_id: listing.id,
        quantity_kg: quantity,
        ...(transporterId ? { transporter_id: transporterId } : {}),
      })
      if (data.payment_required && data.provider === 'rushpay' && data.widget && data.reference) {
        // Embedded RushPay widget; verification happens on /payment/callback
        const reference = data.reference
        await launchRushPayWidget(data.widget, reference, () =>
          navigate(`/payment/callback?reference=${encodeURIComponent(reference)}`))
      } else if (data.payment_required && data.authorization_url) {
        // Hand off to Paystack's hosted checkout; we return via /payment/callback
        window.location.href = data.authorization_url
      } else {
        track('order_placed', { listing_id: listing.id, crop_type: listing.crop_type, region: listing.location, metadata: { payment: 'skipped' } })
        setPlacedOrderId(data.order?.id ?? null)
        setSkippedNotice(data.notice === 'payment_skipped_not_configured')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Could not start checkout. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (notFound) {
    return (
      <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
        <PublicHeader />
        <div className="container-page" style={{ padding: '96px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink-strong)', marginBottom: 12 }}>This listing is no longer available</h1>
          <p style={{ color: 'var(--ink-muted)', marginBottom: 28 }}>It may have sold out or expired. There's plenty more on the market.</p>
          <Link to="/" className="btn-primary btn-lg" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Back to marketplace</Link>
        </div>
      </div>
    )
  }

  // ── Success state (payment-skipped path) ──────────────────────────────────
  if (placedOrderId) {
    return (
      <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
        <PublicHeader />
        <div className="container-page" style={{ padding: '80px 24px', maxWidth: 560 }}>
          <div className="card animate-slide-up" style={{ padding: 36, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'var(--brand)', color: 'var(--on-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 30, height: 30 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-strong)', marginBottom: 8 }}>Order placed</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 8 }}>Order ID: {placedOrderId}</p>
            {skippedNotice && (
              <p className="badge badge-outline" style={{ marginBottom: 16 }}>
                Test mode — payment skipped (Paystack not configured)
              </p>
            )}
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28 }}>
              The farmer has been notified and a delivery request is live for transporters.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/consumer/orders')}>Track my order</button>
              <button className="btn-outline" onClick={() => navigate('/')}>Keep shopping</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--canvas-soft)', minHeight: '100vh' }}>
      <PublicHeader />
      <div className="container-page" style={{ padding: '40px 24px 80px', maxWidth: 920 }}>
        <Link to="/" style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none', fontWeight: 600 }}>← Back to marketplace</Link>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.02em', margin: '12px 0 28px' }}>
          Checkout
        </h1>

        {!listing ? (
          <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
            {/* ── Left: order details ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Product */}
              <div className="card" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: 'var(--brand-soft)', color: 'var(--brand-ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CropIcon type={listing.crop_type} className="w-7 h-7" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{listing.crop_type}</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{listing.location} · {Number(listing.quantity_kg).toLocaleString()} kg available</p>
                </div>
                <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink-strong)', whiteSpace: 'nowrap' }}>
                  GH₵{Number(listing.price_per_kg).toFixed(2)}<span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 400 }}>/kg</span>
                </p>
              </div>

              {/* Quantity */}
              <div className="card" style={{ padding: 22 }}>
                <label htmlFor="qty" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Quantity (kg)
                </label>
                {isBulkBuyer && (
                  <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>
                    Bulk buyer minimum: {MIN_BULK_KG} kg
                  </p>
                )}
                <input
                  id="qty"
                  type="number"
                  className="input-field"
                  min={minQty}
                  max={listing.quantity_kg}
                  step={1}
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  style={{ marginTop: 6, fontSize: 16, fontWeight: 700 }}
                />
              </div>

              {/* Transporter */}
              <div className="card" style={{ padding: 22 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                  Delivery <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>— optional</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                  <TransporterOption
                    selected={transporterId === ''}
                    onClick={() => setTransporterId('')}
                    title="Open to any transporter"
                    sub="First available transporter will accept"
                    icon={<TruckIcon className="w-4 h-4" />}
                  />
                  {transporters.map(t => (
                    <TransporterOption
                      key={t.id}
                      selected={transporterId === t.id}
                      onClick={() => setTransporterId(t.id)}
                      title={t.full_name}
                      sub={t.region}
                      icon={<span style={{ fontWeight: 700, fontSize: 13 }}>{t.full_name[0]?.toUpperCase()}</span>}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: summary + pay ── */}
            <div className="card" style={{ padding: 26, position: 'sticky', top: 92 }}>
              <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', marginBottom: 18 }}>
                Order summary
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--ink)' }}>
                <Row label={`${listing.crop_type} × ${quantity} kg`} value={`GH₵${total.toFixed(2)}`} />
                <Row label="Delivery" value={transporterId ? 'Pre-assigned' : 'Matched after order'} muted />
              </div>
              <div style={{ borderTop: '1px solid var(--edge)', margin: '16px 0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Total</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.02em' }}>GH₵{total.toFixed(2)}</span>
              </div>

              {config && !config.enabled && (
                <p className="badge badge-outline" style={{ marginBottom: 14 }}>
                  Test mode — payment will be skipped
                </p>
              )}

              {error && (
                <div style={{
                  fontSize: 13, fontWeight: 600, marginBottom: 14,
                  background: 'var(--invert-bg)', color: 'var(--invert-ink)',
                  padding: '0.7rem 1rem', borderRadius: 10,
                }}>
                  {error}
                </div>
              )}

              <button
                className="btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={placing || !quantityValid}
                onClick={handlePay}
              >
                {placing
                  ? 'Processing…'
                  : config?.enabled
                    ? `Pay GH₵${total.toFixed(2)} with Paystack`
                    : 'Place order'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 12 }}>
                {config?.enabled
                  ? 'You will be redirected to Paystack to complete payment securely.'
                  : 'Payment collection is coming soon — orders are confirmed directly for now.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--ink-muted)', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontWeight: muted ? 400 : 700, color: muted ? 'var(--ink-muted)' : 'var(--ink)' }}>{value}</span>
    </div>
  )
}

function TransporterOption({ selected, onClick, title, sub, icon }: {
  selected: boolean; onClick: () => void; title: string; sub: string; icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
        border: selected ? '1.5px solid var(--brand)' : '1.5px solid var(--edge)',
        background: selected ? 'var(--brand-soft)' : 'var(--surface)',
        width: '100%', transition: 'all 0.15s', fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: selected ? 'var(--brand)' : 'var(--surface-2)',
        color: selected ? 'var(--on-brand)' : 'var(--ink-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{sub}</p>
      </div>
      {selected && <span className="badge badge-solid" style={{ fontSize: 10, flexShrink: 0 }}>Selected</span>}
    </button>
  )
}
