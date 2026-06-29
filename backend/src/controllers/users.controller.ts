import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const { lat, lng } = req.body as { lat: unknown; lng: unknown }
  const userId = req.user!.id

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'lat and lng must be numbers' })
    return
  }
  if (lat < -90 || lat > 90) {
    res.status(400).json({ error: 'lat must be between -90 and 90' })
    return
  }
  if (lng < -180 || lng > 180) {
    res.status(400).json({ error: 'lng must be between -180 and 180' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ location_lat: lat, location_lng: lng })
    .eq('id', userId)
    .select('id, location_lat, location_lng')
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}
