import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CropIcon } from '../components/CropIcon'
import {
  TrendingUpIcon, GlobeIcon, PackageIcon, BellIcon,
  CloudCheckIcon, LockIcon, CartIcon, TruckIcon, SeedlingIcon, FarmerIcon,
} from '../components/icons'

const stats = [
  { value: '6',  label: 'Crop Types',            suffix: '' },
  { value: '3',  label: 'Regions Covered',        suffix: '' },
  { value: '98', label: 'Delivery Success Rate',  suffix: '%' },
  { value: '7',  label: 'Day Price Forecast',     suffix: '-' },
]

const features = [
  { Icon: TrendingUpIcon, title: 'AI-Powered Forecasting',    desc: 'Demand & price forecasts for the next 7 days, built on real Ministry of Agriculture market data across Ghana.', color: '#C9A84C' },
  { Icon: GlobeIcon,      title: 'Live Market Dashboard',     desc: 'Real-time price charts and supply data for Tarkwa, Bogoso, and Prestea regions.', color: '#2E7D52' },
  { Icon: PackageIcon,    title: 'Instant Order Flow',        desc: 'Consumers order produce; transport requests are auto-created and matched to nearby transporters.', color: '#1A5C38' },
  { Icon: BellIcon,       title: 'Real-time Notifications',   desc: 'Supabase Realtime pushes order updates the moment status changes — no refresh needed.', color: '#C9A84C' },
  { Icon: CloudCheckIcon, title: 'Offline-Ready Mobile',      desc: 'Flutter app caches listings and orders via Hive so field agents stay productive on slow 3G.', color: '#2E7D52' },
  { Icon: LockIcon,       title: 'Role-Based Access',         desc: 'Farmers, consumers, transporters, and admins each get a purpose-built interface with row-level security.', color: '#1A5C38' },
]

const roles = [
  {
    role: 'Farmer', Icon: FarmerIcon, color: '#1A5C38', accentBorder: 'rgba(26,92,56,0.2)',
    iconBg: 'rgba(26,92,56,0.1)', path: '/register',
    points: ['Post produce listings with price & quantity', 'Track orders in real time', 'View AI demand forecasts for your crops'],
  },
  {
    role: 'Consumer', Icon: CartIcon, color: '#C9A84C', accentBorder: 'rgba(201,168,76,0.2)',
    iconBg: 'rgba(201,168,76,0.1)', path: '/register',
    points: ['Browse fresh produce by region & crop', 'Place orders with one tap', 'Track delivery status live'],
  },
  {
    role: 'Transporter', Icon: TruckIcon, color: '#2E7D52', accentBorder: 'rgba(46,125,82,0.2)',
    iconBg: 'rgba(46,125,82,0.1)', path: '/register',
    points: ['See open delivery requests near you', 'Accept & manage runs from the app', 'Update delivery status on the go'],
  },
]

const crops = [
  { name: 'Maize',    type: 'maize',    trend: '+4.2%' },
  { name: 'Tomatoes', type: 'tomatoes', trend: '+7.1%' },
  { name: 'Plantain', type: 'plantain', trend: '-1.3%' },
  { name: 'Cassava',  type: 'cassava',  trend: '+2.8%' },
  { name: 'Pepper',   type: 'pepper',   trend: '+5.4%' },
  { name: 'Rice',     type: 'rice',     trend: '+0.9%' },
]

