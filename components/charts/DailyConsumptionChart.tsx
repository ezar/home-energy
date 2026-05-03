'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { DailySummary } from '@/lib/types/consumption'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props { data: DailySummary[]; ariaLabel?: string }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DailySummary & { label: string }
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--muted-c)', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d?.totalKwh?.toFixed(2)} kWh</div>
      {d?.isAnomalous && d?.avgForWeekday != null && (
        <div style={{ color: '#f87171', marginTop: 4 }}>
          ⚠ {((d.totalKwh / d.avgForWeekday - 1) * 100).toFixed(0)}% sobre media (
          {d.avgForWeekday.toFixed(2)} kWh habitual)
        </div>
      )}
    </div>
  )
}

export function DailyConsumptionChart({ data, ariaLabel = 'Gráfico de consumo diario' }: Props) {
  if (!data.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--dim)', fontSize: 13 }}>
      Sin datos
    </div>
  )

  const chartData = data.map(d => ({ ...d, label: format(parseISO(d.date), 'd MMM', { locale: es }) }))

  return (
    <div role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
        <defs>
          <linearGradient id="dbar-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id="dbar-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={32} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="totalKwh" radius={[2, 2, 0, 0]} maxBarSize={20}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.isAnomalous ? 'url(#dbar-red)' : 'url(#dbar-blue)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
