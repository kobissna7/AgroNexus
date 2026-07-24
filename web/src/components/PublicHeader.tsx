import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { dashboardByRole } from '../lib/redirects'
import ThemeToggle from './ThemeToggle'

/** Sticky public-site header — used on the marketplace homepage (no Layout,
    no notification fetches, safe for guests). */
export default function PublicHeader() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header style={{
      position: 'fixed', top: 0, width: '100%', zIndex: 50,
      background: 'color-mix(in srgb, var(--canvas) 92%, transparent)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--edge)',
    }}>
      <div className="container-page" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, minHeight: 'var(--header-h)', paddingTop: 8, paddingBottom: 8,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo.svg" alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
          <span className="hidden sm:inline" style={{ color: 'var(--ink-strong)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>AgroNexus</span>
        </Link>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <ThemeToggle />
          {user ? (
            <button className="btn-primary" style={{ minHeight: 36, whiteSpace: 'nowrap', padding: '0 16px', fontSize: 13, marginLeft: 4 }} onClick={() => navigate(dashboardByRole[user.role] ?? '/')}>
              Dashboard →
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap', padding: '0 8px', fontSize: 13, marginLeft: 2 }}>
                Log in
              </Link>
              <Link to="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap', minHeight: 36, padding: '0 14px', fontSize: 13 }}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
