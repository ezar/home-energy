'use client'

import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

interface DayData { day: number; kwh: number }

interface Props {
  data: DayData[]
  avgKwh: number
  ariaLabel?: string
}

export function HomeDailyChart({ data, avgKwh, ariaLabel = 'Tendencia de consumo diario' }: Props) {
  const t = useTranslations('Home')
  return (
    <div role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fontSize: 9, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(0)} width={28} />
        <Tooltip
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 11 }}
          formatter={(v: number) => [`${v.toFixed(2)} kWh`, t('tooltipConsumption')]}
          labelFormatter={(d: number) => t('tooltipDay', { n: d })}
          labelStyle={{ color: 'var(--muted-c)', marginBottom: 4 }}
        />
        {avgKwh > 0 && (
          <ReferenceLine y={avgKwh} stroke="var(--dim)" strokeDasharray="3 3" strokeWidth={1} />
        )}
        <Bar dataKey="kwh" radius={[2, 2, 0, 0]} maxBarSize={24}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.kwh > avgKwh * 1.3 ? '#f87171' : d.kwh > avgKwh * 1.05 ? '#fbbf24' : '#60a5fa'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
