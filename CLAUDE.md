# AgroNexus — CLAUDE.md

**Full-stack agricultural marketplace platform**
**Timeline: ~12 days | Team: 5 members | Stack: React + Flutter + Node.js + Flask + Supabase**

---

## Project Structure

```
agronexus/
├── web/          # React.js + Vite + Tailwind CSS (port 3000)
├── mobile/       # Flutter app
├── backend/      # Node.js + Express.js (port 3001)
├── ml/           # Python Flask ML service (port 5000)
└── docker-compose.yml
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | React + Vite + Tailwind CSS + react-router-dom + axios |
| Mobile | Flutter + Dio + Hive + flutter_secure_storage + Provider |
| Backend | Node.js + Express + @supabase/supabase-js + jsonwebtoken |
| ML Service | Python + Flask + TensorFlow + scikit-learn + pandas |
| Database | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Deployment | Render (backend + ML) + Vercel (web) |

---

## Database Schema

Base schema: `supabase_setup.sql`. Then run `migration_v2_roles_and_market.sql` (idempotent) in the Supabase SQL Editor — it adds buyer roles, auto-location, allocations, the anonymized marketplace view, and demand-signal capture.

**Roles:** `farmer`, `wholesaler`, `retailer`, `direct_consumer`, `transporter`, `admin`. (`consumer` is legacy — pre-v2 JWTs still validate, but no new users get it.)

**Tables:** `users`, `produce_listings`, `orders`, `transport_requests`, `price_records`, `listing_allocations`, `notifications`

- `users`: id, email, role, full_name, region, phone, location_lat, location_lng, region_source (gps/ip/manual/unknown) — region is auto-derived from coordinates by a DB trigger (nearest centroid of Tarkwa/Bogoso/Prestea), never typed by the user
- `produce_listings`: id, farmer_id, crop_type, quantity_kg, price_per_kg, location, available_from, status (active/sold/expired)
- `orders`: id, listing_id, consumer_id, quantity_kg, status (pending/confirmed/in_transit/delivered/cancelled), buyer_role, region, unit_price — the last three are stamped by a trigger on insert (demand signal for ML retraining)
- `transport_requests`: id, order_id, transporter_id, pickup_location, delivery_location, crop_type, quantity_kg, status (open/accepted/in_transit/delivered)
- `price_records`: id, crop_type, region, price_per_kg, recorded_date, source
- `listing_allocations`: id, listing_id, region, allocated_kg — farmer splits a listing across regions; a trigger rejects totals exceeding the listing quantity

**Views:** `marketplace_listings` (active listings without farmer identity — buyers must never see farmer_id/name/phone), `demand_weekly` + `supply_weekly` (week × crop × region aggregates feeding ML retraining).

Row Level Security enabled on all tables.

---

## Design System

**Colour tokens** (add to `tailwind.config.js`):

```js
colors: {
  brand: {
    dark:    '#0D2B1F',  // sidebar bg
    DEFAULT: '#1A5C38',  // primary buttons, active nav
    mid:     '#2E7D52',  // hover states
    light:   '#D6EFE1',
    pale:    '#F0FAF4',
  },
  accent: { gold: '#C9A84C' },
  sidebar: { bg: '#0D2B1F', icon: '#4A7C5E', active: '#FFFFFF', hover: '#1A3D2B', text: '#A3C4B0' },
}
```

**Layout:** dark sidebar (#0D2B1F) + light content area (#F9FAFB) + white cards (rounded-2xl shadow-card)

**Buttons:** rounded-full — primary `bg #1A5C38`, secondary `bg #F59E0B`, outline `border border-gray-200`

**Status badges:** rounded-full pills — green `#D1FAE5/#065F46`, amber `#FEF3C7/#92400E`, red `#FEE2E2/#991B1B`

**Charts:** recharts — gold line `#C9A84C` + green dashed `#1A5C38`, no dots, clean grid

**UI Prefix (paste at top of every frontend prompt):**
```
Apply the AgroNexus design system: Sidebar bg #0D2B1F, active nav #1A5C38, icons #4A7C5E.
Cards: white rounded-2xl shadow-card p-6 on #F9FAFB background.
Primary #1A5C38, accent gold #C9A84C. Buttons rounded-full.
Status badges rounded-full: green=#D1FAE5/#065F46, amber=#FEF3C7/#92400E, red=#FEE2E2/#991B1B.
Charts: recharts, gold line + green dashed, no dots.
```

---

## Environment Variables

