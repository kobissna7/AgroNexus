# AgroNexus — Claude Code Implementation Phases
**Timeline: ~12 days | Team: 5 members | Tools: Cursor + Claude Code**

---

## How to use this document

Each phase has:
- A **goal** — what must be working before the next phase starts
- **Who does it** — team member assignment
- **Claude Code prompt** — paste this directly into your terminal (`claude` command) or Cursor chat
- **Done when** — the exact check that confirms the phase is complete

For UI phases, attach your reference screenshot to the Claude Code prompt by running:
```bash
claude --image ./screenshots/screen-name.png "your prompt here"
```
Or in Cursor, drag the screenshot into the chat alongside your prompt.

---

## PHASE 0 — Project Scaffold & Supabase Setup
**Duration: Day 1 | Owner: Bissue (lead) + Evans**
**Goal: Repo structure created, database live, environment variables working**

### Claude Code Prompt
```
Scaffold a full-stack project called AgroNexus with this structure:

agronexus/
├── web/          # React.js + Vite + Tailwind CSS
├── mobile/       # Flutter app
├── backend/      # Node.js + Express.js
├── ml/           # Python Flask service
└── docker-compose.yml

For the backend:
- Initialize Node.js project with Express, cors, dotenv, jsonwebtoken, @supabase/supabase-js
- Create folder structure: routes/, middleware/, services/, controllers/
- Create a .env.example with: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, FLASK_SERVICE_URL, PORT
- Add a basic health check route GET /api/v1/health

For the web frontend:
- Initialize React + Vite project with Tailwind CSS
- Install react-router-dom, axios, @supabase/supabase-js
- Create folder structure: src/pages/, src/components/, src/hooks/, src/context/

For the ML service:
- Create requirements.txt with: flask, tensorflow, scikit-learn, pandas, numpy, python-dotenv, supabase
- Create app.py with a Flask app and a POST /predict placeholder route

Create a root docker-compose.yml that runs backend (port 3001), ml (port 5000), and web (port 3000).

Also generate the following SQL to run in Supabase:

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('farmer','consumer','transporter')) NOT NULL,
  full_name TEXT,
  region TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE produce_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  location TEXT NOT NULL,
  available_from DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES produce_listings(id) ON DELETE CASCADE,
  consumer_id UUID REFERENCES users(id),
  quantity_kg NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_transit','delivered','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE transport_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  transporter_id UUID REFERENCES users(id),
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  crop_type TEXT,
  quantity_kg NUMERIC,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','accepted','in_transit','delivered')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE price_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  region TEXT NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  recorded_date DATE NOT NULL,
  source TEXT DEFAULT 'platform'
);

Enable Row Level Security on all tables.
```

### Done when
- `cd backend && npm run dev` starts without errors
- `GET http://localhost:3001/api/v1/health` returns `{ status: "ok" }`
- All 5 tables exist in Supabase dashboard
- Web app loads at `localhost:3000` with a blank Tailwind page

---

## PHASE 1 — Authentication (Backend + Web)
**Duration: Day 1–2 | Owner: Amprofi**
**Goal: Register, login, and JWT middleware working for all three roles**

### Claude Code Prompt
```
In the AgroNexus backend (Node.js + Express + Supabase), implement full authentication:

1. POST /api/v1/auth/register
   - Accepts: { email, password, full_name, role, region, phone }
   - Creates user in Supabase Auth and inserts a row in the users table
   - Returns: { token, user: { id, email, role, full_name } }

2. POST /api/v1/auth/login
   - Accepts: { email, password }
   - Validates against Supabase Auth
   - Returns: { token, user: { id, email, role, full_name } }

3. Middleware: middleware/auth.js
   - Verifies JWT on every protected route
   - Attaches req.user = { id, role } to the request
   - Returns 401 if token missing or invalid

4. Middleware: middleware/role.js
   - Factory function: requireRole('farmer') 
   - Returns 403 if req.user.role does not match

In the React web app:
- Create AuthContext (src/context/AuthContext.jsx) that stores the token and user in localStorage
- Create useAuth hook
- Create Login page (src/pages/Login.jsx) and Register page (src/pages/Register.jsx)
- Add protected route wrapper that redirects to /login if no token
- After login, redirect based on role:
  - farmer → /farmer/dashboard
  - consumer → /consumer/browse
  - transporter → /transporter/feed
```

