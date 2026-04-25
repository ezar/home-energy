import { createClient } from '@/lib/supabase/server'
import { PvpcView } from './PvpcView'
import { subDays, startOfDay, format } from 'date-fns'
import type { ChartDataPoint, TariffPeriod } from '@/lib/types/consumption'
import type { ConsumptionRow, PvpcPriceRow } from '@/lib/supabase/types-helper'

export const dynamic = 'force-dynamic'

export default async function PvpcPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const from = startOfDay(subDays(now, 2)).toISOString()

  const [consumptionResult, pvpcResult] = await Promise.all([
    supabase.from('consumption').select('datetime, consumption_kwh, period').eq('user_id', user.id).gte('datetime', from).order('datetime', { ascending: true }),
    supabase.from('pvpc_prices').select('datetime, price_eur_kwh').gte('datetime', from).order('datetime', { ascending: true }),
  ])

  type HourlyRow = Pick<ConsumptionRow, 'datetime' | 'consumption_kwh' | 'period'>
  type PvpcRow = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>

  const consumptionRows = (consumptionResult.data ?? []) as HourlyRow[]
  const pvpcRows = (pvpcResult.data ?? []) as PvpcRow[]
  const pvpcMap = new Map(pvpcRows.map((p) => [p.datetime, p.price_eur_kwh]))

  const data: ChartDataPoint[] = consumptionRows.map((r) => {
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

  const withPrice = data.filter((d) => d.priceEurKwh !== null)
  const avgPricePaid = withPrice.length > 0
    ? withPrice.reduce((s, d) => s + (d.priceEurKwh! * d.consumptionKwh), 0) /
      withPrice.reduce((s, d) => s + d.consumptionKwh, 0)
    : null

  const allPrices = pvpcRows.map((p) => p.price_eur_kwh)
  const avgMarketPrice = allPrices.length > 0
    ? allPrices.reduce((s, p) => s + p, 0) / allPrices.length
    : null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comparativa PVPC</h1>
        <p className="text-sm text-muted-foreground mt-1">Consumo real vs precio de mercado — últimas 48 horas</p>
      </div>
      <PvpcView data={data} avgPricePaid={avgPricePaid} avgMarketPrice={avgMarketPrice} />
    </div>
  )
}
