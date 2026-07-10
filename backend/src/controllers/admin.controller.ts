import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'

// ── GET /api/v1/admin/stats ────────────────────────────────────────────────
export async function getStats(req: Request, res: Response): Promise<void> {
  const [users, listings, orders, transport] = await Promise.all([
    supabaseAdmin.from('users').select('role', { count: 'exact', head: false }),
    supabaseAdmin.from('produce_listings').select('status', { count: 'exact', head: false }),
    supabaseAdmin.from('orders').select('status, quantity_kg, produce_listings(price_per_kg)', { count: 'exact', head: false }),
    supabaseAdmin.from('transport_requests').select('status', { count: 'exact', head: false }),
  ])

  const userRows     = users.data ?? []
  const listingRows  = listings.data ?? []
  const orderRows    = orders.data  ?? []
  const transportRows = transport.data ?? []

  type OrderRow = { status: string; quantity_kg: number; produce_listings: { price_per_kg: number } | { price_per_kg: number }[] | null }

  const getPrice = (pl: OrderRow['produce_listings']): number => {
    if (!pl) return 0
    return Array.isArray(pl) ? (pl[0]?.price_per_kg ?? 0) : pl.price_per_kg
  }

  const revenue = (orderRows as unknown as OrderRow[])
    .filter((o) => ['confirmed', 'in_transit', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.quantity_kg * getPrice(o.produce_listings), 0)

  res.json({
    users: {
      total:        userRows.length,
      farmers:      userRows.filter((u) => u.role === 'farmer').length,
      consumers:    userRows.filter((u) => ['wholesaler', 'retailer', 'direct_consumer', 'consumer'].includes(u.role)).length,
      transporters: userRows.filter((u) => u.role === 'transporter').length,
      admins:       userRows.filter((u) => u.role === 'admin').length,
    },
    listings: {
      total:   listingRows.length,
      active:  listingRows.filter((l) => l.status === 'active').length,
      sold:    listingRows.filter((l) => l.status === 'sold').length,
      expired: listingRows.filter((l) => l.status === 'expired').length,
    },
    orders: {
      total:      orderRows.length,
      pending:    orderRows.filter((o) => o.status === 'pending').length,
      confirmed:  orderRows.filter((o) => o.status === 'confirmed').length,
      in_transit: orderRows.filter((o) => o.status === 'in_transit').length,
      delivered:  orderRows.filter((o) => o.status === 'delivered').length,
      cancelled:  orderRows.filter((o) => o.status === 'cancelled').length,
    },
    transport: {
      total:      transportRows.length,
      open:       transportRows.filter((t) => t.status === 'open').length,
      in_transit: transportRows.filter((t) => t.status === 'in_transit').length,
      delivered:  transportRows.filter((t) => t.status === 'delivered').length,
    },
    revenue_ghs: Math.round(revenue * 100) / 100,
  })
}

// ── GET /api/v1/admin/users ────────────────────────────────────────────────
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

// ── PATCH /api/v1/admin/users/:id/role ────────────────────────────────────
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const { id }   = req.params
  const { role } = req.body as { role: string }

  const allowed = ['farmer', 'wholesaler', 'retailer', 'direct_consumer', 'transporter', 'admin']
  if (!allowed.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${allowed.join(', ')}` })
    return
  }

  // Prevent admin from demoting themselves
  if (id === req.user!.id && role !== 'admin') {
    res.status(400).json({ error: 'You cannot change your own role' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) { res.status(500).json({ error: error.message }); return }
  if (!data) { res.status(404).json({ error: 'User not found' }); return }
  res.json(data)
}

// ── DELETE /api/v1/admin/users/:id ────────────────────────────────────────
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id)

  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own account' })
    return
  }

  // Delete from Supabase Auth first, then the profile row cascades
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (authErr) { res.status(500).json({ error: authErr.message }); return }

  // Profile row deleted via cascade (farmer_id ON DELETE CASCADE)
  const { error } = await supabaseAdmin.from('users').delete().eq('id', id)
  if (error) { res.status(500).json({ error: error.message }); return }

  res.json({ ok: true })
}

// ── GET /api/v1/admin/listings ────────────────────────────────────────────
export async function getAllListings(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('produce_listings')
    .select('*, users(full_name, email, region)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

// ── GET /api/v1/admin/orders ──────────────────────────────────────────────
export async function getAllOrders(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, produce_listings(crop_type, location, price_per_kg, users(full_name)), users!consumer_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

// ── GET /api/v1/admin/locations ───────────────────────────────────────────
export async function getLocationData(_req: Request, res: Response): Promise<void> {
  const [usersWithLocRes, allUsersRes, listingsRes, ordersRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, full_name, role, region, location_lat, location_lng')
      .not('location_lat', 'is', null),
    supabaseAdmin.from('users').select('id, role, region'),
    supabaseAdmin
      .from('produce_listings')
      .select('farmer_id, quantity_kg, location, status')
      .in('status', ['active', 'sold']),
    supabaseAdmin
      .from('orders')
      .select('consumer_id, quantity_kg, status, produce_listings(location)')
      .in('status', ['confirmed', 'in_transit', 'delivered']),
  ])

  const usersWithLoc = usersWithLocRes.data ?? []
  const allUsers     = allUsersRes.data ?? []
  const listings     = listingsRes.data ?? []
  const orders       = ordersRes.data   ?? []

  // Volume per user
  const listingVolByUser: Record<string, number> = {}
  for (const l of listings) listingVolByUser[l.farmer_id] = (listingVolByUser[l.farmer_id] ?? 0) + (l.quantity_kg ?? 0)

  const orderVolByUser: Record<string, number> = {}
  for (const o of orders) orderVolByUser[o.consumer_id] = (orderVolByUser[o.consumer_id] ?? 0) + (o.quantity_kg ?? 0)

  const usersWithVolume = usersWithLoc.map((u) => ({
    ...u,
    volume_kg: u.role === 'farmer' ? (listingVolByUser[u.id] ?? 0) : (orderVolByUser[u.id] ?? 0),
  }))

  // Regional aggregates
  type RegionStat = { farmers: number; consumers: number; transporters: number; volume_listed_kg: number; volume_ordered_kg: number }
  const regions: Record<string, RegionStat> = {}
  const ensureRegion = (r: string) => {
    if (!regions[r]) regions[r] = { farmers: 0, consumers: 0, transporters: 0, volume_listed_kg: 0, volume_ordered_kg: 0 }
  }

  for (const u of allUsers) {
    const r = u.region ?? 'Other'
    ensureRegion(r)
    if (u.role === 'farmer') regions[r].farmers++
    else if (['wholesaler', 'retailer', 'direct_consumer', 'consumer'].includes(u.role)) regions[r].consumers++
    else if (u.role === 'transporter') regions[r].transporters++
  }

  for (const l of listings) {
    const r = l.location ?? 'Other'
    ensureRegion(r)
    regions[r].volume_listed_kg += l.quantity_kg ?? 0
  }

  type OrderWithListing = typeof orders[number] & { produce_listings: { location: string } | null }
  for (const o of orders as unknown as OrderWithListing[]) {
    const r = o.produce_listings?.location ?? 'Other'
    ensureRegion(r)
    regions[r].volume_ordered_kg += o.quantity_kg ?? 0
  }

  res.json({ users: usersWithVolume, regions })
}

// ── PATCH /api/v1/admin/listings/:id/status ───────────────────────────────
export async function updateListingStatus(req: Request, res: Response): Promise<void> {
  const { id }     = req.params
  const { status } = req.body as { status: string }

  const allowed = ['active', 'sold', 'expired']
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('produce_listings')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) { res.status(500).json({ error: error.message }); return }
  if (!data) { res.status(404).json({ error: 'Listing not found' }); return }
  res.json(data)
}
