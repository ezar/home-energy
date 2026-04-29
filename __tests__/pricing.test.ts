import { describe, it, expect } from 'vitest'
import {
  getEnergyPrice,
  applyTaxes,
  monthlyPowerCost,
  tariffConfigFromProfile,
  ELECTRICITY_TAX_RATE,
  VAT_RATE,
} from '@/lib/pricing'
import type { TariffConfig } from '@/lib/pricing'

const fixedConfig: TariffConfig = {
  tariffType: 'fixed',
  priceP1: 0.18,
  priceP2: 0.14,
  priceP3: 0.08,
  powerKw: null,
  powerPriceEurKwMonth: null,
}

const pvpcConfig: TariffConfig = {
  tariffType: 'pvpc',
  priceP1: null,
  priceP2: null,
  priceP3: null,
  powerKw: null,
  powerPriceEurKwMonth: null,
}

describe('getEnergyPrice — fixed tariff', () => {
  it('P1 returns priceP1', () => expect(getEnergyPrice(1, null, fixedConfig)).toBe(0.18))
  it('P2 returns priceP2', () => expect(getEnergyPrice(2, null, fixedConfig)).toBe(0.14))
  it('P3 returns priceP3', () => expect(getEnergyPrice(3, null, fixedConfig)).toBe(0.08))
  it('ignores pvpcPrice for fixed tariff', () => {
    expect(getEnergyPrice(1, 0.99, fixedConfig)).toBe(0.18)
  })
  it('returns 0 when price not configured', () => {
    const cfg: TariffConfig = { ...fixedConfig, priceP1: null }
    expect(getEnergyPrice(1, null, cfg)).toBe(0)
  })
})

describe('getEnergyPrice — pvpc tariff', () => {
  it('returns pvpcPrice for any period', () => {
    expect(getEnergyPrice(1, 0.12345, pvpcConfig)).toBe(0.12345)
    expect(getEnergyPrice(3, 0.09876, pvpcConfig)).toBe(0.09876)
  })
  it('returns 0 when pvpcPrice is null', () => {
    expect(getEnergyPrice(1, null, pvpcConfig)).toBe(0)
  })
})

describe('applyTaxes', () => {
  it('calculates electricity tax and VAT on energy+power base', () => {
    const result = applyTaxes(10, 5)
    const preImpuesto = 15
    const electricityTax = preImpuesto * ELECTRICITY_TAX_RATE
    const vatBase = preImpuesto + electricityTax
    const vat = vatBase * VAT_RATE

    expect(result.energyCost).toBe(10)
    expect(result.powerCost).toBe(5)
    expect(result.electricityTax).toBeCloseTo(electricityTax, 8)
    expect(result.vatBase).toBeCloseTo(vatBase, 8)
    expect(result.vat).toBeCloseTo(vat, 8)
    expect(result.total).toBeCloseTo(vatBase + vat, 8)
  })

  it('works with zero power cost', () => {
    const result = applyTaxes(20, 0)
    expect(result.powerCost).toBe(0)
    expect(result.total).toBeGreaterThan(20)
  })

  it('total > pre-tax base', () => {
    const { total } = applyTaxes(100, 10)
    expect(total).toBeGreaterThan(110)
  })
})

describe('monthlyPowerCost', () => {
  it('multiplies powerKw × powerPriceEurKwMonth', () => {
    const cfg: TariffConfig = { ...pvpcConfig, powerKw: 3.45, powerPriceEurKwMonth: 3.113 }
    expect(monthlyPowerCost(cfg)).toBeCloseTo(3.45 * 3.113, 6)
  })

  it('returns 0 when powerKw is null', () => {
    expect(monthlyPowerCost({ ...pvpcConfig, powerKw: null, powerPriceEurKwMonth: 3.113 })).toBe(0)
  })

  it('returns 0 when powerPriceEurKwMonth is null', () => {
    expect(monthlyPowerCost({ ...pvpcConfig, powerKw: 3.45, powerPriceEurKwMonth: null })).toBe(0)
  })
})

describe('tariffConfigFromProfile', () => {
  it('maps all profile fields', () => {
    const cfg = tariffConfigFromProfile({
      tariff_type: 'fixed',
      price_p1_eur_kwh: 0.18,
      price_p2_eur_kwh: 0.14,
      price_p3_eur_kwh: 0.08,
      power_kw: 3.45,
      power_price_eur_kw_month: 3.113,
    })
    expect(cfg.tariffType).toBe('fixed')
    expect(cfg.priceP1).toBe(0.18)
    expect(cfg.priceP2).toBe(0.14)
    expect(cfg.priceP3).toBe(0.08)
    expect(cfg.powerKw).toBe(3.45)
    expect(cfg.powerPriceEurKwMonth).toBe(3.113)
  })

  it('defaults tariffType to pvpc', () => {
    expect(tariffConfigFromProfile({}).tariffType).toBe('pvpc')
  })

  it('nulls missing price fields', () => {
    const cfg = tariffConfigFromProfile({ tariff_type: 'pvpc' })
    expect(cfg.priceP1).toBeNull()
    expect(cfg.powerKw).toBeNull()
  })
})
