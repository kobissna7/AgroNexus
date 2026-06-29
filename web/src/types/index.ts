export type UserRole = 'farmer' | 'consumer' | 'retailer' | 'transporter' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  full_name: string
}

export interface ProduceListing {
  id: string
  farmer_id: string
  crop_type: string
  quantity_kg: number
  price_per_kg: number
  location: string
  available_from: string
  status: 'active' | 'sold' | 'expired'
  created_at: string
}

export interface Order {
  id: string
  listing_id: string
  consumer_id: string
  quantity_kg: number
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled'
  created_at: string
}

export interface TransportRequest {
  id: string
  order_id: string
  transporter_id: string | null
  pickup_location: string
  delivery_location: string
  crop_type: string
  quantity_kg: number
  status: 'open' | 'accepted' | 'in_transit' | 'delivered'
  created_at: string
}

export interface ForecastDay {
  day: number
  demand_kg: number
}
