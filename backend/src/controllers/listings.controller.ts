import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'

export async function createListing(req: Request, res: Response): Promise<void> {
  const { crop_type, quantity_kg, price_per_kg, location, available_from } = req.body as {
    crop_type: string
    quantity_kg: number
    price_per_kg: number
    location: string
    available_from: string
  }

  if (!crop_type || !quantity_kg || !price_per_kg || !location || !available_from) {
    res.status(400).json({ error: 'crop_type, quantity_kg, price_per_kg, location, and available_from are required' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('produce_listings')
    .insert({ farmer_id: req.user!.id, crop_type, quantity_kg, price_per_kg, location, available_from })
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(201).json(data)
}

export async function getAllListings(req: Request, res: Response): Promise<void> {
  const { crop_type, region, min_price, max_price, available_from } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('produce_listings')
    .select('*, users(full_name, region)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (crop_type) query = query.ilike('crop_type', `%${crop_type}%`)
  if (region)    query = query.ilike('location', `%${region}%`)
  if (min_price) query = query.gte('price_per_kg', Number(min_price))
  if (max_price) query = query.lte('price_per_kg', Number(max_price))
  if (available_from) query = query.gte('available_from', available_from)

  const { data, error } = await query
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

export async function getMyListings(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('produce_listings')
    .select('*')
    .eq('farmer_id', req.user!.id)
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

export async function updateListing(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('produce_listings')
    .select('farmer_id')
    .eq('id', id)
    .single()

  if (!existing) { res.status(404).json({ error: 'Listing not found' }); return }
  if (existing.farmer_id !== req.user!.id) { res.status(403).json({ error: 'Not your listing' }); return }

  const { crop_type, quantity_kg, price_per_kg, location, available_from, status } = req.body as {
    crop_type?: string; quantity_kg?: number; price_per_kg?: number
    location?: string; available_from?: string; status?: string
  }

  const { data, error } = await supabaseAdmin
    .from('produce_listings')
    .update({ crop_type, quantity_kg, price_per_kg, location, available_from, status })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

export async function deleteListing(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  const { data: existing } = await supabaseAdmin
    .from('produce_listings')
    .select('farmer_id')
    .eq('id', id)
    .single()

  if (!existing) { res.status(404).json({ error: 'Listing not found' }); return }
  if (existing.farmer_id !== req.user!.id) { res.status(403).json({ error: 'Not your listing' }); return }

  // Check for linked orders
  const { data: linkedOrders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('listing_id', id)
    .limit(1)

  if (linkedOrders && linkedOrders.length > 0) {
    // Soft delete: mark expired so order history is preserved
    const { error } = await supabaseAdmin
      .from('produce_listings')
      .update({ status: 'expired' })
      .eq('id', id)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ message: 'Listing archived (has linked orders)', archived: true })
  } else {
    // Hard delete: no orders reference this listing
    const { error } = await supabaseAdmin
      .from('produce_listings')
      .delete()
      .eq('id', id)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ message: 'Listing deleted', archived: false })
  }
}

export async function getFarmerOrders(req: Request, res: Response): Promise<void> {
  // Get orders on this farmer's listings
  const { data: listings } = await supabaseAdmin
    .from('produce_listings')
    .select('id')
    .eq('farmer_id', req.user!.id)

  if (!listings?.length) { res.json([]); return }

  const listingIds = listings.map((l) => l.id)

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, produce_listings(crop_type, location)')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}
