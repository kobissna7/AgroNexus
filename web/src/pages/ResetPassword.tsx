// /home/ekko-7/AgroNexus/web/src/pages/ResetPassword.tsx
import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [tokenMissing, setTokenMissing] = useState(false)

  // Supabase appends the token as a hash fragment: #access_token=...&type=recovery
  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const token = params.get('access_token')
    const type = params.get('type')
    if (!token || type !== 'recovery') {
      setTokenMissing(true)
    } else {
      setAccessToken(token)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/api/v1/auth/reset-password', { access_token: accessToken, new_password: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .an-rp-input::placeholder { color: var(--ink-faint); }
        .an-rp-input:focus {
          border-color: var(--brand) !important;
          box-shadow: 0 0 0 3px var(--brand-soft) !important;
        }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-2)', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '22rem' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '2.25rem', height: '2.25rem', borderRadius: '50%',
              background: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(11,46,20,0.30)',
            }}>
              <svg style={{ width: '1.1rem', height: '1.1rem' }} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span style={{ color: 'var(--brand-ink)', fontWeight: 700, fontSize: '1.125rem' }}>AgroNexus</span>
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--edge)',
            borderRadius: '1.25rem',
            padding: '2.25rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            {tokenMissing ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-strong)', marginBottom: '0.5rem' }}>Invalid reset link</h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  This link is invalid or has expired. Please request a new one.
                </p>
                <Link
                  to="/forgot-password"
                  style={{
                    display: 'inline-block', padding: '0.75rem 1.5rem', borderRadius: '9999px',
                    background: 'var(--brand)',
                    color: 'var(--on-brand)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(11,46,20,0.30)',
                  }}
                >
                  Request new link
                </Link>
              </div>
            ) : done ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--brand-ink)" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-strong)', marginBottom: '0.5rem' }}>Password updated!</h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--brand-ink)" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                </div>

                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--ink-strong)', textAlign: 'center', marginBottom: '0.375rem' }}>
                  Set new password
                </h1>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1.75rem' }}>
                  Choose a strong password for your account.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.375rem' }}>
                      New password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="rp-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        className="an-rp-input"
                        style={{
                          width: '100%', padding: '0.75rem 2.75rem 0.75rem 1rem', borderRadius: '0.625rem',
                          border: '1.5px solid var(--edge)', backgroundColor: 'var(--surface)',
                          color: 'var(--ink-strong)', fontSize: '0.875rem',
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

                    {/* Strength indicator */}
                    {password.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          {[1,2,3,4].map((level) => {
                            const strength = password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
                            const colors = ['var(--ink-faint)','var(--chart-3)','var(--chart-2)','var(--chart-1)']
                            return (
                              <div key={level} style={{
                                flex: 1, height: '3px', borderRadius: '9999px',
                                background: level <= strength ? colors[strength - 1] : 'var(--edge)',
                                transition: 'background 0.2s',
                              }} />
                            )
                          })}
                        </div>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)' }}>
                          {password.length < 6 ? 'Too short' : password.length < 10 ? 'Fair' : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Strong' : 'Good'}
                        </p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div style={{
                      fontSize: '0.875rem', color: 'var(--ink)',
                      backgroundColor: 'var(--surface-2)', border: '1px solid var(--edge)',
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
                      background: 'var(--brand)',
                      color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(11,46,20,0.30)',
                      transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
