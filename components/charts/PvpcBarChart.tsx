'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PvpcDataPoint { hour: number; price: number }
interface Props { data: PvpcDataPoint[]; height?: number; ariaLabel?: string }

export function PvpcBarChart({ data, height = 130, ariaLabel = 'Gráfico de precio PVPC por hora' }: Props) {
  return (
    <div role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="pvpc-amber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}h`} tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={25} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} width={36} />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(5)} €/kWh`, 'PVPC']}
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 12 }}
          labelFormatter={(h: number) => `${h}:00h`}
          labelStyle={{ color: 'var(--muted-c)' }}
        />
        <Bar dataKey="price" fill="url(#pvpc-amber)" radius={[2, 2, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
