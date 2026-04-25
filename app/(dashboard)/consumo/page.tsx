import { createClient } from '@/lib/supabase/server'
import { ConsumptionView } from './ConsumptionView'
import { format, startOfMonth, subMonths } from 'date-fns'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'
import type { ConsumptionRow, PvpcPriceRow } from '@/lib/supabase/types-helper'
import { subDays, startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function ConsumoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const today = startOfDay(now)

  const [hourlyResult, pvpcResult, monthlyRawResult] = await Promise.all([
    supabase
      .from('consumption')
      .select('datetime, consumption_kwh, period')
      .eq('user_id', user.id)
      .gte('datetime', subDays(today, 1).toISOString())
      .order('datetime', { ascending: true }),

    supabase
      .from('pvpc_prices')
      .select('datetime, price_eur_kwh')
      .gte('datetime', subDays(today, 1).toISOString())
      .order('datetime', { ascending: true }),

    supabase
      .from('consumption')
      .select('datetime, consumption_kwh')
      .eq('user_id', user.id)
      .gte('datetime', startOfMonth(subMonths(now, 11)).toISOString())
      .order('datetime', { ascending: true }),
  ])

  type HourlyRow = Pick<ConsumptionRow, 'datetime' | 'consumption_kwh' | 'period'>
  type PvpcRow = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>
  type MonthlyRow = Pick<ConsumptionRow, 'datetime' | 'consumption_kwh'>

  const hourlyRows = (hourlyResult.data ?? []) as HourlyRow[]
  const pvpcRows = (pvpcResult.data ?? []) as PvpcRow[]
  const monthlyRows = (monthlyRawResult.data ?? []) as MonthlyRow[]

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
  for (const r of hourlyRows) {
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

  const dailyData: DailySummary[] = Array.from(dailyMap.entries()).map(([date, vals]) => ({
    date,
    totalKwh: vals.totalKwh,
    estimatedCostEur: vals.costEur,
    kwhP1: vals.p1,
    kwhP2: vals.p2,
    kwhP3: vals.p3,
  }))

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
      <ConsumptionView hourlyData={hourlyData} dailyData={dailyData} monthlyData={monthlyData} />
    </div>
  )
}
