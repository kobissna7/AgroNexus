import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'
import { broadcast } from '../services/realtime'

export async function getOpenRequests(req: Request, res: Response): Promise<void> {
  // Fetch transporter's region for "near you" tagging (not used to filter)
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('region')
    .eq('id', req.user!.id)
    .single()

  const { data, error } = await supabaseAdmin
    .from('transport_requests')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }

  // Tag requests near the transporter's region
  const region = profile?.region?.toLowerCase() ?? ''
  const tagged = (data ?? []).map((r) => ({
    ...r,
    near_you: region ? r.pickup_location?.toLowerCase().includes(region) : false,
  }))

  res.json(tagged)
}

export async function acceptRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  const { data: request } = await supabaseAdmin
    .from('transport_requests')
    .select('id, status, order_id')
    .eq('id', id)
    .single()

  if (!request) { res.status(404).json({ error: 'Transport request not found' }); return }
  if (request.status !== 'open') { res.status(400).json({ error: 'Request is no longer open' }); return }

  // Accept the transport request
  const { data, error } = await supabaseAdmin
    .from('transport_requests')
    .update({ transporter_id: req.user!.id, status: 'accepted' })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }

  // Update linked order to confirmed
  const { data: updatedOrder } = await supabaseAdmin
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', request.order_id)
    .select('consumer_id, produce_listings(crop_type)')
    .single()

  // Notify consumer that a transporter has picked up their delivery — the
  // in_transit/delivered transitions already notify (see updateStatus);
  // acceptance was previously silent, leaving the buyer's tracking view
  // stuck on "awaiting transporter" until the next status change.
  if (updatedOrder) {
    const consumerId = updatedOrder.consumer_id as string
    const listingData = updatedOrder.produce_listings as { crop_type: string }[] | { crop_type: string } | null
    const cropType    = (Array.isArray(listingData) ? listingData[0]?.crop_type : listingData?.crop_type) ?? 'produce'

    const { data: transporter } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', req.user!.id)
      .single()
    const transporterName = transporter?.full_name ?? 'A transporter'

    console.log(`[SMS] → consumer ${consumerId}: ${transporterName} is now handling your ${cropType} order.`)

    await supabaseAdmin.from('notifications').insert({
      user_id: consumerId,
      type:    'order_status',
      message: `${transporterName} is now handling your ${cropType} order.`,
    })

    broadcast(`orders:consumer-${consumerId}`, 'status_update', {
      order_id: request.order_id,
      status:   'confirmed',
      crop_type: cropType,
      transporter_name: transporterName,
    })
  }

  res.json(data)
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { status } = req.body as { status: 'in_transit' | 'delivered' }

  if (!['in_transit', 'delivered'].includes(status)) {
    res.status(400).json({ error: 'status must be in_transit or delivered' })
    return
  }

  const { data: request } = await supabaseAdmin
    .from('transport_requests')
    .select('id, transporter_id, order_id, status')
    .eq('id', id)
    .single()

  if (!request) { res.status(404).json({ error: 'Transport request not found' }); return }
  if (request.transporter_id !== req.user!.id) { res.status(403).json({ error: 'Not your delivery' }); return }

  const { data, error } = await supabaseAdmin
    .from('transport_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ error: error.message }); return }

  // Sync order status
  const orderStatus = status === 'delivered' ? 'delivered' : 'in_transit'
  const { data: updatedOrder } = await supabaseAdmin
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', request.order_id)
    .select('consumer_id, produce_listings(crop_type)')
    .single()

  // Notify consumer of status change
  if (updatedOrder) {
    const consumerId = updatedOrder.consumer_id as string
    const listingData = updatedOrder.produce_listings as { crop_type: string }[] | { crop_type: string } | null
    const cropType    = (Array.isArray(listingData) ? listingData[0]?.crop_type : listingData?.crop_type) ?? 'produce'

    console.log(`[SMS] → consumer ${consumerId}: Your ${cropType} order is now ${orderStatus}.`)

    await supabaseAdmin.from('notifications').insert({
      user_id: consumerId,
      type:    'order_status',
      message: `Your ${cropType} order is now ${orderStatus}.`,
    })

    broadcast(`orders:consumer-${consumerId}`, 'status_update', {
      order_id: request.order_id,
      status:   orderStatus,
      crop_type: cropType,
    })
  }

  res.json(data)
}

export async function getAvailableTransporters(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, region, phone')
    .eq('role', 'transporter')
    .order('full_name')

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data ?? [])
}

export async function getMyDeliveries(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('transport_requests')
    .select('*, orders(status, quantity_kg, consumer_id)')
    .eq('transporter_id', req.user!.id)
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}
