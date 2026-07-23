import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'
import { makeToken } from './helpers'

// ── Supabase mock (query-builder shape; resolves to empty results) ─────────
function chainable(): Record<string, unknown> {
  const target: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'then') {
        // awaitable: resolve as an empty successful query
        return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
      }
      if (prop === 'single') return () => Promise.resolve({ data: null, error: { message: 'not found' } })
      return () => new Proxy(target, handler)
    },
  }
  return new Proxy(target, handler)
}

vi.mock('../services/supabase', () => ({
  supabaseAdmin: { from: () => chainable() },
  supabaseAuth: { auth: { signInWithPassword: vi.fn() } },
}))
vi.mock('../services/realtime', () => ({ broadcast: vi.fn() }))

const { default: app } = await import('../server')

describe('Public marketplace', () => {
  it('GET /api/v1/marketplace requires no auth', async () => {
    const res = await request(app).get('/api/v1/marketplace')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /api/v1/marketplace/:id 404s for unknown listing without auth', async () => {
    const res = await request(app).get('/api/v1/marketplace/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })
})

describe('Payments', () => {
  it('GET /api/v1/payments/config is public and reports disabled without keys', async () => {
    const res = await request(app).get('/api/v1/payments/config')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: false, currency: 'GHS', provider: null })
  })

  it('POST /api/v1/payments/initialize rejects unauthenticated → 401', async () => {
    const res = await request(app).post('/api/v1/payments/initialize').send({ listing_id: 'x', quantity_kg: 5 })
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/payments/initialize rejects non-buyer roles → 403', async () => {
    const res = await request(app)
      .post('/api/v1/payments/initialize')
      .set('Authorization', `Bearer ${makeToken('farmer')}`)
      .send({ listing_id: 'x', quantity_kg: 5 })
    expect(res.status).toBe(403)
  })

  it('POST /api/v1/payments/initialize validates listing for buyers → 404 for unknown listing', async () => {
    const res = await request(app)
      .post('/api/v1/payments/initialize')
      .set('Authorization', `Bearer ${makeToken('wholesaler')}`)
      .send({ listing_id: '00000000-0000-0000-0000-000000000000', quantity_kg: 5 })
    expect(res.status).toBe(404)
  })

  it('webhook rejects requests without a valid signature → 401', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'charge.success', data: { reference: 'AGX-x' } }))
    expect(res.status).toBe(401)
  })

  it('webhook accepts a correctly signed payload when a key is set', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_dummy'
    const body = JSON.stringify({ event: 'ping', data: { reference: 'AGX-x' } })
    const sig = crypto.createHmac('sha512', 'sk_test_dummy').update(body).digest('hex')
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sig)
      .send(body)
    expect(res.status).toBe(200)
    delete process.env.PAYSTACK_SECRET_KEY
  })
})

describe('Events ingestion', () => {
  it('accepts anonymous batches → 202', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .send({ session_id: 'sid-1', events: [{ event_type: 'page_view', metadata: { path: '/' } }] })
    expect(res.status).toBe(202)
    expect(res.body.accepted).toBe(1)
  })

  it('drops unknown event types', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .send({ session_id: 'sid-1', events: [{ event_type: 'evil_event' }] })
    expect(res.status).toBe(202)
    expect(res.body.accepted).toBe(0)
  })

  it('rejects missing session_id → 400', async () => {
    const res = await request(app).post('/api/v1/events').send({ events: [{ event_type: 'page_view' }] })
    expect(res.status).toBe(400)
  })

  it('never 401s on an invalid token (optional auth)', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', 'Bearer garbage')
      .send({ session_id: 'sid-1', events: [{ event_type: 'page_view' }] })
    expect(res.status).toBe(202)
  })
})
