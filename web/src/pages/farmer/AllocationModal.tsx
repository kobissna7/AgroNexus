import { useState, useEffect, FormEvent } from 'react'
import { XIcon } from '../../components/icons'
import api from '../../lib/api'
import type { ProduceListing, ListingAllocation } from '../../types'

const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']

interface ForecastResponse {
  weekly_pred_w1?: number
}

interface Props {
  listing: ProduceListing
  onClose: () => void
  onSaved: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 10,
  border: '1.5px solid #D1D5DB', background: '#fff',
  color: '#111827', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export default function AllocationModal({ listing, onClose, onSaved }: Props) {
  const [alloc, setAlloc]         = useState<Record<string, number>>({})
  const [forecasts, setForecasts] = useState<Record<string, number | null>>({})
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<ListingAllocation[]>(`/api/v1/listings/${listing.id}/allocations`)
        const existing: Record<string, number> = {}
        for (const a of data) existing[a.region] = a.allocated_kg
        setAlloc(existing)
      } catch { /* no allocations yet */ }

      // Weekly demand forecast per region for this crop (backend caches 6h)
      const results: Record<string, number | null> = {}
      await Promise.all(REGIONS.map(async (region) => {
        try {
          const { data } = await api.post<ForecastResponse>('/api/v1/forecasts/predict', {
            crop_type: listing.crop_type, region,
          })
          results[region] = data.weekly_pred_w1 ?? null
        } catch {
          results[region] = null
        }
      }))
      setForecasts(results)
      setFetching(false)
    }
    load()
  }, [listing])

  const setRegion = (region: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setAlloc((a) => ({ ...a, [region]: isNaN(v) ? 0 : v }))
  }

  const allocated = REGIONS.reduce((s, r) => s + (alloc[r] || 0), 0)
  const remaining = listing.quantity_kg - allocated
  const totalForecast = REGIONS.reduce((s, r) => s + (forecasts[r] ?? 0), 0)

  // Split the listed quantity across regions proportionally to forecast demand
  const autoSplit = () => {
    if (totalForecast <= 0) return
    const next: Record<string, number> = {}
    for (const r of REGIONS) {
      next[r] = Math.floor(listing.quantity_kg * ((forecasts[r] ?? 0) / totalForecast))
    }
    setAlloc(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (remaining < 0) { setError(`Allocated ${allocated} kg but only ${listing.quantity_kg} kg is listed`); return }
    setLoading(true)
    try {
      const allocations = REGIONS
        .filter((r) => (alloc[r] || 0) > 0)
        .map((r) => ({ region: r, allocated_kg: alloc[r] }))
      await api.put(`/api/v1/listings/${listing.id}/allocations`, { allocations })
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to save allocations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: '#fff', borderRadius: 20, padding: 32,
        border: '1px solid #E8EDEA',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1A5C38', marginBottom: 4 }}>Regional Allocation</p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', textTransform: 'capitalize' }}>{listing.crop_type} — {listing.quantity_kg} kg</h2>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 8, borderRadius: 9, background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280', transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280' }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#F0FAF4', border: '1px solid #D6EFE1', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1A5C38' }}>
                Forecast Weekly Demand
              </p>
              <button
                type="button" onClick={autoSplit}
                disabled={fetching || totalForecast <= 0}
                style={{
                  fontSize: 11, padding: '4px 12px', borderRadius: 9999, fontWeight: 700,
                  border: '1px solid #1A5C38', background: 'transparent', color: '#1A5C38',
                  cursor: fetching || totalForecast <= 0 ? 'not-allowed' : 'pointer',
                  opacity: fetching || totalForecast <= 0 ? 0.5 : 1,
                }}
              >
                Auto-split by demand
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
              Allocate more stock to regions where forecast demand is highest
            </p>
          </div>

          {REGIONS.map((region) => (
            <div key={region} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{region}</p>
                <p style={{ fontSize: 11, color: '#6B8A7A', marginTop: 2 }}>
                  {fetching
                    ? 'Loading forecast…'
                    : forecasts[region] != null
                      ? `~${Math.round(forecasts[region]!)} kg/week demand`
                      : 'Forecast unavailable'}
                </p>
              </div>
              <input
                type="number" min="0" step="1" max={listing.quantity_kg}
                value={alloc[region] || ''}
                onChange={setRegion(region)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          ))}

          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 13,
            borderTop: '1px solid #E8EDEA', paddingTop: 12,
          }}>
            <span style={{ color: '#6B7280' }}>Allocated: <strong style={{ color: '#111827' }}>{allocated} kg</strong></span>
            <span style={{ color: remaining < 0 ? '#DC2626' : '#6B7280' }}>
              Unallocated: <strong style={{ color: remaining < 0 ? '#DC2626' : '#1A5C38' }}>{remaining} kg</strong>
            </span>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: 10 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', borderRadius: 9999, border: '1.5px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading || remaining < 0}
              className="btn-primary"
              style={{ flex: 1, padding: '11px 0', fontSize: 13 }}
            >
              {loading ? 'Saving…' : 'Save Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
