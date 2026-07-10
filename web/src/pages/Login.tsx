// /home/ekko-7/AgroNexus/web/src/pages/Login.tsx
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { AuthUser } from '../types'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post<{ token: string; user: AuthUser }>('/api/v1/auth/login', { email, password })
      login(data.token, data.user)
      const destinations: Record<string, string> = {
        farmer: '/farmer/dashboard',
        consumer: '/consumer/browse',
        wholesaler: '/consumer/browse',
        retailer: '/consumer/browse',
        direct_consumer: '/consumer/browse',
        transporter: '/transporter/feed',
        admin: '/admin',
      }
      // Refresh the user's location silently — region is derived server-side
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            api.put('/api/v1/users/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {})
          },
          () => {},
          { timeout: 8000 },
        )
      }
      navigate(destinations[data.user.role] ?? '/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .an-login-input::placeholder { color: #9CA3AF; }
        .an-login-input:focus {
          border-color: #1A5C38 !important;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.12) !important;
        }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#F9FAFB' }}>

        {/* ── Left panel ── */}
        <div
          className="hidden lg:flex"
          style={{
            width: '50%',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '3rem',
            background: 'linear-gradient(160deg, #F0FAF4 0%, #D6EFE1 50%, #E8F5EE 100%)',
            borderRight: '1px solid #D6EFE1',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative radial glows */}
          <div style={{
            position: 'absolute', top: '-140px', right: '-140px',
            width: '520px', height: '520px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,92,56,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-80px', left: '-80px',
            width: '380px', height: '380px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '2.5rem', height: '2.5rem', borderRadius: '50%',
              background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(26,92,56,0.35)',
            }}>
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span style={{ color: '#0D2B1F', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em' }}>AgroNexus</span>
          </div>

          {/* Copy block */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              color: '#92621A', fontSize: '0.6875rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '1rem',
            }}>
              Ghana's Premier Agri Marketplace
            </p>
            <h1 style={{ fontSize: '3.25rem', fontWeight: 800, color: '#0D2B1F', lineHeight: 1.1, marginBottom: '1.25rem' }}>
              Connecting farmers,<br />
              consumers &amp;{' '}
              <span style={{ color: '#C9A84C' }}>transporters</span>
            </h1>
            <p style={{ color: '#374151', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '2.5rem', maxWidth: '26rem' }}>
              AI-powered agricultural marketplace for Ghana's Western Region — real-time prices, demand forecasts, and seamless logistics.
            </p>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
              {[
                { value: '6', label: 'Crops Tracked' },
                { value: '98%', label: 'Delivery Rate' },
                { value: '7-Day', label: 'Forecasts' },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  background: '#fff',
                  border: '1px solid rgba(26,92,56,0.15)',
                  borderRadius: '0.875rem',
                  padding: '1rem 0.875rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <p style={{ fontSize: '1.625rem', fontWeight: 800, color: '#C9A84C', marginBottom: '0.125rem' }}>{value}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ color: '#6B7280', fontSize: '0.75rem', position: 'relative', zIndex: 1 }}>
            © 2026 AgroNexus. All rights reserved.
          </p>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#fff',
        }}>
          <div style={{ width: '100%', maxWidth: '24rem' }}>
            {/* Form card */}
            <div style={{
              background: '#fff',
              border: '1px solid #E8EDEA',
              borderRadius: '1.25rem',
              padding: '2.5rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
              {/* Mobile logo */}
              <div className="flex lg:hidden" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2E7D52, #1A5C38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </div>
                <span style={{ color: '#111827', fontWeight: 700 }}>AgroNexus</span>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Welcome back</h2>
                <p style={{ color: '#6B7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  Sign in to your AgroNexus account
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="an-login-input"
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: '0.625rem',
                      border: '1.5px solid #D1D5DB',
                      backgroundColor: '#fff',
                      color: '#111827', fontSize: '0.875rem',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="an-login-input"
                      style={{
                        width: '100%', padding: '0.75rem 2.75rem 0.75rem 1rem', borderRadius: '0.625rem',
                        border: '1.5px solid #D1D5DB',
                        backgroundColor: '#fff',
                        color: '#111827', fontSize: '0.875rem',
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                        color: '#9CA3AF', display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showPassword ? (
                        // Eye-off icon
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        // Eye icon
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    fontSize: '0.875rem', color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    padding: '0.75rem 1rem', borderRadius: '0.625rem',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '0.8125rem', borderRadius: '9999px',
                    background: loading
                      ? 'rgba(26,92,56,0.5)'
                      : 'linear-gradient(135deg, #2E7D52, #1A5C38)',
                    color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(26,92,56,0.3)',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#1A5C38', fontWeight: 600, textDecoration: 'none' }}>
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
