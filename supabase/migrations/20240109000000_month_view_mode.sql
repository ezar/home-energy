ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS month_view_mode TEXT NOT NULL DEFAULT 'calendar'
  CHECK (month_view_mode IN ('calendar', 'rolling_30d'));
