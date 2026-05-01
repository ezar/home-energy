'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { COLOR_DANGER, COLOR_WARNING } from '@/lib/constants'

interface HeatmapData { avgs: number[][]; max: number }

interface Props {
  data: HeatmapData
  dayLabelsShort: string[]
  dayLabelsLong: string[]
  statRow: (stats: { label: string; val: string; unit: string; color: string }[]) => React.ReactNode
}

export function ConsumptionHeatmap({ data, dayLabelsShort, dayLabelsLong, statRow }: Props) {
  const t = useTranslations('Consumption')
  const tc = useTranslations('Common')
  const [hovered, setHovered] = useState<{ d: number; h: number } | null>(null)

  const flatAvgs = data.avgs.flat()
  const maxVal = Math.max(...flatAvgs)
  const maxIdx = flatAvgs.indexOf(maxVal)
  const peakHr = maxIdx % 24
  const dayTotals = data.avgs.map(row => row.reduce((s, v) => s + v, 0))
  const maxDayIdx = dayTotals.indexOf(Math.max(...dayTotals))
  const hourTotals = Array.from({ length: 24 }, (_, h) => data.avgs.reduce((s, row) => s + row[h], 0))
  const maxHourIdx = hourTotals.indexOf(Math.max(...hourTotals))

  const hoveredVal = hovered ? (data.avgs[hovered.d]?.[hovered.h] ?? 0) : null

  return (
    <>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
        {t('titleHeatmap')}
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 14 }}>
        {t('subtitleHeatmap')}
      </div>
      {flatAvgs.some(v => v > 0) ? (
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{ minWidth: 500, userSelect: 'none' }}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Hour axis */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2, marginBottom: 4 }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{
                  fontSize: 9, textAlign: 'center',
                  color: hovered?.h === h ? 'var(--text-2)' : 'var(--dim)',
                  fontWeight: hovered?.h === h ? 600 : 400,
                  transition: 'color 0.1s',
                }}>
                  {h % 6 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {dayLabelsShort.map((day, d) => (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2, marginBottom: 2 }}>
                <div style={{
                  fontSize: 10, display: 'flex', alignItems: 'center',
                  color: hovered?.d === d ? 'var(--text-2)' : 'var(--dim)',
                  fontWeight: hovered?.d === d ? 600 : 400,
                  transition: 'color 0.1s',
                }}>
                  {day}
                </div>
                {data.avgs[d].map((val, h) => {
                  const intensity = val / data.max
                  const isHov = hovered?.d === d && hovered?.h === h
                  const isRow = hovered?.d === d
                  const isCol = hovered?.h === h
                  const bg = isHov
                    ? '#f59e0b'
                    : intensity < 0.01
                      ? (isRow || isCol ? 'rgba(96,165,250,0.08)' : 'var(--bg-inset)')
                      : `rgba(96,165,250,${(0.12 + intensity * 0.82).toFixed(2)})`
                  return (
                    <div
                      key={h}
                      onMouseEnter={() => setHovered({ d, h })}
                      style={{
                        aspectRatio: '1/1', borderRadius: 2, background: bg,
                        cursor: 'crosshair',
                        outline: isHov
                          ? '1px solid rgba(245,158,11,0.8)'
                          : isRow || isCol
                            ? '1px solid rgba(96,165,250,0.2)'
                            : 'none',
                        outlineOffset: '-1px',
                        transition: 'background 0.08s',
                      }}
                    />
                  )
                })}
              </div>
            ))}

            {/* Tooltip info bar */}
            <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              {hovered && hoveredVal !== null ? (
                <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--dim)', fontFamily: 'var(--font-sans)', fontSize: 11 }}>
                    {dayLabelsLong[hovered.d]}
                  </span>
                  {' '}
                  <span style={{ color: 'var(--text-2)' }}>{String(hovered.h).padStart(2, '0')}:00</span>
                  <span style={{ color: 'var(--dim)' }}> — </span>
                  <span style={{ fontWeight: 700, color: hoveredVal > 0 ? '#60a5fa' : 'var(--dim)' }}>
                    {hoveredVal > 0 ? `${hoveredVal.toFixed(3)} kWh` : tc('noData')}
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--dim2)' }}>{t('heatmapHover')}</span>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{t('heatmapLow')}</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <div key={v} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(96,165,250,${(0.12 + v * 0.82).toFixed(2)})` }} />
              ))}
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{t('heatmapHigh')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--dim)', fontSize: 13 }}>
          {tc('noData')}
        </div>
      )}
      {statRow([
        { label: t('statMostActiveDay'), val: dayLabelsLong[maxDayIdx] ?? '—', unit: '', color: COLOR_DANGER },
        { label: t('statPeakHour'), val: `${String(peakHr).padStart(2, '0')}:00`, unit: `${maxVal.toFixed(3)} kWh`, color: COLOR_WARNING },
        { label: t('statGlobalPeakHour'), val: `${String(maxHourIdx).padStart(2, '0')}:00`, unit: '', color: '#a78bfa' },
      ])}
    </>
  )
}
