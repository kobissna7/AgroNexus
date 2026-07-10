import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import LocationMap from './LocationMap'
import { ROLE_COLORS } from '../../lib/chartTheme'

interface Stats {
  users: { total: number; farmers: number; consumers: number; transporters: number; admins: number }
  listings: { total: number; active: number; sold: number; expired: number }
  orders: { total: number; pending: number; confirmed: number; in_transit: number; delivered: number; cancelled: number }
  transport: { total: number; open: number; in_transit: number; delivered: number }
  revenue_ghs: number
}

interface UserPin {
  id: string; full_name: string; role: string; region: string
  location_lat: number; location_lng: number; volume_kg: number
}
interface RegionStat { farmers: number; consumers: number; transporters: number; volume_listed_kg: number; volume_ordered_kg: number }
interface LocationData { users: UserPin[]; regions: Record<string, RegionStat> }

// Stat tile: ink number + colored accent dot — identity lives in the dot,
// never in the number, so values stay readable.
function StatTile({ label, value, accent = '#1A5C38', sub }: { label: string; value: number | string; accent?: string; sub?: string }) {
  return (
    <div className="card card-lift" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: accent, opacity: 0.85 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6B7280' }}>{label}</p>
      </div>
      <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '0.75rem', fontWeight: 700, color: '#4A7C5E',
      textTransform: 'uppercase', letterSpacing: '0.09em',
      marginBottom: '0.875rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span style={{
        display: 'inline-block', width: '3px', height: '13px',
        backgroundColor: '#C9A84C', borderRadius: '2px', flexShrink: 0,
      }} />
      {children}
    </h2>
  )
}

// Status accents mirror the StatusBadge dot palette
const STATUS_ACCENT = {
  neutral:   '#6B7280',
  good:      '#10B981',
  warning:   '#F59E0B',
  info:      '#3B82F6',
  transit:   '#6366F1',
  bad:       '#EF4444',
  gold:      '#C9A84C',
} as const

