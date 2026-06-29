import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import OrderModal from './OrderModal'
import { CropIcon } from '../../components/CropIcon'
import { WheatIcon, PackageIcon, MapPinIcon, UserIcon, CheckIcon, XIcon } from '../../components/icons'
import api from '../../lib/api'
import type { ProduceListing, Order } from '../../types'

const CROPS = ['', 'maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['', 'Tarkwa', 'Bogoso', 'Prestea']

export default function ConsumerBrowse() {
  const [listings, setListings] = useState<ProduceListing[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ crop_type: '', region: '', min_price: '', max_price: '' })
  const [selected, setSelected] = useState<ProduceListing | null>(null)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const { data } = await api.get<ProduceListing[]>(`/api/v1/listings?${params}`)
      setListings(data)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    const { data } = await api.get<Order[]>('/api/v1/orders/mine')
    setOrders(data)
  }

  useEffect(() => { fetchListings(); fetchOrders() }, [])

  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => {
      const listing = o as Order & { produce_listings?: { price_per_kg: number } }
      return sum + o.quantity_kg * (listing.produce_listings?.price_per_kg ?? 0)
    }, 0)

  const setFilter = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }))

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8,
    border: '1px solid #D1D5DB', background: '#fff', color: '#111827',
    outline: 'none', cursor: 'pointer',
  }

  return (
    <Layout>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Orders" value={orders.length} sub="All time" icon={<BagIcon />} />
        <MetricCard
          label="Active Orders"
          value={orders.filter((o) => ['pending','confirmed','in_transit'].includes(o.status)).length}
          sub="In progress"
          icon={<TruckIcon />}
          accent="#C9A84C"
        />
        <MetricCard
          label="Amount Spent"
          value={`GH₵ ${totalSpent.toFixed(0)}`}
          sub="Across all orders"
          icon={<CoinIcon />}
        />
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B8A7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crop Type</label>
            <select value={filters.crop_type} onChange={setFilter('crop_type')} style={inputStyle}>
              {CROPS.map((c) => <option key={c} value={c}>{c || 'All crops'}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B8A7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Region</label>
            <select value={filters.region} onChange={setFilter('region')} style={inputStyle}>
              {REGIONS.map((r) => <option key={r} value={r}>{r || 'All regions'}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 110px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B8A7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min Price</label>
            <input type="number" min="0" placeholder="0.00" value={filters.min_price} onChange={setFilter('min_price')} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 110px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B8A7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Price</label>
            <input type="number" min="0" placeholder="100.00" value={filters.max_price} onChange={setFilter('max_price')} style={inputStyle} />
          </div>
          <button onClick={fetchListings} className="btn-primary" style={{ padding: '9px 22px', fontSize: 13 }}>
            Search
          </button>
          <button
            onClick={() => { setFilters({ crop_type: '', region: '', min_price: '', max_price: '' }); setTimeout(fetchListings, 0) }}
            style={{ padding: '9px 18px', fontSize: 13, borderRadius: 9999, border: '1px solid rgba(46,125,82,0.15)', background: 'transparent', color: '#6B8A7A', cursor: 'pointer', fontWeight: 500 }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Success banner */}
      {orderSuccess && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34D399',
          fontSize: 13, fontWeight: 600,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckIcon className="w-4 h-4" /> Order placed successfully! ID: {orderSuccess}
          </span>
          <button onClick={() => setOrderSuccess(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#34D399' }}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Listings grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
            {listings.length} listing{listings.length !== 1 ? 's' : ''} available
          </h2>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="card" style={{ padding: 24, animation: 'pulse 2s infinite' }}>
                <div style={{ height: 16, background: '#F3F4F6', borderRadius: 8, marginBottom: 12, width: '60%' }} />
                <div style={{ height: 32, background: '#F3F4F6', borderRadius: 8, marginBottom: 8, width: '45%' }} />
                <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#6B8A7A' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><WheatIcon className="w-14 h-14" /></div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No listings match your filters</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Try broadening your search</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {listings.map((l) => (
              <div key={l.id} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s, transform 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(13,43,31,0.12), 0 0 0 1px rgba(46,125,82,0.15)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(26,92,56,0.22)', color: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CropIcon type={l.crop_type} className="w-6 h-6" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
                    ACTIVE
                  </span>
                </div>

                <p style={{ fontSize: 12, color: '#6B8A7A', textTransform: 'capitalize' }}>{l.crop_type}</p>
                <p style={{ fontSize: '1.9rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginTop: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>GH₵ </span>{l.price_per_kg}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#6B8A7A' }}> / kg</span>
                </p>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  <p style={{ fontSize: 12, color: '#6B8A7A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PackageIcon className="w-3.5 h-3.5 flex-shrink-0" /> {l.quantity_kg} kg available
                  </p>
                  <p style={{ fontSize: 12, color: '#6B8A7A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {l.location}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B8A7A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <UserIcon className="w-3.5 h-3.5 flex-shrink-0" /> {(l as ProduceListing & { users?: { full_name: string } }).users?.full_name ?? 'Farmer'}
                  </p>
                  <p style={{ fontSize: 11, color: '#6B8A7A' }}>From {new Date(l.available_from).toLocaleDateString()}</p>
                </div>

                <button
                  onClick={() => setSelected(l)}
                  className="btn-primary"
                  style={{ marginTop: 16, padding: '10px 0', fontSize: 13, width: '100%' }}
                >
                  Order Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <OrderModal
          listing={selected}
          onClose={() => setSelected(null)}
          onOrdered={(orderId) => {
            setSelected(null)
            setOrderSuccess(orderId)
            fetchListings()
            fetchOrders()
          }}
        />
      )}
    </Layout>
  )
}

function BagIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
}
function TruckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zm0 0l2 1h3l1-4-3-3h-3v6z" /></svg>
}
function CoinIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