### Done when
- Can register a farmer, consumer, and transporter via Postman
- Login returns a valid JWT
- Hitting a protected route without a token returns 401
- Web login form redirects correctly by role

---

## PHASE 2 — Farmer Module (Backend + Web)
**Duration: Day 2–3 | Owner: Yirenkyi**
**Goal: Farmer can create, view, update, and delete produce listings**

### Claude Code Prompt
```
UI structure ref.jpeg
# AgroNexus — UI Reference Specification
**Extracted from reference screenshot (AgooSMS dashboard)**
**Apply this design system to ALL web dashboards and screens**

---

## Design Language Summary

The reference UI is a dark-sidebar, light-content enterprise dashboard with:
- Deep forest green as the primary brand colour
- Clean white content area with soft card shadows
- Minimal, icon-forward left navigation
- Data-dense but uncluttered layout
- Gold/amber as the accent colour for highlights and charts

---

## Colour Tokens
Define these in `src/styles/tokens.css` or as Tailwind config extensions:

```js
// tailwind.config.js
colors: {
  brand: {
    dark:    '#0D2B1F',   // sidebar background (deep forest green)
    DEFAULT: '#1A5C38',   // primary buttons, active nav
    mid:     '#2E7D52',   // hover states
    light:   '#D6EFE1',   // light green backgrounds, badges
    pale:    '#F0FAF4',   // page section backgrounds
  },
  accent: {
    gold:    '#C9A84C',   // chart line 1, trend arrows, highlights
    amber:   '#F59E0B',   // warning badges, secondary chart
    light:   '#FEF3C7',   // amber badge background
  },
  sidebar: {
    bg:      '#0D2B1F',   // left sidebar
    icon:    '#4A7C5E',   // inactive nav icons
    active:  '#FFFFFF',   // active nav item text
    hover:   '#1A3D2B',   // nav item hover
    text:    '#A3C4B0',   // secondary sidebar text
  },
  card: {
    bg:      '#FFFFFF',
    border:  '#F0F0F0',
    shadow:  '0 1px 3px rgba(0,0,0,0.08)',
  },
  status: {
    stable:  '#2E7D52',   // green badge
    warning: '#D97706',   // amber badge
    danger:  '#DC2626',   // red badge
  },
  text: {
    primary:   '#1A1A1A',
    secondary: '#6B7280',
    muted:     '#9CA3AF',
    inverse:   '#FFFFFF',
  },
}
```

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (w-16 icon-only strip + w-48 expanded panel)           │
│  bg: brand.dark                                                  │
├─────────────────────────────────────────────────────────────────┤
│  TOP BAR (h-16)                                                  │
│  breadcrumb left | search center | notifications + user right    │
├─────────────────────────────────────────────────────────────────┤
│  CONTENT AREA (flex-1, bg: #F9FAFB, p-6)                        │
│                                                                  │
│  ┌──────────────────────────────┐  ┌────────────────────────┐   │
│  │  HERO CARD (wide, brand.dark)│  │  STAT CARD (dark green)│   │
│  │  title + subtitle + buttons  │  │  big number + label    │   │
│  └──────────────────────────────┘  └────────────────────────┘   │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ METRIC CARD│  │ METRIC CARD│  │ METRIC CARD│                 │
│  │ icon+label │  │ icon+label │  │ icon+label │                 │
│  │ big number │  │ big number │  │ big number │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
│                                                                  │
│  ┌──────────────────────────────┐  ┌────────────────────────┐   │
│  │  CHART CARD                  │  │  ACTIVITY FEED         │   │
│  │  title + toggle buttons      │  │  scrollable list       │   │
│  │  recharts LineChart          │  │  icon + text + time    │   │
│  └──────────────────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Sidebar
```
Width: 64px (icon strip, always visible) + 192px (label panel, collapsible)
Background: #0D2B1F
Top: Logo area with brand icon (40px circle, brand green bg) + app name + tagline
Nav items: icon (20px) + label, py-3 px-4, rounded-lg on hover/active
Active state: bg #1A5C38, text white
Inactive icon colour: #4A7C5E
Collapse toggle: arrow icon at top right of expanded panel
Bottom: user avatar + "Sign out" link
```

### 2. Top Bar
```
Height: 64px, bg white, border-bottom: 1px solid #F0F0F0
Left: breadcrumb — muted text > active page name (font-medium)
Center: search input — rounded-full, bg #F3F4F6, placeholder text, search icon left
Right: bell icon (notification dot) + help icon + user avatar + name + role text
```

### 3. Hero Card (wide announcement/welcome card)
```
Background: white, rounded-2xl, p-8
Left side (60%):
  - Title: text-2xl font-bold text-gray-900
  - Subtitle: text-sm text-gray-500, mt-1
  - CTA buttons row: mt-6, gap-3
    Primary button: bg brand.DEFAULT, text white, rounded-full, px-5 py-2.5, icon left
    Secondary button: bg accent.amber, text white, rounded-full, px-5 py-2.5, icon left
    Tertiary button: bg white, border, text gray-700, rounded-full, px-5 py-2.5, icon left
