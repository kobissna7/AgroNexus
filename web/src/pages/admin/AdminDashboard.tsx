// /home/ekko-7/AgroNexus/web/src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import LocationMap from './LocationMap'

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

function StatCard({ label, value, sub, color = '#1A5C38' }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: '1rem',
      padding: '1.25rem 1.125rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <p style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginTop: '0.375rem' }}>{label}</p>
      {sub && <p style={{ fontSize: '0.6875rem', color: '#6B7280', marginTop: '0.25rem' }}>{sub}</p>}
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
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#4A7C5E', marginTop: '0.25rem' }}>
          Platform-wide overview
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: '6rem', borderRadius: '1rem',
                background: 'linear-gradient(135deg, #0D2B1F, #071510)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : !stats ? (
        <p style={{ color: '#DC2626' }}>Failed to load stats.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── Revenue hero card ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0D2B1F 0%, #1A3D2B 60%, #071510 100%)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: '0 4px 24px rgba(13,43,31,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-50px', right: '-50px',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <p style={{
              fontSize: '0.6875rem', color: '#7BA892',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.625rem',
              fontWeight: 700,
            }}>
              Total Platform Revenue
            </p>
            <p style={{ fontSize: '3rem', fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>
              GH₵ {stats.revenue_ghs.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#4A6B58', marginTop: '0.5rem' }}>
              From confirmed + in-transit + delivered orders
            </p>
          </div>

          {/* ── Users ── */}
          <section>
            <SectionHeader>Users</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <StatCard label="Total Users"  value={stats.users.total}        color="#C9A84C" />
              <StatCard label="Farmers"       value={stats.users.farmers}       color="#34D399" />
              <StatCard label="Consumers"     value={stats.users.consumers}     color="#60A5FA" />
              <StatCard label="Transporters"  value={stats.users.transporters}  color="#FCD34D" />
              <StatCard label="Admins"        value={stats.users.admins}        color="#C084FC" />
            </div>
          </section>

          {/* ── Listings ── */}
          <section>
            <SectionHeader>Listings</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total"   value={stats.listings.total}   color="#C9A84C" />
              <StatCard label="Active"  value={stats.listings.active}  color="#34D399" />
              <StatCard label="Sold"    value={stats.listings.sold}    color="#C9A84C" />
              <StatCard label="Expired" value={stats.listings.expired} color="#9CA3AF" />
            </div>
          </section>

          {/* ── Orders ── */}
          <section>
            <SectionHeader>Orders</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Total"      value={stats.orders.total}      color="#C9A84C" />
              <StatCard label="Pending"    value={stats.orders.pending}    color="#FCD34D" />
              <StatCard label="Confirmed"  value={stats.orders.confirmed}  color="#60A5FA" />
              <StatCard label="In Transit" value={stats.orders.in_transit} color="#38BDF8" />
              <StatCard label="Delivered"  value={stats.orders.delivered}  color="#34D399" />
              <StatCard label="Cancelled"  value={stats.orders.cancelled}  color="#F87171" />
            </div>
          </section>

          {/* ── Transport ── */}
          <section>
            <SectionHeader>Transport</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total"      value={stats.transport.total}      color="#C9A84C" />
              <StatCard label="Open"       value={stats.transport.open}       color="#FCD34D" />
              <StatCard label="In Transit" value={stats.transport.in_transit} color="#38BDF8" />
              <StatCard label="Delivered"  value={stats.transport.delivered}  color="#34D399" />
            </div>
          </section>

          {/* ── User Locations & Regional Volume ── */}
          <section>
            <SectionHeader>User Locations &amp; Regional Volume</SectionHeader>

            {locLoading ? (
              <div style={{ height: 400, borderRadius: 16, background: 'linear-gradient(135deg, #F0FAF4, #E8F5EE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#4A7C5E', fontSize: 14 }}>Loading map…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { color: '#1A5C38', label: 'Farmer' },
                    { color: '#2563EB', label: 'Consumer / Retailer' },
                    { color: '#D97706', label: 'Transporter' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>· Pin size = trade volume</span>
                </div>

                <LocationMap users={locData?.users ?? []} />

                {/* Regional volume table */}
                {locData && Object.keys(locData.regions).length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                          {['Region', 'Farmers', 'Consumers', 'Transporters', 'Listed (kg)', 'Ordered (kg)'].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4A7C5E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(locData.regions)
                          .sort(([, a], [, b]) => b.volume_listed_kg - a.volume_listed_kg)
                          .map(([region, r], i) => (
                            <tr key={region} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{region}</td>
                              <td style={{ padding: '10px 12px', color: '#374151' }}>{r.farmers}</td>
                              <td style={{ padding: '10px 12px', color: '#374151' }}>{r.consumers}</td>
                              <td style={{ padding: '10px 12px', color: '#374151' }}>{r.transporters}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1A5C38' }}>
                                {r.volume_listed_kg.toLocaleString()}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2563EB' }}>
                                {r.volume_ordered_kg.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
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
