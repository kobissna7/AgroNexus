import { ReactNode, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtimeChannel } from '../hooks/useRealtimeChannel'
import LiveToast, { showToast } from './LiveToast'
import ThemeToggle from './ThemeToggle'
import { CartIcon, TruckIcon as TruckToastIcon, PackageIcon } from './icons'
import api from '../lib/api'

interface NavItem { label: string; to: string; icon: ReactNode }

const farmerNav: NavItem[] = [
  { label: 'Dashboard',   to: '/farmer/dashboard', icon: <HomeIcon /> },
  { label: 'My Listings', to: '/farmer/listings',  icon: <ListIcon /> },
  { label: 'Orders',      to: '/farmer/orders',    icon: <OrderIcon /> },
  { label: 'Market',      to: '/market',           icon: <ChartIcon /> },
  { label: 'Forecasts',   to: '/forecasts',        icon: <ForecastIcon /> },
]
const consumerNav: NavItem[] = [
  { label: 'Marketplace', to: '/consumer/browse',     icon: <BrowseIcon /> },
  { label: 'My Orders',   to: '/consumer/orders',     icon: <OrderIcon /> },
  { label: 'Deliveries',  to: '/consumer/deliveries', icon: <TruckIcon /> },
  { label: 'Market',      to: '/market',              icon: <ChartIcon /> },
  { label: 'Forecasts',   to: '/forecasts',           icon: <ForecastIcon /> },
]
const transporterNav: NavItem[] = [
  { label: 'Feed',       to: '/transporter/feed',       icon: <HomeIcon /> },
  { label: 'Deliveries', to: '/transporter/deliveries', icon: <TruckIcon /> },
]
const adminNav: NavItem[] = [
  { label: 'Overview',  to: '/admin',          icon: <HomeIcon /> },
  { label: 'Users',     to: '/admin/users',    icon: <UsersIcon /> },
  { label: 'Listings',  to: '/admin/listings', icon: <ListIcon /> },
  { label: 'Orders',    to: '/admin/orders',   icon: <OrderIcon /> },
  { label: 'Market',    to: '/market',         icon: <ChartIcon /> },
  { label: 'Forecasts', to: '/forecasts',      icon: <ForecastIcon /> },
  { label: 'Insights',  to: '/admin/insights', icon: <InsightIcon /> },
]

const navByRole: Record<string, NavItem[]> = {
  farmer: farmerNav,
  consumer: consumerNav, wholesaler: consumerNav, retailer: consumerNav, direct_consumer: consumerNav,
  transporter: transporterNav, admin: adminNav,
}

const BUYER_ROLES = ['consumer', 'wholesaler', 'retailer', 'direct_consumer']

/* Sidebar is permanently dark (brand green over black) in both themes;
   only the topbar + content area follow the light/dark tokens. */
const SIDEBAR = {
  bg: 'linear-gradient(180deg, color-mix(in srgb, #0b2e14 55%, #000) 0%, color-mix(in srgb, #0b2e14 30%, #000) 100%)',
  edge: 'rgba(255,255,255,0.08)',
  ink: 'rgba(255,255,255,0.92)',
  muted: 'rgba(255,255,255,0.45)',
  active: 'rgba(255,255,255,0.12)',
  hover: 'rgba(255,255,255,0.06)',
}

