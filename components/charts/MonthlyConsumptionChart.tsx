'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlySummary } from '@/lib/types/consumption'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface MonthlyConsumptionChartProps {
  data: MonthlySummary[]
}

export function MonthlyConsumptionChart({ data }: MonthlyConsumptionChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sin datos disponibles
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(`${d.month}-01`), 'MMM yy', { locale: es }),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(0)}`}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)} kWh`, 'Consumo']}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: 12,
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Bar dataKey="totalKwh" name="Consumo" fill="#60a5fa" radius={[2, 2, 0, 0]} fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}
