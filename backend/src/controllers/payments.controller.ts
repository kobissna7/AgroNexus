import { Request, Response } from 'express'
import crypto from 'crypto'
import { supabaseAdmin } from '../services/supabase'
import * as paystack from '../services/paystack'
import * as rushpay from '../services/rushpay'
import {
  validateListingForOrder, createOrderWithReservation,
  releaseReservation, expireStaleHolds, fulfillOrder,
  Listing, Order,
} from '../services/orderFlow'

const WEB_URL = () => (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '')
// This API's own public URL — RushPay's per-payment callback_url is a SERVER
// webhook target (see their OpenAPI example), not a browser return page.
const BACKEND_PUBLIC_URL = () => (process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '')

/** Active gateway: RushPay wins when both keys are set (Paystack kept as the
    fallback provider); neither key → visible test mode. */
type Provider = 'rushpay' | 'paystack'
function activeProvider(): Provider | null {
  if (rushpay.isConfigured()) return 'rushpay'
  if (paystack.isConfigured()) return 'paystack'
  return null
}

/** Server-side behavior event (client may never return from the redirect). */
async function recordPaymentEvent(type: 'payment_success' | 'payment_failed', payment: {
  user_id: string; order_id: string; reference: string
}, listing?: { crop_type?: string; location?: string }) {
  await supabaseAdmin.from('site_events').insert({
    session_id: `server:${payment.reference}`,
    user_id: payment.user_id,
    event_type: type,
    crop_type: listing?.crop_type ?? null,
    region: listing?.location ?? null,
    metadata: { order_id: payment.order_id, reference: payment.reference, source: 'server' },
  }).then(({ error }) => { if (error) console.warn('site_events insert failed:', error.message) })
}

// GET /api/v1/payments/config — public; lets the UI announce test mode up front
export async function getConfig(_req: Request, res: Response): Promise<void> {
  res.json({ enabled: activeProvider() !== null, currency: 'GHS', provider: activeProvider() })
}

// POST /api/v1/payments/initialize — auth, buyer roles
// { listing_id, quantity_kg, transporter_id? }
export async function initializePayment(req: Request, res: Response): Promise<void> {
  const { listing_id, quantity_kg, transporter_id } = req.body as {
    listing_id: string; quantity_kg: number; transporter_id?: string
  }

  // Release stock held by abandoned checkouts before validating availability
  await expireStaleHolds(listing_id)

  const { listing, error: vErr } = await validateListingForOrder(listing_id, quantity_kg)
  if (vErr || !listing) { res.status(vErr!.status).json({ error: vErr!.message }); return }

  // ── Payment not configured → legacy direct path, clearly flagged ─────────
  if (!activeProvider()) {
    const { order, error } = await createOrderWithReservation(req.user!.id, listing, quantity_kg, 'pending')
    if (error || !order) { res.status(500).json({ error: error ?? 'Failed to create order' }); return }
    const finalOrder = await fulfillOrder(order, listing, transporter_id)
    await recordPaymentEvent('payment_success', { user_id: req.user!.id, order_id: order.id, reference: `skipped-${order.id}` }, listing)
    res.status(201).json({
      payment_required: false,
      notice: 'payment_skipped_not_configured',
      order: finalOrder,
    })
    return
  }

  // ── Gateway path: hold stock, create payment, hand the client what it needs ─
  const { order, error } = await createOrderWithReservation(req.user!.id, listing, quantity_kg, 'pending_payment')
  if (error || !order) { res.status(500).json({ error: error ?? 'Failed to create order' }); return }

  const amountPesewas = Math.round(quantity_kg * Number(listing.price_per_kg) * 100)

  // ── RushPay: server creates the checkout, browser renders the widget ──────
  if (activeProvider() === 'rushpay') {
    try {
      const checkout = await rushpay.createCheckout({
        amountGHS: amountPesewas / 100,
        description: `AgroNexus order — ${quantity_kg}kg ${listing.crop_type}`,
        callbackUrl: `${BACKEND_PUBLIC_URL()}/api/v1/payments/webhook/rushpay`,
        metadata: { order_id: order.id, listing_id, crop_type: listing.crop_type },
      })
      const reference = checkout.payment_reference

      const { error: payErr } = await supabaseAdmin.from('payments').insert({
        order_id: order.id,
        user_id: req.user!.id,
        reference,
        amount_pesewas: amountPesewas,
        currency: 'GHS',
        status: 'initialized',
        gateway_response: { provider: 'rushpay', transporter_id: transporter_id ?? null },
      })
      if (payErr) {
        await releaseReservation(order)
        res.status(500).json({ error: payErr.message })
        return
      }

      const session = await rushpay.createWidgetSession(reference)
      res.status(201).json({
        payment_required: true,
        provider: 'rushpay',
        reference,
        amount_pesewas: amountPesewas,
        order,
        widget: {
          script_url: rushpay.RUSHPAY_WIDGET_SCRIPT,
          api_base: rushpay.RUSHPAY_BASE,
          session,
        },
      })
    } catch (e) {
      await releaseReservation(order)
      const msg = e instanceof Error ? e.message : 'Payment initialization failed'
      console.error('RushPay initialize failed:', msg)
      res.status(502).json({ error: 'Payment service unavailable. Please try again.' })
    }
    return
  }

  // ── Paystack: redirect flow via authorization_url ──────────────────────────
  const reference = `AGX-${order.id.slice(0, 8)}-${crypto.randomBytes(4).toString('hex')}`

  const { error: payErr } = await supabaseAdmin.from('payments').insert({
    order_id: order.id,
    user_id: req.user!.id,
    reference,
    amount_pesewas: amountPesewas,
    currency: 'GHS',
    status: 'initialized',
    gateway_response: { provider: 'paystack', transporter_id: transporter_id ?? null },
  })
  if (payErr) {
    await releaseReservation(order)
    res.status(500).json({ error: payErr.message })
    return
  }

  try {
    const init = await paystack.initializeTransaction({
      email: req.user!.email ?? `${req.user!.id}@agronexus.local`,
      amountPesewas,
      reference,
      callbackUrl: `${WEB_URL()}/payment/callback`,
      metadata: { order_id: order.id, listing_id, crop_type: listing.crop_type },
    })
    res.status(201).json({
      payment_required: true,
      provider: 'paystack',
      authorization_url: init.authorization_url,
      reference,
      amount_pesewas: amountPesewas,
      order,
    })
  } catch (e) {
    // Paystack unreachable/rejected — release the hold so stock isn't stranded
    await releaseReservation(order)
    await supabaseAdmin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('reference', reference)
    const msg = e instanceof Error ? e.message : 'Payment initialization failed'
    console.error('Paystack initialize failed:', msg)
    res.status(502).json({ error: 'Payment service unavailable. Please try again.' })
  }
}

