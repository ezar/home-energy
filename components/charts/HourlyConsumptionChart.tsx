'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { ChartDataPoint } from '@/lib/types/consumption'
import { PERIOD_COLORS, COLOR_SUCCESS, COLOR_PURPLE } from '@/lib/constants'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartDataPoint
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border-c)',
      borderRadius: 8, padding: '10px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--muted-c)', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d?.consumptionKwh?.toFixed(3)} kWh</div>
      {d?.priceEurKwh != null && <div style={{ color: COLOR_PURPLE, fontFamily: 'var(--font-mono)' }}>{d.priceEurKwh.toFixed(5)} €/kWh</div>}
      {d?.estimatedCostEur != null && <div style={{ color: COLOR_SUCCESS, fontFamily: 'var(--font-mono)' }}>{d.estimatedCostEur.toFixed(4)} €</div>}
    </div>
  )
}

interface Props {
  data: ChartDataPoint[]
  showPvpc?: boolean
}

export function HourlyConsumptionChart({ data, showPvpc }: Props) {
  if (!data.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--dim)', fontSize: 13 }}>
      Sin datos
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 4, right: showPvpc ? 44 : 8, bottom: 0, left: -10 }}>
        <defs>
          {[1, 2, 3].map(p => (
            <linearGradient key={p} id={`hbar-${p}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PERIOD_COLORS[p]} stopOpacity={0.95} />
              <stop offset="100%" stopColor={PERIOD_COLORS[p]} stopOpacity={0.45} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval={3} />
        <YAxis yAxisId="kwh" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={32} />
        {showPvpc && (
          <YAxis yAxisId="pvpc" orientation="right" tick={{ fontSize: 10, fill: '#a78bfa' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} width={44} />
        )}
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="kwh" dataKey="consumptionKwh" radius={[2, 2, 0, 0]} maxBarSize={24}>
          {data.map((d, i) => (
            <Cell key={i} fill={`url(#hbar-${d.period ?? 3})`} />
          ))}
        </Bar>
        {showPvpc && (
          <Line yAxisId="pvpc" dataKey="priceEurKwh" stroke="#a78bfa" strokeWidth={1.5}
            dot={false} activeDot={{ r: 3, fill: '#a78bfa' }} connectNulls />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
