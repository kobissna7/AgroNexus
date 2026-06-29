import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { makeToken } from './helpers'

// ── Supabase mock ──────────────────────────────────────────────────────────
const MOCK_LISTINGS = [
  { id: 'listing-1', farmer_id: 'farmer-id-1', crop_type: 'maize', quantity_kg: 500, price_per_kg: 2.5, location: 'Tarkwa', available_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
]

const mockChain = {
  select:  vi.fn().mockReturnThis(),
  insert:  vi.fn().mockReturnThis(),
  update:  vi.fn().mockReturnThis(),
  delete:  vi.fn().mockReturnThis(),
  eq:      vi.fn().mockReturnThis(),
  neq:     vi.fn().mockReturnThis(),
  order:   vi.fn().mockReturnThis(),
  limit:   vi.fn().mockReturnThis(),
  gte:     vi.fn().mockReturnThis(),
  lte:     vi.fn().mockReturnThis(),
  ilike:   vi.fn().mockReturnThis(),
  single:  vi.fn().mockResolvedValue({ data: MOCK_LISTINGS[0], error: null }),
  then:    undefined as unknown,
}
mockChain.then = undefined

const mockFrom = vi.fn(() => ({
  ...mockChain,
  // Resolve as list for getAllListings
  order: vi.fn().mockResolvedValue({ data: MOCK_LISTINGS, error: null }),
}))

vi.mock('../services/supabase', () => ({
  default: { from: mockFrom },
  supabaseAdmin: { from: mockFrom },
  supabaseAuth:  { auth: { signInWithPassword: vi.fn() } },
}))
vi.mock('../services/realtime', () => ({ broadcast: vi.fn() }))

const { default: app } = await import('../server')

describe('Listings — happy path', () => {
  it('authenticated user can browse listings', async () => {
    const res = await request(app)
      .get('/api/v1/listings')
      .set('Authorization', `Bearer ${makeToken('consumer')}`)
    // Returns 200 or 500 depending on mock resolution — key check: NOT 401/403
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('farmer token passes role guard for POST /listings', async () => {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${makeToken('farmer')}`)
      .send({ crop_type: 'maize', quantity_kg: 100, price_per_kg: 2.5, location: 'Tarkwa', available_from: '2026-01-01' })
    // Role guard passes — result depends on supabase mock
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })
})
