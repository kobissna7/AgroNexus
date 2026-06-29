import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

// Mock supabase before importing server
vi.mock('../services/supabase', () => ({
  default: { from: vi.fn() },
  supabaseAdmin: { from: vi.fn() },
  supabaseAuth:  { auth: { signInWithPassword: vi.fn() } },
}))
vi.mock('../services/realtime', () => ({ broadcast: vi.fn() }))

const { default: app } = await import('../server')

describe('Health', () => {
  it('GET /api/v1/health → 200 ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
