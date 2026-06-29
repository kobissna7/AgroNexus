import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import ListingModal from './ListingModal'
import { CropIcon } from '../../components/CropIcon'
import { SeedlingIcon } from '../../components/icons'
import api from '../../lib/api'
import type { ProduceListing } from '../../types'

export default function FarmerListings() {
  const [listings, setListings] = useState<ProduceListing[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState<ProduceListing | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<ProduceListing[]>('/api/v1/listings/mine')
      setListings(data)
    } catch {
      setError('Failed to load listings. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchListings() }, [fetchListings])

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this listing?')) return
    try {
      const { data } = await api.delete<{ message: string; archived?: boolean }>(`/api/v1/listings/${id}`)
      if (data?.archived) {
        setError('Listing has linked orders — it has been archived instead of deleted.')
        setTimeout(() => setError(null), 5000)
      }
      fetchListings()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to remove listing. Please try again.')
    }
  }

  const active  = listings.filter(l => l.status === 'active').length
  const totalKg = listings.filter(l => l.status === 'active').reduce((s, l) => s + l.quantity_kg, 0)

  return (
    <Layout>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2E7D52', marginBottom: 4 }}>My Produce</p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>Listings</h1>
          <p style={{ fontSize: 14, color: '#6B8A7A', marginTop: 4 }}>
            {active} active &middot; {totalKg.toFixed(0)} kg available
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true) }}
          className="btn-primary"
          style={{ padding: '10px 22px', fontSize: 13 }}
        >
          + Add Listing
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 40, background: '#F3F4F6', borderRadius: 10 }} />)}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#1A5C38' }}>
              <SeedlingIcon className="w-14 h-14" />
            </div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No listings yet</p>
            <p style={{ fontSize: 13, color: '#6B8A7A', marginTop: 6 }}>Add your first produce listing to start selling</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-pro" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderRadius: '16px 0 0 0' }}>Crop</th>
                  <th>Quantity</th>
                  <th>Price / kg</th>
                  <th>Location</th>
                  <th>Available From</th>
                  <th>Status</th>
                  <th style={{ borderRadius: '0 16px 0 0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#111827' }}>
                        <CropIcon type={l.crop_type} className="w-4 h-4 flex-shrink-0" />
                        <span style={{ textTransform: 'capitalize' }}>{l.crop_type}</span>
                      </span>
                    </td>
                    <td>{l.quantity_kg} kg</td>
                    <td>GH₵ {l.price_per_kg.toFixed(2)}</td>
                    <td>{l.location}</td>
                    <td style={{ color: '#6B8A7A' }}>{new Date(l.available_from).toLocaleDateString()}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setEditItem(l); setShowModal(true) }}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: '1px solid #D1E0D8', background: 'transparent', color: '#2E7D52', cursor: 'pointer' }}
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 9999, border: 'none', background: 'transparent', color: '#F87171', cursor: 'pointer' }}
                        >Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ListingModal
          listing={editItem}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchListings() }}
        />
      )}
    </Layout>
  )
}
