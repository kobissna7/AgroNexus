// /home/ekko-7/AgroNexus/web/src/pages/ForgotPassword.tsx
import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/v1/auth/forgot-password', { email })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .an-fp-input::placeholder { color: var(--ink-faint); }
        .an-fp-input:focus {
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
            {!submitted ? (
              <>
                {/* Icon */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                    background: 'var(--brand-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--brand-ink)" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                </div>

                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--ink-strong)', textAlign: 'center', marginBottom: '0.375rem' }}>
                  Forgot your password?
                </h1>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1.75rem', lineHeight: 1.55 }}>
                  No worries — enter your email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.375rem' }}>
                      Email address
                    </label>
                    <input
                      id="fp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="an-fp-input"
                      style={{
                        width: '100%', padding: '0.75rem 1rem', borderRadius: '0.625rem',
                        border: '1.5px solid var(--edge)', backgroundColor: 'var(--surface)',
                        color: 'var(--ink-strong)', fontSize: '0.875rem',
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                    />
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
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                    background: 'var(--brand-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--brand-ink)" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-strong)', marginBottom: '0.5rem' }}>Check your inbox</h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  We've sent a password reset link to <strong style={{ color: 'var(--ink-strong)' }}>{email}</strong>. It expires in 1 hour.
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-faint)' }}>
                  Didn't receive it?{' '}
                  <button
                    onClick={() => { setSubmitted(false); setEmail('') }}
                    style={{ color: 'var(--brand-ink)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}
                  >
                    Try again
                  </button>
                </p>
              </div>
            )}

            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--ink-muted)' }}>
              <Link to="/login" style={{ color: 'var(--brand-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