export default function Home() {
  const [ticker, setTicker] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTicker(t => (t + 1) % crops.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E8EDEA',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-icon.png" alt="AgroNexus" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ color: '#111827', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>AgroNexus</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ color: '#374151', textDecoration: 'none', fontSize: 14, padding: '8px 16px', borderRadius: 9999, fontWeight: 500 }}>
            Sign In
          </Link>
          <Link to="/register" style={{
            background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
            color: '#fff', textDecoration: 'none', fontSize: 14,
            padding: '9px 22px', borderRadius: 9999, fontWeight: 600,
            boxShadow: '0 2px 12px rgba(26,92,56,0.3)',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(160deg, #F0FAF4 0%, #E8F5EE 50%, #D6EFE1 100%)',
        padding: '96px 5% 88px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,92,56,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '15%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: 9999, padding: '7px 18px', marginBottom: 28,
            fontSize: 13, color: '#92621A', fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', display: 'inline-block', animation: 'pulse-home 1.5s infinite' }} />
            <CropIcon type={crops[ticker].type} className="w-4 h-4 inline-block" />
            Live · {crops[ticker].name} {crops[ticker].trend} today
          </div>

          <h1 style={{
            color: '#0D2B1F', fontSize: 'clamp(2rem, 5vw, 3.6rem)',
            fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 22,
          }}>
            Ghana's Intelligent<br />
            <span style={{ color: '#1A5C38' }}>Agricultural Marketplace</span>
          </h1>

          <p style={{
            color: '#4B5563', fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px',
          }}>
            Connect farmers, consumers, and transporters across the Western Region.
            AI-powered demand forecasts. Real-time order tracking. Offline-ready mobile app.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
              color: '#fff', textDecoration: 'none',
              padding: '14px 34px', borderRadius: 9999, fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 24px rgba(26,92,56,0.35)',
            }}>
              Start for Free →
            </Link>
            <Link to="/login" style={{
              background: '#fff', border: '1px solid #D1E0D8',
              color: '#374151', textDecoration: 'none',
              padding: '14px 34px', borderRadius: 9999, fontWeight: 600, fontSize: 15,
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: '#F9FAFB', borderBottom: '1px solid #E8EDEA', borderTop: '1px solid #E8EDEA', padding: '40px 5%' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '16px 24px',
              borderRight: i < stats.length - 1 ? '1px solid #E8EDEA' : 'none',
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1A5C38', letterSpacing: '-2px', lineHeight: 1 }}>
                {s.suffix === '-' ? `${s.value}-Day` : `${s.value}${s.suffix}`}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROLES ── */}
      <section style={{ padding: '88px 5%', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#1A5C38', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Who It's For</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#111827', marginBottom: 56, letterSpacing: '-0.5px' }}>
            One platform, three roles
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
            {roles.map((r) => (
              <div key={r.role} style={{
                background: '#fff', borderRadius: 20, padding: '32px 28px',
                border: `1px solid ${r.accentBorder}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: r.color, borderRadius: '20px 20px 0 0' }} />
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: r.iconBg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: r.color, marginBottom: 18,
                }}>
                  <r.Icon className="w-7 h-7" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 14 }}>{r.role}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {r.points.map((p, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#4B5563', fontSize: 14, lineHeight: 1.5 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth={2.5} style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link to={r.path} style={{
                  display: 'inline-block', background: r.color,
                  color: '#fff', textDecoration: 'none',
                  padding: '10px 22px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
                  boxShadow: `0 2px 10px ${r.color}30`,
                }}>
                  Join as {r.role} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '88px 5%', background: '#F9FAFB', borderTop: '1px solid #E8EDEA' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#1A5C38', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Platform Features</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#111827', marginBottom: 56, letterSpacing: '-0.5px' }}>
            Built for Ghana's supply chain
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                border: '1px solid #E8EDEA', display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = f.color + '55'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${f.color}14`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E8EDEA'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color }}>
                  <f.Icon className="w-6 h-6" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CROPS ── */}
      <section style={{ background: '#F0FAF4', padding: '64px 5%', borderTop: '1px solid #D6EFE1' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#6B7280', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Western Region, Ghana</p>
          <h2 style={{ color: '#111827', fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 800, marginBottom: 32, letterSpacing: '-0.5px' }}>6 Crops Tracked in Real Time</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            {crops.map((c) => (
              <div key={c.name} style={{
                background: '#fff', border: '1px solid #D6EFE1',
                borderRadius: 14, padding: '16px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(26,92,56,0.4)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(26,92,56,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#D6EFE1'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
              >
                <span style={{ color: '#1A5C38' }}>
                  <CropIcon type={c.type} className="w-7 h-7" />
                </span>
                <span style={{ color: '#111827', fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                <span style={{
                  fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 9999,
                  background: c.trend.startsWith('+') ? 'rgba(26,92,56,0.08)' : 'rgba(220,38,38,0.08)',
                  color: c.trend.startsWith('+') ? '#1A5C38' : '#DC2626',
                  border: `1px solid ${c.trend.startsWith('+') ? 'rgba(26,92,56,0.2)' : 'rgba(220,38,38,0.2)'}`,
                }}>{c.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '96px 5%', background: '#fff', textAlign: 'center', borderTop: '1px solid #E8EDEA' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: 20, marginBottom: 24,
            background: 'rgba(26,92,56,0.08)',
            border: '1px solid rgba(26,92,56,0.18)', color: '#1A5C38',
          }}>
            <SeedlingIcon className="w-10 h-10" />
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#111827', marginBottom: 16, letterSpacing: '-0.5px' }}>
            Ready to grow smarter?
          </h2>
          <p style={{ color: '#4B5563', fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
            Join farmers, consumers, and transporters across Tarkwa, Bogoso, and Prestea on the platform built for Ghana's agricultural future.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
              color: '#fff', textDecoration: 'none',
              padding: '14px 36px', borderRadius: 9999, fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 20px rgba(26,92,56,0.35)',
            }}>
              Create Free Account
            </Link>
            <Link to="/login" style={{
              background: '#fff', border: '1px solid #D1E0D8',
              color: '#374151', textDecoration: 'none',
              padding: '14px 36px', borderRadius: 9999, fontWeight: 600, fontSize: 15,
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#F9FAFB', borderTop: '1px solid #E8EDEA',
        padding: '32px 5%', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <img src="/logo-icon.png" alt="AgroNexus" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
          <span style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>AgroNexus</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
          Intelligent Agricultural Distribution · Western Region, Ghana · © {new Date().getFullYear()}
        </p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse-home { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }
      `}</style>
    </div>
  )
}
