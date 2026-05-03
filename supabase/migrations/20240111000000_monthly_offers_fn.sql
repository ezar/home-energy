-- Agrega consumo + coste PVPC por mes en SQL, evitando el límite de 1000 filas
-- de PostgREST al traer datos en bruto. Devuelve una fila por mes.

CREATE OR REPLACE FUNCTION get_monthly_offers_data(
  p_user_id UUID,
  p_start   TIMESTAMPTZ
)
RETURNS TABLE(
  month     TEXT,
  p1_kwh    NUMERIC,
  p2_kwh    NUMERIC,
  p3_kwh    NUMERIC,
  total_kwh NUMERIC,
  pvpc_cost NUMERIC,
  pvpc_kwh  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(c.datetime, 'YYYY-MM')                                                                    AS month,
    SUM(CASE WHEN c.period = 1 THEN c.consumption_kwh ELSE 0 END)::NUMERIC                           AS p1_kwh,
    SUM(CASE WHEN c.period = 2 THEN c.consumption_kwh ELSE 0 END)::NUMERIC                           AS p2_kwh,
    SUM(CASE WHEN c.period = 3 THEN c.consumption_kwh ELSE 0 END)::NUMERIC                           AS p3_kwh,
    SUM(c.consumption_kwh)::NUMERIC                                                                   AS total_kwh,
    SUM(CASE WHEN p.price_eur_kwh IS NOT NULL THEN c.consumption_kwh * p.price_eur_kwh ELSE 0 END)::NUMERIC AS pvpc_cost,
    SUM(CASE WHEN p.price_eur_kwh IS NOT NULL THEN c.consumption_kwh                   ELSE 0 END)::NUMERIC AS pvpc_kwh
  FROM consumption c
  LEFT JOIN pvpc_prices p ON p.datetime = c.datetime
  WHERE c.user_id = p_user_id
    AND c.datetime >= p_start
  GROUP BY to_char(c.datetime, 'YYYY-MM')
  ORDER BY month;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_offers_data(UUID, TIMESTAMPTZ) TO authenticated;
