import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { makeToken } from './helpers'

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockChain = {
  select:  vi.fn().mockReturnThis(),
  insert:  vi.fn().mockReturnThis(),
  update:  vi.fn().mockReturnThis(),
  delete:  vi.fn().mockReturnThis(),
  eq:      vi.fn().mockReturnThis(),
  neq:     vi.fn().mockReturnThis(),
  order:   vi.fn().mockResolvedValue({ data: [], error: null }),
  single:  vi.fn().mockResolvedValue({ data: null, error: null }),
}
const mockFrom = vi.fn(() => ({ ...mockChain }))

vi.mock('../services/supabase', () => ({
  default: { from: mockFrom },
  supabaseAdmin: { from: mockFrom, auth: { admin: { createUser: vi.fn() } } },
  supabaseAuth:  { auth: { signInWithPassword: vi.fn() } },
}))
vi.mock('../services/realtime', () => ({ broadcast: vi.fn() }))

const { default: app } = await import('../server')

describe('v2 buyer roles — order guard', () => {
  const buyerRoles = ['wholesaler', 'retailer', 'direct_consumer', 'consumer'] as const

  for (const role of buyerRoles) {
    it(`${role} passes role guard for POST /orders`, async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${makeToken(role)}`)
        .send({ listing_id: 'listing-1', quantity_kg: 10 })
      // Guard passes — result depends on supabase mock
      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(403)
    })
  }

  it('wholesaler cannot create listing → 403', async () => {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${makeToken('wholesaler')}`)
      .send({ crop_type: 'maize', quantity_kg: 100, price_per_kg: 2.5, location: 'Tarkwa' })
    expect(res.status).toBe(403)
  })

  it('retailer cannot accept transport → 403', async () => {
    const res = await request(app)
      .put('/api/v1/transport/some-id/accept')
      .set('Authorization', `Bearer ${makeToken('retailer')}`)
    expect(res.status).toBe(403)
  })
})

describe('v2 allocations — farmer guard', () => {
  it('farmer passes role guard for PUT /listings/:id/allocations', async () => {
    const res = await request(app)
      .put('/api/v1/listings/listing-1/allocations')
      .set('Authorization', `Bearer ${makeToken('farmer')}`)
      .send({ allocations: [{ region: 'Tarkwa', allocated_kg: 50 }] })
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('direct_consumer cannot set allocations → 403', async () => {
    const res = await request(app)
      .put('/api/v1/listings/listing-1/allocations')
      .set('Authorization', `Bearer ${makeToken('direct_consumer')}`)
      .send({ allocations: [{ region: 'Tarkwa', allocated_kg: 50 }] })
    expect(res.status).toBe(403)
  })
})

describe('v2 admin routes — admin guard', () => {
  it('admin passes role guard for GET /admin/stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('farmer cannot access admin routes → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${makeToken('farmer')}`)
    expect(res.status).toBe(403)
  })

  it('unauthenticated admin request → 401', async () => {
    const res = await request(app).get('/api/v1/admin/stats')
    expect(res.status).toBe(401)
  })
})
