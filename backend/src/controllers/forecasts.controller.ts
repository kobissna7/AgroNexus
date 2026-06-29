import { Request, Response } from 'express'
import axios from 'axios'
import supabase, { supabaseAdmin } from '../services/supabase'

const FLASK_URL    = process.env.FLASK_SERVICE_URL ?? 'http://localhost:5000'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

interface CacheEntry {
  data: unknown
  expiresAt: number
}

// In-process cache: key = `crop|region`
const cache = new Map<string, CacheEntry>()

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiresAt) return null
  return entry.data
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// Pull volume totals per region from produce_listings + orders
async function getRegionalVolumes(): Promise<Record<string, { listed_kg: number; ordered_kg: number; user_count: number }>> {
  const [listingsRes, ordersRes, usersRes] = await Promise.all([
    supabaseAdmin.from('produce_listings').select('location, quantity_kg').in('status', ['active', 'sold']),
    supabaseAdmin.from('orders').select('quantity_kg, produce_listings(location)').in('status', ['confirmed', 'in_transit', 'delivered']),
    supabaseAdmin.from('users').select('region'),
  ])

  type ListingRow = { location: string; quantity_kg: number }
  type OrderRow   = { quantity_kg: number; produce_listings: { location: string } | null }
  type UserRow    = { region: string }

  const vol: Record<string, { listed_kg: number; ordered_kg: number; user_count: number }> = {}
  const ensure = (r: string) => { if (!vol[r]) vol[r] = { listed_kg: 0, ordered_kg: 0, user_count: 0 } }

  for (const l of (listingsRes.data ?? []) as ListingRow[]) { ensure(l.location ?? 'Other'); vol[l.location ?? 'Other'].listed_kg += l.quantity_kg ?? 0 }
  for (const o of (ordersRes.data ?? []) as unknown as OrderRow[]) {
    const r = o.produce_listings?.location ?? 'Other'; ensure(r); vol[r].ordered_kg += o.quantity_kg ?? 0
  }
  for (const u of (usersRes.data ?? []) as UserRow[]) { ensure(u.region ?? 'Other'); vol[u.region ?? 'Other'].user_count++ }

  return vol
}

// POST /api/v1/forecasts/predict
export async function getForecast(req: Request, res: Response): Promise<void> {
  const { crop_type, region, demand_history, price_history } = req.body

  if (!crop_type || !region) {
    res.status(400).json({ error: 'crop_type and region are required' })
    return
  }

  const cacheKey = `${crop_type}|${region}`
  const cached = getCached(cacheKey)
  if (cached) {
    res.json({ ...cached as object, cached: true })
    return
  }

  try {
    // If caller didn't supply history, pull recent data from Supabase
    let dHistory: number[] = demand_history ?? []
    let pHistory: number[] = price_history ?? []

    if (dHistory.length === 0 || pHistory.length === 0) {
      const { data: rows } = await supabase
        .from('market_prices')
        .select('price_per_kg, recorded_date')
        .eq('crop_type', crop_type)
        .eq('region', region)
        .order('recorded_date', { ascending: false })
        .limit(8)

      if (rows && rows.length > 0) {
        pHistory = rows.map((r: { price_per_kg: number }) => r.price_per_kg)
      }
    }

    const regionalVolumes = await getRegionalVolumes().catch(() => ({}))

    const { data } = await axios.post(`${FLASK_URL}/predict`, {
      crop_type,
      region,
      demand_history:   dHistory,
      price_history:    pHistory,
      regional_volumes: regionalVolumes,
    })

    setCache(cacheKey, data)
    res.json({ ...data, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ML service unavailable'
    res.status(502).json({ error: message })
  }
}

// GET /api/v1/forecasts/summary  — all crops × regions in one call
export async function getForecastSummary(req: Request, res: Response): Promise<void> {
  const CROPS   = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
  const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']

  try {
    const results = await Promise.all(
      CROPS.flatMap((crop) =>
        REGIONS.map(async (region) => {
          const key    = `${crop}|${region}`
          const cached = getCached(key)
          if (cached) return { crop_type: crop, region, ...(cached as object), cached: true }

          try {
            const { data } = await axios.post(`${FLASK_URL}/predict`, {
              crop_type: crop,
              region,
            })
            setCache(key, data)
            return { ...data, cached: false }
          } catch {
            return { crop_type: crop, region, error: 'unavailable' }
          }
        })
      )
    )
    res.json(results)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'forecast error'
    res.status(502).json({ error: message })
  }
}

// GET /api/v1/forecasts/health
export async function getMLHealth(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await axios.get(`${FLASK_URL}/health`, { timeout: 3000 })
    res.json(data)
  } catch {
    res.status(502).json({ status: 'error', error: 'ML service unreachable' })
  }
}
