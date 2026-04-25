'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ChartDataPoint } from '@/lib/types/consumption'
import { PERIOD_COLORS, PERIOD_NAMES } from '@/lib/tariff'

interface HourlyConsumptionChartProps {
  data: ChartDataPoint[]
  showPvpc?: boolean
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
          {p.name === 'Consumo' ? ' kWh' : p.name === 'PVPC' ? ' €/kWh' : ''}
        </p>
      ))}
    </div>
  )
}

export function HourlyConsumptionChart({ data, showPvpc = false }: HourlyConsumptionChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sin datos para el período seleccionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 4, right: showPvpc ? 48 : 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="kwh"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(1)}`}
          label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
        />
        {showPvpc && (
          <YAxis
            yAxisId="pvpc"
            orientation="right"
            tick={{ fontSize: 11, fill: '#60a5fa' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v * 1000).toFixed(0)}`}
            label={{ value: '€/MWh', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#60a5fa' } }}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value: string) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
        />
        <Bar yAxisId="kwh" dataKey="consumptionKwh" name="Consumo" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.period ? PERIOD_COLORS[entry.period] : '#6b7280'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
        {showPvpc && (
          <Line
            yAxisId="pvpc"
            type="monotone"
            dataKey="priceEurKwh"
            name="PVPC"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
