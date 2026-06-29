import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'

export async function getPrices(_req: Request, res: Response): Promise<void> {
  // Latest price per crop per region
  const { data, error } = await supabaseAdmin
    .from('price_records')
    .select('crop_type, region, price_per_kg, recorded_date')
    .order('recorded_date', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }

  // Group by crop_type: latest record per crop+region, plus 7-day history
  const grouped: Record<string, typeof data> = {}
  for (const row of data ?? []) {
    if (!grouped[row.crop_type]) grouped[row.crop_type] = []
    grouped[row.crop_type].push(row)
  }

  const result = Object.entries(grouped).map(([crop_type, rows]) => ({
    crop_type,
    current_price: rows[0].price_per_kg,
    region: rows[0].region,
    history: rows.slice(0, 7).reverse(),
  }))

  res.json(result)
}

export async function getSupply(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('produce_listings')
    .select('crop_type, quantity_kg')
    .eq('status', 'active')

  if (error) { res.status(500).json({ error: error.message }); return }

  const supply: Record<string, number> = {}
  for (const row of data ?? []) {
    supply[row.crop_type] = (supply[row.crop_type] ?? 0) + Number(row.quantity_kg)
  }

  res.json(Object.entries(supply).map(([crop_type, total_kg]) => ({ crop_type, total_kg })))
}

export async function getActivity(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, quantity_kg, created_at, produce_listings(crop_type, location)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}
