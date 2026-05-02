import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import { CostLineChart } from '@/components/charts/CostLineChart'
import { TariffSimulator } from './TariffSimulator'
import { CupsSelector } from '@/components/dashboard/CupsSelector'
import { startOfMonth, subMonths, startOfDay, subDays, format, getDate, getDaysInMonth } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import type { ConsumptionRow, PvpcPriceRow, ProfileRow, MaximeterRow, UserSupplyRow } from '@/lib/supabase/types-helper'
import {
  tariffConfigFromProfile, getEnergyPrice,
  monthlyPowerCost, applyTaxes, VAT_RATE, ELECTRICITY_TAX_RATE,
} from '@/lib/pricing'
import { PERIOD_COLORS, COLOR_SUCCESS, COLOR_DANGER } from '@/lib/constants'
import { CARD_STYLE as CARD } from '@/lib/ui-styles'

export const dynamic = 'force-dynamic'
const PERIOD_NAMES_STATIC: Record<number, string> = { 1: 'P1 Punta', 2: 'P2 Llano', 3: 'P3 Valle' }

export default async function CostePage({ searchParams }: { searchParams: { cups?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [locale, t, tp] = await Promise.all([
    getLocale(),
    getTranslations('Cost'),
    getTranslations('Period'),
  ])
  const dateFnsLocale = locale === 'en' ? enUS : es

  const selectedCups = searchParams.cups ?? null
  const now = new Date()

  const [profileResult, maximeterResult, maximeter3mResult, suppliesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('tariff_type, price_p1_eur_kwh, price_p2_eur_kwh, price_p3_eur_kwh, power_kw, power_price_eur_kw_month, month_view_mode')
      .eq('id', user.id)
      .single(),
    (() => {
      let q = supabase.from('maximeter').select('datetime, max_power_kw, period')
        .eq('user_id', user.id).gte('datetime', startOfMonth(now).toISOString())
        .order('max_power_kw', { ascending: false }).limit(10)
      if (selectedCups) q = q.eq('cups', selectedCups)
      return q
    })(),
    (() => {
      let q = supabase.from('maximeter').select('max_power_kw')
        .eq('user_id', user.id).gte('datetime', startOfMonth(subMonths(now, 3)).toISOString())
        .order('max_power_kw', { ascending: false }).limit(500)
      if (selectedCups) q = q.eq('cups', selectedCups)
      return q
    })(),
    supabase.from('user_supplies').select('cups, display_name').eq('user_id', user.id).eq('is_active', true),
  ])

  type MaxRow = Pick<MaximeterRow, 'datetime' | 'max_power_kw' | 'period'>
  const maximeterRows = (maximeterResult.data ?? []) as MaxRow[]
  const maximeter3mRows = (maximeter3mResult.data ?? []) as Pick<MaximeterRow, 'max_power_kw'>[]
  const supplies = (suppliesResult.data ?? []) as Pick<UserSupplyRow, 'cups' | 'display_name'>[]

  const profileData = (profileResult.data ?? {}) as Pick<ProfileRow,
    'tariff_type' | 'price_p1_eur_kwh' | 'price_p2_eur_kwh' | 'price_p3_eur_kwh' | 'power_kw' | 'power_price_eur_kw_month' | 'month_view_mode'>
  const tariffConfig = tariffConfigFromProfile(profileData)
  const isRolling = profileData.month_view_mode === 'rolling_30d'

  const months = isRolling
    ? [
        { label: t('last30days'), shortLabel: '30d', start: startOfDay(subDays(now, 30)).toISOString(), end: now.toISOString(), isCurrentMonth: true },
        { label: t('prev30days'), shortLabel: '-30d', start: startOfDay(subDays(now, 60)).toISOString(), end: startOfDay(subDays(now, 30)).toISOString(), isCurrentMonth: false },
        { label: t('prev60days'), shortLabel: '-60d', start: startOfDay(subDays(now, 90)).toISOString(), end: startOfDay(subDays(now, 60)).toISOString(), isCurrentMonth: false },
      ]
    : [0, 1, 2].map(offset => {
        const d = subMonths(now, offset)
        return {
          label: format(d, 'MMMM yyyy', { locale: dateFnsLocale }),
          shortLabel: format(d, 'MMM', { locale: dateFnsLocale }),
          start: startOfMonth(d).toISOString(),
          end: offset === 0 ? now.toISOString() : startOfMonth(subMonths(d, -1)).toISOString(),
          isCurrentMonth: offset === 0,
        }
      })

  type CRow = Pick<ConsumptionRow, 'consumption_kwh' | 'period' | 'datetime'>
  type PRow = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>

  const monthlyStats = await Promise.all(
    months.map(async ({ label, shortLabel, start, end, isCurrentMonth }) => {
      let consumptionQ = supabase.from('consumption').select('consumption_kwh, period, datetime')
        .eq('user_id', user.id).gte('datetime', start).lt('datetime', end)
        .limit(3000)  // 1 month × 24h × up to N cups
      if (selectedCups) consumptionQ = consumptionQ.eq('cups', selectedCups)

      const queries: [Promise<{ data: CRow[] | null }>, Promise<{ data: PRow[] | null }>] = [
        consumptionQ as unknown as Promise<{ data: CRow[] | null }>,
        (supabase.from('pvpc_prices').select('datetime, price_eur_kwh').gte('datetime', start).lt('datetime', end).limit(1000)) as unknown as Promise<{ data: PRow[] | null }>,
      ]
      const [{ data: consumptionRaw }, { data: pvpcRaw }] = await Promise.all(queries)
      const consumption = (consumptionRaw ?? []) as CRow[]
      const pvpc = (pvpcRaw ?? []) as PRow[]
      const pvpcMap = new Map(pvpc.map(p => [p.datetime, p.price_eur_kwh]))

      let totalKwh = 0, totalCost = 0, marketCost = 0, marketCoveredKwh = 0
      let p1Kwh = 0, p2Kwh = 0, p3Kwh = 0
      let p1Cost = 0, p2Cost = 0, p3Cost = 0

      const dailyMap = new Map<number, number>()
      for (const r of consumption) {
        const period = (r.period ?? 3) as 1 | 2 | 3
        const pvpcPrice = pvpcMap.get(r.datetime) ?? null
        const price = getEnergyPrice(period, pvpcPrice, tariffConfig)
        const cost = r.consumption_kwh * price
        totalKwh += r.consumption_kwh
        totalCost += cost
        if (period === 1) { p1Kwh += r.consumption_kwh; p1Cost += cost }
        else if (period === 2) { p2Kwh += r.consumption_kwh; p2Cost += cost }
        else { p3Kwh += r.consumption_kwh; p3Cost += cost }

        if (pvpcPrice !== null) {
          marketCost += r.consumption_kwh * pvpcPrice
          marketCoveredKwh += r.consumption_kwh
        }

        const day = getDate(new Date(r.datetime))
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + cost)
      }

      const dailyCumul: { day: number; cumCost: number }[] = []
      let cum = 0
      Array.from(dailyMap.entries()).sort(([a], [b]) => a - b).forEach(([day, cost]) => {
        cum += cost
        dailyCumul.push({ day, cumCost: parseFloat(cum.toFixed(2)) })
      })

      return { label, shortLabel, totalKwh, totalCost, p1Kwh, p2Kwh, p3Kwh, p1Cost, p2Cost, p3Cost, dailyCumul, isCurrentMonth, marketCost, marketCoveredKwh }
    })
  )

  const PERIOD_NAMES: Record<number, string> = { 1: tp('1'), 2: tp('2'), 3: tp('3') }

  const current = monthlyStats[0]
  const avgPrice = current.totalKwh > 0 ? current.totalCost / current.totalKwh : 0

  // Factura breakdown
  const powerTerm = monthlyPowerCost(tariffConfig)
  const bill = applyTaxes(current.totalCost, powerTerm)

  // Proyección fin de mes (mínimo 5 días para que la extrapolación sea fiable)
  const daysElapsed = getDate(now)
  const daysInMonth = getDaysInMonth(now)
  const hasEnoughDaysForProjection = daysElapsed >= 5
  const projectedEnergy = hasEnoughDaysForProjection ? current.totalCost / daysElapsed * daysInMonth : 0
  const projectedBill = applyTaxes(projectedEnergy, powerTerm)

  const byPeriod = [
    { period: 1 as const, kwh: current.p1Kwh, cost: current.p1Cost },
    { period: 2 as const, kwh: current.p2Kwh, cost: current.p2Cost },
    { period: 3 as const, kwh: current.p3Kwh, cost: current.p3Cost },
  ]

  const hasPower = tariffConfig.powerKw && tariffConfig.powerPriceEurKwMonth

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {supplies.length > 1 && <CupsSelector supplies={supplies} selected={selectedCups} />}
      {/* Top stats */}
      <div className="g3">
        {[
          { label: t('energyNoTax'), val: current.totalCost.toFixed(2), unit: '€', color: 'var(--text)' },
          { label: t('kwhConsumed'), val: current.totalKwh.toFixed(1), unit: 'kWh', color: '#38bdf8' },
          { label: t('avgEnergyPrice'), val: avgPrice > 0 ? avgPrice.toFixed(5) : '—', unit: '€/kWh', color: '#a78bfa' },
        ].map(item => (
          <div key={item.label} style={CARD}>
            <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
              {item.val} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Period breakdown */}
      <div style={CARD}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {t('periodBreakdown')}
        </div>
        <div className="g3" style={{ gap: 10 }}>
          {byPeriod.map(({ period, kwh, cost }) => {
            const color = PERIOD_COLORS[period]
            const pct = current.totalKwh > 0 ? Math.round(kwh / current.totalKwh * 100) : 0
            const avgP = kwh > 0 ? cost / kwh : 0
            const fixedPrice = tariffConfig.tariffType === 'fixed'
              ? (period === 1 ? tariffConfig.priceP1 : period === 2 ? tariffConfig.priceP2 : tariffConfig.priceP3)
              : null
            return (
              <div key={period} style={{ borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}30`, background: `${color}08` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}60` }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{PERIOD_NAMES[period]}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dim)', fontWeight: 500 }}>{pct}%</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {kwh.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--muted-c)', marginLeft: 4, fontFamily: 'var(--font-sans)' }}>kWh</span>
                </div>
                <div style={{ fontSize: 14, color: COLOR_SUCCESS, marginTop: 3, fontFamily: 'var(--font-mono)' }}>{cost.toFixed(2)} €</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6 }}>
                  {fixedPrice != null
                    ? <span>{t('fixedPrice')} <span style={{ color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{fixedPrice.toFixed(5)} €/kWh</span></span>
                    : <span>{t('avgPrice')} <span style={{ color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{avgP > 0 ? avgP.toFixed(5) : '—'} €/kWh</span></span>
                  }
                </div>
                <div style={{ marginTop: 8, background: 'var(--bg-inset)', borderRadius: 3, height: 3 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, boxShadow: `0 0 4px ${color}50` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Factura estimada */}
      <div className="g2">
        {/* Breakdown */}
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            {t('estimatedBill', { month: current.label })}
          </div>
          {[
            { label: t('energyTerm'), val: current.totalCost, color: '#60a5fa' },
            ...(hasPower ? [{ label: t('powerTerm', { kw: tariffConfig.powerKw }), val: powerTerm, color: '#a78bfa' }] : []),
            { label: t('electricityTax', { pct: (ELECTRICITY_TAX_RATE * 100).toFixed(2) }), val: bill.electricityTax, color: 'var(--muted-c)' },
            { label: t('vat', { pct: (VAT_RATE * 100).toFixed(0) }), val: bill.vat, color: 'var(--muted-c)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color, fontFamily: 'var(--font-mono)' }}>{val.toFixed(2)} €</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('totalWithVat')}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)' }}>{bill.total.toFixed(2)} €</span>
          </div>
          {!hasPower && (
            <p style={{ fontSize: 10.5, color: 'var(--dim2)', marginTop: 10 }}>
              {t('noPowerNote')}
            </p>
          )}
        </div>

        {/* Proyección */}
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {t('projection')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 14 }}>
            {t('projectionNote', { days: daysElapsed })}
          </div>
          {hasEnoughDaysForProjection ? [
            { label: t('projectedEnergy'), val: projectedEnergy.toFixed(2), unit: '€', color: '#60a5fa' },
            ...(hasPower ? [{ label: t('projectedPower'), val: powerTerm.toFixed(2), unit: '€', color: '#a78bfa' }] : []),
            { label: t('projectedWithTax'), val: projectedBill.total.toFixed(2), unit: '€', color: COLOR_SUCCESS },
          ].map(({ label, val, unit, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>{val} {unit}</span>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: 'var(--dim2)', padding: '8px 0' }}>
              {t('projectionTooEarly')}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 6 }}>
              {t('monthProgress', { elapsed: daysElapsed, total: daysInMonth })}
            </div>
            <div style={{ height: 6, background: 'var(--bg-inset)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, daysElapsed / daysInMonth * 100)}%`,
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #f59e0b, #f97316)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Eficiencia vs mercado (solo tarifa fija) */}
      {tariffConfig.tariffType === 'fixed' && current.marketCost > 0 && (() => {
        const savedVsMarket = current.marketCost - current.totalCost
        const savedSign = savedVsMarket > 0
        const savedColor = savedSign ? COLOR_SUCCESS : COLOR_DANGER
        const avgFixed = current.totalKwh > 0 ? current.totalCost / current.totalKwh : 0
        const avgMarket = current.marketCoveredKwh > 0 ? current.marketCost / current.marketCoveredKwh : 0
        const coveragePct = current.totalKwh > 0 ? Math.round(current.marketCoveredKwh / current.totalKwh * 100) : 0
        return (
          <div style={CARD}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              {t('vsMarket', { month: current.label })}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { label: t('yourCost'), val: current.totalCost.toFixed(2), unit: '€', color: '#60a5fa', note: `${avgFixed.toFixed(5)} €/kWh` },
                { label: t('marketCost'), val: current.marketCost.toFixed(2), unit: '€', color: '#a78bfa', note: `${avgMarket.toFixed(5)} €/kWh` },
              ].map(({ label, val, unit, color, note }) => (
                <div key={label} style={{ flex: '1 1 140px', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{val} <span style={{ fontSize: 12, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>{unit}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{note}</div>
                </div>
              ))}
              <div style={{ flex: '1 1 140px', padding: '12px 14px', borderRadius: 10, background: savedSign ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${savedColor}30` }}>
                <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 6 }}>{savedSign ? t('savedVsMarket') : t('paidMoreVsMarket')}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: savedColor, fontFamily: 'var(--font-mono)' }}>
                  {savedSign ? '+' : ''}{savedVsMarket.toFixed(2)} <span style={{ fontSize: 12, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>€</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>
                  {t('pvpcCoverage', { pct: coveragePct })}
                </div>
              </div>
            </div>
            {coveragePct < 90 && (
              <p style={{ fontSize: 10.5, color: 'var(--dim2)', margin: 0 }}>
                {t('pvpcCoverageNote', { pct: coveragePct })}
              </p>
            )}
          </div>
        )
      })()}

      {/* Maxímetro */}
      {maximeterRows.length > 0 && (() => {
        const peak = maximeterRows[0]
        const peakKw = peak.max_power_kw
        const contracted = tariffConfig.powerKw ?? 0
        const exceeded = contracted > 0 && peakKw > contracted
        const peakColor = exceeded ? COLOR_DANGER : COLOR_SUCCESS
        return (
          <div style={{ ...CARD, borderColor: exceeded ? 'rgba(248,113,113,0.3)' : 'var(--border-c)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('maximeter', { month: format(now, 'MMMM yyyy', { locale: dateFnsLocale }) })}
              </div>
              {exceeded && (
                <div style={{ fontSize: 10.5, fontWeight: 600, color: COLOR_DANGER, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '3px 9px' }}>
                  {t('powerExceeded')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 130px', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-inset)', border: `1px solid ${peakColor}30` }}>
                <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 6 }}>{t('peakPower')}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: peakColor, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                  {peakKw.toFixed(3)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>kW</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 4 }}>
                  {format(new Date(peak.datetime), "d MMM · HH:mm", { locale: dateFnsLocale })}
                  {peak.period && <span style={{ marginLeft: 6 }}>· {PERIOD_NAMES[peak.period] ?? ''}</span>}
                </div>
              </div>
              {contracted > 0 && (
                <div style={{ flex: '1 1 130px', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 6 }}>{t('contractedPower')}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {contracted.toFixed(3)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>kW</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: exceeded ? COLOR_DANGER : COLOR_SUCCESS, marginTop: 4, fontWeight: 500 }}>
                    {exceeded
                      ? t('excess', { kw: (peakKw - contracted).toFixed(3) })
                      : t('margin', { kw: (contracted - peakKw).toFixed(3) })}
                  </div>
                </div>
              )}
              <div style={{ flex: '2 1 200px', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-inset)', border: '1px solid var(--border-c)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 2 }}>{t('topPeaks')}</div>
                {maximeterRows.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(r.datetime), 'd MMM HH:mm', { locale: dateFnsLocale })}
                    </span>
                    <span style={{ color: contracted > 0 && r.max_power_kw > contracted ? COLOR_DANGER : 'var(--text-2)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {r.max_power_kw.toFixed(3)} kW
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {exceeded && (
              <p style={{ fontSize: 10.5, color: 'var(--dim2)', margin: '10px 0 0', lineHeight: 1.6 }}>
                {t('exceededWarning')}
              </p>
            )}
          </div>
        )
      })()}

      {/* Recomendación de potencia óptima */}
      {maximeter3mRows.length > 0 && tariffConfig.powerKw && tariffConfig.powerKw > 0 && (() => {
        const peak3m = maximeter3mRows[0].max_power_kw
        const contracted = tariffConfig.powerKw!
        const pricePerKw = tariffConfig.powerPriceEurKwMonth ?? 0

        // Suggested power = peak with 20% safety margin, rounded to 0.01
        const suggested = Math.ceil(peak3m * 1.2 * 100) / 100
        const canDowngrade = suggested < contracted * 0.92 && pricePerKw > 0
        const needsUpgrade = peak3m > contracted

        if (!canDowngrade && !needsUpgrade) return null

        const monthlySaving = canDowngrade ? (contracted - suggested) * pricePerKw : 0
        const annualSaving = monthlySaving * 12
        const upgradeKw = Math.ceil(peak3m * 1.1 * 100) / 100

        const isDowngrade = canDowngrade && !needsUpgrade
        const accentColor = isDowngrade ? '#34d399' : '#f59e0b'
        const bgAlpha = isDowngrade ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)'
        const borderAlpha = isDowngrade ? 'rgba(52,211,153,0.25)' : 'rgba(245,158,11,0.25)'

        return (
          <div style={{ ...CARD, borderColor: borderAlpha, background: bgAlpha }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('powerRecommendation')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim2)' }}>{t('powerPeriod')}</div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 160px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: accentColor, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  {isDowngrade ? suggested.toFixed(2) : upgradeKw.toFixed(2)}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)', marginLeft: 4 }}>kW</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, marginBottom: 4 }}>
                  {isDowngrade ? t('powerDowngrade') : t('powerUpgradeNeeded')}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--dim)' }}>
                  {t('powerPeak3m', { peak: peak3m.toFixed(3) })}
                </div>
              </div>
              {isDowngrade && (
                <div style={{ flex: '1 1 140px', padding: '10px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{t('powerSavings')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    {monthlySaving.toFixed(2)} €<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>/mes</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {annualSaving.toFixed(0)} € {t('powerSavingsAnnual')}
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim2)', marginTop: 10, lineHeight: 1.6 }}>
              {isDowngrade ? t('powerSafeMargin') : t('powerUpgradeWarning')}
            </div>
          </div>
        )
      })()}

      {/* Calculadora de cambio de tarifa */}
      <TariffSimulator
        months={monthlyStats.map(m => ({
          label: m.label,
          p1Kwh: m.p1Kwh,
          p2Kwh: m.p2Kwh,
          p3Kwh: m.p3Kwh,
          actualCost: m.totalCost,
        }))}
        currentP1={tariffConfig.tariffType === 'fixed' ? tariffConfig.priceP1 : null}
        currentP2={tariffConfig.tariffType === 'fixed' ? tariffConfig.priceP2 : null}
        currentP3={tariffConfig.tariffType === 'fixed' ? tariffConfig.priceP3 : null}
      />

      {/* Chart + history */}
      <div className="g2">
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('cumulativeCost', { month: current.label })}
          </div>
          <CostLineChart data={current.dailyCumul} />
          {current.dailyCumul.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--dim)' }}>
              {t('energyLabel')} <span style={{ color: COLOR_SUCCESS, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{current.totalCost.toFixed(2)} €</span>
              {hasPower && <span style={{ marginLeft: 8 }}>· {t('powerLabel')} <span style={{ color: '#a78bfa', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{powerTerm.toFixed(2)} €</span></span>}
            </div>
          )}
        </div>

        <div style={{ ...CARD, overflow: 'auto', maxHeight: 280 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('monthlyHistory')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {[t('colMonth'), t('colKwh'), t('colAvgPrice'), t('colEnergy')].map(h => (
              <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
            ))}
            {monthlyStats.map((m, i) => (
              <>
                <div key={`m${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{m.label.split(' ')[0]}</div>
                <div key={`k${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{m.totalKwh.toFixed(1)}</div>
                <div key={`p${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                  {m.totalKwh > 0 ? (m.totalCost / m.totalKwh).toFixed(4) : '—'}
                </div>
                <div key={`c${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)' }}>{m.totalCost.toFixed(2)}</div>
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
