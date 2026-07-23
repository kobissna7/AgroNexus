-- ═══════════════════════════════════════════════════════════════════════════
-- AgroNexus Migration v3 — Paystack payments, behavior tracking, and
-- interest-signal aggregation for ML retraining.
--
-- Run in Supabase SQL Editor AFTER migration_v2_roles_and_market.sql.
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. ORDER STATUS: pending_payment ───────────────────────────────────────
-- Orders now start in 'pending_payment' while a Paystack transaction is in
-- flight; they move to 'pending' only after payment succeeds (or immediately
-- when payment is not configured / skipped).

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment','pending','confirmed','in_transit','delivered','cancelled'));


-- ─── 2. PAYMENTS ─────────────────────────────────────────────────────────────
-- One row per Paystack transaction attempt, keyed by our reference.
-- gateway_response stores the raw Paystack payload plus checkout metadata
-- (e.g. the transporter chosen at checkout, needed at fulfillment time).

CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id),
  reference        TEXT UNIQUE NOT NULL,
  amount_pesewas   INTEGER NOT NULL CHECK (amount_pesewas > 0),
  currency         TEXT NOT NULL DEFAULT 'GHS',
  status           TEXT NOT NULL DEFAULT 'initialized'
    CHECK (status IN ('initialized','success','failed','abandoned','skipped')),
  gateway_response JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (reference);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments (status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE payments TO service_role;
GRANT SELECT ON TABLE payments TO authenticated;

DROP POLICY IF EXISTS "Users read own payments" ON payments;
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT USING (user_id = auth.uid());


-- ─── 3. DEMAND VIEW: exclude unpaid orders ──────────────────────────────────
-- pending_payment rows are holds, not demand — keep them out of the ML feed.

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
WHERE o.status NOT IN ('cancelled','pending_payment')
GROUP BY 1, 2, 3;

GRANT SELECT ON demand_weekly TO service_role;


-- ─── 4. SITE EVENTS (behavior tracking) ─────────────────────────────────────
-- Raw client + server events: page views, listing views, searches, checkout
-- steps, payment outcomes. session_id ties anonymous browsing to the same
-- visitor after they sign in; user_id is attached when a valid JWT is present.

CREATE TABLE IF NOT EXISTS site_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  listing_id UUID,
  crop_type  TEXT,
  region     TEXT,
  metadata   JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_events_type_created ON site_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_site_events_session ON site_events (session_id);

ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE site_events TO service_role;
-- No authenticated/anon grants: events are written and read only via the
-- service-role backend.


-- ─── 5. WEEKLY INTEREST AGGREGATE (ML retraining feed) ──────────────────────
-- Behavioral counterpart to demand_weekly: what visitors looked at, searched
-- for, and paid for — week × crop × region.

CREATE OR REPLACE VIEW interest_weekly AS
SELECT
  date_trunc('week', e.created_at)::date                                    AS week_start,
  e.crop_type,
  e.region,
  COUNT(*) FILTER (WHERE e.event_type = 'listing_view')                     AS listing_views,
  COUNT(*) FILTER (WHERE e.event_type IN ('search','filter'))               AS searches,
  COUNT(*) FILTER (WHERE e.event_type = 'checkout_start')                   AS checkouts,
  COUNT(*) FILTER (WHERE e.event_type = 'payment_success')                  AS paid_orders
FROM site_events e
WHERE e.crop_type IS NOT NULL
GROUP BY 1, 2, 3;

GRANT SELECT ON interest_weekly TO service_role;


-- ─── 6. WART FIX: legacy 'consumer' role in demand stamping ─────────────────
-- Pre-v2 JWTs can still carry role 'consumer'; include it so those orders
-- don't leave buyer_role/region NULL in the training signal.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_role_check;
ALTER TABLE orders ADD CONSTRAINT orders_buyer_role_check
  CHECK (buyer_role IN ('wholesaler','retailer','direct_consumer','consumer'));

CREATE OR REPLACE FUNCTION stamp_order_demand_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT u.role, u.region INTO NEW.buyer_role, NEW.region
  FROM users u WHERE u.id = NEW.consumer_id
    AND u.role IN ('wholesaler','retailer','direct_consumer','consumer');

  IF NEW.unit_price IS NULL THEN
    SELECT pl.price_per_kg INTO NEW.unit_price
    FROM produce_listings pl WHERE pl.id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$;

-- (trigger trg_stamp_order_demand from v2 already points at this function)
