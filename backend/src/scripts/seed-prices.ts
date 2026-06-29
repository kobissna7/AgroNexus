import 'dotenv/config'
import { supabaseAdmin } from '../services/supabase'

const CROPS = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
const REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']

// Base prices per crop (GH₵/kg) — approximate WFP Ghana data
const BASE: Record<string, number> = {
  maize: 2.80, tomatoes: 5.50, plantain: 3.20,
  cassava: 1.90, pepper: 12.00, rice: 4.50,
}

function seedRows() {
  const rows: { crop_type: string; region: string; price_per_kg: number; recorded_date: string; source: string }[] = []
  const today = new Date('2026-06-25')

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)

    // One record per crop per day, rotating region
    for (const crop of CROPS) {
      const region = REGIONS[Math.floor(Math.random() * REGIONS.length)]
      const base = BASE[crop]
      // Add ±15% daily variance with slight upward drift
      const variance = base * 0.15 * (Math.random() * 2 - 1)
      const drift = (base * 0.005) * (29 - i)
      const price = Math.round((base + variance + drift) * 100) / 100

      rows.push({ crop_type: crop, region, price_per_kg: Math.max(price, 0.5), recorded_date: dateStr, source: 'WFP-Ghana' })
    }
  }
  return rows
}

async function main() {
  console.log('Seeding price_records…')
  const rows = seedRows()
  const { error } = await supabaseAdmin.from('price_records').insert(rows)
  if (error) { console.error('Seed failed:', error.message); process.exit(1) }
  console.log(`✓ Inserted ${rows.length} price records`)
}

main()
