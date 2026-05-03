'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { COLOR_SUCCESS, COLOR_DANGER } from '@/lib/constants'

interface MonthEntry {
  label: string
  totalKwh: number
  prevKwh: number | null
  yoyPct: number | null
}

interface Props {
  data: MonthEntry[]
  labelThisYear: string
  labelLastYear: string
}

function YoYTooltip({ active, payload, label, labelThisYear, labelLastYear }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string
  labelThisYear: string; labelLastYear: string
}) {
  if (!active || !payload?.length) return null
  const curr = payload.find(p => p.dataKey === 'totalKwh')?.value ?? null
  const prev = payload.find(p => p.dataKey === 'prevKwh')?.value ?? null
  const pct = curr !== null && prev !== null && prev > 0 ? ((curr - prev) / prev) * 100 : null
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border-c)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: '#60a5fa' }} />
        <span style={{ color: 'var(--dim)' }}>{labelThisYear}:</span>
        <span style={{ color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{curr?.toFixed(1)} kWh</span>
      </div>
      {prev !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--dim)', opacity: 0.5 }} />
          <span style={{ color: 'var(--dim)' }}>{labelLastYear}:</span>
          <span style={{ color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{prev.toFixed(1)} kWh</span>
        </div>
      )}
      {pct !== null && (
        <div style={{
          marginTop: 4, fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: pct > 5 ? COLOR_DANGER : pct < -5 ? COLOR_SUCCESS : 'var(--dim)',
        }}>
          {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

export function YoYComparisonChart({ data, labelThisYear, labelLastYear }: Props) {
  const hasPrev = data.some(m => m.prevKwh !== null)
  if (!hasPrev) return null

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="20%" barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--grid-line)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dim)' }} axisLine={false} tickLine={false} minTickGap={25} />
        <YAxis tick={{ fontSize: 9, fill: 'var(--dim)' }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          content={(props) => (
            <YoYTooltip {...props as Parameters<typeof YoYTooltip>[0]} labelThisYear={labelThisYear} labelLastYear={labelLastYear} />
          )}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Bar dataKey="prevKwh" name={labelLastYear} fill="var(--dim)" fillOpacity={0.22} radius={[2, 2, 0, 0]} maxBarSize={14} />
        <Bar dataKey="totalKwh" name={labelThisYear} radius={[2, 2, 0, 0]} maxBarSize={14}>
          {data.map((m, i) => (
            <Cell
              key={i}
              fill={(m.yoyPct ?? 0) > 10 ? '#f87171' : (m.yoyPct ?? 0) < -10 ? '#34d399' : '#60a5fa'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
