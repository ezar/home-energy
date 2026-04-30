import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Zap, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { startOfMonth, subMonths, format, subHours, startOfDay, addDays } from 'date-fns'
import type { ConsumptionRow, PvpcPriceRow, ProfileRow, UserSupplyRow } from '@/lib/supabase/types-helper'
import { CupsSelector } from '@/components/dashboard/CupsSelector'
import { StatCard } from '@/components/dashboard/StatCard'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'
import { PvpcBarChart } from '@/components/charts/PvpcBarChart'
import { PvpcSparkline } from '@/components/charts/PvpcSparkline'
import { HomeDailyChart } from '@/components/charts/HomeDailyChart'
import { tariffConfigFromProfile, getEnergyPrice } from '@/lib/pricing'
import { getPeriod } from '@/lib/tariff'
import { PERIOD_COLORS, COLOR_SUCCESS, COLOR_DANGER, COLOR_WARNING, COLOR_INFO, COLOR_PURPLE, COLOR_CYAN } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type MonthRow = Pick<ConsumptionRow, 'consumption_kwh' | 'datetime'>
type LatestRow = Pick<ConsumptionRow, 'datetime'>
type PvpcRow = Pick<PvpcPriceRow, 'price_eur_kwh' | 'datetime'>
type Appliance = { name: string; duration: number; icon: string; color: string }
type ApplianceSuggestion = Appliance & { start: Date; avgPrice: number }

