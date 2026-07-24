import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import AuthShell from '../components/AuthShell'
import { postAuthDestination, safeNext } from '../lib/redirects'
import type { AuthUser, UserRole } from '../types'

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'farmer', label: 'Farmer', desc: 'List and sell produce' },
  { value: 'wholesaler', label: 'Wholesaler', desc: 'Buy in large volumes for distribution' },
  { value: 'retailer', label: 'Retailer', desc: 'Buy in bulk for resale' },
  { value: 'direct_consumer', label: 'Direct Consumer', desc: 'Buy produce for personal/household use' },
  { value: 'transporter', label: 'Transporter', desc: 'Accept and deliver orders' },
]

const BUYER_ROLES: UserRole[] = ['wholesaler', 'retailer', 'direct_consumer']

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  // A buyer intent (e.g. /checkout/…) means they came to buy — preselect nothing
  // but highlight buyer roles first if they arrived mid-purchase.
  const buyingIntent = !!next && next.startsWith('/checkout')

  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: '' as UserRole | '',
    phone: '',
  })
  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported by your browser'); return }
    setLocLoading(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      () => {
        setLocError('Location unavailable — allow location access and retry, or continue without it')
        setLocLoading(false)
      },
      { timeout: 10000 },
    )
  }

  // Location is captured automatically — your region is derived from it server-side
  useEffect(() => { detectLocation() }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.role) { setError('Please select a role'); return }
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, ...(coords ? { location_lat: coords.lat, location_lng: coords.lng } : {}) }
      const { data } = await api.post<{ token: string; user: AuthUser }>('/api/v1/auth/register', payload)
      login(data.token, data.user)
      // Only follow a checkout intent for roles that can actually buy
      const followNext = !buyingIntent || BUYER_ROLES.includes(data.user.role) ? next : null
      navigate(postAuthDestination(data.user.role, followNext))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = buyingIntent
    ? [...ROLES.filter(r => BUYER_ROLES.includes(r.value)), ...ROLES.filter(r => !BUYER_ROLES.includes(r.value))]
    : ROLES

  return (
    <AuthShell
      headline={<>Grow with<br />the market.</>}
      sub="Create a free account to buy fresh produce, sell your harvest, or deliver orders across the Western Region."
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.55rem)', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.03em' }}>Create your account</h2>
        <p style={{ color: 'var(--ink-muted)', marginTop: 4, fontSize: 13 }}>
          {buyingIntent ? 'One quick step and your order continues right where you left it' : 'Free to join — start in under a minute'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Role selector */}
        <div>
          <label htmlFor="role" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
            I am a…
          </label>
          <select id="role" className="input-field" value={form.role} onChange={set('role')} required>
            <option value="" disabled>Select your role</option>
            {roleOptions.map(({ value, label, desc }) => (
              <option key={value} value={value}>{label} — {desc}</option>
            ))}
          </select>
        </div>

        {/* two-up rows keep the whole form inside one viewport */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label htmlFor="full_name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
              Full name
            </label>
            <input id="full_name" type="text" className="input-field" value={form.full_name} onChange={set('full_name')} required placeholder="Kwame Mensah" />
          </div>
          <div>
            <label htmlFor="phone" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
              Phone
            </label>
            <input id="phone" type="tel" className="input-field" value={form.phone} onChange={set('phone')} placeholder="024 000 0000" />
          </div>
        </div>

        <div>
          <label htmlFor="reg_email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
            Email address
          </label>
          <input id="reg_email" type="email" className="input-field" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
        </div>

        <div>
          <label htmlFor="reg_password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg_password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              style={{ paddingRight: '2.75rem' }}
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              placeholder="At least 6 characters"
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
              {showPassword ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Location — detected automatically, region derived server-side */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>
            Location <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>— detected automatically</span>
          </label>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.625rem 0.875rem', borderRadius: 10,
            background: coords ? 'var(--brand-soft)' : 'var(--surface-2)',
            border: coords ? '1.5px solid var(--brand)' : '1.5px dashed var(--edge-strong)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: coords ? 'var(--brand-ink)' : 'var(--ink-faint)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span style={{ fontSize: 13, color: coords ? 'var(--brand-ink)' : 'var(--ink-muted)', fontWeight: coords ? 600 : 400 }}>
                {coords
                  ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                  : locLoading ? 'Detecting your location…' : 'Location not detected'}
              </span>
            </div>
            {!coords && !locLoading && (
              <button type="button" onClick={detectLocation} style={{ fontSize: 12, color: 'var(--brand-ink)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Retry
              </button>
            )}
          </div>
          {locError && <p style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600, marginTop: 4 }}>{locError}</p>}
          <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
            Your region is set automatically from your location to match you with nearby markets
          </p>
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

        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', minHeight: 48, fontSize: 15 }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ marginTop: '0.9rem', textAlign: 'center', fontSize: 14, color: 'var(--ink-muted)' }}>
        Already have an account?{' '}
        <Link
          to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          style={{ color: 'var(--brand-ink)', fontWeight: 700, textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
