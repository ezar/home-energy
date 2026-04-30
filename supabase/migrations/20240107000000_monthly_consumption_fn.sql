-- Function: aggregate monthly consumption in SQL to avoid fetching all raw rows
-- Groups hourly rows by YYYY-MM and returns one row per month per user/cups combo

CREATE OR REPLACE FUNCTION get_monthly_consumption(
  p_user_id UUID,
  p_cups    TEXT,
  p_start   TIMESTAMPTZ
)
RETURNS TABLE(month TEXT, total_kwh NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(datetime, 'YYYY-MM') AS month,
    SUM(consumption_kwh)::NUMERIC AS total_kwh
  FROM consumption
  WHERE user_id = p_user_id
    AND (p_cups IS NULL OR cups = p_cups)
    AND datetime >= p_start
  GROUP BY to_char(datetime, 'YYYY-MM')
  ORDER BY month;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_consumption(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
