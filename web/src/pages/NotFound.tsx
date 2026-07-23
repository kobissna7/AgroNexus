import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SeedlingIcon } from '../components/icons'

export default function NotFound() {
  const { user } = useAuth()

  const homeHref = !user ? '/login'
    : user.role === 'farmer'      ? '/farmer/dashboard'
    : user.role === 'consumer'    ? '/consumer/browse'
    : '/transporter/feed'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'linear-gradient(170deg, #000 0%, color-mix(in srgb, #0b2e14 55%, #000) 100%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 360, textAlign: 'center',
        background: 'rgba(13,43,31,0.6)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--edge)', borderRadius: 24, padding: '48px 40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, color: 'var(--brand-ink)' }}>
          <SeedlingIcon className="w-16 h-16" />
        </div>
        <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>404</h1>
        <p style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16, marginBottom: 8 }}>Page not found</p>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 32 }}>This crop hasn't been planted yet.</p>
        <Link
          to={homeHref}
          style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 9999,
            background: 'var(--brand)',
            color: 'var(--on-brand)', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(11,46,20,0.30)',
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
