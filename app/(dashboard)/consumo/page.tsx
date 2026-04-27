import { createClient } from '@/lib/supabase/server'
import { ConsumptionView } from './ConsumptionView'
import { CupsSelector } from '@/components/dashboard/CupsSelector'
import { format, startOfMonth, subMonths, getDay } from 'date-fns'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'
import type { ConsumptionRow, PvpcPriceRow, UserSupplyRow } from '@/lib/supabase/types-helper'
import { subDays, startOfDay } from 'date-fns'

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

  let monthlyQ = supabase
    .from('consumption').select('datetime, consumption_kwh')
    .eq('user_id', user.id).gte('datetime', startOfMonth(subMonths(now, 23)).toISOString())
    .order('datetime', { ascending: true })
  if (selectedCups) monthlyQ = monthlyQ.eq('cups', selectedCups)

  const [hourlyResult, pvpcResult, dailyRawResult, monthlyRawResult, suppliesResult] = await Promise.all([
    hourlyQ,
    supabase.from('pvpc_prices').select('datetime, price_eur_kwh')
      .gte('datetime', subDays(today, 90).toISOString()).order('datetime', { ascending: true }),
    dailyQ,
    monthlyQ,
    supabase.from('user_supplies').select('cups, display_name').eq('user_id', user.id).eq('is_active', true),
  ])

  type HourlyRow = Pick<ConsumptionRow, 'datetime' | 'consumption_kwh' | 'period'>
  type PvpcRow = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>
  type MonthlyRow = Pick<ConsumptionRow, 'datetime' | 'consumption_kwh'>

  const hourlyRows = (hourlyResult.data ?? []) as HourlyRow[]
  const pvpcRows = (pvpcResult.data ?? []) as PvpcRow[]
  const dailyRows = (dailyRawResult.data ?? []) as HourlyRow[]
  const monthlyRows = (monthlyRawResult.data ?? []) as MonthlyRow[]
  const supplies = (suppliesResult.data ?? []) as Pick<UserSupplyRow, 'cups' | 'display_name'>[]

  const pvpcMap = new Map<string, number>(pvpcRows.map((p) => [p.datetime, p.price_eur_kwh]))

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

  const weekdayAvgs = new Map<string, number>()
  for (const entry of rawDailyData) {
    const dow = getDay(new Date(entry.date))
    const sameWeekdayBefore = rawDailyData
      .filter(d => d.date < entry.date && getDay(new Date(d.date)) === dow)
      .slice(-8)
    if (sameWeekdayBefore.length >= 3) {
      const avg = sameWeekdayBefore.reduce((s, d) => s + d.totalKwh, 0) / sameWeekdayBefore.length
      weekdayAvgs.set(entry.date, avg)
    }
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

  const monthlyMap = new Map<string, number>()
  for (const r of monthlyRows) {
    const monthKey = format(new Date(r.datetime), 'yyyy-MM')
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + r.consumption_kwh)
  }

  const monthlyData: MonthlySummary[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totalKwh]) => ({ month, totalKwh, estimatedCostEur: 0, avgPriceEurKwh: 0 }))

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
