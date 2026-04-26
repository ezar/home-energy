'use client'

import { useState } from 'react'
import { HourlyConsumptionChart } from '@/components/charts/HourlyConsumptionChart'
import { DailyConsumptionChart } from '@/components/charts/DailyConsumptionChart'
import { MonthlyConsumptionChart } from '@/components/charts/MonthlyConsumptionChart'
import { PeriodBadge } from '@/components/dashboard/PeriodBadge'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'

const PERIOD_COLORS: Record<number, string> = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399' }
const PERIOD_NAMES: Record<number, string> = { 1: 'P1 Punta', 2: 'P2 Llano', 3: 'P3 Valle' }

interface Props {
  hourlyData: ChartDataPoint[]
  dailyData: DailySummary[]
  monthlyData: MonthlySummary[]
}

const TAB_STYLE = (active: boolean) => ({
  padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: active ? 500 : 400,
  background: active ? 'rgba(245,158,11,0.12)' : 'var(--btn-bg)',
  color: active ? 'var(--nav-active-text)' : 'var(--btn-text)',
  border: `1px solid ${active ? 'rgba(245,158,11,0.25)' : 'var(--btn-border)'}`,
  transition: 'all 0.15s',
  fontFamily: 'var(--font-sans)',
})

const CARD = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}

export function ConsumptionView({ hourlyData, dailyData, monthlyData }: Props) {
  const [view, setView] = useState<'horaria' | 'diaria' | 'mensual'>('horaria')
  const [showPvpc, setShowPvpc] = useState(false)

  const periods = [1, 2, 3] as TariffPeriod[]
  const totalKwh = hourlyData.reduce((s, d) => s + d.consumptionKwh, 0)
  const totalCost = hourlyData.reduce((s, d) => s + (d.estimatedCostEur ?? 0), 0)
  const avgPvpc = hourlyData.filter(d => d.priceEurKwh != null).length > 0
    ? hourlyData.reduce((s, d) => s + (d.priceEurKwh ?? 0), 0) / hourlyData.filter(d => d.priceEurKwh != null).length
    : null

  const periodSummary = periods.map(p => ({
    period: p,
    kwh: hourlyData.filter(d => d.period === p).reduce((s, d) => s + d.consumptionKwh, 0),
  }))

  const dailyTotal = dailyData.reduce((s, d) => s + d.totalKwh, 0)
  const dailyMax = dailyData.length ? Math.max(...dailyData.map(d => d.totalKwh)) : 0

  const monthlyTotal = monthlyData.reduce((s, d) => s + d.totalKwh, 0)
  const monthlyAvg = monthlyData.length ? monthlyTotal / monthlyData.length : 0
  const monthlyPeak = monthlyData.length ? monthlyData.reduce((a, b) => b.totalKwh > a.totalKwh ? b : a) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['horaria', 'diaria', 'mensual'] as const).map(v => (
          <button key={v} style={TAB_STYLE(view === v)} onClick={() => setView(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {view === 'horaria' && (
          <button
            style={TAB_STYLE(showPvpc)}
            onClick={() => setShowPvpc(p => !p)}
          >
            ⟋ PVPC overlay
          </button>
        )}
      </div>

      {/* Main chart card */}
      <div style={CARD}>
        {view === 'horaria' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Consumo horario · Últimas 48h
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {periods.map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted-c)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PERIOD_COLORS[p] }} />
                    {PERIOD_NAMES[p]}
                  </div>
                ))}
                {showPvpc && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#a78bfa' }}>
                    <div style={{ width: 14, height: 2, background: '#a78bfa', borderRadius: 1 }} /> PVPC
                  </div>
                )}
              </div>
            </div>
            <HourlyConsumptionChart data={hourlyData} showPvpc={showPvpc} />
            {/* Stat row */}
            <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Total', val: totalKwh.toFixed(2), unit: 'kWh', color: 'var(--text)' },
                { label: 'Coste estimado', val: totalCost.toFixed(3), unit: '€', color: '#34d399' },
                { label: 'Precio medio PVPC', val: avgPvpc != null ? avgPvpc.toFixed(5) : '—', unit: '€/kWh', color: '#a78bfa' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '12px 0',
                  borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {s.val} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'diaria' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Consumo diario · Últimos 30 días
            </div>
            <DailyConsumptionChart data={dailyData} />
            <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Total mes', val: dailyTotal.toFixed(1), unit: 'kWh', color: 'var(--text)' },
                { label: 'Media diaria', val: dailyData.length ? (dailyTotal / dailyData.length).toFixed(2) : '—', unit: 'kWh', color: '#38bdf8' },
                { label: 'Día máximo', val: dailyMax.toFixed(2), unit: 'kWh', color: '#fbbf24' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '12px 0',
                  borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {s.val} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'mensual' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Consumo mensual · Últimos 12 meses
            </div>
            <MonthlyConsumptionChart data={monthlyData} />
            <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Total año', val: Math.round(monthlyTotal).toString(), unit: 'kWh', color: 'var(--text)' },
                { label: 'Media mensual', val: Math.round(monthlyAvg).toString(), unit: 'kWh', color: '#38bdf8' },
                { label: 'Mes pico', val: monthlyPeak?.month ?? '—', unit: `${monthlyPeak?.totalKwh ?? 0} kWh`, color: '#f87171' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '12px 0',
                  borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {s.val} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hourly detail table */}
      {view === 'horaria' && hourlyData.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Detalle hora a hora
          </div>
          <div className="table-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 100px', minWidth: 400 }}>
              {['Hora', 'kWh', '€/kWh', 'Coste', 'Período'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
              ))}
              {hourlyData.map((d, i) => (
                <>
                  <div key={`h${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{d.hour}</div>
                  <div key={`k${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{d.consumptionKwh.toFixed(3)}</div>
                  <div key={`p${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{d.priceEurKwh?.toFixed(5) ?? '—'}</div>
                  <div key={`c${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{d.estimatedCostEur?.toFixed(4) ?? '—'}</div>
                  <div key={`b${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                    {d.period && <PeriodBadge period={d.period as 1|2|3} />}
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
