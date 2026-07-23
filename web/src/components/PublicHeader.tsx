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
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in srgb, var(--canvas) 92%, transparent)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--edge)',
    }}>
      <div className="container-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.svg" alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ color: 'var(--ink-strong)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>AgroNexus</span>
        </Link>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle />
          {user ? (
            <button className="btn-primary" style={{ minHeight: 40 }} onClick={() => navigate(dashboardByRole[user.role] ?? '/')}>
              Go to dashboard →
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Sign in →
              </Link>
              <Link to="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