/** Idempotent success routine shared by verify (user redirect) and webhook.
    The conditional update on orders.status = 'pending_payment' guarantees
    fulfillment runs exactly once even when both fire. */
async function settleSuccessfulPayment(reference: string): Promise<{ order?: Order; already?: boolean; error?: string }> {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .single()

  if (!payment) return { error: 'Payment not found' }

  await supabaseAdmin
    .from('payments')
    .update({ status: 'success', updated_at: new Date().toISOString() })
    .eq('reference', reference)

  // single-flight guard: only the caller that flips pending_payment → pending fulfills
  const { data: flipped } = await supabaseAdmin
    .from('orders')
    .update({ status: 'pending' })
    .eq('id', payment.order_id)
    .eq('status', 'pending_payment')
    .select()

  if (!flipped || flipped.length === 0) {
    const { data: existing } = await supabaseAdmin.from('orders').select('*').eq('id', payment.order_id).single()
    return { order: existing as Order, already: true }
  }

  const order = flipped[0] as Order
  const { data: listing } = await supabaseAdmin
    .from('produce_listings')
    .select('*')
    .eq('id', order.listing_id)
    .single()

  const transporterId = (payment.gateway_response as { transporter_id?: string } | null)?.transporter_id ?? undefined
  const finalOrder = listing ? await fulfillOrder(order, listing as Listing, transporterId) : order
  await recordPaymentEvent('payment_success', { user_id: payment.user_id, order_id: order.id, reference }, listing as Listing | undefined)
  return { order: finalOrder }
}

async function settleFailedPayment(reference: string, gatewayStatus: string): Promise<void> {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .single()
  if (!payment || payment.status === 'success') return

  await supabaseAdmin
    .from('payments')
    .update({ status: 'failed', gateway_response: { ...(payment.gateway_response ?? {}), final_status: gatewayStatus }, updated_at: new Date().toISOString() })
    .eq('reference', reference)

  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', payment.order_id).single()
  if (order) await releaseReservation(order as Order)
  const { data: listing } = order
    ? await supabaseAdmin.from('produce_listings').select('crop_type, location').eq('id', (order as Order).listing_id).single()
    : { data: null }
  await recordPaymentEvent('payment_failed', { user_id: payment.user_id, order_id: payment.order_id, reference }, listing ?? undefined)
}

