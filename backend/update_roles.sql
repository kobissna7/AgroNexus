-- Migration to add 'retailer' and 'direct_consumer' roles

-- 1. Drop the existing role check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add the updated constraint including the new roles
-- We keep 'consumer' temporarily if you have existing records.
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('farmer', 'consumer', 'direct_consumer', 'retailer', 'transporter', 'admin'));

-- 3. Update existing 'consumer' users to 'direct_consumer' (if that is your intent)
UPDATE users SET role = 'direct_consumer' WHERE role = 'consumer';

-- 4. Clean up: recreate constraint without the old 'consumer' role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('farmer', 'direct_consumer', 'retailer', 'transporter', 'admin'));
