import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import { track } from '../../lib/analytics'
import PublicHeader from '../../components/PublicHeader'

type VerifyState = 'verifying' | 'success' | 'failed' | 'pending' | 'error'

interface VerifyResponse {
  status: 'success' | 'failed' | 'pending'
  order?: { id: string; status: string }
  gateway_status?: string
}

/** Paystack redirects here with ?reference= after hosted checkout. */
export default function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') ?? searchParams.get('trxref')
  const [state, setState] = useState<VerifyState>('verifying')
  const [orderId, setOrderId] = useState<string | null>(null)

  const verify = useCallback(async () => {
    if (!reference) { setState('error'); return }
    setState('verifying')
    try {
      const { data } = await api.get<VerifyResponse>(`/api/v1/payments/verify/${encodeURIComponent(reference)}`)
      setOrderId(data.order?.id ?? null)
      setState(data.status)
      if (data.status === 'success') track('payment_success', { metadata: { reference, source: 'client' } })
      else if (data.status === 'failed') track('payment_failed', { metadata: { reference, source: 'client' } })
    } catch {
      setState('error')
    }
  }, [reference])

  useEffect(() => { verify() }, [verify])

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
      <PublicHeader />
      <div className="container-page" style={{ padding: '80px 24px', maxWidth: 560 }}>
        <div className="card animate-slide-up" style={{ padding: 36, textAlign: 'center' }}>
          {state === 'verifying' && (
            <>
              <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px' }} />
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink-strong)' }}>Confirming your payment…</h1>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 10 }}>This takes just a moment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: 'var(--brand)', color: 'var(--on-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 30, height: 30 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-strong)', marginBottom: 8 }}>Payment confirmed</h1>
              {orderId && <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 6 }}>Order ID: {orderId}</p>}
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28 }}>
                Your order is live — the farmer has been notified and delivery is being arranged.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/consumer/orders" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Track my order</Link>
                <Link to="/" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Keep shopping</Link>
              </div>
            </>
          )}

          {(state === 'failed' || state === 'error') && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: 'var(--invert-bg)', color: 'var(--invert-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-strong)', marginBottom: 8 }}>
                {state === 'failed' ? 'Payment unsuccessful' : 'We could not verify your payment'}
              </h1>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28 }}>
                {state === 'failed'
                  ? 'No money was taken and the produce was released back to the market. You can try again anytime.'
                  : 'If you completed the payment, retry verification — nothing is lost.'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {state === 'error' && <button className="btn-primary" onClick={verify}>Retry verification</button>}
                <Link to="/" className={state === 'failed' ? 'btn-primary' : 'btn-outline'} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                  Back to marketplace
                </Link>
              </div>
            </>
          )}

          {state === 'pending' && (
            <>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink-strong)', marginBottom: 8 }}>Payment still processing</h1>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 28 }}>
                The gateway hasn't finalized this transaction yet. Check again in a few seconds.
              </p>
              <button className="btn-primary" onClick={verify}>Check again</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
