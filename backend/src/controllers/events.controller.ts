import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'

const EVENT_TYPES = new Set([
  'page_view', 'listing_view', 'listing_click', 'search', 'filter',
  'checkout_start', 'payment_success', 'payment_failed', 'order_placed',
])

const MAX_BATCH = 50

interface IncomingEvent {
  event_type: string
  listing_id?: string
  crop_type?: string
  region?: string
  metadata?: Record<string, unknown>
}

// POST /api/v1/events — { session_id, events: IncomingEvent[] }
// optionalAuth attaches user_id when a valid token rides along; sendBeacon
// bodies arrive as text/plain, so accept both shapes.
export async function ingestEvents(req: Request, res: Response): Promise<void> {
  let body = req.body as { session_id?: string; events?: IncomingEvent[] } | string
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { res.status(400).json({ error: 'Invalid payload' }); return }
  }

  const { session_id, events } = body as { session_id?: string; events?: IncomingEvent[] }
  if (!session_id || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'session_id and a non-empty events array are required' })
    return
  }

  const rows = events
    .slice(0, MAX_BATCH)
    .filter(e => e && EVENT_TYPES.has(e.event_type))
    .map(e => ({
      session_id: String(session_id).slice(0, 64),
      user_id: req.user?.id ?? null,
      event_type: e.event_type,
      listing_id: e.listing_id ?? null,
      crop_type: e.crop_type ? String(e.crop_type).slice(0, 40).toLowerCase() : null,
      region: e.region ? String(e.region).slice(0, 40) : null,
      metadata: e.metadata ?? {},
    }))

  if (rows.length === 0) { res.status(202).json({ accepted: 0 }); return }

  const { error } = await supabaseAdmin.from('site_events').insert(rows)
  if (error) {
    // analytics must never break the product — log and accept
    console.warn('site_events insert failed:', error.message)
  }
  res.status(202).json({ accepted: rows.length })
}
