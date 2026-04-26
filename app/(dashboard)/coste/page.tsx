import { createClient } from '@/lib/supabase/server'
import { CostLineChart } from '@/components/charts/CostLineChart'
import { startOfMonth, subMonths, format, getDate } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ConsumptionRow, PvpcPriceRow } from '@/lib/supabase/types-helper'

export const dynamic = 'force-dynamic'

const PERIOD_COLORS: Record<number, string> = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399' }
const PERIOD_NAMES: Record<number, string> = { 1: 'P1 Punta', 2: 'P2 Llano', 3: 'P3 Valle' }

const CARD = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}

export default async function CostePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const months = [0, 1, 2].map(offset => {
    const d = subMonths(now, offset)
    return {
      label: format(d, 'MMMM yyyy', { locale: es }),
      shortLabel: format(d, 'MMM', { locale: es }),
      start: startOfMonth(d).toISOString(),
      end: offset === 0 ? now.toISOString() : startOfMonth(subMonths(d, -1)).toISOString(),
      isCurrentMonth: offset === 0,
    }
  })

  type CRow = Pick<ConsumptionRow, 'consumption_kwh' | 'period' | 'datetime'>
  type PRow = Pick<PvpcPriceRow, 'datetime' | 'price_eur_kwh'>

  const monthlyStats = await Promise.all(
    months.map(async ({ label, shortLabel, start, end, isCurrentMonth }) => {
      const [{ data: consumptionRaw }, { data: pvpcRaw }] = await Promise.all([
        supabase.from('consumption').select('consumption_kwh, period, datetime').eq('user_id', user.id).gte('datetime', start).lt('datetime', end),
        supabase.from('pvpc_prices').select('datetime, price_eur_kwh').gte('datetime', start).lt('datetime', end),
      ])
      const consumption = (consumptionRaw ?? []) as CRow[]
      const pvpc = (pvpcRaw ?? []) as PRow[]
      const pvpcMap = new Map(pvpc.map(p => [p.datetime, p.price_eur_kwh]))

      let totalKwh = 0, totalCost = 0
      let p1Kwh = 0, p2Kwh = 0, p3Kwh = 0
      let p1Cost = 0, p2Cost = 0, p3Cost = 0

      for (const r of consumption) {
        const price = pvpcMap.get(r.datetime) ?? 0
        const cost = r.consumption_kwh * price
        totalKwh += r.consumption_kwh; totalCost += cost
        if (r.period === 1) { p1Kwh += r.consumption_kwh; p1Cost += cost }
        else if (r.period === 2) { p2Kwh += r.consumption_kwh; p2Cost += cost }
        else { p3Kwh += r.consumption_kwh; p3Cost += cost }
      }

      // Acumulado diario
      const dailyCumul: { day: number; cumCost: number }[] = []
      const dailyMap = new Map<number, number>()
      for (const r of consumption) {
        const day = getDate(new Date(r.datetime))
        const price = pvpcMap.get(r.datetime) ?? 0
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + r.consumption_kwh * price)
      }
      let cum = 0
      Array.from(dailyMap.entries()).sort(([a], [b]) => a - b).forEach(([day, cost]) => {
        cum += cost
        dailyCumul.push({ day, cumCost: parseFloat(cum.toFixed(2)) })
      })

      return { label, shortLabel, totalKwh, totalCost, p1Kwh, p2Kwh, p3Kwh, p1Cost, p2Cost, p3Cost, dailyCumul, isCurrentMonth }
    })
  )

  const current = monthlyStats[0]
  const avgPrice = current.totalKwh > 0 ? current.totalCost / current.totalKwh : 0

  const byPeriod = [
    { period: 1 as const, kwh: current.p1Kwh, cost: current.p1Cost },
    { period: 2 as const, kwh: current.p2Kwh, cost: current.p2Cost },
    { period: 3 as const, kwh: current.p3Kwh, cost: current.p3Cost },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Coste total mes', val: current.totalCost.toFixed(2), unit: '€', color: 'var(--text)' },
          { label: 'kWh consumidos', val: current.totalKwh.toFixed(1), unit: 'kWh', color: '#38bdf8' },
          { label: 'Precio medio', val: avgPrice.toFixed(5), unit: '€/kWh', color: '#a78bfa' },
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
          Desglose por período
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {byPeriod.map(({ period, kwh, cost }) => {
            const color = PERIOD_COLORS[period]
            const pct = current.totalKwh > 0 ? Math.round(kwh / current.totalKwh * 100) : 0
            const avgP = kwh > 0 ? cost / kwh : 0
            return (
              <div key={period} style={{
                borderRadius: 10, padding: '14px 16px',
                border: `1px solid ${color}30`, background: `${color}08`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}60` }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{PERIOD_NAMES[period]}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dim)', fontWeight: 500 }}>{pct}%</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {kwh.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--muted-c)', marginLeft: 4, fontFamily: 'var(--font-sans)' }}>kWh</span>
                </div>
                <div style={{ fontSize: 14, color: '#34d399', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{cost.toFixed(2)} €</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6 }}>
                  Precio medio: <span style={{ color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{avgP.toFixed(5)} €/kWh</span>
                </div>
                <div style={{ marginTop: 8, background: 'var(--bg-inset)', borderRadius: 3, height: 3 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, boxShadow: `0 0 4px ${color}50` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart + history */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Coste acumulado · {current.label}
          </div>
          <CostLineChart data={current.dailyCumul} />
          {current.dailyCumul.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--dim)' }}>
              Total: <span style={{ color: '#34d399', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{current.totalCost.toFixed(2)} €</span>
            </div>
          )}
        </div>

        <div style={{ ...CARD, overflow: 'auto', maxHeight: 280 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Histórico mensual
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {['Mes', 'kWh', '€ medio', 'Coste'].map(h => (
              <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
            ))}
            {monthlyStats.map((m, i) => (
              <>
                <div key={`m${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{m.label.split(' ')[0]}</div>
                <div key={`k${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{m.totalKwh.toFixed(1)}</div>
                <div key={`p${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                  {m.totalKwh > 0 ? (m.totalCost / m.totalKwh).toFixed(4) : '—'}
                </div>
                <div key={`c${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{m.totalCost.toFixed(2)}</div>
              </>
            ))}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Solo término de energía (PVPC horario) — sin potencia ni impuestos</p>
    </div>
  )
}
