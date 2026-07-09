import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '../services/supabase'

// Exports the demand_weekly view (platform orders aggregated week × crop ×
// region) to ml/data/platform_demand.csv in the same shape as
// demand_volume.csv, so train.py can blend real marketplace demand into
// retraining. Run: npm run export:demand [-- /custom/output.csv]

const OUT_PATH = process.argv[2]
  ?? path.resolve(__dirname, '../../../ml/data/platform_demand.csv')

// Festival windows must stay in sync with _FESTIVALS in ml/app.py
const FESTIVALS: [month: number, from: number, to: number][] = [
  [12, 20, 31], // Christmas
  [4, 1, 14],   // Easter
  [8, 1, 31],   // Homowo
]

function festivalFlag(date: Date): number {
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  return FESTIVALS.some(([fm, d0, d1]) => m === fm && d >= d0 && d <= d1) ? 1 : 0
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

interface DemandWeekRow {
  week_start: string
  crop_type: string
  region: string
  demand_kg: number
  avg_price_per_kg: number | null
  order_count: number
}

async function main() {
  const { data, error } = await supabaseAdmin
    .from('demand_weekly')
    .select('week_start, crop_type, region, demand_kg, avg_price_per_kg, order_count')
    .order('week_start')

  if (error) { console.error('Export failed:', error.message); process.exit(1) }
  if (!data || data.length === 0) {
    console.log('No platform demand yet — nothing exported.')
    return
  }

  const header = 'date,crop_type,region,demand_kg,price_per_kg,festival_flag,month,week_of_year'
  const lines = (data as DemandWeekRow[]).map((row) => {
    const date = new Date(`${row.week_start}T00:00:00Z`)
    const price = row.avg_price_per_kg == null ? '' : Number(row.avg_price_per_kg).toFixed(2)
    return [
      row.week_start,
      row.crop_type,
      row.region,
      Number(row.demand_kg).toFixed(1),
      price,
      festivalFlag(date),
      date.getUTCMonth() + 1,
      isoWeek(date),
    ].join(',')
  })

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, [header, ...lines].join('\n') + '\n')
  console.log(`✓ Exported ${lines.length} weekly demand rows → ${OUT_PATH}`)
}

main()
