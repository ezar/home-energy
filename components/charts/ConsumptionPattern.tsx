'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTranslations } from 'next-intl'
import { COLOR_DANGER, COLOR_WARNING, COLOR_SUCCESS } from '@/lib/constants'

interface HourBucket { hour: string; avgKwh: number }

interface Props {
  hourPattern: HourBucket[]
  statRow: (stats: { label: string; val: string; unit: string; color: string }[]) => React.ReactNode
}

export function ConsumptionPattern({ hourPattern, statRow }: Props) {
  const t = useTranslations('Consumption')
  const tc = useTranslations('Common')

  const valid = hourPattern.filter(h => h.avgKwh > 0)
  const peakHour = valid.length ? valid.reduce((a, b) => b.avgKwh > a.avgKwh ? b : a) : null
  const cheapHour = valid.length ? valid.reduce((a, b) => b.avgKwh < a.avgKwh ? b : a) : null
  const avgDayKwh = hourPattern.reduce((s, h) => s + h.avgKwh, 0)

  return (
    <>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
        {t('titlePattern')}
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 12 }}>{t('subtitlePattern')}</div>
      {valid.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourPattern} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} width={36} />
            <Tooltip
              contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v.toFixed(3)} kWh`, t('tooltipAvg')]}
              labelStyle={{ color: 'var(--muted-c)', marginBottom: 4 }}
            />
            <Bar dataKey="avgKwh" radius={[3, 3, 0, 0]} maxBarSize={22}>
              {hourPattern.map((_, i) => {
                const color = (i >= 10 && i < 14) || (i >= 18 && i < 22)
                  ? COLOR_DANGER
                  : (i >= 8 && i < 10) || (i >= 14 && i < 18) || i >= 22
                    ? COLOR_WARNING
                    : COLOR_SUCCESS
                return <Cell key={i} fill={color} fillOpacity={0.8} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--dim)', fontSize: 13 }}>{tc('noData')}</div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
        {[
          { label: t('p1PatternLabel'), color: COLOR_DANGER },
          { label: t('p2PatternLabel'), color: COLOR_WARNING },
          { label: t('p3PatternLabel'), color: COLOR_SUCCESS },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted-c)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.8 }} />
            {label}
          </div>
        ))}
      </div>
      {statRow([
        { label: t('statPeakHour'), val: peakHour?.hour ?? '—', unit: `${peakHour?.avgKwh.toFixed(3) ?? '—'} kWh`, color: COLOR_DANGER },
        { label: t('statDailyAvg'), val: avgDayKwh.toFixed(2), unit: 'kWh/d', color: 'var(--text)' },
        { label: t('statValleyHour'), val: cheapHour?.hour ?? '—', unit: `${cheapHour?.avgKwh.toFixed(3) ?? '—'} kWh`, color: COLOR_SUCCESS },
      ])}
    </>
  )
}
