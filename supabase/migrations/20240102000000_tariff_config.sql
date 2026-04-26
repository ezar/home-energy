-- Configuración de tarifa eléctrica por usuario

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tariff_type text DEFAULT 'pvpc'
    CHECK (tariff_type IN ('pvpc', 'fixed')),
  ADD COLUMN IF NOT EXISTS price_p1_eur_kwh numeric(8,6),
  ADD COLUMN IF NOT EXISTS price_p2_eur_kwh numeric(8,6),
  ADD COLUMN IF NOT EXISTS price_p3_eur_kwh numeric(8,6),
  ADD COLUMN IF NOT EXISTS power_kw numeric(6,3),
  ADD COLUMN IF NOT EXISTS power_price_eur_kw_month numeric(8,4);
