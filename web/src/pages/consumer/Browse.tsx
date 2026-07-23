import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import MetricCard from '../../components/MetricCard'
import ListingCard, { type MarketListing } from '../../components/ListingCard'
import { CropIcon } from '../../components/CropIcon'
import { WheatIcon } from '../../components/icons'
import api from '../../lib/api'
import { track } from '../../lib/analytics'
import type { Order } from '../../types'

const CROPS = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['', 'Tarkwa', 'Bogoso', 'Prestea']

export default function ConsumerBrowse() {
  const navigate = useNavigate()
  const [listings, setListings] = useState<MarketListing[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [crop, setCrop] = useState('')
  const [region, setRegion] = useState('')

  const fetchListings = useCallback(async (params: { crop_type: string; region: string }) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (params.crop_type) qs.set('crop_type', params.crop_type)
      if (params.region) qs.set('region', params.region)
      const { data } = await api.get<MarketListing[]>(`/api/v1/listings?${qs}`)
      setListings(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchListings({ crop_type: crop, region }) }, [crop, region, fetchListings])
  useEffect(() => {
    api.get<Order[]>('/api/v1/orders/mine').then(({ data }) => setOrders(data)).catch(() => {})
  }, [])

  const totalSpent = orders
    .filter((o) => !['cancelled', 'pending_payment'].includes(o.status))
    .reduce((sum, o) => {
      const listing = o as Order & { produce_listings?: { price_per_kg: number } }
      return sum + o.quantity_kg * (listing.produce_listings?.price_per_kg ?? 0)
    }, 0)

  return (
    <Layout>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Orders" value={orders.length} sub="All time" icon={<BagIcon />} />
        <MetricCard
          label="Active Orders"
          value={orders.filter((o) => ['pending', 'confirmed', 'in_transit'].includes(o.status)).length}
          sub="In progress"
          icon={<TruckMetricIcon />}
        />
        <MetricCard label="Amount Spent" value={`GH₵ ${totalSpent.toFixed(0)}`} sub="Across all orders" icon={<CoinIcon />} />
      </div>

      {/* Filter bar — crop chips + region, same language as the public marketplace */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setCrop('')}
          className={crop === '' ? 'btn-primary' : 'btn-outline'}
          style={{ minHeight: 34, padding: '0 14px', fontSize: 13 }}
        >
          All
        </button>
        {CROPS.map(c => (
          <button
            key={c}
            onClick={() => setCrop(prev => {
              const nextCrop = prev === c ? '' : c
              if (nextCrop) track('filter', { crop_type: nextCrop, region: region || undefined })
              return nextCrop
            })}
            className={crop === c ? 'btn-primary' : 'btn-outline'}
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}
          >
            <CropIcon type={c} className="w-4 h-4" />
            {c}
          </button>
        ))}
        <select
          className="input-field"
          style={{ width: 'auto', borderRadius: 9999, padding: '7px 14px', fontSize: 13, marginLeft: 'auto' }}
          value={region}
          onChange={e => {
            setRegion(e.target.value)
            if (e.target.value) track('filter', { region: e.target.value, crop_type: crop || undefined })
          }}
          aria-label="Filter by region"
        >
          {REGIONS.map((r) => <option key={r} value={r}>{r || 'All regions'}</option>)}
        </select>
      </div>

      {/* Listings grid */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
          {listings.length} listing{listings.length !== 1 ? 's' : ''} available
        </h2>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 190, borderRadius: 16 }} />)}
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--ink-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><WheatIcon className="w-14 h-14" /></div>
          <p style={{ fontWeight: 700, color: 'var(--ink)' }}>No listings match your filters</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Try broadening your search</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }} className="animate-fade-in">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} onBuy={(listing) => navigate(`/checkout/${listing.id}`)} />
          ))}
        </div>
      )}
    </Layout>
  )
}

function BagIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
}
function TruckMetricIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zm0 0l2 1h3l1-4-3-3h-3v6z" /></svg>
}
function CoinIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
