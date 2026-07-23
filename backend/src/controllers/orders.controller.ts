import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'
import { validateListingForOrder, createOrderWithReservation, fulfillOrder } from '../services/orderFlow'

// Direct (no-payment) order placement — used by the mobile app and kept as the
// fallback path when Paystack is not configured. The web checkout goes through
// POST /api/v1/payments/initialize instead.
export async function placeOrder(req: Request, res: Response): Promise<void> {
  const { listing_id, quantity_kg, transporter_id } = req.body as { listing_id: string; quantity_kg: number; transporter_id?: string }

  const { listing, error: vErr } = await validateListingForOrder(listing_id, quantity_kg)
  if (vErr || !listing) { res.status(vErr!.status).json({ error: vErr!.message }); return }

  const { order, error } = await createOrderWithReservation(req.user!.id, listing, quantity_kg, 'pending')
  if (error || !order) { res.status(500).json({ error: error ?? 'Failed to create order' }); return }

  const finalOrder = await fulfillOrder(order, listing, transporter_id)
  res.status(201).json(finalOrder)
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
