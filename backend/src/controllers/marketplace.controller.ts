import { Request, Response } from 'express'
import { anonymizedListingsQuery, getAnonymizedListing, ListingFilters } from '../services/listingsQuery'

// Public (unauthenticated) marketplace — guests browse produce and prices.
export async function browseMarketplace(req: Request, res: Response): Promise<void> {
  const { data, error } = await anonymizedListingsQuery(req.query as ListingFilters)
  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data)
}

export async function getMarketplaceListing(req: Request, res: Response): Promise<void> {
  const { data, error } = await getAnonymizedListing(req.params.id as string)
  if (error || !data) { res.status(404).json({ error: 'Listing not found' }); return }
  res.json(data)
}
