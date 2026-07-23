import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '../services/supabase'

// Exports the interest_weekly view (site behavior aggregated week × crop ×
// region: listing views, searches, checkouts, paid orders) to
// ml/data/platform_interest.csv. train.py left-merges these as extra features
// when the file is present. Run: npm run export:interest [-- /custom/output.csv]

const OUT_PATH = process.argv[2]
  ?? path.resolve(__dirname, '../../../ml/data/platform_interest.csv')

interface InterestWeekRow {
  week_start: string
  crop_type: string
  region: string | null
  listing_views: number
  searches: number
  checkouts: number
  paid_orders: number
}

async function main() {
  const { data, error } = await supabaseAdmin
    .from('interest_weekly')
    .select('week_start, crop_type, region, listing_views, searches, checkouts, paid_orders')
    .order('week_start')

  if (error) { console.error('Export failed:', error.message); process.exit(1) }
  if (!data || data.length === 0) {
    console.log('No interest signal yet — nothing exported.')
    return
  }

  const header = 'date,crop_type,region,listing_views,searches,checkouts,paid_orders'
  const lines = (data as InterestWeekRow[])
    .filter(row => row.region) // rows need a region to join the demand grid
    .map(row => [
      row.week_start,
      row.crop_type,
      row.region,
      row.listing_views,
      row.searches,
      row.checkouts,
      row.paid_orders,
    ].join(','))

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, [header, ...lines].join('\n') + '\n')
  console.log(`✓ Exported ${lines.length} weekly interest rows → ${OUT_PATH}`)
}

main()
