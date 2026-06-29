import { useState, useEffect, FormEvent } from 'react'
import { XIcon, MapPinIcon, TruckIcon } from '../../components/icons'
import { CropIcon } from '../../components/CropIcon'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import type { ProduceListing } from '../../types'

interface Transporter {
  id: string
  full_name: string
  region: string
  phone: string
}

interface Props {
  listing: ProduceListing
  onClose: () => void
  onOrdered: (orderId: string) => void
}

const MIN_BULK_KG = 50

export default function OrderModal({ listing, onClose, onOrdered }: Props) {
  const { user } = useAuth()
  const isRetailer = user?.role === 'retailer'
  const minQty = isRetailer ? MIN_BULK_KG : 1

  const [quantity, setQuantity]           = useState<number>(minQty)
  const [transporters, setTransporters]   = useState<Transporter[]>([])
  const [transporterId, setTransporterId] = useState<string>('')
  const [step, setStep]                   = useState<1 | 2>(1)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [loadingT, setLoadingT]           = useState(false)

  useEffect(() => {
    setLoadingT(true)
    api.get<Transporter[]>('/api/v1/transport/available')
      .then(({ data }) => setTransporters(data))
      .catch(() => {})
      .finally(() => setLoadingT(false))
  }, [])

  const total = (quantity * listing.price_per_kg).toFixed(2)

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault()
    setError('')
    if (quantity < minQty || quantity > listing.quantity_kg) {
      setError(
        isRetailer
          ? `Retailers must order a minimum of ${MIN_BULK_KG} kg (max ${listing.quantity_kg} kg)`
          : `Enter a quantity between 1 and ${listing.quantity_kg} kg`
      )
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post<{ id: string }>('/api/v1/orders', {
        listing_id: listing.id,
        quantity_kg: quantity,
        ...(transporterId ? { transporter_id: transporterId } : {}),
      })
      onOrdered(data.id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
    border: '1.5px solid #D1D5DB', background: '#fff',
    color: '#111827', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff', borderRadius: 20, padding: 32,
        border: '1px solid #E8EDEA',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1A5C38', marginBottom: 4 }}>
              Step {step} of 2 · {step === 1 ? 'Quantity' : 'Delivery'}
            </p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>Place Order</h2>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 8, borderRadius: 9, background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280' }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Listing summary */}
        <div style={{ background: '#F0FAF4', border: '1px solid #D6EFE1', borderRadius: 14, padding: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(26,92,56,0.12)', color: '#1A5C38', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CropIcon type={listing.crop_type} className="w-5 h-5" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{listing.crop_type}</p>
              <p style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {listing.location}
              </p>
            </div>
            {isRetailer && (
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 10px', borderRadius: 9999, background: 'rgba(201,168,76,0.12)', color: '#92621A', border: '1px solid rgba(201,168,76,0.25)', fontWeight: 700 }}>
                BULK
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #D6EFE1', paddingTop: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>PRICE / KG</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1A5C38', letterSpacing: '-0.02em' }}>GH₵ {listing.price_per_kg}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>AVAILABLE</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{listing.quantity_kg} kg</p>
            </div>
          </div>
        </div>

        {step === 1 ? (
          /* ── Step 1: Quantity ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: 6 }}>
                Quantity (kg)
                {isRetailer && <span style={{ color: '#92621A', fontWeight: 400, marginLeft: 6 }}>— min {MIN_BULK_KG} kg for retailers</span>}
              </label>
              <input
                type="number" min={minQty} max={listing.quantity_kg} step={1}
                value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                required style={inputStyle}
              />
            </div>

            {/* Order total */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#FFFBEB', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Estimated Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#C9A84C', letterSpacing: '-0.02em' }}>GH₵ {total}</span>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: 10 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: '11px 0', borderRadius: 9999, border: '1.5px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleNextStep} className="btn-primary" style={{ flex: 1, padding: '11px 0', fontSize: 13 }}>
                Next: Select Transporter →
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 2: Transporter selection ── */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: 6 }}>
                Choose a Transporter <span style={{ color: '#9CA3AF', fontWeight: 400 }}>— optional</span>
              </label>

              {loadingT ? (
                <div style={{ height: 80, background: '#F3F4F6', borderRadius: 10 }} />
              ) : transporters.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6B7280', padding: '12px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  No transporters registered yet — your order will be open for any available transporter.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => setTransporterId('')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                      border: transporterId === '' ? '1.5px solid #1A5C38' : '1.5px solid #E5E7EB',
                      background: transporterId === '' ? 'rgba(26,92,56,0.06)' : '#fff',
                      width: '100%', transition: 'all 0.15s',
                    }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0 }}>
                      <TruckIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Open to any transporter</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>First available transporter will accept</p>
                    </div>
                  </button>
                  {transporters.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTransporterId(t.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                        border: transporterId === t.id ? '1.5px solid #1A5C38' : '1.5px solid #E5E7EB',
                        background: transporterId === t.id ? 'rgba(26,92,56,0.06)' : '#fff',
                        width: '100%', transition: 'all 0.15s',
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #2E7D52, #1A5C38)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {t.full_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.full_name}</p>
                        <p style={{ fontSize: 11, color: '#6B7280' }}>{t.region}</p>
                      </div>
                      {transporterId === t.id && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'rgba(26,92,56,0.1)', color: '#1A5C38', fontWeight: 700, flexShrink: 0 }}>
                          Selected
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E8EDEA' }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>{quantity} kg · GH₵ {listing.price_per_kg}/kg</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>GH₵ {total}</span>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: 10 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setStep(1)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 9999, border: '1.5px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, padding: '11px 0', fontSize: 13 }}>
                {loading ? 'Placing…' : 'Confirm Order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
