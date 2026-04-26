'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { HourlyConsumptionChart } from '@/components/charts/HourlyConsumptionChart'
import { DailyConsumptionChart } from '@/components/charts/DailyConsumptionChart'
import { MonthlyConsumptionChart } from '@/components/charts/MonthlyConsumptionChart'
import { PeriodBadge } from '@/components/dashboard/PeriodBadge'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'

const PERIOD_COLORS: Record<number, string> = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399' }
const PERIOD_NAMES: Record<number, string> = { 1: 'P1 Punta', 2: 'P2 Llano', 3: 'P3 Valle' }

const CARD: React.CSSProperties = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: active ? 500 : 400,
  background: active ? 'rgba(245,158,11,0.12)' : 'var(--btn-bg)',
  color: active ? 'var(--nav-active-text)' : 'var(--btn-text)',
  border: `1px solid ${active ? 'rgba(245,158,11,0.25)' : 'var(--btn-border)'}`,
  transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
})

const CHIP_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: active ? 500 : 400,
  background: active ? 'rgba(96,165,250,0.12)' : 'transparent',
  color: active ? '#60a5fa' : 'var(--dim)',
  border: `1px solid ${active ? 'rgba(96,165,250,0.25)' : 'transparent'}`,
  transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
})

interface Props {
  hourlyData: ChartDataPoint[]
  dailyData: DailySummary[]
  monthlyData: MonthlySummary[]
}

