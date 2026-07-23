import { supabaseAdmin } from './supabase'
import { broadcast } from './realtime'

export interface Listing {
  id: string
  farmer_id: string
  crop_type: string
  quantity_kg: number
  price_per_kg: number
  location: string
  status: string
}

export interface Order {
  id: string
  listing_id: string
  consumer_id: string
  quantity_kg: number
  status: string
}

/** Fetch an active listing and validate the requested quantity against stock. */
export async function validateListingForOrder(listing_id: string, quantity_kg: number):
  Promise<{ listing?: Listing; error?: { status: number; message: string } }> {
  if (!listing_id || !quantity_kg || quantity_kg <= 0) {
    return { error: { status: 400, message: 'listing_id and a positive quantity_kg are required' } }
  }

  const { data: listing, error } = await supabaseAdmin
    .from('produce_listings')
    .select('*')
    .eq('id', listing_id)
    .eq('status', 'active')
    .single()

  if (error || !listing) return { error: { status: 404, message: 'Listing not found or no longer active' } }
  if (quantity_kg > listing.quantity_kg) return { error: { status: 400, message: `Only ${listing.quantity_kg} kg available` } }
  return { listing }
}

/** Insert the order and reserve stock immediately (decrement; mark sold when
    depleted). Reserving at creation means two buyers can never pay for the
    same kilos; failed/abandoned payments release via restoreReservation. */
export async function createOrderWithReservation(
  consumerId: string, listing: Listing, quantity_kg: number, status: 'pending' | 'pending_payment',
): Promise<{ order?: Order; error?: string }> {
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({ listing_id: listing.id, consumer_id: consumerId, quantity_kg, status })
    .select()
    .single()

  if (orderErr || !order) return { error: orderErr?.message ?? 'Failed to create order' }

  const remaining = listing.quantity_kg - quantity_kg
  await supabaseAdmin
    .from('produce_listings')
    .update({ quantity_kg: remaining, status: remaining <= 0 ? 'sold' : 'active' })
    .eq('id', listing.id)

  return { order }
}

/** Release a reservation: cancel the order and hand the kilos back. */
export async function releaseReservation(order: Order): Promise<void> {
  const { data: cancelled } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id)
    .eq('status', 'pending_payment') // single-flight: only release an active hold
    .select()

  if (!cancelled || cancelled.length === 0) return

  const { data: listing } = await supabaseAdmin
    .from('produce_listings')
    .select('quantity_kg, status')
    .eq('id', order.listing_id)
    .single()

  if (!listing) return
  await supabaseAdmin
    .from('produce_listings')
    .update({ quantity_kg: Number(listing.quantity_kg) + Number(order.quantity_kg), status: 'active' })
    .eq('id', order.listing_id)
}

/** Cancel pending_payment holds older than maxAgeMinutes on a listing (or all
    listings when none given) and restore their stock. Called lazily from
    initialize so abandoned checkouts release inventory. */
export async function expireStaleHolds(listingId?: string, maxAgeMinutes = 30): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString()
  let query = supabaseAdmin
    .from('orders')
    .select('*')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
  if (listingId) query = query.eq('listing_id', listingId)

  const { data: stale } = await query
  for (const order of stale ?? []) {
    await releaseReservation(order as Order)
    await supabaseAdmin
      .from('payments')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('order_id', order.id)
      .eq('status', 'initialized')
  }
}

/** Everything that happens once an order is live: transport request, SMS
    fallback log, farmer notification, realtime broadcasts. Shared by the
    direct (payment-skipped) path and the payment-success path. */
export async function fulfillOrder(order: Order, listing: Listing, transporterId?: string): Promise<Order> {
  let finalOrder = order

  // Auto-create transport request (pre-assign transporter if buyer selected one)
  const transportStatus = transporterId ? 'accepted' : 'open'
  const { error: transportErr } = await supabaseAdmin
    .from('transport_requests')
    .insert({
      order_id: order.id,
      pickup_location: listing.location,
      delivery_location: listing.location,
      crop_type: listing.crop_type,
      quantity_kg: order.quantity_kg,
      status: transportStatus,
      ...(transporterId ? { transporter_id: transporterId } : {}),
    })

  if (transportErr) {
    console.error('Transport request creation failed:', transportErr.message)
  } else if (transporterId) {
    // Transporter pre-assigned → order moves straight to confirmed
    const { data: updated } = await supabaseAdmin
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order.id)
      .select()
      .single()
    if (updated) finalOrder = updated
  }

  // ── SMS fallback (console log + DB record) ────────────────────────────────
  const { data: farmer } = await supabaseAdmin
    .from('users')
    .select('full_name, phone')
    .eq('id', listing.farmer_id)
    .single()

  console.log(`[SMS] → ${farmer?.phone ?? 'no phone'} (${farmer?.full_name}): New order — ${order.quantity_kg}kg of ${listing.crop_type} at GH₵${listing.price_per_kg}/kg. Total: GH₵${(order.quantity_kg * listing.price_per_kg).toFixed(2)}`)

  // ── Persist notification ──────────────────────────────────────────────────
  await supabaseAdmin.from('notifications').insert({
    user_id: listing.farmer_id,
    type:    'new_order',
    message: `New order: ${order.quantity_kg}kg of ${listing.crop_type} at GH₵${listing.price_per_kg}/kg`,
  })

  // ── Realtime broadcasts ───────────────────────────────────────────────────
  broadcast(`orders:farmer-${listing.farmer_id}`, 'new_order', {
    order_id:   order.id,
    crop_type:  listing.crop_type,
    quantity_kg: order.quantity_kg,
    price_per_kg: listing.price_per_kg,
    location:   listing.location,
  })
  broadcast('transport:all', 'new_request', {
    crop_type:  listing.crop_type,
    quantity_kg: order.quantity_kg,
    pickup:     listing.location,
  })
  broadcast(`orders:consumer-${order.consumer_id}`, 'order_placed', {
    order_id:  order.id,
    status:    finalOrder.status,
    crop_type: listing.crop_type,
  })

  return finalOrder
}