**backend/.env:**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
FLASK_SERVICE_URL=http://localhost:5000
PORT=3001
```

**web/.env:**
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## API Routes

### Auth
- `POST /api/v1/auth/register` — { email, password, full_name, role, phone, location_lat?, location_lng? } — no region field; it's derived from coordinates server-side
- `POST /api/v1/auth/login` — { email, password } → { token, user }

### Users
- `PUT /api/v1/users/location` — { lat, lng } — updates coordinates; DB trigger re-derives region

### Listings
- `POST /api/v1/listings` — farmer only
- `GET /api/v1/listings` — all authenticated, supports `?crop_type=&region=&min_price=&max_price=&available_from=`; returns anonymized columns only (no farmer identity)
- `GET /api/v1/listings/mine` — farmer's own listings
- `GET /api/v1/listings/orders` — farmer: orders placed on their listings
- `GET /api/v1/listings/:id/allocations` — regional allocations for a listing
- `PUT /api/v1/listings/:id/allocations` — farmer owner only; replaces allocation set, sum must not exceed quantity_kg
- `PUT /api/v1/listings/:id` — farmer owner only
- `DELETE /api/v1/listings/:id` — soft-delete (status → expired)

### Orders
- `POST /api/v1/orders` — buyer roles (wholesaler/retailer/direct_consumer) only; auto-creates transport_request
- `GET /api/v1/orders/mine` — buyer's orders
- `GET /api/v1/orders/:id` — single order

### Notifications
- `GET /api/v1/notifications` — current user's notifications
- `POST /api/v1/notifications/mark-read` — { ids: string[] }

### Admin (all under `requireRole('admin')`)
- `GET /api/v1/admin/stats` · `GET /api/v1/admin/users` · `PATCH /api/v1/admin/users/:id/role` · `DELETE /api/v1/admin/users/:id`
- `GET /api/v1/admin/listings` · `PATCH /api/v1/admin/listings/:id/status` · `GET /api/v1/admin/orders` · `GET /api/v1/admin/locations`

### Prices
- `GET /api/v1/prices/moa` · `GET /api/v1/prices/moa/:crop` — Ministry of Agriculture reference prices

### Transport
- `GET /api/v1/transport` — transporter only, filtered by region
- `PUT /api/v1/transport/:id/accept` — transporter accepts
- `PUT /api/v1/transport/:id/status` — { status: 'in_transit' | 'delivered' }

### Dashboard
- `GET /api/v1/dashboard/prices`
- `GET /api/v1/dashboard/supply`
- `GET /api/v1/dashboard/activity`
- `GET /api/v1/forecasts?crop_type=&region=`

### Forecasts (backend proxy with 6h cache)
- `POST /api/v1/forecasts/predict` — { crop_type, region, demand_history?, price_history? }
- `GET /api/v1/forecasts/summary` — all crops × regions
- `GET /api/v1/forecasts/health` — ML service status + MAPE

### ML Service (Flask, port 5000)
- `POST /predict` — { crop_type, region, demand_history?, price_history? } → 7-day daily forecast
- `GET /health` — model status, MAPE, RMSE
- `GET /crops` — supported crops + regions

---

## Phase Tracker

| # | Phase | Owner | Days | Status |
|---|---|---|---|---|
| 0 | Scaffold + Supabase Setup | Bissue + Evans | Day 1 | ✅ Done (run supabase_setup.sql manually) |
| 1 | Authentication (Backend + Web) | Amprofi | Day 1–2 | ✅ Done |
| 2 | Farmer Module (Backend + Web) | Yirenkyi | Day 2–3 | ✅ Done |
| 3 | Consumer Module (Backend + Web) | Arthur | Day 3–4 | ✅ Done |
| 4 | Transporter Module (Backend + Web) | Evans | Day 4 | ✅ Done |
| 5 | Market Dashboard | Bissue | Day 5 | ✅ Done |
| 6 | ML Forecasting Service | Amprofi + Amissah | Day 5–6 | ✅ Done |
| 7 | Flutter Mobile App | Yirenkyi + Arthur | Day 6–9 | ✅ Done |
| 8 | Realtime + Notifications | Bissue + Evans | Day 9–10 | ✅ Done |
| 9 | Integration Testing + Polish | All | Day 10–11 | ✅ Done |
| 10 | Deployment | Amissah + Bissue | Day 12 | ⬜ Not started |

Update status: ⬜ Not started → 🔄 In progress → ✅ Done

---

## Phase Done-When Criteria

**Phase 0:**
- `cd backend && npm run dev` starts without errors
- `GET localhost:3001/api/v1/health` → `{ status: "ok" }`
- All 5 tables exist in Supabase dashboard
- Web app loads at `localhost:3000`

**Phase 1:**
- Register farmer, consumer, transporter via Postman ✓
- Login returns valid JWT ✓
- Protected route without token → 401 ✓
- Web login redirects correctly by role ✓

**Phase 2:**
- Farmer adds listing via web UI → appears in Supabase ✓
- Listings table shows with status badges ✓
- Edit/delete work without page refresh ✓

**Phase 3:**
- Consumer can browse and filter listings ✓
- Placing an order creates both `orders` + `transport_requests` row ✓
- Order history shows correct status badges ✓

**Phase 4:**
- Transporter sees open requests after consumer places order ✓
- Accepting updates order status to 'confirmed' ✓
- Marking delivered updates both transport + order tables ✓

**Phase 5:**
- Dashboard loads charts for all 6 crop types ✓
- Price/supply data from backend (not hardcoded) ✓
- All three roles can access dashboard from nav ✓

**Phase 6:**
- Model MAPE ≤ 25% on test set ✓
- `POST localhost:5000/predict` returns 7-day forecast array ✓
- Farmer + market dashboards show real forecast data ✓

**Phase 7:**
- Flutter app builds and runs on Android emulator ✓
- Farmer can log in, create listing, see it on web dashboard in real time ✓
- Transporter accepts delivery on mobile, status updates on web ✓
- Offline mode shows cached data with banner ✓

**Phase 8:**
- Consumer order immediately appears in farmer dashboard without refresh ✓
- Transporter feed updates live on new order ✓
- Console shows SMS fallback log entries ✓

**Phase 9:**
- Full happy path completes without errors ✓
- No console errors on web or mobile ✓
- All screens match reference screenshots ✓
- Role guards tested and working ✓

**Phase 10:**
- Backend health check 200 at Render URL ✓
- Flask /health 200 at Render URL ✓
- Web app loads at Vercel URL, login works ✓
- Full order flow tested on production URLs ✓

---

## Reference Screenshots

Store in `screenshots/`:
```
screenshots/
├── web-login.png
├── web-farmer-dashboard.png
├── web-consumer-browse.png
├── web-transporter-feed.png
├── web-market-dashboard.png
├── mobile-login.png
├── mobile-farmer-dashboard.png
├── mobile-farmer-listings.png
├── mobile-transporter-feed.png
└── mobile-transporter-delivery.png
```

Attach to prompts:
- Claude Code terminal: `claude "prompt" --image ./screenshots/screen.png`
- Cursor: drag screenshot into chat alongside the prompt

---

## Crops & Regions

**Tracked crops:** maize, tomatoes, plantain, cassava, pepper, rice

**Regions (Western Region, Ghana):** Tarkwa, Bogoso, Prestea — assigned automatically from GPS/IP coordinates via the `derive_region` DB function; never ask the user to pick a region

**Seasonal flags:** Christmas, Easter, Homowo (binary features for ML model)

---

## ML Model Details

- Architecture: LSTM (64 units → Dropout 0.2 → LSTM 32 → Dense 1)
- Input: 30 timesteps × 12 features → output: 7-day demand forecast
- Baseline: GradientBoostingRegressor (compare MAPE)
- Target MAPE: ≤ 20% (≤ 25% acceptable for prototype)
- Artifacts: `model.h5`, `scaler_X.pkl`, `scaler_y.pkl`
- Fallback: gradient boosting model if `model.h5` missing

---

## Realtime (Supabase)

- Farmer dashboard: subscribe `orders` INSERT filtered by `farmer_id`
- Transporter feed: subscribe `transport_requests` INSERT
- Consumer orders: subscribe `orders` UPDATE for status changes
- SMS fallback: log to console + insert into `notifications` table

---

## Deployment Targets

| Service | Platform | Notes |
|---|---|---|
| Backend | Render (Node.js web service) | Health check: `/api/v1/health` |
| ML Service | Render (Docker) | python:3.10-slim base image |
| Web Frontend | Vercel | Set `VITE_API_URL` to Render backend URL |

After deploying, update backend CORS to allow Vercel domain.

---

## Daily Standup Checklist

1. Which phase am I on?
2. What is the "done when" check for my phase?
3. Is anything blocked that another member needs to unblock?

Merge to `main` only when your phase's "done when" criteria are fully met.
