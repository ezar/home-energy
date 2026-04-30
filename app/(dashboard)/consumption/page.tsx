import { createClient } from '@/lib/supabase/server'
import { ConsumptionView } from './ConsumptionView'
import { CupsSelector } from '@/components/dashboard/CupsSelector'
import { format, startOfMonth, subMonths, getDay, subDays, startOfDay } from 'date-fns'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'
import type { ConsumptionRow, PvpcPriceRow, UserSupplyRow } from '@/lib/supabase/types-helper'

export const dynamic = 'force-dynamic'

export default async function ConsumoPage({ searchParams }: { searchParams: { cups?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const selectedCups = searchParams.cups ?? null
  const now = new Date()
  const today = startOfDay(now)

  let hourlyQ = supabase
    .from('consumption').select('datetime, consumption_kwh, period')
    .eq('user_id', user.id).gte('datetime', subDays(today, 30).toISOString())
    .order('datetime', { ascending: true })
  if (selectedCups) hourlyQ = hourlyQ.eq('cups', selectedCups)

  let dailyQ = supabase
    .from('consumption').select('datetime, consumption_kwh, period')
    .eq('user_id', user.id).gte('datetime', subDays(today, 90).toISOString())
    .order('datetime', { ascending: true })
  if (selectedCups) dailyQ = dailyQ.eq('cups', selectedCups)

  const monthlyStart = startOfMonth(subMonths(now, 23)).toISOString()

  const [hourlyResult, pvpcResult, dailyRawResult, monthlyRawResult, suppliesResult] = await Promise.all([
    hourlyQ,
    supabase.from('pvpc_prices').select('datetime, price_eur_kwh')
      .gte('datetime', subDays(today, 90).toISOString()).order('datetime', { ascending: true }),
    dailyQ,
    supabase.rpc('get_monthly_consumption', {
      p_user_id: user.id,
      p_cups: selectedCups,
      p_start: monthlyStart,
    }),
    supabase.from('user_supplies').select('cups, display_name').eq('user_id', user.id).eq('is_active', true),
  ])

  type HourlyRow = Pick<ConsumptionRow, 'datetime' | 'consumption_kwh' | 'period'>
  type PvpcRow = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>

  const hourlyRows = (hourlyResult.data ?? []) as HourlyRow[]
  const pvpcRows = (pvpcResult.data ?? []) as PvpcRow[]
  const dailyRows = (dailyRawResult.data ?? []) as HourlyRow[]
  const monthlyAgg = (monthlyRawResult.data ?? []) as { month: string; total_kwh: number }[]
  const supplies = (suppliesResult.data ?? []) as Pick<UserSupplyRow, 'cups' | 'display_name'>[]

  const pvpcMap = new Map<string, number>(pvpcRows.map((p) => [p.datetime, p.price_eur_kwh]))

  // Debug: log first datetime from each source to detect format mismatch
  if (process.env.NODE_ENV !== 'production') {
    console.log('[pvpc-debug] pvpc[0]:', pvpcRows[0]?.datetime)
    console.log('[pvpc-debug] hourly[0]:', hourlyRows[0]?.datetime)
    console.log('[pvpc-debug] pvpcMap size:', pvpcMap.size)
    console.log('[pvpc-debug] hourly hit:', hourlyRows[0] ? pvpcMap.has(hourlyRows[0].datetime) : 'n/a')
  }

  const hourlyData: ChartDataPoint[] = hourlyRows.map((r) => {
    const dt = new Date(r.datetime)
    const priceEurKwh = pvpcMap.get(r.datetime) ?? null
    return {
      datetime: r.datetime,
      hour: format(dt, 'dd/MM HH:mm'),
      consumptionKwh: r.consumption_kwh,
      period: r.period as TariffPeriod | null,
      priceEurKwh,
      estimatedCostEur: priceEurKwh !== null ? r.consumption_kwh * priceEurKwh : null,
    }
  })

  const dailyMap = new Map<string, { totalKwh: number; costEur: number; p1: number; p2: number; p3: number }>()
  for (const r of dailyRows) {
    const dateKey = format(new Date(r.datetime), 'yyyy-MM-dd')
    const existing = dailyMap.get(dateKey) ?? { totalKwh: 0, costEur: 0, p1: 0, p2: 0, p3: 0 }
    const price = pvpcMap.get(r.datetime) ?? 0
    existing.totalKwh += r.consumption_kwh
    existing.costEur += r.consumption_kwh * price
    if (r.period === 1) existing.p1 += r.consumption_kwh
    else if (r.period === 2) existing.p2 += r.consumption_kwh
    else existing.p3 += r.consumption_kwh
    dailyMap.set(dateKey, existing)
  }

  const rawDailyData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }))

  // O(n): accumulate same-weekday history in insertion order (data is date-sorted)
  const byWeekday = new Map<number, Array<{ date: string; totalKwh: number }>>()
  const weekdayAvgs = new Map<string, number>()
  for (const entry of rawDailyData) {
    const dow = getDay(new Date(entry.date))
    const group = byWeekday.get(dow) ?? []
    if (group.length >= 3) {
      const recent = group.slice(-8)
      weekdayAvgs.set(entry.date, recent.reduce((s, d) => s + d.totalKwh, 0) / recent.length)
    }
    group.push({ date: entry.date, totalKwh: entry.totalKwh })
    byWeekday.set(dow, group)
  }

  const dailyData: DailySummary[] = rawDailyData.map(({ date, totalKwh, costEur, p1, p2, p3 }) => {
    const avgForWeekday = weekdayAvgs.get(date)
    return {
      date,
      totalKwh,
      estimatedCostEur: costEur,
      kwhP1: p1,
      kwhP2: p2,
      kwhP3: p3,
      avgForWeekday,
      isAnomalous: avgForWeekday !== undefined && totalKwh > avgForWeekday * 1.75,
    }
  })

  const monthlyData: MonthlySummary[] = monthlyAgg.map(r => ({
    month: r.month,
    totalKwh: Number(r.total_kwh),
    estimatedCostEur: 0,
    avgPriceEurKwh: 0,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consumo</h1>
        <p className="text-sm text-muted-foreground mt-1">Análisis horario, diario y mensual</p>
      </div>
      {supplies.length > 1 && <CupsSelector supplies={supplies} selected={selectedCups} />}
      <ConsumptionView hourlyData={hourlyData} dailyData={dailyData} monthlyData={monthlyData} />
    </div>
  )
}
