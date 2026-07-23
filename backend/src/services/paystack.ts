import axios from 'axios'
import crypto from 'crypto'

const PAYSTACK_BASE = 'https://api.paystack.co'

function secretKey(): string | undefined {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  return key || undefined
}

/** Payments are enabled only when a secret key is configured; without one the
    checkout falls through to direct order creation (visible "test mode"). */
export function isConfigured(): boolean {
  return !!secretKey()
}

export interface InitializeResult {
  authorization_url: string
  access_code: string
  reference: string
}

export async function initializeTransaction(params: {
  email: string
  amountPesewas: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<InitializeResult> {
  const { data } = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email: params.email,
      amount: params.amountPesewas, // pesewas (GHS × 100)
      currency: 'GHS',
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    },
    { headers: { Authorization: `Bearer ${secretKey()}` }, timeout: 15000 },
  )
  return data.data as InitializeResult
}

export interface VerifyResult {
  status: string          // 'success' | 'failed' | 'abandoned' | ...
  reference: string
  amount: number
  currency: string
  paid_at: string | null
  channel: string | null
  gateway_response: string | null
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const { data } = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey()}` }, timeout: 15000 },
  )
  return data.data as VerifyResult
}

/** Webhook authenticity: HMAC-SHA512 of the RAW request body with the secret
    key must equal the x-paystack-signature header. */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
  const key = secretKey()
  if (!key || !signature) return false
  const expected = crypto.createHmac('sha512', key).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