export function ConsumptionView({ hourlyData, dailyData, monthlyData }: Props) {
  const [view, setView] = useState<'horaria' | 'diaria' | 'mensual' | 'patron' | 'heatmap'>('horaria')
  const [showPvpc, setShowPvpc] = useState(false)
  const [hourlyDays, setHourlyDays] = useState<7 | 14 | 30>(7)
  const [dailyDays, setDailyDays] = useState<30 | 60 | 90>(90)

  const filteredHourly = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - hourlyDays)
    return hourlyData.filter(d => new Date(d.datetime) >= cutoff)
  }, [hourlyData, hourlyDays])

  const filteredDaily = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - dailyDays)
    return dailyData.filter(d => new Date(d.date) >= cutoff)
  }, [dailyData, dailyDays])

  const periodKwh = useMemo(() => {
    const p1 = filteredHourly.filter(d => d.period === 1).reduce((s, d) => s + d.consumptionKwh, 0)
    const p2 = filteredHourly.filter(d => d.period === 2).reduce((s, d) => s + d.consumptionKwh, 0)
    const p3 = filteredHourly.filter(d => d.period === 3).reduce((s, d) => s + d.consumptionKwh, 0)
    return { p1, p2, p3, total: p1 + p2 + p3 }
  }, [filteredHourly])

  const hourPattern = useMemo(() =>
    Array.from({ length: 24 }, (_, h) => {
      const entries = hourlyData.filter(d => new Date(d.datetime).getHours() === h)
      return {
        hour: `${String(h).padStart(2, '0')}h`,
        avgKwh: entries.length ? entries.reduce((s, d) => s + d.consumptionKwh, 0) / entries.length : 0,
      }
    }),
    [hourlyData]
  )

  const totalKwh = filteredHourly.reduce((s, d) => s + d.consumptionKwh, 0)
  const totalCost = filteredHourly.reduce((s, d) => s + (d.estimatedCostEur ?? 0), 0)
  const withPrice = filteredHourly.filter(d => d.priceEurKwh != null)
  const avgPvpc = withPrice.length > 0
    ? withPrice.reduce((s, d) => s + (d.priceEurKwh ?? 0), 0) / withPrice.length
    : null

  const dailyTotal = filteredDaily.reduce((s, d) => s + d.totalKwh, 0)
  const dailyMax = filteredDaily.length ? Math.max(...filteredDaily.map(d => d.totalKwh)) : 0

  const monthlyTotal = monthlyData.reduce((s, d) => s + d.totalKwh, 0)
  const monthlyAvg = monthlyData.length ? monthlyTotal / monthlyData.length : 0
  const monthlyPeak = monthlyData.length ? monthlyData.reduce((a, b) => b.totalKwh > a.totalKwh ? b : a) : null

  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sum: 0, count: 0 })))
    for (const d of hourlyData) {
      const dt = new Date(d.datetime)
      const jsDay = dt.getDay()
      const moDay = jsDay === 0 ? 6 : jsDay - 1 // 0=Mon..6=Sun
      const hour = dt.getHours()
      grid[moDay][hour].sum += d.consumptionKwh
      grid[moDay][hour].count++
    }
    const avgs = grid.map(row => row.map(c => c.count > 0 ? c.sum / c.count : 0))
    const max = Math.max(...avgs.flat(), 0.001)
    return { avgs, max }
  }, [hourlyData])

  const validPattern = hourPattern.filter(h => h.avgKwh > 0)
  const peakHour = validPattern.length ? validPattern.reduce((a, b) => b.avgKwh > a.avgKwh ? b : a) : null
  const cheapHour = validPattern.length ? validPattern.reduce((a, b) => b.avgKwh < a.avgKwh ? b : a) : null
  const avgDayKwh = hourPattern.reduce((s, h) => s + h.avgKwh, 0)

  const statRow = (stats: { label: string; val: string; unit: string; color: string }[]) => (
    <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRight: i < stats.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={{ fontSize: 10.5, color: 'var(--dim)', marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
            {s.val} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)' }}>{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['horaria', 'diaria', 'mensual', 'patron', 'heatmap'] as const).map(v => (
          <button key={v} style={TAB_STYLE(view === v)} onClick={() => setView(v)}>
            {v === 'patron' ? 'Patrón' : v === 'heatmap' ? 'Heatmap' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {view === 'horaria' && (
          <button style={TAB_STYLE(showPvpc)} onClick={() => setShowPvpc(p => !p)}>⟋ PVPC overlay</button>
        )}
      </div>

      {/* Main chart card */}
      <div style={CARD}>

        {/* ── Horaria ── */}
        {view === 'horaria' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Consumo horario
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {([7, 14, 30] as const).map(d => (
                  <button key={d} style={CHIP_STYLE(hourlyDays === d)} onClick={() => setHourlyDays(d)}>{d}d</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              {([1, 2, 3] as const).map(p => (
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
            <HourlyConsumptionChart data={filteredHourly} showPvpc={showPvpc} />

            {statRow([
              { label: 'Total', val: totalKwh.toFixed(2), unit: 'kWh', color: 'var(--text)' },
              { label: 'Coste estimado', val: totalCost.toFixed(3), unit: '€', color: '#34d399' },
              { label: 'Precio medio PVPC', val: avgPvpc != null ? avgPvpc.toFixed(5) : '—', unit: '€/kWh', color: '#a78bfa' },
            ])}

            {/* Period distribution */}
            {periodKwh.total > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Distribución por período
                </div>
                {[
                  { label: 'P1 Punta', kwh: periodKwh.p1, color: '#f87171' },
                  { label: 'P2 Llano', kwh: periodKwh.p2, color: '#fbbf24' },
                  { label: 'P3 Valle', kwh: periodKwh.p3, color: '#34d399' },
                ].map(({ label, kwh, color }) => {
                  const pct = (kwh / periodKwh.total) * 100
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 52, fontSize: 10, color: 'var(--dim)', flexShrink: 0 }}>{label}</div>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-inset)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ width: 34, fontSize: 10, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)', flexShrink: 0, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
                      <div style={{ width: 62, fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--font-mono)', flexShrink: 0, textAlign: 'right' }}>{kwh.toFixed(1)} kWh</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Diaria ── */}
        {view === 'diaria' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Consumo diario
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {([30, 60, 90] as const).map(d => (
                  <button key={d} style={CHIP_STYLE(dailyDays === d)} onClick={() => setDailyDays(d)}>{d}d</button>
                ))}
              </div>
            </div>
            <DailyConsumptionChart data={filteredDaily} />
            {statRow([
              { label: 'Total período', val: dailyTotal.toFixed(1), unit: 'kWh', color: 'var(--text)' },
              { label: 'Media diaria', val: filteredDaily.length ? (dailyTotal / filteredDaily.length).toFixed(2) : '—', unit: 'kWh', color: '#38bdf8' },
              { label: 'Día máximo', val: dailyMax.toFixed(2), unit: 'kWh', color: '#fbbf24' },
            ])}
          </>
        )}

        {/* ── Mensual ── */}
        {view === 'mensual' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Consumo mensual · Últimos 12 meses
            </div>
            <MonthlyConsumptionChart data={monthlyData} />
            {statRow([
              { label: 'Total año', val: Math.round(monthlyTotal).toString(), unit: 'kWh', color: 'var(--text)' },
              { label: 'Media mensual', val: Math.round(monthlyAvg).toString(), unit: 'kWh', color: '#38bdf8' },
              { label: 'Mes pico', val: monthlyPeak?.month ?? '—', unit: `${Math.round(monthlyPeak?.totalKwh ?? 0)} kWh`, color: '#f87171' },
            ])}
          </>
        )}

        {/* ── Patrón ── */}
        {view === 'patron' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Patrón horario · Media últimos 30 días
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 12 }}>Consumo medio por hora del día</div>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourPattern} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} width={36} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(3)} kWh`, 'Media']}
                    labelStyle={{ color: 'var(--muted-c)', marginBottom: 4 }}
                  />
                  <Bar dataKey="avgKwh" radius={[3, 3, 0, 0]} maxBarSize={22}>
                    {hourPattern.map((_, i) => {
                      const color = (i >= 10 && i < 14) || (i >= 18 && i < 22)
                        ? '#f87171'
                        : (i >= 8 && i < 10) || (i >= 14 && i < 18) || i >= 22
                          ? '#fbbf24'
                          : '#34d399'
                      return <Cell key={i} fill={color} fillOpacity={0.8} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--dim)', fontSize: 13 }}>Sin datos</div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
              {[
                { label: 'P1 Punta (lab.)', color: '#f87171' },
                { label: 'P2 Llano', color: '#fbbf24' },
                { label: 'P3 Valle', color: '#34d399' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted-c)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.8 }} />
                  {label}
                </div>
              ))}
            </div>
            {statRow([
              { label: 'Hora pico', val: peakHour?.hour ?? '—', unit: `${peakHour?.avgKwh.toFixed(3) ?? '—'} kWh`, color: '#f87171' },
              { label: 'Media diaria', val: avgDayKwh.toFixed(2), unit: 'kWh/día', color: 'var(--text)' },
              { label: 'Hora valle', val: cheapHour?.hour ?? '—', unit: `${cheapHour?.avgKwh.toFixed(3) ?? '—'} kWh`, color: '#34d399' },
            ])}
          </>
        )}
        {/* ── Heatmap ── */}
        {view === 'heatmap' && (() => {
          const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
          const DAY_LABELS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
          const flatAvgs = heatmapData.avgs.flat()
          const maxVal = Math.max(...flatAvgs)
          const maxIdx = flatAvgs.indexOf(maxVal)
          const peakDay = Math.floor(maxIdx / 24)
          const peakHr = maxIdx % 24
          const dayTotals = heatmapData.avgs.map(row => row.reduce((s, v) => s + v, 0))
          const maxDayIdx = dayTotals.indexOf(Math.max(...dayTotals))
          const hourTotals = Array.from({ length: 24 }, (_, h) => heatmapData.avgs.reduce((s, row) => s + row[h], 0))
          const maxHourIdx = hourTotals.indexOf(Math.max(...hourTotals))

          return (
            <>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Heatmap semanal
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 14 }}>
                Consumo medio por hora y día de la semana
              </div>
              {hourlyData.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 500, userSelect: 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2, marginBottom: 4 }}>
                      <div />
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} style={{ fontSize: 9, color: 'var(--dim)', textAlign: 'center' }}>
                          {h % 6 === 0 ? `${h}h` : ''}
                        </div>
                      ))}
                    </div>
                    {DAY_LABELS.map((day, d) => (
                      <div key={day} style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2, marginBottom: 2 }}>
                        <div style={{ fontSize: 10, color: 'var(--dim)', display: 'flex', alignItems: 'center' }}>{day}</div>
                        {heatmapData.avgs[d].map((val, h) => {
                          const intensity = val / heatmapData.max
                          const bg = intensity < 0.01
                            ? 'var(--bg-inset)'
                            : `rgba(96,165,250,${(0.12 + intensity * 0.82).toFixed(2)})`
                          return (
                            <div
                              key={h}
                              title={val > 0 ? `${day} ${String(h).padStart(2, '0')}:00 — ${val.toFixed(3)} kWh` : undefined}
                              style={{ aspectRatio: '1/1', borderRadius: 2, background: bg, cursor: val > 0 ? 'help' : 'default' }}
                            />
                          )
                        })}
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 9, color: 'var(--dim)' }}>Bajo</span>
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                        <div key={v} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(96,165,250,${(0.12 + v * 0.82).toFixed(2)})` }} />
                      ))}
                      <span style={{ fontSize: 9, color: 'var(--dim)' }}>Alto</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--dim)', fontSize: 13 }}>Sin datos</div>
              )}
              {statRow([
                { label: 'Día más activo', val: DAY_LABELS_LONG[maxDayIdx] ?? '—', unit: '', color: '#f87171' },
                { label: 'Hora pico', val: `${String(peakHr).padStart(2, '0')}:00`, unit: `${maxVal.toFixed(3)} kWh`, color: '#fbbf24' },
                { label: 'Hora global máx.', val: `${String(maxHourIdx).padStart(2, '0')}:00`, unit: '', color: '#a78bfa' },
              ])}
            </>
          )
        })()}

      </div>

      {/* Hourly detail table */}
      {view === 'horaria' && filteredHourly.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Detalle hora a hora
          </div>
          <div className="table-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 100px', minWidth: 400 }}>
              {['Hora', 'kWh', '€/kWh', 'Coste', 'Período'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
              ))}
              {filteredHourly.map((d, i) => (
                <>
                  <div key={`h${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{d.hour}</div>
                  <div key={`k${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{d.consumptionKwh.toFixed(3)}</div>
                  <div key={`p${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{d.priceEurKwh?.toFixed(5) ?? '—'}</div>
                  <div key={`c${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{d.estimatedCostEur?.toFixed(4) ?? '—'}</div>
                  <div key={`b${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                    {d.period && <PeriodBadge period={d.period as 1 | 2 | 3} />}
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
