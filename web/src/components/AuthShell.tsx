import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

/** Split-panel auth layout: dark brand panel (Karma-style big type) + form. */
export default function AuthShell({ headline, sub, children }: {
  headline: ReactNode
  sub: string
  children: ReactNode
}) {
  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', background: 'var(--canvas)' }}>
      {/* ── Brand panel — permanently dark, brand green over black ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '46%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3rem',
          background: 'linear-gradient(170deg, #000 0%, color-mix(in srgb, #0b2e14 55%, #000) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', bottom: '-160px', right: '-160px',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          <img src="/logo.svg" alt="" style={{ width: 36, height: 36, borderRadius: 9 }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>AgroNexus</span>
        </Link>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 'clamp(2.4rem, 3.6vw, 3.4rem)', fontWeight: 800,
            color: '#fff', lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20,
          }}>
            {headline}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.7, maxWidth: '26rem' }}>
            {sub}
          </p>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} AgroNexus · Western Region, Ghana
        </p>
      </div>

      {/* ── Form panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '1.25rem 2rem', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggle />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: '28rem', padding: '0.25rem 0 1rem' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
