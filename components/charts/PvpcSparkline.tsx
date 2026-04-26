'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props { data: number[]; color?: string }

export function PvpcSparkline({ data, color = '#a78bfa' }: Props) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={14}>
      <LineChart data={chartData}>
        <Line dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
