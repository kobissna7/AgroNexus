import { useState, useEffect, FormEvent } from 'react'
import { XIcon } from '../../components/icons'
import api from '../../lib/api'
import type { ProduceListing } from '../../types'

const CROPS = ['Maize', 'Tomatoes', 'Plantain', 'Cassava', 'Pepper', 'Rice']
const LOCATIONS = ['Tarkwa', 'Bogoso', 'Prestea', 'Takoradi', 'Cape Coast', 'Other']

interface MoaCropData {
  national_avg: number
  trend_pct: number
  by_region: Record<string, number>
}
interface MoaResponse {
  crops: Record<string, MoaCropData>
}

interface Props {
  listing: ProduceListing | null
  onClose: () => void
  onSaved: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 10,
  border: '1.5px solid var(--edge)', background: 'var(--surface)',
  color: 'var(--ink-strong)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--ink-muted)', marginBottom: 6,
}

export default function ListingModal({ listing, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    crop_type: listing?.crop_type ?? '',
    quantity_kg: listing?.quantity_kg ?? '',
    price_per_kg: listing?.price_per_kg ?? '',
    location: listing?.location ?? '',
    available_from: listing?.available_from?.slice(0, 10) ?? '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [moaData, setMoaData] = useState<MoaResponse | null>(null)

  useEffect(() => {
    api.get<MoaResponse>('/api/v1/prices/moa')
      .then(({ data }) => setMoaData(data))
      .catch(() => {})
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (listing) { await api.put(`/api/v1/listings/${listing.id}`, form) }
      else { await api.post('/api/v1/listings', form) }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to save listing')
    } finally {
      setLoading(false)
    }
  }

  const cropKey = form.crop_type.toLowerCase()
  const cropMoa = moaData?.crops?.[cropKey]
  const topRegions = cropMoa
    ? Object.entries(cropMoa.by_region)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : []

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: 'var(--surface)', borderRadius: 20, padding: 32,
        border: '1px solid var(--edge)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand-ink)', marginBottom: 4 }}>Listing</p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink-strong)' }}>{listing ? 'Edit Listing' : 'Add New Listing'}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 8, borderRadius: 9, background: 'var(--surface-2)', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-soft)'; e.currentTarget.style.color = 'var(--ink)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--ink-muted)' }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Crop Type</label>
            <select value={form.crop_type} onChange={set('crop_type')} required style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select crop</option>
              {CROPS.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* MoA price benchmark + demand insight */}
          {cropMoa && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-ink)' }}>
                  Ministry of Agriculture Benchmark
                </p>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 9999, fontWeight: 700,
                  background: cropMoa.trend_pct >= 0 ? 'rgba(11,46,20,0.30)' : 'rgba(220,38,38,0.08)',
                  color: cropMoa.trend_pct >= 0 ? 'var(--brand-ink)' : 'var(--ink)',
                }}>
                  {cropMoa.trend_pct >= 0 ? '↑' : '↓'} {Math.abs(cropMoa.trend_pct)}% (Jul–Oct)
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 10 }}>
                National avg: <strong>GH₵ {cropMoa.national_avg.toFixed(2)}/kg</strong>
              </p>
              {topRegions.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6, fontWeight: 600 }}>Highest demand regions:</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {topRegions.map(([region, price]) => (
                      <span key={region} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 9999,
                        background: 'var(--surface)', border: '1px solid var(--edge)',
                        color: 'var(--ink)', fontWeight: 600,
                      }}>
                        {region} — GH₵{price.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Stock Quantity (kg)</label>
              <input type="number" min="1" step="0.1" value={form.quantity_kg} onChange={set('quantity_kg')} required placeholder="500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Price / kg (GH₵)</label>
              <input type="number" min="0.01" step="0.01" value={form.price_per_kg} onChange={set('price_per_kg')} required placeholder="2.50" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <select value={form.location} onChange={set('location')} required style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select location</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Available From</label>
            <input type="date" value={form.available_from} onChange={set('available_from')} required style={inputStyle} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--surface-2)', border: '1px solid var(--edge)', padding: '10px 14px', borderRadius: 10 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', borderRadius: 9999, border: '1.5px solid var(--edge)', background: 'transparent', color: 'var(--ink-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="btn-primary"
              style={{ flex: 1, padding: '11px 0', fontSize: 13 }}
            >
              {loading ? 'Saving…' : listing ? 'Save Changes' : 'Add Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
