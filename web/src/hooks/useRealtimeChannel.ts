import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to a Supabase Realtime Broadcast channel.
 * Falls back silently when VITE_SUPABASE_URL / ANON_KEY are not set.
 *
 * @param channelName  e.g. "orders:farmer-<uuid>"
 * @param event        broadcast event name, e.g. "new_order"
 * @param handler      called with the payload each time the event fires
 */
export function useRealtimeChannel(
  channelName: string,
  event: string,
  handler: (payload: Record<string, unknown>) => void,
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!supabase || !channelName) return

    const client = supabase
    const channel = client
      .channel(channelName)
      .on('broadcast', { event }, ({ payload }) => {
        handlerRef.current(payload as Record<string, unknown>)
      })
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [channelName, event])
}
