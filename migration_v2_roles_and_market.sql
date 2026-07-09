-- ═══════════════════════════════════════════════════════════════════════════
-- AgroNexus Migration v2 — Buyer roles, anonymized marketplace, regional
-- allocation, auto-location, and demand-signal capture for ML retraining.
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- Supersedes backend/update_roles.sql (do not run that file afterwards).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. ROLES ────────────────────────────────────────────────────────────────
-- Buyer side splits into three: wholesaler, retailer, direct_consumer.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users SET role = 'direct_consumer' WHERE role = 'consumer';

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('farmer','wholesaler','retailer','direct_consumer','transporter','admin'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_role_check;


-- ─── 2. AUTO-LOCATION ────────────────────────────────────────────────────────
-- Region is derived from GPS coordinates, never typed by the user.
-- Frontend sends location_lat/location_lng (browser geolocation, IP fallback);
-- a trigger maps them to the nearest supported region centroid.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_lat    DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS location_lng    DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS region_source   TEXT DEFAULT 'unknown'
    CHECK (region_source IN ('gps','ip','manual','unknown'));

CREATE INDEX IF NOT EXISTS idx_users_location
  ON users (location_lat, location_lng)
  WHERE location_lat IS NOT NULL;

-- Nearest-centroid region resolver (Western Region markets)
CREATE OR REPLACE FUNCTION derive_region(lat double precision, lng double precision)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT name FROM (VALUES
    ('Tarkwa',  5.3006, -1.9834),
    ('Bogoso',  5.5710, -2.0089),
    ('Prestea', 5.4323, -2.1431)
  ) AS centroids(name, clat, clng)
  ORDER BY (clat - lat)^2 + (clng - lng)^2
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION users_auto_region()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
    NEW.region        := derive_region(NEW.location_lat::float8, NEW.location_lng::float8);
    NEW.region_source := COALESCE(NULLIF(NEW.region_source, 'unknown'), 'gps');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_auto_region ON users;
CREATE TRIGGER trg_users_auto_region
  BEFORE INSERT OR UPDATE OF location_lat, location_lng ON users
  FOR EACH ROW EXECUTE FUNCTION users_auto_region();

-- Backfill region for existing users who already have coordinates
UPDATE users
SET region = derive_region(location_lat::float8, location_lng::float8),
    region_source = 'gps'
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;


-- ─── 3. REGIONAL ALLOCATION OF LISTINGS ─────────────────────────────────────
-- A farmer splits a listing's quantity across regions, guided by the demand
-- forecast. Sum of allocations can never exceed the listing quantity.

CREATE TABLE IF NOT EXISTS listing_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE,
  region       TEXT NOT NULL,
  allocated_kg NUMERIC NOT NULL CHECK (allocated_kg > 0),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (listing_id, region)
);

CREATE OR REPLACE FUNCTION check_allocation_total()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cap   NUMERIC;
  total NUMERIC;
BEGIN
  SELECT quantity_kg INTO cap FROM produce_listings WHERE id = NEW.listing_id;
  SELECT COALESCE(SUM(allocated_kg), 0) INTO total
  FROM listing_allocations
  WHERE listing_id = NEW.listing_id AND id IS DISTINCT FROM NEW.id;

  IF total + NEW.allocated_kg > cap THEN
    RAISE EXCEPTION 'Allocation total % kg exceeds listing quantity % kg',
      total + NEW.allocated_kg, cap;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_allocation_total ON listing_allocations;
CREATE TRIGGER trg_check_allocation_total
  BEFORE INSERT OR UPDATE ON listing_allocations
  FOR EACH ROW EXECUTE FUNCTION check_allocation_total();

ALTER TABLE listing_allocations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE listing_allocations TO service_role;
GRANT SELECT ON TABLE listing_allocations TO authenticated;

DROP POLICY IF EXISTS "Farmers manage own allocations" ON listing_allocations;
CREATE POLICY "Farmers manage own allocations"
  ON listing_allocations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM produce_listings pl
    WHERE pl.id = listing_allocations.listing_id AND pl.farmer_id = auth.uid()
  ));


