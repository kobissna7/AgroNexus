import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'
import { broadcast } from '../services/realtime'

export async function placeOrder(req: Request, res: Response): Promise<void> {
  const { listing_id, quantity_kg, transporter_id } = req.body as { listing_id: string; quantity_kg: number; transporter_id?: string }

  if (!listing_id || !quantity_kg || quantity_kg <= 0) {
    res.status(400).json({ error: 'listing_id and a positive quantity_kg are required' })
    return
  }

  // Fetch listing and validate
  const { data: listing, error: listingErr } = await supabaseAdmin
    .from('produce_listings')
    .select('*')
    .eq('id', listing_id)
    .eq('status', 'active')
    .single()

  if (listingErr || !listing) {
    res.status(404).json({ error: 'Listing not found or no longer active' })
    return
  }

  if (quantity_kg > listing.quantity_kg) {
    res.status(400).json({ error: `Only ${listing.quantity_kg} kg available` })
    return
  }

  // Create order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({ listing_id, consumer_id: req.user!.id, quantity_kg, status: 'pending' })
    .select()
    .single()

  if (orderErr || !order) {
    res.status(500).json({ error: orderErr?.message ?? 'Failed to create order' })
    return
  }

  // Decrement listing quantity (or mark sold if fully taken)
  const remaining = listing.quantity_kg - quantity_kg
  await supabaseAdmin
    .from('produce_listings')
    .update({ quantity_kg: remaining, status: remaining <= 0 ? 'sold' : 'active' })
    .eq('id', listing_id)

  // Auto-create transport request (pre-assign transporter if consumer selected one)
  const transportStatus = transporter_id ? 'accepted' : 'open'
  const { error: transportErr } = await supabaseAdmin
    .from('transport_requests')
    .insert({
      order_id: order.id,
      pickup_location: listing.location,
      delivery_location: listing.location,
      crop_type: listing.crop_type,
      quantity_kg,
      status: transportStatus,
      ...(transporter_id ? { transporter_id } : {}),
    })

  // If transporter was pre-assigned, move order to confirmed immediately
  if (transporter_id && !transportErr) {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order.id)
  }

  if (transportErr) {
    console.error('Transport request creation failed:', transportErr.message)
  }

  // ── SMS fallback (console log + DB record) ────────────────────────────────
  const { data: farmer } = await supabaseAdmin
    .from('users')
    .select('full_name, phone')
    .eq('id', listing.farmer_id)
    .single()

  console.log(`[SMS] → ${farmer?.phone ?? 'no phone'} (${farmer?.full_name}): New order — ${quantity_kg}kg of ${listing.crop_type} at GH₵${listing.price_per_kg}/kg. Total: GH₵${(quantity_kg * listing.price_per_kg).toFixed(2)}`)

  // ── Persist notification ────────────────────────────────────────────────
  await supabaseAdmin.from('notifications').insert({
    user_id: listing.farmer_id,
    type:    'new_order',
    message: `New order: ${quantity_kg}kg of ${listing.crop_type} at GH₵${listing.price_per_kg}/kg`,
  })

  // ── Realtime broadcast ─────────────────────────────────────────────────
  // Farmer dashboard channel
  broadcast(`orders:farmer-${listing.farmer_id}`, 'new_order', {
    order_id:   order.id,
    crop_type:  listing.crop_type,
    quantity_kg,
    price_per_kg: listing.price_per_kg,
    location:   listing.location,
  })

  // Transporter feed channel (new job available)
  broadcast('transport:all', 'new_request', {
    crop_type:  listing.crop_type,
    quantity_kg,
    pickup:     listing.location,
  })

  // Consumer order status channel
  broadcast(`orders:consumer-${req.user!.id}`, 'order_placed', {
    order_id:  order.id,
    status:    'pending',
    crop_type: listing.crop_type,
  })

  res.status(201).json(order)
}

export async function getMyOrders(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, produce_listings(crop_type, location, price_per_kg)')
    .eq('consumer_id', req.user!.id)
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, produce_listings(crop_type, location, price_per_kg), transport_requests(*)')
    .eq('id', id)
    .single()

  if (error || !data) { res.status(404).json({ error: 'Order not found' }); return }

  // Only the consumer who placed it or the farmer who owns the listing can view
  const isConsumer = data.consumer_id === req.user!.id
  const isFarmer = req.user!.role === 'farmer'
  if (!isConsumer && !isFarmer) { res.status(403).json({ error: 'Forbidden' }); return }

  res.json(data)
}
