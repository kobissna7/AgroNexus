import { useEffect, useRef } from 'react'
import { CropIcon } from './CropIcon'
import { track } from '../lib/analytics'
import type { CSSProperties } from 'react'

export interface MarketListing {
  id: string
  crop_type: string
  quantity_kg: number
  price_per_kg: number
  location: string
  available_from: string
  status: string
  created_at: string
}

interface Props {
  listing: MarketListing
  onBuy: (listing: MarketListing) => void
  buyLabel?: string
  style?: CSSProperties
}

/** Marketplace product card — shared by the public homepage and the authed
    buyer Browse page. Anonymized data only (no farmer identity). */
export default function ListingCard({ listing, onBuy, buyLabel = 'Buy now', style }: Props) {
  const available = new Date(listing.available_from) <= new Date()
  const cardRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef(false)

  // listing_view — once per mount, when at least half the card is on screen
  useEffect(() => {
    const el = cardRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      if (!seenRef.current && entries.some(e => e.isIntersecting)) {
        seenRef.current = true
        track('listing_view', { listing_id: listing.id, crop_type: listing.crop_type, region: listing.location })
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [listing.id, listing.crop_type, listing.location])

  const handleBuy = () => {
    track('listing_click', { listing_id: listing.id, crop_type: listing.crop_type, region: listing.location })
    onBuy(listing)
  }

  return (
    <div ref={cardRef} className="card card-lift" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'var(--brand-soft)', color: 'var(--brand-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CropIcon type={listing.crop_type} className="w-7 h-7" />
        </div>
        <span className={`badge ${available ? 'badge-soft' : 'badge-outline'}`}>
          {available ? 'Available now' : `From ${new Date(listing.available_from).toLocaleDateString()}`}
        </span>
      </div>

      <div>
        <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink-strong)', textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
          {listing.crop_type}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
          {listing.location} · {Number(listing.quantity_kg).toLocaleString()} kg available
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.02em' }}>
            GH₵{Number(listing.price_per_kg).toFixed(2)}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}> /kg</span>
        </div>
        <button className="btn-primary" style={{ minHeight: 38, padding: '0 18px', fontSize: 13 }} onClick={handleBuy}>
          {buyLabel}
        </button>
      </div>
    </div>
  )
}
