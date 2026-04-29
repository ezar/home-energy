'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CostPoint { day: number; cumCost: number }
interface Props { data: CostPoint[]; height?: number; ariaLabel?: string }

export function CostLineChart({ data, height = 130, ariaLabel = 'Gráfico de coste acumulado' }: Props) {
  return (
    <div role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="cost-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}€`} width={36} />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(2)} €`, 'Acumulado']}
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 12 }}
          labelFormatter={(d: number) => `Día ${d}`}
          labelStyle={{ color: 'var(--muted-c)' }}
        />
        <Area dataKey="cumCost" stroke="#34d399" strokeWidth={2} fill="url(#cost-green)" />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}
