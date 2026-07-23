import { supabaseAdmin } from './supabase'

export interface ListingFilters {
  crop_type?: string
  region?: string
  min_price?: string
  max_price?: string
  available_from?: string
}

// Anonymized listing query shared by the authed /listings route and the
// public /marketplace route. Buyers and guests see the product, quantity,
// price, and region only — never the farmer's identity (no users join here).
export function anonymizedListingsQuery(filters: ListingFilters) {
  let query = supabaseAdmin
    .from('produce_listings')
    .select('id, crop_type, quantity_kg, price_per_kg, location, available_from, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (filters.crop_type) query = query.ilike('crop_type', `%${filters.crop_type}%`)
  if (filters.region)    query = query.ilike('location', `%${filters.region}%`)
  if (filters.min_price) query = query.gte('price_per_kg', Number(filters.min_price))
  if (filters.max_price) query = query.lte('price_per_kg', Number(filters.max_price))
  if (filters.available_from) query = query.gte('available_from', filters.available_from)

  return query
}

export async function getAnonymizedListing(id: string) {
  return supabaseAdmin
    .from('produce_listings')
    .select('id, crop_type, quantity_kg, price_per_kg, location, available_from, status, created_at')
    .eq('id', id)
    .single()
}