Right side (40%): decorative grid pattern or chart placeholder (opacity-20)
```

### 4. Stat Card (dark, top-right)
```
Background: #0D2B1F (brand.dark), rounded-2xl, p-6
Label: text-xs uppercase tracking-wide text-green-300, mb-2
Big number: text-5xl font-bold text-white
Sub-label: text-sm text-green-200, mt-1
Bottom: row of 4 coloured mini-bars (varying green shades, rounded)
Badge: pill, bg rgba(white,0.15), text white, text-xs, absolute top-right of number
```

### 5. Metric Cards (row of 3)
```
Background: white, rounded-2xl, p-6, shadow-sm
Top row: icon (24px, bg #F3F4F6, rounded-lg, p-2) left | trend badge right
Trend badge: text-xs, text-green-600, bg-green-50, rounded-full, px-2 py-1
  e.g. "+100% ↗"
Label: text-sm text-gray-500, mt-4
Big number: text-4xl font-bold text-gray-900, mt-1
  - If currency: prefix "GH₵" in same weight
Sub-label: text-xs text-gray-400, mt-1
```

### 6. Chart Card
```
Background: white, rounded-2xl, p-6
Header: title (font-semibold) + subtitle (text-xs text-gray-400) left
        toggle pills right: active pill bg brand.dark text-white, inactive bg-gray-100
Chart: recharts ResponsiveContainer height=240
  Line 1: stroke #C9A84C (gold), strokeWidth 2.5, dot false, type monotone
  Line 2: stroke #1A5C38 (brand), strokeWidth 2, strokeDasharray "6 3", dot false
  XAxis: tick fontSize 11, tickLine false, axisLine false
  YAxis: tick fontSize 11, tickLine false, axisLine false, width 35
  CartesianGrid: strokeDasharray "3 3", stroke #F0F0F0
  Tooltip: custom styled, bg white, shadow, rounded-lg
```

### 7. Activity Feed Card
```
Background: white, rounded-2xl, p-6
Header: "Activity Feed" font-semibold | clock icon button right
Items: py-3, border-bottom last:border-0
  Left: avatar/icon circle (40px, bg #F3F4F6)
  Right: title (text-sm font-medium) + description (text-xs text-gray-400) + time (text-xs text-gray-400 mt-0.5)
Scrollable: max-h-64 overflow-y-auto custom scrollbar
```

### 8. Status Badges / Pills
```
Stable / Active / Delivered:  bg #D1FAE5, text #065F46, font-medium text-xs px-2.5 py-0.5 rounded-full
Warning / Pending / In Transit: bg #FEF3C7, text #92400E
Danger / Cancelled:           bg #FEE2E2, text #991B1B
```

### 9. Buttons
```
Primary:   bg #1A5C38, text white, hover:bg #2E7D52, rounded-full, px-5 py-2.5, text-sm font-medium
Secondary: bg #F59E0B, text white, hover:bg #D97706, rounded-full, px-5 py-2.5
Outline:   bg white, border border-gray-200, text gray-700, hover:bg gray-50, rounded-full
Icon btn:  p-2, rounded-lg, hover:bg gray-100
```

---

## Per-Role Dashboard Adaptations

### Farmer Dashboard
- Hero card title: "Welcome back, [Name]" / subtitle: your active listings and demand forecasts
- Hero card buttons: "Add New Listing" (primary green) | "View Forecasts" (amber) | "My Orders" (outline)
- Stat card (dark): "Forecast Accuracy" with percentage + STABLE badge
- Metric cards: Active Listings | Pending Orders | Total Revenue (GH₵)
- Chart: "Demand Forecast — Next 7 Days" with gold line (forecast) + green dashed line (last week actual)
- Activity feed: incoming orders on farmer's listings

### Consumer Dashboard / Browse Page
- No hero card — replace with search bar + filter row at top
- Metric cards: Total Orders | Active Orders | Amount Spent (GH₵)
- Main content: listing cards grid (not activity feed)
- Each listing card matches Metric Card style: crop icon, crop name, price/kg large, location + farmer region small, "Order" button

### Transporter Feed
- Hero card title: "Delivery Requests Near You" / subtitle: open requests in your region
- Metric cards: Open Requests | Active Deliveries | Completed This Week
- Main content: request cards in a list (not grid) — each matches Activity Feed item style with an "Accept" button replacing the timestamp
- Active deliveries section below with status update buttons

### Market Dashboard (all roles)
- Hero card: "Market Intelligence" / subtitle: real-time prices and regional demand
- Stat card (dark): platform-wide activity number + LIVE badge
- Metric cards: Crops Tracked | Active Listings | Orders Today
- Chart card: "Price Trends" — one line per crop, toggle by crop type
- Activity feed: recent platform transactions

---

## Tailwind Config Extension

Add this to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      brand: {
        dark: '#0D2B1F',
        DEFAULT: '#1A5C38',
        mid: '#2E7D52',
        light: '#D6EFE1',
        pale: '#F0FAF4',
      },
      accent: {
        gold: '#C9A84C',
      }
    },
    borderRadius: {
      '2xl': '1rem',
      '3xl': '1.5rem',
    },
    boxShadow: {
      card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    }
  }
}
```

---

## Claude Code UI Prompt Prefix

Paste this at the top of EVERY frontend phase prompt so Claude Code applies the design system consistently:

```
Apply the AgroNexus design system throughout:
- Sidebar: bg #0D2B1F, active nav bg #1A5C38, icons #4A7C5E
- Content area: bg #F9FAFB, cards bg white rounded-2xl shadow-card p-6
- Primary colour: #1A5C38 (brand green), accent: #C9A84C (gold)
- Buttons: rounded-full, primary bg #1A5C38, secondary bg #F59E0B
- Status badges: rounded-full pills — green=#D1FAE5/#065F46, amber=#FEF3C7/#92400E, red=#FEE2E2/#991B1B
- Charts: recharts, gold line (#C9A84C) + green dashed line (#1A5C38), no dots, clean grid
- Typography: text-gray-900 headings, text-gray-500 labels, text-gray-400 meta
- Metric cards: icon top-left (bg #F3F4F6 rounded-lg) + trend badge top-right + big number + sub-label
- Activity feed: 40px avatar circle + title + description + time, border-bottom dividers
Match the reference screenshot (AgooSMS dashboard) layout and colour system exactly.
```
In the AgroNexus backend, implement the listings module:

1. POST /api/v1/listings — create a listing (farmer only)
2. GET /api/v1/listings — get all active listings (any authenticated user)
3. GET /api/v1/listings/mine — get listings for the logged-in farmer only
4. PUT /api/v1/listings/:id — update a listing (farmer owner only)
5. DELETE /api/v1/listings/:id — soft-delete by setting status to 'expired' (farmer owner only)

Each listing: { crop_type, quantity_kg, price_per_kg, location, available_from }

In the React web app, build the Farmer Dashboard (src/pages/farmer/Dashboard.jsx):
- Header showing farmer's name and region
- "My Listings" section: table showing active listings with crop, quantity, price, status
- "Add New Listing" button that opens a modal form
- Edit and delete actions on each row
- "Demand Forecast" card (placeholder for now — show static data)
- "Recent Orders" card showing last 5 orders on farmer's listings
- Status badges: green = active, amber = in progress, red = pending

Match this layout and colour scheme from the reference screenshot provided.
Use Tailwind CSS for all styling. No external component libraries unless already installed.
```

### Done when
- Farmer can add a listing via the web UI and it appears in Supabase
- Listings table shows correctly with status badges
- Edit/delete work without page refresh

---

## PHASE 3 — Consumer Module (Backend + Web)
**Duration: Day 3–4 | Owner: Arthur**
**Goal: Consumer can browse listings, filter, and place orders**

### Claude Code Prompt
```
[Attach your consumer browse page screenshot here]

In the AgroNexus backend, implement the orders module:

1. GET /api/v1/listings — already exists; add query params: ?crop_type=&region=&min_price=&max_price=&available_from=
2. POST /api/v1/orders — place an order (consumer only)
   - Accepts: { listing_id, quantity_kg }
   - Validates quantity does not exceed listing quantity
   - Decrements listing quantity_kg
   - Creates order record with status 'pending'
   - Creates a transport_request with status 'open' automatically
   - Returns the created order
3. GET /api/v1/orders/mine — consumer's order history
4. GET /api/v1/orders/:id — single order with status

In the React web app:
- Build Browse page (src/pages/consumer/Browse.jsx)
  - Search bar and filters: crop type dropdown, region dropdown, price range slider, date picker
  - Listing cards in a responsive grid: crop name, price/kg, quantity, location, farmer region
  - "Order" button on each card that opens a quantity input modal
  - Order confirmation shows order ID and current status
- Build Order History page (src/pages/consumer/Orders.jsx)
  - Table of past orders with status badges (red=pending, amber=in_transit, green=delivered)

Match the reference screenshot layout exactly.
```

### Done when
- Consumer can browse and filter listings
- Placing an order creates both an order and a transport_request in Supabase
- Order history shows with correct status badges

---

## PHASE 4 — Transporter Module (Backend + Web)
**Duration: Day 4 | Owner: Evans**
**Goal: Transporter can see open requests in their region and accept them**

### Claude Code Prompt
```
[Attach your transporter feed screenshot here]

In the AgroNexus backend, implement the transport module:

1. GET /api/v1/transport — get open transport requests (transporter only)
   - Filter by transporter's region from their profile
2. PUT /api/v1/transport/:id/accept — transporter accepts a request
   - Sets transporter_id to logged-in user
   - Sets status to 'accepted'
   - Updates linked order status to 'confirmed'
3. PUT /api/v1/transport/:id/status — update delivery status
   - Accepts: { status: 'in_transit' | 'delivered' }
   - When delivered: updates linked order status to 'delivered'

In the React web app:
- Build Transporter Feed (src/pages/transporter/Feed.jsx)
  - List of open delivery requests: pickup location, crop type, quantity, distance (static for now)
  - Each card has an "Accept" button
  - Accepted requests move to "My Active Deliveries" section
  - Status update buttons: "Mark In Transit" → "Mark Delivered"
  - Badge colours: red=open, amber=accepted/in_transit, green=delivered

Match the reference screenshot.
```

### Done when
- Transporter sees open requests after a consumer places an order
- Accepting a request updates order status to 'confirmed'
- Marking delivered updates both transport and order tables

---

## PHASE 5 — Market Dashboard (Backend + Web)
**Duration: Day 5 | Owner: Bissue**
**Goal: All roles can see real-time price trends, supply levels, and activity**

### Claude Code Prompt
```
[Attach your dashboard screenshot here]

In the AgroNexus backend:
1. GET /api/v1/dashboard/prices — latest price per crop per region from price_records table
2. GET /api/v1/dashboard/supply — total active listing quantity per crop type
3. GET /api/v1/dashboard/activity — last 10 orders across the platform
4. Seed the price_records table with 30 rows of sample WFP-style data for: 
   maize, tomatoes, plantain, cassava, pepper, rice across Western Region markets

In the React web app, build the Market Dashboard (src/pages/shared/Dashboard.jsx):
- Accessible to all roles from their nav
- Price trend cards: one per crop showing current price and a sparkline chart (use recharts)
- Supply overview: bar chart of available quantity per crop (recharts)
- Recent activity feed: scrollable list of recent orders
- 7-day Demand Forecast section: placeholder cards per crop with directional arrow and colour
  (green arrow up = high demand expected, amber = stable, red arrow down = low)

Use recharts for all charts. Match the reference screenshot layout.
```

### Done when
- Dashboard loads with charts for all 6 crop types
- Price and supply data comes from the backend (not hardcoded in frontend)
- All three roles can access the dashboard from their nav

---

## PHASE 6 — ML Forecasting Service
**Duration: Day 5–6 | Owner: Amprofi + Amissah**
**Goal: LSTM model trained, Flask API serving forecasts, connected to dashboard**

### Claude Code Prompt (Part A — Data prep + training, run in Google Colab)
```
Build a complete ML pipeline for agricultural demand forecasting.

Data sources to load:
1. WFP Ghana food prices CSV (I will upload this file)
2. Synthetic demand volume data generated as follows:
   - Crops: maize, tomatoes, plantain, cassava, pepper, rice
   - Regions: Tarkwa, Bogoso, Prestea
   - Date range: 2018-01-01 to 2024-12-31 (weekly records)
   - Base demand anchored to MOFA production estimates
   - Seasonal peaks aligned to Ghana's major/minor harvest seasons
   - Price-inverse relationship: high price weeks = lower demand
   - Festival flags: Christmas, Easter, Homowo as binary features

Pipeline steps:
1. Merge price data with synthetic demand on date + crop_type + region
2. Add features: month, week_of_year, lag_7, lag_14, lag_30 price columns
3. Min-max normalise price and demand columns
4. Encode crop_type and region as integers
5. Build sequences of 30 time steps predicting next 7 days demand

Model architecture (TensorFlow/Keras):
- Input: (30, 12) — 30 timesteps, 12 features
- LSTM layer 1: 64 units, return_sequences=True
- Dropout: 0.2
- LSTM layer 2: 32 units
- Dense output: 1 unit, linear activation
- Compile: Adam optimizer, MSE loss
- Train: 50 epochs, batch_size=32, 80/20 chronological split
- Evaluate: print MAPE and RMSE on test set
- Save model as model.h5

Also train a GradientBoostingRegressor baseline on the same split and compare MAPE.
```

### Claude Code Prompt (Part B — Flask service)
```
In agronexus/ml/, build a production-ready Flask forecasting microservice:

1. Load model.h5 on startup using TensorFlow
2. Load the fitted scaler objects (save them as scaler_X.pkl and scaler_y.pkl during training)
3. POST /predict
   - Accepts: { crop_type: string, region: string, horizon_days: 7 }
   - Preprocesses the input into a 30-step sequence using the same pipeline as training
   - Returns: { crop_type, region, forecast: [{ day: 1, demand_kg: 450 }, ...] }
4. GET /health — returns { status: "ok", model: "lstm" }
5. If model.h5 does not exist, fall back to the gradient boosting model

Connect the backend to the Flask service:
- In agronexus/backend/services/forecastService.js
  - Function getForecast(crop_type, region) that POST requests to FLASK_SERVICE_URL/predict
  - Cache the result in Supabase forecasts table for 24 hours
- Add GET /api/v1/forecasts?crop_type=&region= to the backend
  - Returns cached forecast if less than 24 hours old, otherwise calls Flask

Update the dashboard frontend to call /api/v1/forecasts and replace placeholder cards with real data.
```

### Done when
- Model achieves MAPE ≤ 25% on test set (target is 20%, 25% acceptable for prototype)
- `POST http://localhost:5000/predict` returns a 7-day forecast array
- Farmer dashboard and market dashboard show real forecast data

---

## PHASE 7 — Flutter Mobile App
**Duration: Day 6–9 | Owner: Yirenkyi + Arthur**
**Goal: Full mobile app for farmers and transporters with offline support**

### Claude Code Prompt (Part A — Setup + Auth)
```
[Attach your mobile login/register screenshot]

In agronexus/mobile/ (Flutter), implement the complete mobile app.

Setup:
- Add to pubspec.yaml: dio, flutter_secure_storage, hive, hive_flutter, connectivity_plus, provider, cached_network_image, intl
- Create folder structure: lib/screens/, lib/widgets/, lib/services/, lib/models/, lib/providers/

Auth screens:
- LoginScreen: email + password fields, login button, link to register
- RegisterScreen: email, password, full_name, role selector (farmer/transporter only — consumers use web), region dropdown, phone
- On login success: store JWT in flutter_secure_storage, navigate by role
  - farmer → FarmerDashboardScreen
  - transporter → TransporterFeedScreen

API service (lib/services/api_service.dart):
- Base URL from .env
- Attach JWT to every request header automatically
- On 401: clear stored token and navigate to login
- Wrap every request in try/catch, return typed result objects

Match the mobile login UI from the reference screenshot exactly — colours, fonts, layout, spacing.
```

### Claude Code Prompt (Part B — Farmer mobile screens)
```
[Attach farmer mobile dashboard, listing form, and order notification screenshots]

Build these Flutter screens for the farmer role:

1. FarmerDashboardScreen
   - Summary cards: active listings count, pending orders, total revenue (mock)
   - Demand forecast mini-cards per crop with colour indicators
   - Recent orders list
   - FAB button to add new listing

2. MyListingsScreen
   - ListView of farmer's listings with crop, quantity, price, status chip
   - Swipe to delete, tap to edit
   - Pull to refresh

3. AddListingScreen
   - Form: crop type dropdown, quantity (kg), price per kg, location, available from date picker
   - Submit creates listing via API
   - Works offline: if no connection, save to Hive queue and sync on reconnect

4. OrdersScreen
   - Incoming orders on farmer's listings
   - Each card: consumer name (anon), crop, quantity, status, timestamp

Offline support:
- Cache listing and order data in Hive on every successful fetch
- Show cached data with a banner "Showing offline data" when disconnected
- Queue write operations (new listings) in Hive and sync when connectivity returns

Match the reference screenshots for all screens — colours, card styles, typography, spacing.
```

### Claude Code Prompt (Part C — Transporter mobile screens)
```
[Attach transporter mobile feed and delivery screens screenshots]

Build these Flutter screens for the transporter role:

1. TransporterFeedScreen
   - List of open delivery requests in transporter's region
   - Each card: pickup location, crop type, quantity, distance (static), time posted
   - "Accept" button on each card — calls PUT /transport/:id/accept
   - Pull to refresh

2. MyDeliveriesScreen
   - Active deliveries (accepted/in_transit)
   - Each card shows full delivery details + action button
   - "Mark In Transit" button → calls status update API
   - "Mark Delivered" button → calls status update API, moves card to completed

3. Completed deliveries tab — historical list

Match the reference screenshots for all screens.
```

### Done when
- Flutter app builds and runs on Android emulator without errors
- Farmer can log in, create a listing, and see it appear on the web dashboard in real time
- Transporter can accept a delivery request on mobile and status updates on web
- Offline mode shows cached data with the banner when network is disconnected

---

## PHASE 8 — Real-time & Notifications
**Duration: Day 9–10 | Owner: Bissue + Evans**
**Goal: Order status updates push in real time across web and mobile**

### Claude Code Prompt
```
In AgroNexus, implement real-time updates using Supabase Realtime:

Web (React):
1. In the farmer dashboard, subscribe to changes on the orders table filtered by farmer_id
   - New order → show toast notification "New order received for [crop_type]"
   - Use Supabase JS client: supabase.channel('orders').on('postgres_changes', ...)
2. In the transporter feed, subscribe to transport_requests INSERT events
   - New request → card appears in feed without page refresh
3. In the consumer orders page, subscribe to order status changes
   - Status change → update badge in real time

Mobile (Flutter):
1. Use Supabase Flutter SDK realtime subscriptions
2. Farmer: listen for new orders on their listings → show in-app notification banner
3. Transporter: listen for new transport requests → update feed live

SMS fallback (simulate only — no actual SMS gateway needed for prototype):
- In the backend, when an order is placed, log to console:
  "SMS would be sent to farmer [phone]: New order for [quantity]kg of [crop]"
- Add a notifications log table in Supabase to record all notification events
```

### Done when
- Placing an order on the consumer web app immediately shows in the farmer's dashboard without refresh
- Transporter feed updates live when a new order creates a transport request
- Console shows SMS fallback log entries

---

## PHASE 9 — Integration Testing & Polish
**Duration: Day 10–11 | Owner: All members**
**Goal: Full end-to-end flow works, UI matches reference screenshots, no broken routes**

### Claude Code Prompt
```
In AgroNexus, run a full integration check and fix all issues:

1. Test the complete happy path end-to-end:
   - Register a farmer, consumer, and transporter
   - Farmer creates a listing
   - Consumer browses, filters, and places an order
   - Transport request is automatically created
   - Transporter accepts the request
   - Farmer sees order confirmed
   - Transporter marks in transit, then delivered
   - All status badges update correctly throughout

2. Add missing error handling:
   - All API routes: return { error: "message" } with correct HTTP status codes
   - Web forms: show inline validation errors
   - Mobile forms: show SnackBar errors on failed API calls

3. Fix any CORS issues between frontend ports and backend

4. Add loading states to all data-fetching components (spinner or skeleton)

5. Ensure role guards work:
   - Consumer cannot access /farmer routes
   - Farmer cannot access /transporter routes
   - Unauthenticated users cannot access any protected page

6. Compare each screen against the reference screenshots and fix spacing, colour, or layout mismatches.

Run: npm test in backend/ and report any failing tests.
```

### Done when
- Full happy path completes without errors
- No console errors on web or mobile
- All screens visually match reference screenshots
- Role guards tested and working

---

## PHASE 10 — Deployment
**Duration: Day 12 | Owner: Amissah + Bissue**
**Goal: Everything live and accessible via public URLs**

### Claude Code Prompt
```
Deploy the AgroNexus project:

1. Backend (Render):
   - Create a render.yaml in backend/ for a Node.js web service
   - Add all environment variables from .env to Render dashboard
   - Set build command: npm install
   - Set start command: node server.js
   - Health check path: /api/v1/health

2. ML service (Render, Docker):
   - Create a Dockerfile in ml/:
     FROM python:3.10-slim
     WORKDIR /app
     COPY requirements.txt .
     RUN pip install -r requirements.txt
     COPY . .
     CMD ["python", "app.py"]
   - Deploy as a Docker web service on Render
   - Add SUPABASE_URL and SUPABASE_SERVICE_KEY as env vars

3. Web frontend (Vercel):
   - Run: vercel --prod from web/
   - Set environment variable VITE_API_URL to the Render backend URL
   - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

4. Update CORS in backend to allow the Vercel domain

5. Test all three deployed services end-to-end using the production URLs.

Print a deployment checklist confirming each service is live.
```

### Done when
- Backend health check returns 200 at Render URL
- Flask /health returns 200 at its Render URL
- Web app loads at Vercel URL and login works
- Full order flow tested on production URLs

---

## Team Assignment Summary

| Phase | Owner | Days |
|---|---|---|
| 0 — Scaffold + Supabase | Bissue + Evans | Day 1 |
| 1 — Authentication | Amprofi | Day 1–2 |
| 2 — Farmer module (web) | Yirenkyi | Day 2–3 |
| 3 — Consumer module (web) | Arthur | Day 3–4 |
| 4 — Transporter module (web) | Evans | Day 4 |
| 5 — Market dashboard | Bissue | Day 5 |
| 6 — ML forecasting service | Amprofi + Amissah | Day 5–6 |
| 7 — Flutter mobile app | Yirenkyi + Arthur | Day 6–9 |
| 8 — Realtime + notifications | Bissue + Evans | Day 9–10 |
| 9 — Integration testing + polish | All | Day 10–11 |
| 10 — Deployment | Amissah + Bissue | Day 12 |

---

## Using Your Reference Screenshots

When running any Phase 2–8 prompt, attach the relevant screenshot like this:

**In Cursor:**
Drag the screenshot image into the Cursor chat window alongside the prompt text.

**In Claude Code terminal:**
```bash
claude "your phase prompt here" --image ./screenshots/farmer-dashboard.png
```

**Tip:** Name your screenshots clearly before starting:
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

---

## Daily Standup Checklist

Each day, each member should be able to answer:
1. Which phase am I on?
2. What is the "done when" check for my phase?
3. Is anything blocked that another member needs to unblock?

Merge to `main` only when your phase's "done when" criteria are fully met.