export default function Layout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showBell, setShowBell] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; message: string; read: boolean; created_at: string }[]>([])
  const bellRef = useRef<HTMLDivElement>(null)
  const navItems = navByRole[user?.role ?? ''] ?? []

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (e.matches) setCollapsed(true)
    }
    setIsMobile(mq.matches)
    if (mq.matches) setCollapsed(true)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    if (!user) return
    api.get<{ id: string; message: string; read: boolean; created_at: string }[]>('/api/v1/notifications')
      .then(({ data }) => { setNotifications(data); setUnread(data.filter(n => !n.read).length) })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const farmerId    = user?.role === 'farmer' ? user.id : ''
  const consumerId  = user && BUYER_ROLES.includes(user.role) ? user.id : ''
  const isTransport = user?.role === 'transporter'

  useRealtimeChannel(`orders:farmer-${farmerId}`, 'new_order', (p) => {
    if (!farmerId) return
    const msg = `New order: ${p.quantity_kg}kg of ${p.crop_type}`
    showToast(msg, <CartIcon className="w-5 h-5" />)
    setUnread(u => u + 1)
    setNotifications(prev => [{ id: Date.now().toString(), message: msg, read: false, created_at: new Date().toISOString() }, ...prev])
  })

  useRealtimeChannel('transport:all', 'new_request', (p) => {
    if (!isTransport) return
    showToast(`New delivery job: ${p.quantity_kg}kg of ${p.crop_type}`, <TruckToastIcon className="w-5 h-5" />)
    setUnread(u => u + 1)
  })

  useRealtimeChannel(`orders:consumer-${consumerId}`, 'status_update', (p) => {
    if (!consumerId) return
    const msg = `Your ${p.crop_type} order is now ${String(p.status).replace(/_/g, ' ')}`
    showToast(msg, <PackageIcon className="w-5 h-5" />)
    setUnread(u => u + 1)
    setNotifications(prev => [{ id: Date.now().toString(), message: msg, read: false, created_at: new Date().toISOString() }, ...prev])
  })

  const handleBellClick = async () => {
    setShowBell(v => !v)
    if (unread > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      setUnread(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      api.post('/api/v1/notifications/mark-read', { ids: unreadIds }).catch(() => {})
    }
  }

  const initials = user?.full_name?.[0]?.toUpperCase() ?? '?'

  // Sidebar visibility logic
  const sidebarVisible = isMobile ? mobileOpen : true
  const sidebarWidth   = isMobile ? 240 : (collapsed ? 64 : 220)
  // Labels/user-info show when: mobile drawer is open, OR desktop is expanded
  const showLabels = isMobile || !collapsed

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
          }}
        />
      )}
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside style={{
        width: sidebarWidth,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: SIDEBAR.bg,
        borderRight: `1px solid ${SIDEBAR.edge}`,
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        zIndex: isMobile ? 50 : undefined,
        transform: isMobile ? (sidebarVisible ? 'translateX(0)' : 'translateX(-100%)') : undefined,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: showLabels ? '20px 16px' : '20px 14px',
          borderBottom: `1px solid ${SIDEBAR.edge}`,
          overflow: 'hidden',
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            <img src="/logo.png" alt="AgroNexus" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {showLabels && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: SIDEBAR.ink, fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px', lineHeight: '1.2' }}>AgroNexus</p>
              <p style={{ color: SIDEBAR.muted, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Platform</p>
            </div>
          )}
        </div>

        {/* Role pill */}
        {showLabels && user?.role && (
          <div style={{ padding: '10px 16px 4px' }}>
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '3px 10px', borderRadius: 9999,
              background: SIDEBAR.active, color: SIDEBAR.ink,
              border: `1px solid ${SIDEBAR.edge}`,
            }}>
              {user.role.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: showLabels ? '10px 12px' : '10px 13px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.15s',
                color: isActive ? SIDEBAR.ink : SIDEBAR.muted,
                background: isActive ? SIDEBAR.active : 'transparent',
                border: isActive ? `1px solid ${SIDEBAR.edge}` : '1px solid transparent',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (el.style.background !== SIDEBAR.active) {
                  el.style.background = SIDEBAR.hover
                  el.style.color = SIDEBAR.ink
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (el.style.background !== SIDEBAR.active) {
                  el.style.background = el.getAttribute('aria-current') === 'page' ? SIDEBAR.active : 'transparent'
                  el.style.color = el.getAttribute('aria-current') === 'page' ? SIDEBAR.ink : SIDEBAR.muted
                }
              }}
            >
              <span style={{ width: 18, height: 18, flexShrink: 0 }}>{item.icon}</span>
              {showLabels && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '10px', borderTop: `1px solid ${SIDEBAR.edge}` }}>
          {showLabels && (
            <div style={{
              padding: '10px 10px 8px',
              background: SIDEBAR.hover,
              borderRadius: 10, marginBottom: 6,
              border: `1px solid ${SIDEBAR.edge}`,
            }}>
              <p style={{ color: SIDEBAR.ink, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name}</p>
              <p style={{ color: SIDEBAR.muted, fontSize: 10, marginTop: 2 }}>{user?.email?.slice(0, 22)}{(user?.email?.length ?? 0) > 22 ? '…' : ''}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: showLabels ? '9px 10px' : '9px 13px',
              borderRadius: 9, width: '100%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: SIDEBAR.muted, fontSize: 12, fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = SIDEBAR.hover; e.currentTarget.style.color = SIDEBAR.ink }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SIDEBAR.muted }}
          >
            <LogoutIcon />
            {showLabels && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 60, flexShrink: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--edge)',
          position: 'relative', zIndex: 40,
        }}>
          {/* Collapse toggle */}
          <button
            onClick={() => {
              if (isMobile) setMobileOpen(v => !v)
              else setCollapsed(v => !v)
            }}
            className="btn-ghost"
            style={{ minHeight: 36, padding: '0 8px' }}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          
          {title && (
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-strong)', margin: 0, marginRight: 'auto', marginLeft: 16 }}>
              {title}
            </h1>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />

            {/* Bell */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={handleBellClick}
                className="btn-ghost"
                style={{ minHeight: 36, padding: '0 8px', position: 'relative' }}
                aria-label="Notifications"
              >
                <BellIcon />
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--brand)',
                    color: 'var(--on-brand)', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 2px var(--surface)',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {showBell && (
                <div className="card" style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 320, borderRadius: 14, zIndex: 50, overflow: 'hidden',
                  boxShadow: 'var(--shadow-pop)',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-strong)' }}>Notifications</p>
                    {unread === 0 && <span className="live-dot" />}
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '24px 16px' }}>No notifications yet</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--edge)',
                          background: n.read ? 'transparent' : 'var(--brand-soft)',
                        }}>
                          <p style={{ fontSize: 13, color: 'var(--ink)' }}>{n.message}</p>
                          <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--brand)',
                color: 'var(--on-brand)', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ display: 'none' }} className="sm:block" >
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)', lineHeight: '1.3' }}>{user?.full_name}</p>
                <p style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 28, background: 'var(--canvas-soft)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      <LiveToast />
    </div>
  )
}

/* ── Inline SVG icons ──────────────────────────────────── */
function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}
function ListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}
function OrderIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
}
function BrowseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
}
function TruckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
}
function InsightIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
}
function ForecastIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function LogoutIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16, flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
}
function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
}
function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
}
