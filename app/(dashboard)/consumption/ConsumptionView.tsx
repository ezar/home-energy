'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { HourlyConsumptionChart } from '@/components/charts/HourlyConsumptionChart'
import { DailyConsumptionChart } from '@/components/charts/DailyConsumptionChart'
import { MonthlyConsumptionChart } from '@/components/charts/MonthlyConsumptionChart'
import { ConsumptionHeatmap } from '@/components/charts/ConsumptionHeatmap'
import { ConsumptionPattern } from '@/components/charts/ConsumptionPattern'
import { PeriodBadge } from '@/components/dashboard/PeriodBadge'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'
import { PERIOD_COLORS, COLOR_SUCCESS, COLOR_DANGER, COLOR_WARNING, COLOR_INFO } from '@/lib/constants'
import { CARD_STYLE as CARD, tabStyle as TAB_STYLE, chipStyle as CHIP_STYLE } from '@/lib/ui-styles'

type ViewMode = 'hourly' | 'daily' | 'monthly' | 'pattern' | 'heatmap'

interface Props {
  hourlyData: ChartDataPoint[]
  dailyData: DailySummary[]
  monthlyData: MonthlySummary[]
}

export function ConsumptionView({ hourlyData, dailyData, monthlyData }: Props) {
  const t = useTranslations('Consumption')
  const tc = useTranslations('Common')

  const [view, setView] = useState<ViewMode>('hourly')
  const [showPvpc, setShowPvpc] = useState(false)
  const [hourlyDays, setHourlyDays] = useState<7 | 14 | 30>(7)
  const [dailyDays, setDailyDays] = useState<30 | 60 | 90>(90)
  const [showAnomalies, setShowAnomalies] = useState(false)

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
  const anomalyCount = filteredDaily.filter(d => d.isAnomalous).length

  const recent12 = useMemo(() => monthlyData.slice(-12), [monthlyData])

  const downloadCsv = useCallback(() => {
    let csv = ''
    let filename = ''

    if (view === 'hourly') {
      csv = 'datetime,consumption_kwh,price_eur_kwh,cost_eur,period\n'
      csv += filteredHourly.map(d =>
        `${d.datetime},${d.consumptionKwh.toFixed(4)},${d.priceEurKwh?.toFixed(6) ?? ''},${d.estimatedCostEur?.toFixed(6) ?? ''},${d.period ?? ''}`
      ).join('\n')
      filename = `consumption-hourly-${hourlyDays}d.csv`
    } else if (view === 'daily') {
      csv = 'date,total_kwh,cost_eur,kwh_p1,kwh_p2,kwh_p3,anomaly\n'
      csv += filteredDaily.map(d =>
        `${d.date},${d.totalKwh.toFixed(4)},${d.estimatedCostEur.toFixed(4)},${d.kwhP1.toFixed(4)},${d.kwhP2.toFixed(4)},${d.kwhP3.toFixed(4)},${d.isAnomalous ? 'yes' : 'no'}`
      ).join('\n')
      filename = `consumption-daily-${dailyDays}d.csv`
    } else if (view === 'monthly') {
      csv = 'month,total_kwh\n'
      csv += recent12.map(d => `${d.month},${d.totalKwh.toFixed(4)}`).join('\n')
      filename = 'consumption-monthly.csv'
    } else {
      return
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [view, filteredHourly, filteredDaily, recent12, hourlyDays, dailyDays])

  const yoyComparison = useMemo(() => {
    const monthMap = new Map(monthlyData.map(m => [m.month, m.totalKwh]))
    return recent12.map(m => {
      const [year, month] = m.month.split('-')
      const prevKey = `${parseInt(year) - 1}-${month}`
      const prevKwh = monthMap.get(prevKey) ?? null
      const yoyPct = prevKwh && prevKwh > 0 ? ((m.totalKwh - prevKwh) / prevKwh) * 100 : null
      return { ...m, prevKwh, yoyPct }
    })
  }, [recent12, monthlyData])

  const monthlyTotal = recent12.reduce((s, d) => s + d.totalKwh, 0)
  const monthlyAvg = recent12.length ? monthlyTotal / recent12.length : 0
  const monthlyPeak = recent12.length ? recent12.reduce((a, b) => b.totalKwh > a.totalKwh ? b : a) : null

  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sum: 0, count: 0 })))
    for (const d of hourlyData) {
      const dt = new Date(d.datetime)
      const jsDay = dt.getDay()
      const moDay = jsDay === 0 ? 6 : jsDay - 1
      const hour = dt.getHours()
      grid[moDay][hour].sum += d.consumptionKwh
      grid[moDay][hour].count++
    }
    const avgs = grid.map(row => row.map(c => c.count > 0 ? c.sum / c.count : 0))
    const max = Math.max(...avgs.flat(), 0.001)
    return { avgs, max }
  }, [hourlyData])

  const VIEW_LABELS: Record<ViewMode, string> = {
    hourly: t('viewHourly'),
    daily: t('viewDaily'),
    monthly: t('viewMonthly'),
    pattern: t('viewPattern'),
    heatmap: t('viewHeatmap'),
  }

  const PERIOD_NAMES: Record<number, string> = {
    1: t('p1PatternLabel'),
    2: t('p2PatternLabel'),
    3: t('p3PatternLabel'),
  }

  const DAY_LABELS_SHORT = [
    t('dayMonShort'), t('dayTueShort'), t('dayWedShort'), t('dayThuShort'),
    t('dayFriShort'), t('daySatShort'), t('daySunShort'),
  ]
  const DAY_LABELS_LONG = [
    t('dayMonLong'), t('dayTueLong'), t('dayWedLong'), t('dayThuLong'),
    t('dayFriLong'), t('daySatLong'), t('daySunLong'),
  ]

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
        {(['hourly', 'daily', 'monthly', 'pattern', 'heatmap'] as const).map(v => (
          <button key={v} style={TAB_STYLE(view === v)} onClick={() => setView(v)}>
            {VIEW_LABELS[v]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {view === 'hourly' && (
          <button style={TAB_STYLE(showPvpc)} onClick={() => setShowPvpc(p => !p)}>{t('pvpcOverlay')}</button>
        )}
        {['hourly', 'daily', 'monthly'].includes(view) && (
          <button style={TAB_STYLE(false)} onClick={downloadCsv} title={t('downloadCsv')}>
            ↓ CSV
          </button>
        )}
      </div>

      {/* Main chart card */}
      <div style={CARD}>

        {/* ── Hourly ── */}
        {view === 'hourly' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('titleHourly')}
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
              { label: t('statTotal'), val: totalKwh.toFixed(2), unit: 'kWh', color: 'var(--text)' },
              { label: t('statCost'), val: totalCost.toFixed(3), unit: '€', color: COLOR_SUCCESS },
              { label: t('statAvgPvpc'), val: avgPvpc != null ? avgPvpc.toFixed(5) : '—', unit: '€/kWh', color: '#a78bfa' },
            ])}

            {periodKwh.total > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {t('periodDistribution')}
                </div>
                {[
                  { label: t('p1PatternLabel'), kwh: periodKwh.p1, color: COLOR_DANGER },
                  { label: t('p2PatternLabel'), kwh: periodKwh.p2, color: COLOR_WARNING },
                  { label: t('p3PatternLabel'), kwh: periodKwh.p3, color: COLOR_SUCCESS },
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

        {/* ── Daily ── */}
        {view === 'daily' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t('titleDaily')}
                </div>
                {anomalyCount > 0 && (
                  <button
                    onClick={() => setShowAnomalies(v => !v)}
                    style={{ fontSize: 10, fontWeight: 600, color: COLOR_DANGER, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {t('anomaly', { count: anomalyCount })}
                    <span style={{ fontSize: 8 }}>{showAnomalies ? '▲' : '▼'}</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {([30, 60, 90] as const).map(d => (
                  <button key={d} style={CHIP_STYLE(dailyDays === d)} onClick={() => setDailyDays(d)}>{d}d</button>
                ))}
              </div>
            </div>
            <DailyConsumptionChart data={filteredDaily} />
            {anomalyCount > 0 && showAnomalies && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {t('anomalyDetail')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {filteredDaily
                    .filter(d => d.isAnomalous)
                    .sort((a, b) => b.totalKwh - a.totalKwh)
                    .map(d => {
                      const pct = d.avgForWeekday != null && d.avgForWeekday > 0
                        ? Math.round(((d.totalKwh - d.avgForWeekday) / d.avgForWeekday) * 100)
                        : null
                      return (
                        <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--dim)', minWidth: 52, flexShrink: 0 }}>
                            {d.date.substring(5).replace('-', '/')}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: COLOR_DANGER }}>
                            {d.totalKwh.toFixed(2)} kWh
                          </span>
                          {d.avgForWeekday != null && (
                            <span style={{ fontSize: 10, color: 'var(--dim2)', flex: 1 }}>
                              {t('anomalyExpected')}: {d.avgForWeekday.toFixed(2)} kWh
                            </span>
                          )}
                          {pct !== null && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: COLOR_DANGER, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                              +{pct}%
                            </span>
                          )}
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            )}
            {statRow([
              { label: t('statTotalPeriod'), val: dailyTotal.toFixed(1), unit: 'kWh', color: 'var(--text)' },
              { label: t('statDailyAvg'), val: filteredDaily.length ? (dailyTotal / filteredDaily.length).toFixed(2) : '—', unit: 'kWh', color: '#38bdf8' },
              { label: t('statMaxDay'), val: dailyMax.toFixed(2), unit: 'kWh', color: COLOR_WARNING },
            ])}
          </>
        )}

        {/* ── Monthly ── */}
        {view === 'monthly' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              {t('titleMonthly')}
            </div>
            <MonthlyConsumptionChart data={recent12} />
            {statRow([
              { label: t('statTotal12m'), val: Math.round(monthlyTotal).toString(), unit: 'kWh', color: 'var(--text)' },
              { label: t('statMonthlyAvg'), val: Math.round(monthlyAvg).toString(), unit: 'kWh', color: '#38bdf8' },
              { label: t('statPeakMonth'), val: monthlyPeak?.month ?? '—', unit: `${Math.round(monthlyPeak?.totalKwh ?? 0)} kWh`, color: COLOR_DANGER },
            ])}

            {yoyComparison.some(m => m.yoyPct !== null) && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {t('yoyTitle')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {yoyComparison.filter(m => m.yoyPct !== null).map(m => {
                    const up = (m.yoyPct ?? 0) > 0
                    const color = up ? COLOR_DANGER : COLOR_SUCCESS
                    const [, mon] = m.month.split('-')
                    const monthKey = `month${mon}` as Parameters<typeof t>[0]
                    return (
                      <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '5px 8px', borderRadius: 6, background: 'var(--bg-inset)', minWidth: 44 }}>
                        <span style={{ fontSize: 9.5, color: 'var(--dim)' }}>{t(monthKey)}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>
                          {up ? '+' : ''}{(m.yoyPct ?? 0).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Pattern ── */}
        {view === 'pattern' && (
          <ConsumptionPattern hourPattern={hourPattern} statRow={statRow} />
        )}

        {/* ── Heatmap ── */}
        {view === 'heatmap' && (
          <ConsumptionHeatmap
            data={heatmapData}
            dayLabelsShort={DAY_LABELS_SHORT}
            dayLabelsLong={DAY_LABELS_LONG}
            statRow={statRow}
          />
        )}

      </div>

      {/* Hourly detail table */}
      {view === 'hourly' && filteredHourly.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('hourlyDetail')}
          </div>
          <div className="table-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 100px', minWidth: 400 }}>
              {[t('colHour'), t('colKwh'), t('colPrice'), t('colCost'), t('colPeriod')].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
              ))}
              {filteredHourly.map((d, i) => (
                <>
                  <div key={`h${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{d.hour}</div>
                  <div key={`k${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{d.consumptionKwh.toFixed(3)}</div>
                  <div key={`p${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{d.priceEurKwh?.toFixed(5) ?? '—'}</div>
                  <div key={`c${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)' }}>{d.estimatedCostEur?.toFixed(4) ?? '—'}</div>
                  <div key={`b${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                    {d.period && <PeriodBadge period={d.period as 1 | 2 | 3} />}
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily detail table */}
      {view === 'daily' && filteredDaily.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('dailyDetail')}
          </div>
          <div className="table-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 70px', minWidth: 480 }}>
              {[t('colDate'), t('colKwh'), t('colP1'), t('colP2'), t('colP3'), t('colCost'), t('colAnomaly')].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
              ))}
              {[...filteredDaily].reverse().map((d, i) => (
                <>
                  <div key={`dt${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{d.date}</div>
                  <div key={`dk${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{d.totalKwh.toFixed(2)}</div>
                  <div key={`p1${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: PERIOD_COLORS[1], fontFamily: 'var(--font-mono)' }}>{d.kwhP1.toFixed(2)}</div>
                  <div key={`p2${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: PERIOD_COLORS[2], fontFamily: 'var(--font-mono)' }}>{d.kwhP2.toFixed(2)}</div>
                  <div key={`p3${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: PERIOD_COLORS[3], fontFamily: 'var(--font-mono)' }}>{d.kwhP3.toFixed(2)}</div>
                  <div key={`dc${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)' }}>{d.estimatedCostEur > 0 ? `${d.estimatedCostEur.toFixed(3)} €` : '—'}</div>
                  <div key={`da${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: d.isAnomalous ? COLOR_DANGER : 'var(--dim)' }}>
                    {d.isAnomalous ? '⚠' : '—'}
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly detail table */}
      {view === 'monthly' && recent12.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('monthlyDetail')}
          </div>
          <div className="table-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', minWidth: 280 }}>
              {[t('colMonth'), t('colKwh'), t('colYoy')].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
              ))}
              {[...yoyComparison].reverse().map((m, i) => {
                const yoyUp = (m.yoyPct ?? 0) > 0
                const yoyColor = m.yoyPct === null ? 'var(--dim)' : yoyUp ? COLOR_DANGER : COLOR_SUCCESS
                return (
                  <>
                    <div key={`mm${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{m.month}</div>
                    <div key={`mk${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{m.totalKwh.toFixed(1)}</div>
                    <div key={`my${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: yoyColor, fontFamily: 'var(--font-mono)' }}>
                      {m.yoyPct !== null ? `${yoyUp ? '+' : ''}${m.yoyPct.toFixed(1)}%` : '—'}
                    </div>
                  </>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pattern detail table */}
      {view === 'pattern' && hourPattern.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {t('patternDetail')}
          </div>
          <div className="table-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', minWidth: 200 }}>
              {[t('colHour'), t('colAvgKwh')].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', borderBottom: '1px solid var(--border-c)' }}>{h}</div>
              ))}
              {hourPattern.map((h, i) => (
                <>
                  <div key={`ph${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>{h.hour}</div>
                  <div key={`pa${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{h.avgKwh.toFixed(3)}</div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
