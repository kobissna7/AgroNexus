import { supabaseAdmin } from './supabase'

/**
 * Broadcast an event to a named Supabase Realtime channel.
 * Frontend clients subscribe using the anon key — no RLS needed for broadcast.
 */
export async function broadcast(channel: string, event: string, payload: object): Promise<void> {
  try {
    const ch = supabaseAdmin.channel(channel)
    await new Promise<void>((resolve) => {
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve()
      })
    })
    await ch.send({ type: 'broadcast', event, payload })
    await supabaseAdmin.removeChannel(ch)
  } catch (err) {
    // Non-fatal — realtime broadcast failure should not break the request
    console.warn('[realtime] broadcast failed:', channel, event, err)
  }
}
