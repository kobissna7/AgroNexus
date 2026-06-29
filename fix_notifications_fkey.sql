-- ─── FIX: Add ON DELETE CASCADE to ALL foreign keys referencing users ─────────
-- Run this in the Supabase SQL Editor (primary database, postgres role)
-- Safe to run more than once — uses DROP CONSTRAINT IF EXISTS.

-- 1. orders.consumer_id
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_consumer_id_fkey,
  ADD CONSTRAINT orders_consumer_id_fkey
    FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. transport_requests.transporter_id
ALTER TABLE transport_requests
  DROP CONSTRAINT IF EXISTS transport_requests_transporter_id_fkey,
  ADD CONSTRAINT transport_requests_transporter_id_fkey
    FOREIGN KEY (transporter_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3. notifications.user_id (in case the previous fix wasn't run yet)
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
