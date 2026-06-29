// /home/ekko-7/AgroNexus/web/src/pages/admin/AdminListings.tsx
import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { CropIcon } from '../../components/CropIcon'
import api from '../../lib/api'

interface AdminListing {
  id: string
  crop_type: string
  quantity_kg: number
  price_per_kg: number
  location: string
  available_from: string
  status: 'active' | 'sold' | 'expired'
  created_at: string
  users: { full_name: string; email: string; region: string | null } | null
}

const STATUS_OPTIONS = ['active', 'sold', 'expired'] as const

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:  { bg: 'rgba(52,211,153,0.12)',  color: '#34D399' },
  sold:    { bg: 'rgba(201,168,76,0.12)',  color: '#C9A84C' },
  expired: { bg: 'rgba(107,138,122,0.1)', color: '#6B8A7A' },
}

export default function AdminListings() {
  const [listings, setListings] = useState<AdminListing[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [changing, setChanging] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<AdminListing[]>('/api/v1/admin/listings')
      setListings(data)
    } catch {
      setError('Failed to load listings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchListings() }, [fetchListings])

  const handleStatusChange = async (id: string, status: string) => {
    setChanging(id)
    try {
      await api.patch(`/api/v1/admin/listings/${id}/status`, { status })
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: status as AdminListing['status'] } : l))
    } catch {
      alert('Failed to update status.')
    } finally {
      setChanging(null)
    }
  }

  const filtered = listings.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || l.crop_type.includes(q) || l.location.toLowerCase().includes(q) || l.users?.full_name?.toLowerCase().includes(q) || false
    return matchStatus && matchSearch
  })

  return (
    <Layout>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
            All Listings
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4A7C5E', marginTop: '0.25rem' }}>
            {listings.length} listings · {listings.filter(l => l.status === 'active').length} active
          </p>
        </div>
        <button
          onClick={fetchListings}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '9999px',
            border: '1px solid #D1E0D8',
            background: '#fff', color: '#374151',
            fontSize: '0.8125rem', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '12rem', position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '0.9375rem', height: '0.9375rem', color: '#6B8A7A', pointerEvents: 'none' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search crop, location, farmer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.625rem 1rem 0.625rem 2.375rem',
              borderRadius: '9999px',
              border: '1px solid #D1E0D8',
              backgroundColor: '#fff',
              fontSize: '0.875rem', color: '#374151',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['all', ...STATUS_OPTIONS]).map(s => {
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={isActive ? {
                  padding: '0.5rem 1rem', borderRadius: '9999px',
                  fontSize: '0.8125rem', fontWeight: 600,
                  background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
                  color: '#fff', border: 'none',
                  boxShadow: '0 4px 12px rgba(26,92,56,0.3)',
                  cursor: 'pointer',
                } : {
                  padding: '0.5rem 1rem', borderRadius: '9999px',
                  fontSize: '0.8125rem', fontWeight: 500,
                  backgroundColor: '#fff', color: '#374151',
                  border: '1px solid #D1E0D8', cursor: 'pointer',
                }}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem',
          fontSize: '0.875rem', color: '#F87171',
        }}>
          {error}
        </div>
      )}

      {/* ── Table card ── */}
      <div style={{
        background: '#fff',
        border: '1px solid rgba(46,125,82,0.1)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(13,43,31,0.08)',
      }}>
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: '3rem', borderRadius: '0.5rem', backgroundColor: '#F3F4F6' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: '#6B8A7A' }}>No listings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0D2B1F' }}>
                  {['Crop', 'Farmer', 'Qty / Price', 'Location', 'Status', 'Date'].map(col => (
                    <th key={col} style={{
                      padding: '0.875rem 1.5rem', textAlign: 'left',
                      fontSize: '0.6875rem', fontWeight: 600,
                      color: '#A3C4B0', textTransform: 'uppercase', letterSpacing: '0.06em',
                      border: 'none',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-gray-50"
                    style={{ borderBottom: '1px solid rgba(46,125,82,0.07)', transition: 'background 0.12s' }}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: '#111827' }}>
                        <CropIcon type={l.crop_type} className="w-4 h-4" />
                        <span style={{ textTransform: 'capitalize' }}>{l.crop_type}</span>
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <p style={{ fontWeight: 600, color: '#111827' }}>{l.users?.full_name ?? '—'}</p>
                      <p style={{ fontSize: '0.75rem', color: '#6B8A7A', marginTop: '0.125rem' }}>{l.users?.email}</p>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6B8A7A' }}>
                      {l.quantity_kg} kg · GH₵ {l.price_per_kg.toFixed(2)}/kg
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6B8A7A' }}>{l.location}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <select
                        value={l.status}
                        disabled={changing === l.id}
                        onChange={e => handleStatusChange(l.id, e.target.value)}
                        style={{
                          fontSize: '0.75rem',
                          borderRadius: '9999px',
                          padding: '0.3125rem 0.75rem',
                          border: 'none',
                          outline: 'none',
                          cursor: changing === l.id ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          backgroundColor: STATUS_BADGE[l.status]?.bg ?? 'rgba(107,138,122,0.1)',
                          color: STATUS_BADGE[l.status]?.color ?? '#374151',
                          appearance: 'none' as React.CSSProperties['appearance'],
                        }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#6B8A7A' }}>
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
