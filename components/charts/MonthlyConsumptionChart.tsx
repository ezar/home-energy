'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { MonthlySummary } from '@/lib/types/consumption'

interface Props { data: MonthlySummary[] }

export function MonthlyConsumptionChart({ data }: Props) {
  if (!data.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--dim)', fontSize: 13 }}>
      Sin datos
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
        <defs>
          <linearGradient id="mbar-violet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}`} width={36} />
        <Tooltip
          formatter={(v: number) => [`${v} kWh`, 'Consumo']}
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--muted-c)' }}
        />
        <Bar dataKey="totalKwh" fill="url(#mbar-violet)" radius={[2, 2, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
