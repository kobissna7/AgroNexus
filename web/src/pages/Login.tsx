import { useState, FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import AuthShell from '../components/AuthShell'
import { postAuthDestination, safeNext } from '../lib/redirects'
import type { AuthUser } from '../types'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

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
      navigate(postAuthDestination(data.user.role, next))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      headline={<>Welcome<br />back.</>}
      sub="Sign in to keep buying, selling, and moving fresh produce across Tarkwa, Bogoso, and Prestea."
    >
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.55rem)', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.03em' }}>Sign in</h2>
        <p style={{ color: 'var(--ink-muted)', marginTop: 6, fontSize: 14 }}>
          {next ? 'Sign in to continue with your order' : 'Good to see you again'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              style={{ paddingRight: '2.75rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'var(--ink-faint)', display: 'flex', alignItems: 'center',
              }}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '-0.4rem' }}>
          <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--brand-ink)', fontWeight: 600, textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        {error && (
          <div style={{
            fontSize: 13, fontWeight: 600,
            background: 'var(--invert-bg)', color: 'var(--invert-ink)',
            padding: '0.75rem 1rem', borderRadius: 10,
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary btn-lg" style={{ width: '100%' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 14, color: 'var(--ink-muted)' }}>
        Don't have an account?{' '}
        <Link
          to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          style={{ color: 'var(--brand-ink)', fontWeight: 700, textDecoration: 'none' }}
        >
          Create one
        </Link>
      </p>
    </AuthShell>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
