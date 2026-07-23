import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'
import { anonymizedListingsQuery, ListingFilters } from '../services/listingsQuery'

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
  const { data, error } = await anonymizedListingsQuery(req.query as ListingFilters)
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

const ALLOCATION_REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']

export async function getAllocations(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('listing_allocations')
    .select('id, region, allocated_kg, created_at')
    .eq('listing_id', id)
    .order('region')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

export async function setAllocations(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { allocations } = req.body as { allocations: { region: string; allocated_kg: number }[] }

  if (!Array.isArray(allocations)) {
    res.status(400).json({ error: 'allocations must be an array of { region, allocated_kg }' })
    return
  }

  const { data: listing } = await supabaseAdmin
    .from('produce_listings')
    .select('farmer_id, quantity_kg')
    .eq('id', id)
    .single()

  if (!listing) { res.status(404).json({ error: 'Listing not found' }); return }
  if (listing.farmer_id !== req.user!.id) { res.status(403).json({ error: 'Not your listing' }); return }

  const cleaned = allocations.filter((a) => a.allocated_kg > 0)

  for (const a of cleaned) {
    if (!ALLOCATION_REGIONS.includes(a.region)) {
      res.status(400).json({ error: `region must be one of: ${ALLOCATION_REGIONS.join(', ')}` })
      return
    }
  }

  const total = cleaned.reduce((s, a) => s + a.allocated_kg, 0)
  if (total > listing.quantity_kg) {
    res.status(400).json({ error: `Allocations total ${total} kg but only ${listing.quantity_kg} kg is listed` })
    return
  }

  // Replace-all semantics: clear existing allocations, then insert the new set
  const { error: delError } = await supabaseAdmin
    .from('listing_allocations')
    .delete()
    .eq('listing_id', id)

  if (delError) { res.status(500).json({ error: delError.message }); return }

  if (cleaned.length === 0) { res.json([]); return }

  const { data, error } = await supabaseAdmin
    .from('listing_allocations')
    .insert(cleaned.map((a) => ({ listing_id: id, region: a.region, allocated_kg: a.allocated_kg })))
    .select('id, region, allocated_kg, created_at')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
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
