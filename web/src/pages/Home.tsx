import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { track } from '../lib/analytics'
import { useAuth } from '../hooks/useAuth'
import PublicHeader from '../components/PublicHeader'
import ListingCard, { type MarketListing } from '../components/ListingCard'
import { CropIcon } from '../components/CropIcon'

const CROPS = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']
const BUYER_ROLES = ['consumer', 'wholesaler', 'retailer', 'direct_consumer']

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [crop, setCrop] = useState('')
  const [region, setRegion] = useState('')

  const fetchListings = useCallback(async (params: { crop_type?: string; region?: string }) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (params.crop_type) qs.set('crop_type', params.crop_type)
      if (params.region) qs.set('region', params.region)
      const { data } = await api.get<MarketListing[]>(`/api/v1/marketplace?${qs}`)
      setListings(data)
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListings({ crop_type: crop || search, region })
  }, [crop, region, fetchListings]) // search applies on submit

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCrop('')
    if (search.trim()) track('search', { crop_type: search.trim().toLowerCase(), region: region || undefined, metadata: { query: search.trim() } })
    fetchListings({ crop_type: search, region })
  }

  const handleBuy = (listing: MarketListing) => {
    const checkout = `/checkout/${listing.id}`
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(checkout)}`)
    } else if (BUYER_ROLES.includes(user.role)) {
      navigate(checkout)
    } else {
      // farmers/transporters browsing — send them to their own space
      navigate(user.role === 'farmer' ? '/farmer/dashboard' : '/transporter/feed')
    }
  }

  const stats = useMemo(() => {
    const kg = listings.reduce((s, l) => s + Number(l.quantity_kg), 0)
    const cropsLive = new Set(listings.map(l => l.crop_type.toLowerCase())).size
    return { count: listings.length, kg, cropsLive }
  }, [listings])

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
      <PublicHeader />

      {/* ── HERO — big type, marketplace-first ── */}
      <section style={{ padding: '72px 0 40px' }}>
        <div className="container-page">
          <p className="section-label">Western Region, Ghana · Live market</p>
          <h1 className="page-title" style={{ maxWidth: 720 }}>
            Fresh produce,<br />straight from the farm.
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: 1.7, maxWidth: 540, margin: '20px 0 32px' }}>
            Browse what farmers in Tarkwa, Bogoso, and Prestea are selling right now.
            Order in a few taps — delivery is matched automatically.
          </p>

          {/* search */}
          <form onSubmit={submitSearch} style={{ display: 'flex', gap: 10, maxWidth: 520, flexWrap: 'wrap' }}>
            <input
              className="input-field"
              style={{ flex: 1, minWidth: 220, borderRadius: 9999, padding: '12px 20px' }}
              placeholder="Search produce — maize, tomatoes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search produce"
            />
            <button type="submit" className="btn-primary btn-lg" style={{ minHeight: 46 }}>Search</button>
          </form>

          {/* live stats strip */}
          <div style={{ display: 'flex', gap: 28, marginTop: 36, flexWrap: 'wrap' }}>
            {[
              { v: stats.count, l: 'live listings' },
              { v: `${stats.kg.toLocaleString()} kg`, l: 'on the market' },
              { v: stats.cropsLive, l: 'crops available' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.02em' }}>{s.v}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{s.l}</span>
              </div>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink-muted)' }}>
              <span className="live-dot" /> updating live
            </span>
          </div>
        </div>
      </section>

      {/* ── FILTERS — start of the green band ── */}
      <section className="section-brand" style={{ position: 'sticky', top: 68, zIndex: 40, backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--edge)', padding: '14px 0' }}>
        <div className="container-page" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setCrop(''); setSearch('') }}
            className={crop === '' ? 'btn-primary' : 'btn-outline'}
            style={{ minHeight: 36, padding: '0 16px', fontSize: 13 }}
          >
            All
          </button>
          {CROPS.map(c => (
            <button
              key={c}
              onClick={() => {
                setSearch('')
                setCrop(prev => {
                  const nextCrop = prev === c ? '' : c
                  if (nextCrop) track('filter', { crop_type: nextCrop, region: region || undefined })
                  return nextCrop
                })
              }}
              className={crop === c ? 'btn-primary' : 'btn-outline'}
              style={{ minHeight: 36, padding: '0 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}
            >
              <CropIcon type={c} className="w-4 h-4" />
              {c}
            </button>
          ))}
          <select
            className="input-field"
            style={{ width: 'auto', borderRadius: 9999, padding: '8px 14px', fontSize: 13, marginLeft: 'auto' }}
            value={region}
            onChange={e => {
              setRegion(e.target.value)
              if (e.target.value) track('filter', { region: e.target.value, crop_type: crop || undefined })
            }}
            aria-label="Filter by region"
          >
            <option value="">All regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </section>

      {/* ── LISTINGS GRID — green band: white cards, white ink ── */}
      <section className="section-brand" style={{ padding: '36px 0 72px', minHeight: 420 }}>
        <div className="container-page">
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 190, borderRadius: 16 }} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 20px', color: 'var(--ink-muted)' }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Nothing on the market for that filter yet</p>
              <p style={{ fontSize: 14, marginTop: 8 }}>Try another crop or region — new produce is listed daily.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }} className="animate-fade-in">
              {listings.map(l => <ListingCard key={l.id} listing={l} onBuy={handleBuy} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── VALUE STRIP — back to white (green + black content) ── */}
      <section style={{ padding: '64px 0' }}>
        <div className="container-page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {[
            { t: 'Sell as a farmer', d: 'List your harvest in minutes and reach wholesalers, retailers, and households across the region.', cta: 'Start selling', to: '/register' },
            { t: 'Deliver as a transporter', d: 'Pick up delivery jobs near you the moment orders are placed. Update status on the go.', cta: 'Start delivering', to: '/register' },
            { t: 'Smarter prices for everyone', d: 'AI demand forecasts built on Ministry of Agriculture data keep prices fair and food where it is needed.', cta: 'Create account', to: '/register' },
          ].map((b, i) => (
            <div key={i}>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.01em', marginBottom: 10 }}>{b.t}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.7, marginBottom: 16 }}>{b.d}</p>
              <button className="btn-outline" style={{ fontSize: 13 }} onClick={() => navigate(b.to)}>{b.cta} →</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER — green band closes the rhythm ── */}
      <footer className="section-brand" style={{ padding: '28px 0' }}>
        <div className="container-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.svg" alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain' }} />
            <span style={{ color: 'var(--ink-strong)', fontWeight: 700, fontSize: 14 }}>AgroNexus</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
            Intelligent Agricultural Distribution · Western Region, Ghana · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
