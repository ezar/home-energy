ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_subscription jsonb,
  ADD COLUMN IF NOT EXISTS push_price_threshold numeric(6,5);
