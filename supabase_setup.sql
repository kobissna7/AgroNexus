-- AgroNexus — Supabase Database Setup
-- Run this entire file in the Supabase SQL Editor

-- ─── TABLES ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  role        TEXT CHECK (role IN ('farmer','consumer','transporter','admin')) NOT NULL,
  full_name   TEXT,
  region      TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produce_listings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  crop_type      TEXT NOT NULL,
  quantity_kg    NUMERIC NOT NULL,
  price_per_kg   NUMERIC NOT NULL,
  location       TEXT NOT NULL,
  available_from DATE NOT NULL,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active','sold','expired')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES produce_listings(id) ON DELETE CASCADE,
  consumer_id UUID REFERENCES users(id),
  quantity_kg NUMERIC NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_transit','delivered','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  transporter_id    UUID REFERENCES users(id),
  pickup_location   TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  crop_type         TEXT,
  quantity_kg       NUMERIC,
  status            TEXT DEFAULT 'open' CHECK (status IN ('open','accepted','in_transit','delivered')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type     TEXT NOT NULL,
  region        TEXT NOT NULL,
  price_per_kg  NUMERIC NOT NULL,
  recorded_date DATE NOT NULL,
  source        TEXT DEFAULT 'platform'
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE produce_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- ─── GRANTS ───────────────────────────────────────────────────────────────────
-- service_role is used by the Node backend; it must have table-level privileges
-- even though it bypasses RLS at the policy level.

GRANT ALL ON TABLE users               TO service_role;
GRANT ALL ON TABLE produce_listings    TO service_role;
GRANT ALL ON TABLE orders              TO service_role;
GRANT ALL ON TABLE transport_requests  TO service_role;
GRANT ALL ON TABLE price_records       TO service_role;
GRANT ALL ON TABLE notifications       TO service_role;

GRANT ALL ON TABLE users               TO authenticated;
GRANT ALL ON TABLE produce_listings    TO authenticated;
GRANT ALL ON TABLE orders              TO authenticated;
GRANT ALL ON TABLE transport_requests  TO authenticated;
GRANT ALL ON TABLE price_records       TO authenticated;
GRANT ALL ON TABLE notifications       TO authenticated;

-- Basic authenticated read policies (extend per phase as needed)
CREATE POLICY "Authenticated users can read price_records"
  ON price_records FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

-- ─── REALTIME ─────────────────────────────────────────────────────────────────

-- Enable realtime on tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE transport_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── ADMIN ROLE (run after initial setup) ────────────────────────────────────

-- Expand the role check constraint to include 'admin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('farmer','consumer','transporter','admin'));

-- To promote a user to admin (replace email):
-- UPDATE users SET role = 'admin' WHERE email = 'admin@yourdomain.com';
