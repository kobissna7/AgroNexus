import { createClient } from '@supabase/supabase-js'

// Admin client: always uses service_role JWT for DB queries, bypasses RLS.
// Never call signInWithPassword on this client — it would pollute the session.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Auth client: used only for signInWithPassword (verifying user credentials).
// Session changes on this client are intentional and isolated.
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default supabaseAdmin