export default function AdminDashboard() {
  const [stats, setStats]         = useState<Stats | null>(null)
  const [locData, setLocData]     = useState<LocationData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [locLoading, setLocLoading] = useState(true)

  useEffect(() => {
    api.get<Stats>('/api/v1/admin/stats')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false))
    api.get<LocationData>('/api/v1/admin/locations')
      .then(({ data }) => setLocData(data))
      .finally(() => setLocLoading(false))
  }, [])

  return (
    <Layout>
      {/* Dark hero with revenue */}
      <div style={{
        background: 'linear-gradient(135deg, #030B07 0%, #0D2B1F 60%, #071510 100%)',
        borderRadius: 20, padding: 32, marginBottom: 24,
        border: '1px solid rgba(46,125,82,0.25)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ADE80', marginBottom: 8 }}>Platform Administration</p>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#E8F0EB', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Admin Dashboard</h1>
            <p style={{ fontSize: 14, color: '#4A6B58', marginTop: 6 }}>Platform-wide overview · Western Region, Ghana</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#7BA892', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Total Platform Revenue</p>
            <p style={{ fontSize: '2.6rem', fontWeight: 800, color: '#C9A84C', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {loading || !stats ? '—' : <>GH₵ {stats.revenue_ghs.toLocaleString()}</>}
            </p>
            <p style={{ fontSize: 11, color: '#4A6B58', marginTop: 6 }}>confirmed + in-transit + delivered orders</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16 }} />)}
        </div>
      ) : !stats ? (
        <p style={{ color: '#991B1B' }}>Failed to load stats.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── Users ── */}
          <section>
            <SectionHeader>Users</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              <StatTile label="Total Users"  value={stats.users.total}        accent={STATUS_ACCENT.gold} />
              <StatTile label="Farmers"      value={stats.users.farmers}      accent={ROLE_COLORS.farmer} />
              <StatTile label="Buyers"       value={stats.users.consumers}    accent={ROLE_COLORS.buyer} sub="wholesale · retail · direct" />
              <StatTile label="Transporters" value={stats.users.transporters} accent={ROLE_COLORS.transporter} />
              <StatTile label="Admins"       value={stats.users.admins}       accent={ROLE_COLORS.admin} />
            </div>
          </section>

          {/* ── Listings ── */}
          <section>
            <SectionHeader>Listings</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              <StatTile label="Total"   value={stats.listings.total}   accent={STATUS_ACCENT.neutral} />
              <StatTile label="Active"  value={stats.listings.active}  accent={STATUS_ACCENT.good} />
              <StatTile label="Sold"    value={stats.listings.sold}    accent={STATUS_ACCENT.gold} />
              <StatTile label="Expired" value={stats.listings.expired} accent={STATUS_ACCENT.bad} />
            </div>
          </section>

          {/* ── Orders ── */}
          <section>
            <SectionHeader>Orders</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              <StatTile label="Total"      value={stats.orders.total}      accent={STATUS_ACCENT.neutral} />
              <StatTile label="Pending"    value={stats.orders.pending}    accent={STATUS_ACCENT.warning} />
              <StatTile label="Confirmed"  value={stats.orders.confirmed}  accent={STATUS_ACCENT.info} />
              <StatTile label="In Transit" value={stats.orders.in_transit} accent={STATUS_ACCENT.transit} />
              <StatTile label="Delivered"  value={stats.orders.delivered}  accent={STATUS_ACCENT.good} />
              <StatTile label="Cancelled"  value={stats.orders.cancelled}  accent={STATUS_ACCENT.bad} />
            </div>
          </section>

          {/* ── Transport ── */}
          <section>
            <SectionHeader>Transport</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              <StatTile label="Total"      value={stats.transport.total}      accent={STATUS_ACCENT.neutral} />
              <StatTile label="Open"       value={stats.transport.open}       accent={STATUS_ACCENT.warning} />
              <StatTile label="In Transit" value={stats.transport.in_transit} accent={STATUS_ACCENT.transit} />
              <StatTile label="Delivered"  value={stats.transport.delivered}  accent={STATUS_ACCENT.good} />
            </div>
          </section>

          {/* ── User Locations & Regional Volume ── */}
          <section>
            <SectionHeader>User Locations &amp; Regional Volume</SectionHeader>

            {locLoading ? (
              <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Legend — matches map pin palette */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { color: ROLE_COLORS.farmer,      label: 'Farmer' },
                    { color: ROLE_COLORS.buyer,       label: 'Buyer' },
                    { color: ROLE_COLORS.transporter, label: 'Transporter' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{label}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>· Pin size = trade volume</span>
                </div>

                <LocationMap users={locData?.users ?? []} />

                {/* Regional volume table */}
                {locData && Object.keys(locData.regions).length > 0 && (
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table-pro">
                        <thead>
                          <tr>
                            <th>Region</th>
                            <th>Farmers</th>
                            <th>Buyers</th>
                            <th>Transporters</th>
                            <th>Listed (kg)</th>
                            <th>Ordered (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(locData.regions)
                            .sort(([, a], [, b]) => b.volume_listed_kg - a.volume_listed_kg)
                            .map(([region, r]) => (
                              <tr key={region}>
                                <td style={{ fontWeight: 600, color: '#111827' }}>{region}</td>
                                <td>{r.farmers}</td>
                                <td>{r.consumers}</td>
                                <td>{r.transporters}</td>
                                <td style={{ fontWeight: 700, color: '#111827' }}>{r.volume_listed_kg.toLocaleString()}</td>
                                <td style={{ fontWeight: 700, color: '#111827' }}>{r.volume_ordered_kg.toLocaleString()}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ML forecast note */}
                <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#C9A84C" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p style={{ fontSize: 12, color: '#92621A', lineHeight: 1.6, margin: 0 }}>
                    Regional volume data is passed to the ML forecast service with each prediction request, helping the model learn which areas have higher demand. Pin size on the map is proportional to trade volume per user.
                  </p>
                </div>
              </div>
            )}
          </section>

        </div>
      )}
    </Layout>
  )
}
