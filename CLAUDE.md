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

Base schema: `supabase_setup.sql`. Then run `migration_v2_roles_and_market.sql`, `migration_v3_payments_and_events.sql`, then `migration_v4_rls_hardening.sql` (all idempotent) in the Supabase SQL Editor. v2 adds buyer roles, auto-location, allocations, the anonymized marketplace view, and demand-signal capture. v3 adds `payments`, `site_events`, the `interest_weekly` view, the `pending_payment` order status, and excludes unpaid orders from `demand_weekly`. v4 adds the missing RLS policies on `users`/`orders`/`transport_requests` — dormant today since the backend always queries via `service_role` and the web app's Supabase client only does Realtime Broadcast, but they'll matter the moment any client authenticates to Supabase directly.

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

## Design System (v2 — strict 3-color)

**Only three colors exist:** `#0b2e14` (brand green), `#000000`, `#ffffff` — every other value is a tint/alpha/`color-mix` of these. **Never introduce any other hue** (no gold, no red, no blue).

**Typography:** `'Paralucent', 'Mulish', ui-sans-serif, sans-serif`. Mulish (variable) is vendored in `web/public/fonts/`; drop licensed `Paralucent-Variable.woff2` into that folder to activate Paralucent with zero code changes.

**Theming:** light is the default regardless of device preference; dark is opt-in only, via a manual toggle persisted as `agronexus_theme` in localStorage (`data-theme` on `<html>`, applied pre-paint in `index.html` before OS `prefers-color-scheme` gets a chance to paint the page dark first). **Dark mode is green-dominant, not black:** `--canvas` is brand green; black appears only in mixes/shadows/overlays. All colors are semantic CSS vars defined in `web/src/index.css`:

- Surfaces: `--canvas`, `--canvas-soft`, `--surface`, `--surface-2`
- Ink: `--ink`, `--ink-strong`, `--ink-muted`, `--ink-faint`
- Brand: `--brand` (green in light, white in dark), `--on-brand`, `--brand-soft`, `--brand-ink`
- Structure: `--edge`, `--edge-strong`, `--ring`, `--overlay`, `--invert-bg`/`--invert-ink` (attention/errors)
- Charts: `--chart-1..3` (single-green lightness ramp), `--chart-grid`, `--chart-cursor`
- Bands: `--band` + `.section-brand`

**Page rhythm (public pages):** sections alternate white (green + black content) → green band (white + black content) → repeat. Wrap any `<section>` in `.section-brand` and every primitive inside adapts automatically (white ink on green; `.card`/`.input-field` float white with black ink + green accents restored). In dark mode the band renders a deeper green so it still alternates against the green canvas. Reference: `web/src/pages/Home.tsx`.

**Logo:** the mark is a white sprout on a green rounded tile — source of truth `web/public/favicon.svg` (= `logo.svg`); PNG/ICO fallbacks and the mobile copies (`mobile/assets/images/`) are rasterized from it.

**Mobile parity:** `mobile/lib/config/theme.dart` mirrors this system — `AppColors` getters resolve light/dark from device brightness (`themeMode: ThemeMode.system`; dark = green-dominant like the web), Mulish 400–800 is bundled in `mobile/assets/fonts/`, and the home screen uses the same alternating band rhythm. `AppColors.green`/`brandDark` are the only const-safe members; everything else is a getter, so don't use them inside `const` expressions. Cards on green bands stay white with FIXED black-alpha inks (never dynamic tokens). Never reintroduce gold/red/blue/gray hues in Flutter screens.

**Rules for new UI:** use the CSS vars (or the Tailwind tokens mapped in `@theme`) — **never hardcode hex colors in components**. Reuse primitives in `web/src/components/ui/` (Button, Card, Input, Select, Badge, PageHeader, Modal, EmptyState) and utility classes (`.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-lg`, `.card`, `.badge-*`, `.input-field`, `.table-pro`, `.page-title`, `.container-page`). Status is expressed structurally (solid pill = done, soft = in progress, outlined = waiting, strikethrough = dead, inverted black/white = errors) — never by extra hues. Charts must ship a legend + dash/direct-label secondary encoding (single-hue ramp carries limited identity). Aesthetic reference: Karma landing (big bold display type, pill buttons, generous space) + shopify.com polish; sidebar and auth brand panels stay permanently dark (green-over-black).

