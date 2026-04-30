-- Function: aggregate daily consumption in SQL to avoid the PostgREST row-count cap.
-- Joins with pvpc_prices (timezone-aware) to compute hourly cost, then groups by day.
-- Consumption datetimes are "fake UTC" (Spanish local time stored as UTC).
-- PVPC datetimes are real UTC → converted to Madrid local time for the join.

CREATE OR REPLACE FUNCTION get_daily_consumption(
  p_user_id UUID,
  p_cups    TEXT,
  p_start   TIMESTAMPTZ
)
RETURNS TABLE(
  day       TEXT,
  total_kwh NUMERIC,
  kwh_p1    NUMERIC,
  kwh_p2    NUMERIC,
  kwh_p3    NUMERIC,
  cost_eur  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(c.datetime, 'YYYY-MM-DD')                                       AS day,
    SUM(c.consumption_kwh)::NUMERIC                                         AS total_kwh,
    SUM(CASE WHEN c.period = 1 THEN c.consumption_kwh ELSE 0 END)::NUMERIC  AS kwh_p1,
    SUM(CASE WHEN c.period = 2 THEN c.consumption_kwh ELSE 0 END)::NUMERIC  AS kwh_p2,
    SUM(CASE WHEN c.period = 3 THEN c.consumption_kwh ELSE 0 END)::NUMERIC  AS kwh_p3,
    COALESCE(SUM(c.consumption_kwh * p.price_eur_kwh), 0)::NUMERIC          AS cost_eur
  FROM consumption c
  LEFT JOIN pvpc_prices p
    ON (p.datetime AT TIME ZONE 'Europe/Madrid') = (c.datetime AT TIME ZONE 'UTC')
  WHERE c.user_id = p_user_id
    AND (p_cups IS NULL OR c.cups = p_cups)
    AND c.datetime >= p_start
  GROUP BY to_char(c.datetime, 'YYYY-MM-DD')
  ORDER BY day;
$$;

GRANT EXECUTE ON FUNCTION get_daily_consumption(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