// GET /api/v1/payments/verify/:reference — auth; called from the callback page
export async function verifyPayment(req: Request, res: Response): Promise<void> {
  const reference = req.params.reference as string

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .single()

  if (!payment) { res.status(404).json({ error: 'Payment not found' }); return }
  if (payment.user_id !== req.user!.id) { res.status(403).json({ error: 'Not your payment' }); return }

  // Already settled — idempotent response
  if (payment.status === 'success') {
    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', payment.order_id).single()
    res.json({ status: 'success', order })
    return
  }

  // Which gateway created this payment? Stamped at initialize time so verify
  // still routes correctly if the active provider changes later.
  const paymentProvider = ((payment.gateway_response as { provider?: string } | null)?.provider ?? 'paystack') as 'rushpay' | 'paystack'

  if (paymentProvider === 'rushpay' ? !rushpay.isConfigured() : !paystack.isConfigured()) {
    res.status(503).json({ error: 'Payments not configured' })
    return
  }

  try {
    let outcome: 'success' | 'failed' | 'pending'
    let gatewayStatus: string
    if (paymentProvider === 'rushpay') {
      const result = await rushpay.getPaymentStatus(reference)
      gatewayStatus = String(result.status ?? 'unknown')
      outcome = rushpay.classifyStatus(gatewayStatus)
    } else {
      const result = await paystack.verifyTransaction(reference)
      gatewayStatus = result.status
      outcome = result.status === 'success' ? 'success'
        : (result.status === 'failed' || result.status === 'abandoned' || result.status === 'reversed') ? 'failed'
        : 'pending'
    }

    if (outcome === 'success') {
      const { order, error } = await settleSuccessfulPayment(reference)
      if (error) { res.status(500).json({ error }); return }
      res.json({ status: 'success', order })
    } else if (outcome === 'failed') {
      await settleFailedPayment(reference, gatewayStatus)
      res.json({ status: 'failed', gateway_status: gatewayStatus })
    } else {
      // ongoing / pending at the gateway — don't release the hold yet
      res.json({ status: 'pending', gateway_status: gatewayStatus })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verification failed'
    console.error(`${paymentProvider} verify failed:`, msg)
    res.status(502).json({ error: 'Could not verify payment. Please retry shortly.' })
  }
}

// POST /api/v1/payments/webhook — raw body, HMAC-verified; production safety net
export async function paystackWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-paystack-signature'] as string | undefined
  const raw = req.body as Buffer // express.raw() mounted for this route

  if (!paystack.verifyWebhookSignature(raw, signature)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  let event: { event: string; data: { reference: string; status?: string } }
  try {
    event = JSON.parse(raw.toString('utf8'))
  } catch {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }

  // Ack fast; Paystack retries on non-2xx
  res.sendStatus(200)

  try {
    if (event.event === 'charge.success') {
      await settleSuccessfulPayment(event.data.reference)
    } else if (event.event === 'charge.failed') {
      await settleFailedPayment(event.data.reference, event.data.status ?? 'failed')
    }
  } catch (e) {
    console.error('Webhook processing failed:', e instanceof Error ? e.message : e)
  }
}

// POST /api/v1/payments/webhook/rushpay — raw body; production safety net.
// RushPay's own guidance: never trust the payload for money movement — treat
// the webhook as a wake-up signal and confirm via server-side status lookup.
// (Signature verification is added once the webhook secret arrives with the
// live API key — the status re-check already makes spoofed payloads harmless.)
export async function rushpayWebhook(req: Request, res: Response): Promise<void> {
  if (!rushpay.isConfigured()) { res.sendStatus(503); return }

  let payload: { payment_reference?: string; data?: { payment_reference?: string } }
  try {
    payload = JSON.parse((req.body as Buffer).toString('utf8'))
  } catch {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }
  const reference = payload.payment_reference ?? payload.data?.payment_reference
  if (!reference) { res.status(400).json({ error: 'Missing payment_reference' }); return }

  // Ack fast, then reconcile against the gateway's status endpoint
  res.sendStatus(200)

  try {
    const status = await rushpay.getPaymentStatus(reference)
    const outcome = rushpay.classifyStatus(String(status.status ?? ''))
    if (outcome === 'success') await settleSuccessfulPayment(reference)
    else if (outcome === 'failed') await settleFailedPayment(reference, String(status.status))
  } catch (e) {
    console.error('RushPay webhook processing failed:', e instanceof Error ? e.message : e)
  }
}