---

## Environment Variables

**backend/.env:**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
FLASK_SERVICE_URL=http://localhost:5000
PORT=3001
PAYSTACK_SECRET_KEY=        # fallback gateway
RUSHPAY_API_KEY=            # primary gateway (rushpay.cash) — wins over Paystack when set
RUSHPAY_WEBHOOK_SECRET=     # for webhook signature verification (pending RushPay onboarding)
BACKEND_PUBLIC_URL=http://localhost:3001   # this API's public URL — RushPay callback/webhook target
WEB_URL=http://localhost:3000
```
Both payment keys blank → checkout runs in payment-skipped test mode.
Manual go-live steps (Supabase migration, RushPay onboarding, webhook URL, deploys): see `SETUP.md`.

**One-command dev:** from the repo root, `npm run dev` starts backend + web together (`npm run dev:all` adds the Flask ML service).

**web/.env:**
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## API Routes

### Marketplace (public — no auth; guests browse before signing up)
- `GET /api/v1/marketplace` — anonymized active listings, same filters as /listings
- `GET /api/v1/marketplace/:id` — single anonymized listing (used by checkout)

### Payments (GHS; provider = RushPay if RUSHPAY_API_KEY set, else Paystack, else visible "test mode")
- `GET /api/v1/payments/config` — public; { enabled, currency, provider }
- `POST /api/v1/payments/initialize` — buyer roles; { listing_id, quantity_kg, transporter_id? } → order `pending_payment` + stock reserved. RushPay: returns `{ provider:'rushpay', reference, widget:{ script_url, api_base, session } }` and the browser renders the embedded RushPayV2 widget. Paystack: returns `authorization_url` redirect. (Or `payment_required:false` fallback.) Stale holds >30 min auto-release stock.
- `GET /api/v1/payments/verify/:reference` — idempotent; routes by the provider stamped on the payment row; success → order `pending` + fulfillment; failure → order cancelled + stock restored
- `POST /api/v1/payments/webhook` — Paystack, raw-body HMAC-SHA512 verified (mounted before express.json)
- `POST /api/v1/payments/webhook/rushpay` — raw body; treated as a wake-up signal only — always reconciled via server-side `GET merchant/payments/status` before settling (signature verification lands once RushPay issues the webhook secret)
- RushPay service: `backend/src/services/rushpay.ts` (core.rushpay.cash, `X-API-Key` header, amounts in GHS major units as strings; status-string mapping in `classifyStatus` is permissive pending live-key testing)

### Events (behavior tracking → ML)
- `POST /api/v1/events` — optional auth (never 401s); { session_id, events:[{event_type, listing_id?, crop_type?, region?, metadata?}] } batches ≤50; types: page_view, listing_view, listing_click, search, filter, checkout_start, payment_success, payment_failed, order_placed. Web tracker: `web/src/lib/analytics.ts` (10 s flush + sendBeacon on tab hide).

### Auth
- `POST /api/v1/auth/register` — { email, password, full_name, role, phone, location_lat?, location_lng? } — no region field; it's derived from coordinates server-side. Honors `?next=` redirect intent after signup.
- `POST /api/v1/auth/login` — { email, password } → { token, user }. Honors `?next=` (guest Buy → login → resumes at /checkout/:listingId).

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
- Retraining on real orders: `cd backend && npm run export:demand` writes the `demand_weekly` view to `ml/data/platform_demand.csv` (gitignored); `train.py` blends it automatically when present, platform rows winning on overlap
- Retraining on behavior: `npm run export:interest` writes `interest_weekly` to `ml/data/platform_interest.csv`; `train.py` left-merges `listing_views`/`searches`/`checkouts` as features (zeros when absent). Retrained models and `ml/app.py` must deploy together (feature vector length); serving pads missing interest features with 0.

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
