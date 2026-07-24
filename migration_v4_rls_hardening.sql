-- ═══════════════════════════════════════════════════════════════════════════
-- AgroNexus Migration v4 — RLS hardening for users, orders, transport_requests.
--
-- These three tables had ENABLE ROW LEVEL SECURITY with zero policies, so any
-- client authenticated directly to Supabase (not routed through the Express
-- backend's service_role client) got zero rows back. Today nothing hits these
-- tables that way — the web app's anon-key Supabase client is used only for
-- Realtime Broadcast channels, and auth.controller.ts never hands the client
-- a live Supabase Auth session (it validates credentials server-side, then
-- issues its own JWT_SECRET-signed token instead). All current reads/writes
-- go through supabaseAdmin (service_role), which bypasses RLS regardless of
-- what's defined here.
--
-- These policies exist so the database enforces the same ownership rules
-- independently, the moment any client establishes a real Supabase Auth
-- session (auth.uid() populated) and queries these tables directly — e.g. a
-- future mobile Supabase SDK integration. They mirror the ownership pattern
-- already used for produce_listings / notifications / payments /
-- listing_allocations. Status-changing writes (payment verification,
-- transport accept/deliver, order fulfillment) remain backend-only by
-- omission — no client-side UPDATE policy is granted for those transitions.
--
-- Run in Supabase SQL Editor AFTER migration_v3_payments_and_events.sql.
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── USERS ───────────────────────────────────────────────────────────────────
-- Buyers must never see farmer identity (see marketplace_listings view) and
-- no role needs to browse other users' profiles — everyone reads/updates
-- only their own row. Row creation stays admin-only (register() links the
-- profile row to a Supabase Auth user id created via the admin API).

DROP POLICY IF EXISTS "Users read own profile" ON users;
CREATE POLICY "Users read own profile"
  ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON users;
CREATE POLICY "Users update own profile"
  ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ─── ORDERS ──────────────────────────────────────────────────────────────────
-- Three parties may see an order: the buyer who placed it, the farmer whose
-- listing it's against, and the transporter carrying it. Multiple permissive
-- SELECT policies on the same table OR together, so all three apply at once.

DROP POLICY IF EXISTS "Buyers view own orders" ON orders;
CREATE POLICY "Buyers view own orders"
  ON orders FOR SELECT USING (consumer_id = auth.uid());

DROP POLICY IF EXISTS "Farmers view orders on own listings" ON orders;
CREATE POLICY "Farmers view orders on own listings"
  ON orders FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM produce_listings pl
      WHERE pl.id = orders.listing_id AND pl.farmer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Transporters view orders they carry" ON orders;
CREATE POLICY "Transporters view orders they carry"
  ON orders FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transport_requests tr
      WHERE tr.order_id = orders.id AND tr.transporter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers create own orders" ON orders;
CREATE POLICY "Buyers create own orders"
  ON orders FOR INSERT WITH CHECK (
    consumer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('wholesaler', 'retailer', 'direct_consumer', 'consumer')
    )
  );

-- No client-side UPDATE policy: status transitions (pending_payment → pending
-- → in_transit → delivered/cancelled) are driven by payment verification and
-- transport actions in the backend, always via service_role.


-- ─── TRANSPORT_REQUESTS ──────────────────────────────────────────────────────
-- Transporters browse open jobs plus their own accepted ones; the buyer and
-- farmer on the underlying order can track its delivery. Accepting a job
-- (open → accepted, claiming transporter_id) is the one client-shaped write
-- allowed at the DB layer; later status advances stay backend-only.

DROP POLICY IF EXISTS "Transporters view open and own requests" ON transport_requests;
CREATE POLICY "Transporters view open and own requests"
  ON transport_requests FOR SELECT USING (
    transporter_id = auth.uid()
    OR (
      status = 'open'
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'transporter')
    )
  );

DROP POLICY IF EXISTS "Order parties view their transport request" ON transport_requests;
CREATE POLICY "Order parties view their transport request"
  ON transport_requests FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN produce_listings pl ON pl.id = o.listing_id
      WHERE o.id = transport_requests.order_id
        AND (o.consumer_id = auth.uid() OR pl.farmer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Transporters accept open requests" ON transport_requests;
CREATE POLICY "Transporters accept open requests"
  ON transport_requests FOR UPDATE
  USING (
    transporter_id = auth.uid()
    OR (
      status = 'open'
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'transporter')
    )
  )
  WITH CHECK (transporter_id = auth.uid());
