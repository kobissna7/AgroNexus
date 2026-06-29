import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     as string
const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Anon client — used exclusively for Realtime broadcast subscriptions.
// All data fetching goes through the Express backend (api.ts), not this client.
export const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null
