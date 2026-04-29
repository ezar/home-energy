'use client'

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

  const flatAvgs = data.avgs.flat()
  const maxVal = Math.max(...flatAvgs)
  const maxIdx = flatAvgs.indexOf(maxVal)
  const peakDay = Math.floor(maxIdx / 24)
  const peakHr = maxIdx % 24
  const dayTotals = data.avgs.map(row => row.reduce((s, v) => s + v, 0))
  const maxDayIdx = dayTotals.indexOf(Math.max(...dayTotals))
  const hourTotals = Array.from({ length: 24 }, (_, h) => data.avgs.reduce((s, row) => s + row[h], 0))
  const maxHourIdx = hourTotals.indexOf(Math.max(...hourTotals))

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
          <div style={{ minWidth: 500, userSelect: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2, marginBottom: 4 }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ fontSize: 9, color: 'var(--dim)', textAlign: 'center' }}>
                  {h % 6 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>
            {dayLabelsShort.map((day, d) => (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2, marginBottom: 2 }}>
                <div style={{ fontSize: 10, color: 'var(--dim)', display: 'flex', alignItems: 'center' }}>{day}</div>
                {data.avgs[d].map((val, h) => {
                  const intensity = val / data.max
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
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{t('heatmapLow')}</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <div key={v} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(96,165,250,${(0.12 + v * 0.82).toFixed(2)})` }} />
              ))}
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{t('heatmapHigh')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--dim)', fontSize: 13 }}>{tc('noData')}</div>
      )}
      {statRow([
        { label: t('statMostActiveDay'), val: dayLabelsLong[maxDayIdx] ?? '—', unit: '', color: COLOR_DANGER },
        { label: t('statPeakHour'), val: `${String(peakHr).padStart(2, '0')}:00`, unit: `${maxVal.toFixed(3)} kWh`, color: COLOR_WARNING },
        { label: t('statGlobalPeakHour'), val: `${String(maxHourIdx).padStart(2, '0')}:00`, unit: '', color: '#a78bfa' },
      ])}
    </>
  )
}
