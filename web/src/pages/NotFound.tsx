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
      padding: 24, background: 'linear-gradient(135deg, #030B07 0%, #0D2B1F 60%, #071510 100%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 360, textAlign: 'center',
        background: 'rgba(13,43,31,0.6)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(46,125,82,0.25)', borderRadius: 24, padding: '48px 40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, color: '#4ADE80' }}>
          <SeedlingIcon className="w-16 h-16" />
        </div>
        <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#E8F0EB', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>404</h1>
        <p style={{ fontWeight: 700, color: '#E8F0EB', fontSize: 16, marginBottom: 8 }}>Page not found</p>
        <p style={{ fontSize: 13, color: '#4A6B58', marginBottom: 32 }}>This crop hasn't been planted yet.</p>
        <Link
          to={homeHref}
          style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 9999,
            background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
            color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(26,92,56,0.4)',
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
