import { useEffect, useRef } from 'react'
import { ROLE_COLORS } from '../../lib/chartTheme'

interface UserPin {
  id: string
  full_name: string
  role: string
  region: string
  location_lat: number
  location_lng: number
  volume_kg: number
}

interface Props {
  users: UserPin[]
}

// Pin colors follow the shared role palette (validated in lib/chartTheme):
// all buyer roles share one hue — identity is farmer / buyer / transporter.
const ROLE_COLOR: Record<string, string> = {
  farmer:          ROLE_COLORS.farmer,
  wholesaler:      ROLE_COLORS.buyer,
  retailer:        ROLE_COLORS.buyer,
  direct_consumer: ROLE_COLORS.buyer,
  consumer:        ROLE_COLORS.buyer,
  transporter:     ROLE_COLORS.transporter,
  admin:           ROLE_COLORS.admin,
}
const ROLE_LABEL: Record<string, string> = {
  farmer: 'Farmer', wholesaler: 'Wholesaler', retailer: 'Retailer',
  direct_consumer: 'Consumer', consumer: 'Consumer', transporter: 'Transporter', admin: 'Admin',
}

function svgMarker(color: string, size: number): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.4}" viewBox="0 0 24 34">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 22 12 22S24 21 24 12C24 5.37 18.63 0 12 0z"
        fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="#fff" opacity="0.9"/>
    </svg>
  `
}

export default function LocationMap({ users }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null)
  const mapObj    = useRef<unknown>(null)
  const markersRef = useRef<unknown[]>([])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L
    if (!L || !mapRef.current || mapObj.current) return

    // Centre on Ghana Western Region
    const map = L.map(mapRef.current, { zoomControl: true }).setView([5.4, -2.0], 10)
    mapObj.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    return () => {
      map.remove()
      mapObj.current = null
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L
    const map = mapObj.current as any // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!L || !map) return

    // Remove old markers
    for (const m of markersRef.current) (m as any).remove() // eslint-disable-line @typescript-eslint/no-explicit-any
    markersRef.current = []

    for (const u of users) {
      const color  = ROLE_COLOR[u.role] ?? '#6B7280'
      const volText = u.volume_kg > 0 ? `${u.volume_kg.toLocaleString()} kg` : 'No volume yet'
      const size = Math.max(28, Math.min(48, 28 + Math.sqrt(u.volume_kg / 10)))

      const icon = L.divIcon({
        html: svgMarker(color, size),
        className: '',
        iconSize:   [size, size * 1.4],
        iconAnchor: [size / 2, size * 1.4],
      })

      const marker = L.marker([u.location_lat, u.location_lng], { icon })
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:160px">
            <p style="font-weight:700;font-size:14px;margin:0 0 4px">${u.full_name}</p>
            <p style="font-size:12px;color:#6B7280;margin:0 0 2px">${ROLE_LABEL[u.role] ?? u.role} · ${u.region}</p>
            <p style="font-size:12px;font-weight:600;color:${color};margin:0">${volText}</p>
          </div>
        `)
        .addTo(map)

      markersRef.current.push(marker)
    }
  }, [users])

  if (users.length === 0) {
    return (
      <div style={{
        height: 320, borderRadius: 16, border: '1.5px dashed #D1D5DB',
        background: '#F9FAFB', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>No user locations shared yet</p>
        <p style={{ fontSize: 12, color: '#D1D5DB', margin: 0 }}>Users can share their GPS when registering or from their profile</p>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      style={{
        height: 400, borderRadius: 16, overflow: 'hidden',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 0,
      }}
    />
  )
}
