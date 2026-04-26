// Lógica centralizada de precios y facturación eléctrica
// Soporta tarifa PVPC (variable horaria) y tarifa fija por período

export type TariffConfig = {
  tariffType: 'pvpc' | 'fixed'
  priceP1: number | null  // €/kWh
  priceP2: number | null
  priceP3: number | null
  powerKw: number | null
  powerPriceEurKwMonth: number | null
}

// Impuesto especial sobre electricidad: 5.11269%
export const ELECTRICITY_TAX_RATE = 0.0511269
// IVA general: 21%
export const VAT_RATE = 0.21

export function getEnergyPrice(
  period: 1 | 2 | 3,
  pvpcPrice: number | null,
  config: TariffConfig,
): number {
  if (config.tariffType === 'fixed') {
    return period === 1 ? (config.priceP1 ?? 0)
         : period === 2 ? (config.priceP2 ?? 0)
         : (config.priceP3 ?? 0)
  }
  return pvpcPrice ?? 0
}

export function monthlyPowerCost(config: TariffConfig): number {
  if (!config.powerKw || !config.powerPriceEurKwMonth) return 0
  return config.powerKw * config.powerPriceEurKwMonth
}

export function applyTaxes(energyCost: number, powerCost: number) {
  const preImpuesto = energyCost + powerCost
  const electricityTax = preImpuesto * ELECTRICITY_TAX_RATE
  const vatBase = preImpuesto + electricityTax
  const vat = vatBase * VAT_RATE
  return {
    energyCost,
    powerCost,
    electricityTax,
    vatBase,
    vat,
    total: vatBase + vat,
  }
}

export function tariffConfigFromProfile(profile: {
  tariff_type?: 'pvpc' | 'fixed' | null
  price_p1_eur_kwh?: number | null
  price_p2_eur_kwh?: number | null
  price_p3_eur_kwh?: number | null
  power_kw?: number | null
  power_price_eur_kw_month?: number | null
}): TariffConfig {
  return {
    tariffType: profile.tariff_type ?? 'pvpc',
    priceP1: profile.price_p1_eur_kwh ?? null,
    priceP2: profile.price_p2_eur_kwh ?? null,
    priceP3: profile.price_p3_eur_kwh ?? null,
    powerKw: profile.power_kw ?? null,
    powerPriceEurKwMonth: profile.power_price_eur_kw_month ?? null,
  }
}
