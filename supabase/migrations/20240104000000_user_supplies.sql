CREATE TABLE IF NOT EXISTS user_supplies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cups text NOT NULL,
  distributor_code text NOT NULL,
  point_type integer NOT NULL DEFAULT 5,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cups)
);
ALTER TABLE user_supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplies" ON user_supplies FOR ALL USING (auth.uid() = user_id);
-- Migrate existing single-CUPS from profiles
INSERT INTO user_supplies (user_id, cups, distributor_code, point_type)
SELECT id, cups, COALESCE(distributor_code, ''), point_type
FROM profiles
WHERE cups IS NOT NULL
ON CONFLICT (user_id, cups) DO NOTHING;
