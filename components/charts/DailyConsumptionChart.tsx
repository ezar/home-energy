'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DailySummary } from '@/lib/types/consumption'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props { data: DailySummary[] }

export function DailyConsumptionChart({ data }: Props) {
  if (!data.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--dim)', fontSize: 13 }}>
      Sin datos
    </div>
  )

  const chartData = data.map(d => ({ ...d, label: format(parseISO(d.date), 'd MMM', { locale: es }) }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
        <defs>
          <linearGradient id="dbar-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={32} />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(2)} kWh`, 'Consumo']}
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--muted-c)' }}
        />
        <Bar dataKey="totalKwh" fill="url(#dbar-blue)" radius={[2, 2, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
