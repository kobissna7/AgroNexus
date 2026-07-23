/* Lightweight behavior tracker. Events are queued in memory, flushed to
   POST /api/v1/events every 10 s via axios (Bearer token rides along, linking
   the user) and via navigator.sendBeacon when the tab hides/closes. The
   anonymous session_id persists in localStorage so pre-signup browsing joins
   up with the same visitor's post-signup activity. All failures are swallowed:
   analytics must never break the product. */
import api from './api'

const SESSION_KEY = 'agronexus_sid'
const FLUSH_MS = 10_000
const MAX_QUEUE = 50

export type EventType =
  | 'page_view' | 'listing_view' | 'listing_click' | 'search' | 'filter'
  | 'checkout_start' | 'payment_success' | 'payment_failed' | 'order_placed'

interface TrackedEvent {
  event_type: EventType
  listing_id?: string
  crop_type?: string
  region?: string
  metadata?: Record<string, unknown>
}

let queue: TrackedEvent[] = []
let timer: ReturnType<typeof setInterval> | null = null

export function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return 'anonymous'
  }
}

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ''
}

async function flush(useBeacon = false): Promise<void> {
  if (queue.length === 0) return
  const events = queue
  queue = []
  const payload = { session_id: getSessionId(), events }

  try {
    if (useBeacon && navigator.sendBeacon) {
      // beacon has no headers: anonymous, but session_id still ties it together
      navigator.sendBeacon(`${apiBase()}/api/v1/events`, JSON.stringify(payload))
    } else {
      await api.post('/api/v1/events', payload)
    }
  } catch {
    /* drop on the floor — never surface analytics errors */
  }
}

function ensureStarted(): void {
  if (timer) return
  timer = setInterval(() => { flush() }, FLUSH_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  window.addEventListener('pagehide', () => flush(true))
}

export function track(event_type: EventType, props: Omit<TrackedEvent, 'event_type'> = {}): void {
  try {
    ensureStarted()
    queue.push({ event_type, ...props })
    if (queue.length >= MAX_QUEUE) flush()
  } catch {
    /* never throw from analytics */
  }
}
