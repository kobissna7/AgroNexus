import axios from 'axios'

/** RushPay (rushpay.cash) — Ghana payment provider, GHS only.
    Docs: https://app.rushpay.cash/api-docs (OpenAPI at /openapi.json).
    Flow: server creates a checkout (X-API-Key, never in the browser), exchanges
    the payment_reference for a short-lived widget session token, and the
    browser renders the embedded widget from
    https://core.rushpay.cash/widget/payment-widget-v2.js.
    Money movement must be confirmed server-side (status lookup) before
    fulfilling — webhook payloads are treated as a wake-up signal only. */

export const RUSHPAY_BASE = 'https://core.rushpay.cash'
export const RUSHPAY_WIDGET_SCRIPT = `${RUSHPAY_BASE}/widget/payment-widget-v2.js`

function apiKey(): string | undefined {
  const key = process.env.RUSHPAY_API_KEY?.trim()
  return key || undefined
}

export function isConfigured(): boolean {
  return !!apiKey()
}

function headers() {
  return { 'X-API-Key': apiKey() as string }
}

interface Envelope<T> { success: boolean; data: T; message?: string }

export interface RushPayCheckout {
  payment_reference: string
  [k: string]: unknown
}

/** POST /api/v1/merchant/payments/create — amount is GHS in MAJOR units, as a string. */
export async function createCheckout(params: {
  amountGHS: number
  description: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<RushPayCheckout> {
  const { data } = await axios.post<Envelope<RushPayCheckout>>(
    `${RUSHPAY_BASE}/api/v1/merchant/payments/create`,
    {
      amount: params.amountGHS.toFixed(2),
      description: params.description,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    },
    { headers: headers(), timeout: 15000 },
  )
  if (!data.success || !data.data?.payment_reference) {
    throw new Error(data.message ?? 'RushPay checkout creation failed')
  }
  return data.data
}

/** POST /api/v1/merchant/payments/widget-session — short-lived browser token
    scoped to one payment_reference (X-RushPay-Widget-Session). */
export async function createWidgetSession(paymentReference: string): Promise<Record<string, unknown>> {
  const { data } = await axios.post<Envelope<Record<string, unknown>>>(
    `${RUSHPAY_BASE}/api/v1/merchant/payments/widget-session`,
    { payment_reference: paymentReference },
    { headers: headers(), timeout: 15000 },
  )
  if (!data.success) throw new Error(data.message ?? 'RushPay widget session failed')
  return data.data
}

export interface RushPayStatus {
  status: string
  [k: string]: unknown
}

/** GET /api/v1/merchant/payments/status?payment_reference=… — the source of
    truth before fulfilling an order. */
export async function getPaymentStatus(paymentReference: string): Promise<RushPayStatus> {
  const { data } = await axios.get<Envelope<RushPayStatus>>(
    `${RUSHPAY_BASE}/api/v1/merchant/payments/status`,
    { params: { payment_reference: paymentReference }, headers: headers(), timeout: 15000 },
  )
  if (!data.success) throw new Error(data.message ?? 'RushPay status lookup failed')
  return data.data
}

/** Map RushPay status strings onto our settle actions. Exact enum TBC against
    a live key — unknown values are treated as still-pending (safe: the hold
    stays until success/failure is certain or it expires). */
export function classifyStatus(status: string | undefined): 'success' | 'failed' | 'pending' {
  const s = (status ?? '').toLowerCase()
  if (['success', 'succeeded', 'paid', 'completed', 'complete'].includes(s)) return 'success'
  if (['failed', 'failure', 'cancelled', 'canceled', 'declined', 'expired', 'reversed'].includes(s)) return 'failed'
  return 'pending'
}