export default async function HomePage({ searchParams }: { searchParams: { cups?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: onboardingCheck } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (onboardingCheck && !(onboardingCheck as { onboarding_completed: boolean }).onboarding_completed) {
    redirect('/welcome')
  }

  const selectedCups = searchParams.cups ?? null
  const now = new Date()
  const startThisMonth = startOfMonth(now).toISOString()
  const startLastMonth = startOfMonth(subMonths(now, 1)).toISOString()
  const endLastMonth = startThisMonth
  const start24h = subHours(now, 24).toISOString()
  const startToday = startOfDay(now).toISOString()
  const endTomorrow = startOfDay(addDays(now, 2)).toISOString()

  let qThisMonth = supabase.from('consumption').select('consumption_kwh, datetime').eq('user_id', user.id).gte('datetime', startThisMonth).limit(3000)
  if (selectedCups) qThisMonth = qThisMonth.eq('cups', selectedCups)

  let qLastMonth = supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startLastMonth).lt('datetime', endLastMonth).limit(3000)
  if (selectedCups) qLastMonth = qLastMonth.eq('cups', selectedCups)

  let qLatest = supabase.from('consumption').select('datetime').eq('user_id', user.id).order('datetime', { ascending: false }).limit(1)
  if (selectedCups) qLatest = qLatest.eq('cups', selectedCups)

  const [profileResult, thisMonthResult, lastMonthResult, latestResult, pvpcNowResult, pvpc24hResult, pvpcTodayResult, suppliesResult] =
    await Promise.all([
      supabase.from('profiles').select('last_sync_at, cups, distributor_code, tariff_type, price_p1_eur_kwh, price_p2_eur_kwh, price_p3_eur_kwh, power_kw, power_price_eur_kw_month, monthly_kwh_target').eq('id', user.id).single(),
      qThisMonth,
      qLastMonth,
      qLatest,
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').order('datetime', { ascending: false }).limit(1),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').gte('datetime', start24h).order('datetime', { ascending: true }),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').gte('datetime', startToday).lt('datetime', endTomorrow).order('datetime', { ascending: true }),
      supabase.from('user_supplies').select('cups, display_name').eq('user_id', user.id).eq('is_active', true),
    ])

  const profile = profileResult.data as Pick<ProfileRow, 'last_sync_at' | 'cups' | 'distributor_code' | 'tariff_type' | 'price_p1_eur_kwh' | 'price_p2_eur_kwh' | 'price_p3_eur_kwh' | 'power_kw' | 'power_price_eur_kw_month' | 'monthly_kwh_target'> | null
  const thisMonthRows = (thisMonthResult.data ?? []) as MonthRow[]
  const lastMonthRows = (lastMonthResult.data ?? []) as MonthRow[]
  const latestRows = (latestResult.data ?? []) as LatestRow[]
  const pvpcNow = ((pvpcNowResult.data ?? []) as PvpcRow[])[0] ?? null
  const pvpc24h = (pvpc24hResult.data ?? []) as PvpcRow[]
  const pvpcToday = (pvpcTodayResult.data ?? []) as PvpcRow[]
  const supplies = (suppliesResult.data ?? []) as Pick<UserSupplyRow, 'cups' | 'display_name'>[]

  const t = await getTranslations('Home')
  const tp = await getTranslations('Period')
  const tc = await getTranslations('Common')

  const tariffConfig = tariffConfigFromProfile(profile ?? {})
  const currentPeriod = getPeriod(now)
  const currentPeriodPrice = getEnergyPrice(currentPeriod, pvpcNow?.price_eur_kwh ?? null, tariffConfig)
  const PERIOD_NAMES: Record<number, string> = { 1: tp('1'), 2: tp('2'), 3: tp('3') }

  const thisMonthKwh = thisMonthRows.reduce((s, r) => s + r.consumption_kwh, 0)
  const lastMonthKwh = lastMonthRows.reduce((s, r) => s + r.consumption_kwh, 0)
  const estimatedCostEur = pvpcNow ? thisMonthKwh * pvpcNow.price_eur_kwh : null
  const avgPvpc = pvpcNow ? pvpcNow.price_eur_kwh : null
  const monthTrend = lastMonthKwh > 0 ? ((thisMonthKwh - lastMonthKwh) / lastMonthKwh) * 100 : null
  const latestDatetime = latestRows[0]?.datetime ?? null

  // Period breakdown (P1/P2/P3)
  const periodTotals: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
  const dailyMap: Record<number, number> = {}
  for (const row of thisMonthRows) {
    const dt = new Date(row.datetime)
    const period = getPeriod(dt) as 1 | 2 | 3
    periodTotals[period] += row.consumption_kwh
    const day = dt.getDate()
    dailyMap[day] = (dailyMap[day] ?? 0) + row.consumption_kwh
  }
  const dailyData = Object.entries(dailyMap).map(([day, kwh]) => ({ day: Number(day), kwh })).sort((a, b) => a.day - b.day)
  const avgDailyKwh = dailyData.length > 0 ? dailyData.reduce((s, d) => s + d.kwh, 0) / dailyData.length : 0

  const pvpc24hForChart = pvpc24h.map((p, i) => ({
    hour: new Date(p.datetime).getHours(),
    price: p.price_eur_kwh,
  }))
  const pvpcPrices24h = pvpc24h.map(p => p.price_eur_kwh)
  const minPvpc = pvpcPrices24h.length ? Math.min(...pvpcPrices24h) : null
  const maxPvpc = pvpcPrices24h.length ? Math.max(...pvpcPrices24h) : null
  const avgPvpc24h = pvpcPrices24h.length ? pvpcPrices24h.reduce((a, b) => a + b, 0) / pvpcPrices24h.length : null
  const cheapHour = pvpc24h.length ? new Date(pvpc24h.reduce((a, b) => b.price_eur_kwh < a.price_eur_kwh ? b : a).datetime).getHours() : null
  const expHour = pvpc24h.length ? new Date(pvpc24h.reduce((a, b) => b.price_eur_kwh > a.price_eur_kwh ? b : a).datetime).getHours() : null

  const nowRounded = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
  const upcomingPvpc = pvpcToday.filter(p => new Date(p.datetime) >= nowRounded)
  const bestHoursToday = [...upcomingPvpc].sort((a, b) => a.price_eur_kwh - b.price_eur_kwh).slice(0, 3)

  // Sliding-window O(n): timestamps parsed once, consecutive flags precomputed,
  // running sum updated incrementally — avoids O(n²) of the naïve slice approach.
  function findBestWindow(hours: PvpcRow[], duration: number): { start: Date; avgPrice: number } | null {
    if (hours.length < duration) return null
    const ms = hours.map(h => new Date(h.datetime).getTime())
    // consec[i] = true when hour i is exactly 1h after hour i-1
    const consec = ms.map((t, i) => i === 0 || Math.abs((t - ms[i - 1]) / 3600000 - 1) <= 0.1)

    let windowSum = hours.slice(0, duration).reduce((s, h) => s + h.price_eur_kwh, 0)
    let bestAvg = Infinity
    let bestStart: Date | null = null

    for (let i = 0; i <= hours.length - duration; i++) {
      if (i > 0) windowSum += hours[i + duration - 1].price_eur_kwh - hours[i - 1].price_eur_kwh
      // Verify all hours in window are consecutive (max 4 iterations for longest appliance)
      let ok = true
      for (let j = i + 1; j < i + duration; j++) {
        if (!consec[j]) { ok = false; break }
      }
      if (!ok) continue
      const avg = windowSum / duration
      if (avg < bestAvg) { bestAvg = avg; bestStart = new Date(hours[i].datetime) }
    }
    return bestStart ? { start: bestStart, avgPrice: bestAvg } : null
  }

  const APPLIANCES: Appliance[] = [
    { name: t('appWasher'),     duration: 2, icon: '◎', color: COLOR_INFO },
    { name: t('appDishwasher'), duration: 1, icon: '◈', color: COLOR_SUCCESS },
    { name: t('appOven'),       duration: 1, icon: '▣', color: COLOR_WARNING },
    { name: t('appEV'),         duration: 4, icon: '⏣', color: COLOR_PURPLE },
  ]

  const applianceSuggestions = upcomingPvpc.length > 0
    ? APPLIANCES.map(a => {
        const win = findBestWindow(upcomingPvpc, a.duration)
        return win ? { ...a, ...win } : null
      }).filter((s): s is ApplianceSuggestion => s !== null)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {supplies.length > 1 && <CupsSelector supplies={supplies} selected={selectedCups} />}
      {/* Stat cards */}
      <div className="g4">
        {/* Consumo */}
        <StatCard
          label={t('consumptionMonth')}
          value={thisMonthKwh.toFixed(1)}
          unit="kWh"
          icon={<Zap size={14} color="#f59e0b" />}
          iconBg="rgba(245,158,11,0.15)"
          accentBg="linear-gradient(135deg,rgba(245,158,11,0.12),rgba(249,115,22,0.06))"
          meta={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {monthTrend !== null && (
                <ColorBadge color={monthTrend > 0 ? COLOR_DANGER : COLOR_SUCCESS}>
                  {monthTrend > 0 ? '↑' : '↓'} {Math.abs(monthTrend).toFixed(1)}%
                </ColorBadge>
              )}
              {lastMonthKwh > 0 && (
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>vs {lastMonthKwh.toFixed(1)} kWh</span>
              )}
            </div>
          }
        />

        {/* Coste */}
        <StatCard
          label={t('estimatedCost')}
          value={estimatedCostEur !== null ? estimatedCostEur.toFixed(2) : '—'}
          unit="€"
          icon={<DollarSign size={14} color="#34d399" />}
          iconBg="rgba(52,211,153,0.1)"
          meta={
            <div>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>{t('avgPrice')} </span>
              <span style={{ fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>
                {avgPvpc !== null ? avgPvpc.toFixed(5) : '—'} €/kWh
              </span>
              <div style={{ fontSize: 10.5, color: 'var(--dim2)', fontStyle: 'italic', marginTop: 2 }}>{t('energyOnly')}</div>
            </div>
          }
        />

        {/* Precio ahora */}
        {(() => {
          const isFixed = tariffConfig.tariffType === 'fixed'
          const priceLabel = isFixed ? t('priceNow') : t('pvpcNow')
          const priceVal = currentPeriodPrice > 0 ? currentPeriodPrice.toFixed(5) : '—'
          const periodColor = PERIOD_COLORS[currentPeriod]
          const cheapness = avgPvpc24h && pvpcNow
            ? pvpcNow.price_eur_kwh < avgPvpc24h * 0.85 ? { label: t('cheap'), color: COLOR_SUCCESS }
            : pvpcNow.price_eur_kwh > avgPvpc24h * 1.15 ? { label: t('expensive'), color: COLOR_DANGER }
            : { label: t('normal'), color: COLOR_WARNING }
            : null
          return (
            <StatCard
              label={priceLabel}
              value={priceVal}
              unit="€/kWh"
              icon={<TrendingUp size={14} color="#a78bfa" />}
              iconBg="rgba(167,139,250,0.1)"
              meta={
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: periodColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 10.5, color: periodColor, fontWeight: 500 }}>{PERIOD_NAMES[currentPeriod]}</span>
                    {!isFixed && cheapness && (
                      <span style={{ fontSize: 10, color: cheapness.color, marginLeft: 2 }}>· {cheapness.label}</span>
                    )}
                    {isFixed && <ColorBadge color="#60a5fa">{t('fixed')}</ColorBadge>}
                  </div>
                  {!isFixed && pvpcPrices24h.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <PvpcSparkline data={pvpcPrices24h} />
                    </div>
                  )}
                  {!isFixed && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {cheapHour !== null && <span style={{ fontSize: 10.5, color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)' }}>↓ {cheapHour}:00</span>}
                      {expHour !== null && <span style={{ fontSize: 10.5, color: COLOR_DANGER, fontFamily: 'var(--font-mono)' }}>↑ {expHour}:00</span>}
                    </div>
                  )}
                </div>
              }
            />
          )
        })()}

        {/* Último dato */}
        <StatCard
          label={t('lastData')}
          value={latestDatetime ? format(new Date(latestDatetime), 'dd MMM HH:mm') : tc('noData')}
          icon={<Clock size={14} color={COLOR_CYAN} />}
          iconBg="rgba(56,189,248,0.1)"
          meta={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {profile?.distributor_code && <ColorBadge color={COLOR_CYAN}>Dist. {profile.distributor_code}</ColorBadge>}
              {profile?.cups && (
                <div style={{ fontSize: 10, color: 'var(--dim2)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', lineHeight: 1.5, marginTop: 4 }}>
                  {profile.cups}
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* Period breakdown + Daily trend */}
      {thisMonthKwh > 0 && (
        <div className="g2">
          {/* Period breakdown card */}
          <div style={{
            background: 'var(--card-grad)', border: '1px solid var(--border-c)',
            borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              {t('periodBreakdown')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([1, 2, 3] as const).map(p => {
                const kwh = periodTotals[p]
                const pct = thisMonthKwh > 0 ? (kwh / thisMonthKwh) * 100 : 0
                const color = PERIOD_COLORS[p]
                return (
                  <div key={p}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{PERIOD_NAMES[p]}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{kwh.toFixed(1)} kWh</span>
                        <span style={{ fontSize: 10, color: 'var(--dim)', minWidth: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-inset)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, opacity: 0.75 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily trend card */}
          <div style={{
            background: 'var(--card-grad)', border: '1px solid var(--border-c)',
            borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('dailyTrend')}
              </div>
              {avgDailyKwh > 0 && (
                <span style={{ fontSize: 10.5, color: 'var(--dim2)', fontFamily: 'var(--font-mono)' }}>
                  {t('avgDailyKwh', { avg: avgDailyKwh.toFixed(1) })}
                </span>
              )}
            </div>
            <HomeDailyChart data={dailyData} avgKwh={avgDailyKwh} />
          </div>
        </div>
      )}

      {/* Objetivo mensual */}
      {profile?.monthly_kwh_target && profile.monthly_kwh_target > 0 && (() => {
        const target = profile.monthly_kwh_target
        const pct = Math.min((thisMonthKwh / target) * 100, 110)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const daysElapsed = now.getDate()
        const projected = daysElapsed > 0 ? (thisMonthKwh / daysElapsed) * daysInMonth : 0
        const willExceed = projected > target
        const barColor = pct > 100 ? COLOR_DANGER : pct > 80 ? COLOR_WARNING : COLOR_SUCCESS
        return (
          <div style={{
            background: 'var(--card-grad)', border: `1px solid ${pct > 100 ? 'rgba(248,113,113,0.3)' : 'var(--border-c)'}`,
            borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  {t('monthlyTarget')}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: barColor, fontFamily: 'var(--font-mono)' }}>{thisMonthKwh.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted-c)' }}>/ {target} kWh</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>({pct.toFixed(0)}%)</span>
                </div>
              </div>
              {willExceed && (
                <div style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 6, background: 'rgba(248,113,113,0.12)', color: COLOR_DANGER, border: '1px solid rgba(248,113,113,0.25)', fontWeight: 500, flexShrink: 0 }}>
                  {t('forecast', { value: projected.toFixed(0) })}
                </div>
              )}
            </div>
            <div style={{ height: 8, background: 'var(--bg-inset)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4,
                background: barColor, transition: 'width 0.4s ease',
                boxShadow: `0 0 8px ${barColor}50`,
              }} />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 6 }}>
              {t('daysProgress', { elapsed: daysElapsed, total: daysInMonth, remaining: (target - thisMonthKwh).toFixed(1) })}
            </div>
          </div>
        )
      })()}

      {/* Mejor hora hoy */}
      {bestHoursToday.length > 0 && (
        <div style={{
          background: 'var(--card-grad)', border: '1px solid var(--border-c)',
          borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('bestHourToday')}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim2)' }}>
              {t('hoursAvailable', { count: upcomingPvpc.length, date: format(now, 'dd MMM') })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {bestHoursToday.map((p) => {
              const dt = new Date(p.datetime)
              const hoursDiff = Math.round((dt.getTime() - now.getTime()) / 3600000)
              const isNow = hoursDiff === 0
              const isTomorrow = dt.toDateString() !== now.toDateString()
              const timeLabel = isNow ? t('timeNow') : isTomorrow ? t('timeTomorrow') : t('timeInHours', { hours: hoursDiff })
              const period = getPeriod(dt)
              const pColor = PERIOD_COLORS[period]
              return (
                <div key={p.datetime} style={{
                  flex: '1 1 120px', padding: '10px 12px', borderRadius: 8,
                  background: isNow ? 'rgba(52,211,153,0.08)' : 'rgba(96,165,250,0.05)',
                  border: `1px solid ${isNow ? 'rgba(52,211,153,0.3)' : 'var(--border-c)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                      {String(dt.getHours()).padStart(2, '0')}:00
                    </span>
                    <span style={{ fontSize: 9.5, color: isNow ? COLOR_SUCCESS : COLOR_INFO, fontWeight: 500 }}>
                      {timeLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: COLOR_SUCCESS, marginBottom: 4 }}>
                    {p.price_eur_kwh.toFixed(5)} €/kWh
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: pColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: pColor }}>{PERIOD_NAMES[period]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sugerencias de carga */}
      {applianceSuggestions.length > 0 && (
        <div style={{
          background: 'var(--card-grad)', border: '1px solid var(--border-c)',
          borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('chargeSuggestions')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {applianceSuggestions.map((s) => {
              const endHour = new Date(s.start.getTime() + s.duration * 3600000)
              const isTomorrow = s.start.toDateString() !== now.toDateString()
              const hoursUntil = Math.round((s.start.getTime() - now.getTime()) / 3600000)
              return (
                <div key={s.name} style={{
                  flex: '1 1 140px', padding: '10px 12px', borderRadius: 8,
                  background: `rgba(${s.color === COLOR_INFO ? '96,165,250' : s.color === COLOR_SUCCESS ? '52,211,153' : s.color === COLOR_WARNING ? '251,191,36' : '167,139,250'},0.06)`,
                  border: `1px solid ${s.color}30`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.name}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--dim)' }}>{s.duration}h</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    {String(s.start.getHours()).padStart(2, '0')}:00–{String(endHour.getHours()).padStart(2, '0')}:00
                  </div>
                  <div style={{ fontSize: 11, color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    {s.avgPrice.toFixed(5)} €/kWh
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim2)' }}>
                    {isTomorrow ? t('timeTomorrow') : hoursUntil <= 0 ? t('timeNowImmediately') : t('timeInHours', { hours: hoursUntil })}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim2)', marginTop: 10 }}>
            {t('chargeNote')}
          </div>
        </div>
      )}

      {/* PVPC 24h chart */}
      {pvpc24hForChart.length > 0 && (
        <div style={{
          background: 'var(--card-grad)', border: '1px solid var(--border-c)',
          borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('pvpc24h')}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: t('min'), val: minPvpc?.toFixed(4), color: COLOR_SUCCESS },
                { label: t('max'), val: maxPvpc?.toFixed(4), color: COLOR_DANGER },
                { label: t('avg'), val: avgPvpc24h?.toFixed(4), color: COLOR_PURPLE },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--dim)' }}>{s.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: 'var(--font-mono)' }}>
                    {s.val ?? '—'} €
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PvpcBarChart data={pvpc24hForChart} />
        </div>
      )}
    </div>
  )
}
