import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startOfMonth, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ConsumptionRow, PvpcPriceRow } from '@/lib/supabase/types-helper'

export const dynamic = 'force-dynamic'

export default async function CostePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()

  const months = [0, 1, 2].map((offset) => {
    const d = subMonths(now, offset)
    return {
      label: format(d, 'MMMM yyyy', { locale: es }),
      start: startOfMonth(d).toISOString(),
      end: offset === 0 ? now.toISOString() : startOfMonth(subMonths(d, -1)).toISOString(),
    }
  })

  type ConsumptionWithPeriod = Pick<ConsumptionRow, 'consumption_kwh' | 'period' | 'datetime'>
  type PvpcItem = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>

  const monthlyStats = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const { data: consumptionRaw } = await supabase
        .from('consumption')
        .select('consumption_kwh, period, datetime')
        .eq('user_id', user.id)
        .gte('datetime', start)
        .lt('datetime', end)

      const { data: pvpcRaw } = await supabase
        .from('pvpc_prices')
        .select('datetime, price_eur_kwh')
        .gte('datetime', start)
        .lt('datetime', end)

      const consumption = (consumptionRaw ?? []) as ConsumptionWithPeriod[]
      const pvpc = (pvpcRaw ?? []) as PvpcItem[]
      const pvpcMap = new Map(pvpc.map((p) => [p.datetime, p.price_eur_kwh]))

      let totalKwh = 0, totalCost = 0
      let p1Kwh = 0, p2Kwh = 0, p3Kwh = 0
      let p1Cost = 0, p2Cost = 0, p3Cost = 0

      for (const r of consumption) {
        const price = pvpcMap.get(r.datetime) ?? 0
        const cost = r.consumption_kwh * price
        totalKwh += r.consumption_kwh
        totalCost += cost
        if (r.period === 1) { p1Kwh += r.consumption_kwh; p1Cost += cost }
        else if (r.period === 2) { p2Kwh += r.consumption_kwh; p2Cost += cost }
        else { p3Kwh += r.consumption_kwh; p3Cost += cost }
      }

      return { label, totalKwh, totalCost, p1Kwh, p2Kwh, p3Kwh, p1Cost, p2Cost, p3Cost }
    })
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coste estimado</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Solo término de energía (PVPC horario) — sin término de potencia ni impuestos
        </p>
      </div>

      <div className="space-y-4">
        {monthlyStats.map((month) => (
          <Card key={month.label}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-baseline">
                <CardTitle className="text-base capitalize">{month.label}</CardTitle>
                <div className="text-right">
                  <div className="text-lg font-bold">{month.totalCost.toFixed(2)} €</div>
                  <div className="text-xs text-muted-foreground">{month.totalKwh.toFixed(1)} kWh</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Punta (P1)', kwh: month.p1Kwh, cost: month.p1Cost, color: '#ef4444' },
                  { label: 'Llano (P2)', kwh: month.p2Kwh, cost: month.p2Cost, color: '#f59e0b' },
                  { label: 'Valle (P3)', kwh: month.p3Kwh, cost: month.p3Cost, color: '#22c55e' },
                ].map(({ label, kwh, cost, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="text-xs font-medium" style={{ color }}>{label}</div>
                    <div className="font-semibold">{cost.toFixed(2)} €</div>
                    <div className="text-xs text-muted-foreground">{kwh.toFixed(2)} kWh</div>
                    {month.totalKwh > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {((kwh / month.totalKwh) * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
