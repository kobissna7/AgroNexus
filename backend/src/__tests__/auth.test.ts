import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockSingle  = vi.fn()
const mockInsert  = vi.fn(() => ({ select: () => ({ single: mockSingle }) }))
const mockSelect  = vi.fn(() => ({ eq: () => ({ single: mockSingle }) }))
const mockFrom    = vi.fn(() => ({ select: mockSelect, insert: mockInsert }))

vi.mock('../services/supabase', () => ({
  default: { from: mockFrom },
  supabaseAdmin: {
    from: mockFrom,
    auth: { admin: { createUser: vi.fn() } },
  },
  supabaseAuth: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  },
}))
vi.mock('../services/realtime', () => ({ broadcast: vi.fn() }))

const { default: app } = await import('../server')

describe('Auth — role guards', () => {
  it('rejects unauthenticated request → 401', async () => {
    const res = await request(app).get('/api/v1/listings/mine')
    expect(res.status).toBe(401)
  })

  it('rejects request with malformed token → 401', async () => {
    const res = await request(app)
      .get('/api/v1/listings/mine')
      .set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })

  it('rejects consumer trying to create listing → 403', async () => {
    // A valid token for a consumer role
    const { makeToken } = await import('./helpers')
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${makeToken('consumer')}`)
      .send({ crop_type: 'maize', quantity_kg: 100, price_per_kg: 2.5, location: 'Tarkwa' })
    expect(res.status).toBe(403)
  })

  it('rejects transporter trying to place order → 403', async () => {
    const { makeToken } = await import('./helpers')
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken('transporter')}`)
      .send({ listing_id: 'some-id', quantity_kg: 50 })
    expect(res.status).toBe(403)
  })

  it('rejects farmer trying to place order → 403', async () => {
    const { makeToken } = await import('./helpers')
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken('farmer')}`)
      .send({ listing_id: 'some-id', quantity_kg: 50 })
    expect(res.status).toBe(403)
  })

  it('rejects farmer trying to accept transport → 403', async () => {
    const { makeToken } = await import('./helpers')
    const res = await request(app)
      .put('/api/v1/transport/some-id/accept')
      .set('Authorization', `Bearer ${makeToken('farmer')}`)
    expect(res.status).toBe(403)
  })
})
