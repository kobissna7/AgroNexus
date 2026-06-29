// /home/ekko-7/AgroNexus/web/src/pages/Register.tsx
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { AuthUser, UserRole } from '../types'

const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea', 'Takoradi', 'Cape Coast', 'Other']
const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'farmer', label: 'Farmer', desc: 'List and sell produce' },
  { value: 'consumer', label: 'Direct Consumer', desc: 'Buy produce for personal/household use' },
  { value: 'retailer', label: 'Retailer', desc: 'Buy in bulk for resale or distribution' },
  { value: 'transporter', label: 'Transporter', desc: 'Accept and deliver orders' },
]

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: '' as UserRole | '',
    region: '', phone: '',
  })
  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const shareLocation = () => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported by your browser'); return }
    setLocLoading(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      () => {
        setLocError('Could not get location — check browser permissions')
        setLocLoading(false)
      },
      { timeout: 10000 },
    )
  }

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
      const destinations: Record<string, string> = {
        farmer: '/farmer/dashboard',
        consumer: '/consumer/browse',
        retailer: '/consumer/browse',
        transporter: '/transporter/feed',
      }
      navigate(destinations[data.user.role] ?? '/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const lightInputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: '0.625rem',
    border: '1.5px solid #D1D5DB',
    backgroundColor: '#fff',
    color: '#111827', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <>
      <style>{`
        .an-reg-input::placeholder { color: #9CA3AF; }
        .an-reg-input:focus {
          border-color: #1A5C38 !important;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.12) !important;
        }
        .an-reg-select option { background-color: #fff; color: #111827; }
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
              Join the Network
            </p>
            <h1 style={{ fontSize: '3.25rem', fontWeight: 800, color: '#0D2B1F', lineHeight: 1.1, marginBottom: '1.25rem' }}>
              Join Ghana's{' '}
              <span style={{ color: '#C9A84C' }}>smartest</span>
              <br />agricultural network
            </h1>
            <p style={{ color: '#374151', fontSize: '0.9375rem', lineHeight: 1.65, maxWidth: '26rem' }}>
              Reduce post-harvest losses, get fair prices, and connect with buyers and transporters in your region.
            </p>
          </div>

          <p style={{ color: '#6B7280', fontSize: '0.75rem', position: 'relative', zIndex: 1 }}>
            © 2026 AgroNexus. All rights reserved.
          </p>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#fff',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: '26rem', paddingTop: '2rem', paddingBottom: '2rem' }}>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Create your account</h2>
                <p style={{ color: '#6B7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  Get started with AgroNexus today
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Role selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.625rem' }}>
                    I am a…
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
                    {ROLES.map(({ value, label, desc }) => {
                      const isSelected = form.role === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, role: value }))}
                          style={{
                            padding: '0.875rem 0.625rem',
                            borderRadius: '0.75rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.18s',
                            border: isSelected
                              ? '1.5px solid #1A5C38'
                              : '1.5px solid #E5E7EB',
                            background: isSelected
                              ? 'rgba(26,92,56,0.08)'
                              : '#F9FAFB',
                            boxShadow: isSelected
                              ? '0 0 0 1px rgba(26,92,56,0.1)'
                              : 'none',
                          }}
                        >
                          <p style={{
                            fontSize: '0.8125rem', fontWeight: 700,
                            color: isSelected ? '#1A5C38' : '#374151',
                            marginBottom: '0.25rem',
                          }}>
                            {label}
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: '#6B7280' }}>{desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={set('full_name')}
                    required
                    placeholder="Kwame Mensah"
                    className="an-reg-input"
                    style={lightInputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    placeholder="you@example.com"
                    className="an-reg-input"
                    style={lightInputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="an-reg-input"
                    style={lightInputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                      Region
                    </label>
                    <select
                      value={form.region}
                      onChange={set('region')}
                      className="an-reg-input an-reg-select"
                      style={lightInputStyle}
                    >
                      <option value="">Select region</option>
                      {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="024 000 0000"
                      className="an-reg-input"
                      style={lightInputStyle}
                    />
                  </div>
                </div>

                {/* ── Location picker ── */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Location <span style={{ color: '#9CA3AF', fontWeight: 400 }}>— optional</span>
                  </label>
                  {coords ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'rgba(26,92,56,0.06)', border: '1.5px solid #1A5C38', borderRadius: '0.625rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#1A5C38" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span style={{ fontSize: '0.8125rem', color: '#1A5C38', fontWeight: 600 }}>
                          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                        </span>
                      </div>
                      <button type="button" onClick={() => setCoords(null)} style={{ fontSize: '0.75rem', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={shareLocation}
                      disabled={locLoading}
                      style={{
                        width: '100%', padding: '0.625rem', borderRadius: '0.625rem',
                        border: '1.5px dashed #D1D5DB', background: '#F9FAFB',
                        color: '#374151', fontSize: '0.8125rem', fontWeight: 500,
                        cursor: locLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        opacity: locLoading ? 0.6 : 1,
                      }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {locLoading ? 'Getting location…' : 'Share my GPS location'}
                    </button>
                  )}
                  {locError && (
                    <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.375rem' }}>{locError}</p>
                  )}
                  <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.375rem' }}>
                    Helps us track demand in your area and improve forecasts
                  </p>
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
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#1A5C38', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
