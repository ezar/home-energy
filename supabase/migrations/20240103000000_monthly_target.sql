ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS monthly_kwh_target numeric(8,2);
