'use client'

import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

interface MonthData { month: string; totalKwh: number }

interface Props {
  data: MonthData[]
  avgKwh: number
  ariaLabel?: string
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function HomeMonthlyChart({ data, avgKwh, ariaLabel = 'Annual consumption trend' }: Props) {
  const t = useTranslations('Home')
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9, fill: 'var(--dim)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => MONTH_ABBR[Number(v.split('-')[1]) - 1] ?? v}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--dim)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(0)}
            width={28}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: number) => [`${v.toFixed(1)} kWh`, t('tooltipConsumption')]}
            labelFormatter={(d: string) => {
              const [year, mon] = d.split('-')
              return `${MONTH_ABBR[Number(mon) - 1]} ${year}`
            }}
            labelStyle={{ color: 'var(--muted-c)', marginBottom: 4 }}
          />
          {avgKwh > 0 && (
            <ReferenceLine y={avgKwh} stroke="var(--dim)" strokeDasharray="3 3" strokeWidth={1} />
          )}
          <Bar dataKey="totalKwh" radius={[2, 2, 0, 0]} maxBarSize={32}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.totalKwh > avgKwh * 1.2 ? '#f87171' : d.totalKwh > avgKwh * 1.05 ? '#fbbf24' : '#60a5fa'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