-- ─── 4. ANONYMIZED MARKETPLACE VIEW ─────────────────────────────────────────
-- Buyers browse this view: crop, quantity, price, region, availability —
-- no farmer_id, name, or phone. (Default view semantics run as the view
-- owner, intentionally bypassing produce_listings RLS for these columns only.)

CREATE OR REPLACE VIEW marketplace_listings AS
SELECT
  pl.id,
  pl.crop_type,
  pl.quantity_kg,
  pl.price_per_kg,
  pl.location AS region,
  pl.available_from,
  pl.status,
  pl.created_at
FROM produce_listings pl
WHERE pl.status = 'active';

GRANT SELECT ON marketplace_listings TO authenticated;

-- Farmers can still see and manage their own raw rows directly
DROP POLICY IF EXISTS "Farmers manage own listings" ON produce_listings;
CREATE POLICY "Farmers manage own listings"
  ON produce_listings FOR ALL
  USING (farmer_id = auth.uid());


-- ─── 5. DEMAND-SIGNAL CAPTURE ON ORDERS ─────────────────────────────────────
-- Every order is stamped with the buyer's role, region, and the price paid,
-- so platform activity becomes labelled training data for the forecast model.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS buyer_role TEXT
    CHECK (buyer_role IN ('wholesaler','retailer','direct_consumer')),
  ADD COLUMN IF NOT EXISTS region     TEXT,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC;

CREATE OR REPLACE FUNCTION stamp_order_demand_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT u.role, u.region INTO NEW.buyer_role, NEW.region
  FROM users u WHERE u.id = NEW.consumer_id
    AND u.role IN ('wholesaler','retailer','direct_consumer');

  IF NEW.unit_price IS NULL THEN
    SELECT pl.price_per_kg INTO NEW.unit_price
    FROM produce_listings pl WHERE pl.id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_order_demand ON orders;
CREATE TRIGGER trg_stamp_order_demand
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION stamp_order_demand_fields();

-- Backfill historical orders
UPDATE orders o
SET buyer_role = u.role, region = COALESCE(o.region, u.region)
FROM users u
WHERE u.id = o.consumer_id AND o.buyer_role IS NULL
  AND u.role IN ('wholesaler','retailer','direct_consumer');

UPDATE orders o
SET unit_price = pl.price_per_kg
FROM produce_listings pl
WHERE pl.id = o.listing_id AND o.unit_price IS NULL;


-- ─── 6. WEEKLY DEMAND AGGREGATE (ML retraining feed) ────────────────────────
-- Matches the shape of ml/data/demand_volume.csv so retraining can consume
-- platform orders directly:  week × crop × region → demand_kg + avg price,
-- split by buyer segment.

CREATE OR REPLACE VIEW demand_weekly AS
SELECT
  date_trunc('week', o.created_at)::date                                    AS week_start,
  pl.crop_type,
  COALESCE(o.region, pl.location)                                           AS region,
  SUM(o.quantity_kg)                                                        AS demand_kg,
  AVG(o.unit_price)                                                         AS avg_price_per_kg,
  SUM(o.quantity_kg) FILTER (WHERE o.buyer_role = 'wholesaler')             AS wholesale_kg,
  SUM(o.quantity_kg) FILTER (WHERE o.buyer_role = 'retailer')               AS retail_kg,
  SUM(o.quantity_kg) FILTER (WHERE o.buyer_role = 'direct_consumer')        AS direct_kg,
  COUNT(*)                                                                  AS order_count
FROM orders o
JOIN produce_listings pl ON pl.id = o.listing_id
WHERE o.status <> 'cancelled'
GROUP BY 1, 2, 3;

GRANT SELECT ON demand_weekly TO service_role;

-- Supply-side counterpart: what farmers put on the market each week
CREATE OR REPLACE VIEW supply_weekly AS
SELECT
  date_trunc('week', pl.created_at)::date AS week_start,
  pl.crop_type,
  pl.location                             AS region,
  SUM(pl.quantity_kg)                     AS listed_kg,
  AVG(pl.price_per_kg)                    AS avg_asking_price,
  COUNT(*)                                AS listing_count
FROM produce_listings pl
GROUP BY 1, 2, 3;

GRANT SELECT ON supply_weekly TO service_role;
