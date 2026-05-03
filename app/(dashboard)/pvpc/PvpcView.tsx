'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { PeriodBadge, ColorBadge } from '@/components/dashboard/PeriodBadge'
import type { ChartDataPoint, TariffPeriod } from '@/lib/types/consumption'
import { PERIOD_COLORS, COLOR_SUCCESS, COLOR_DANGER, COLOR_PURPLE, COLOR_CYAN } from '@/lib/constants'
import { CARD_STYLE as CARD, chipStyle } from '@/lib/ui-styles'

const RANGES = [
  { key: '48h', hours: 48 },
  { key: '7d',  hours: 7 * 24 },
  { key: '30d', hours: 30 * 24 },
] as const
type RangeKey = typeof RANGES[number]['key']

interface Props {
  data: ChartDataPoint[]
  avgPricePaid: number | null
  avgMarketPrice: number | null
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartDataPoint
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-c)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--muted-c)', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d?.consumptionKwh?.toFixed(3)} kWh</div>
      {d?.priceEurKwh != null && (
        <div style={{ color: COLOR_PURPLE, fontFamily: 'var(--font-mono)' }}>{d.priceEurKwh.toFixed(5)} €/kWh</div>
      )}
    </div>
  )
}

export function PvpcView({ data, avgPricePaid, avgMarketPrice }: Props) {
  const t = useTranslations('Pvpc')
  const tc = useTranslations('Common')
  const tp = useTranslations('Period')
  const [range, setRange] = useState<RangeKey>('48h')

  const PERIOD_NAMES: Record<number, string> = { 1: tp('1'), 2: tp('2'), 3: tp('3') }

  const filteredData = useMemo(() => {
    const hours = RANGES.find(r => r.key === range)!.hours
    return data.slice(-hours)
  }, [data, range])

  const withPrice = filteredData.filter(d => d.priceEurKwh != null)

  const filteredAvgPricePaid = withPrice.length > 0
    ? withPrice.reduce((s, d) => s + (d.priceEurKwh! * d.consumptionKwh), 0) /
      withPrice.reduce((s, d) => s + d.consumptionKwh, 0)
    : null
  const filteredAvgMarketPrice = withPrice.length > 0
    ? withPrice.reduce((s, d) => s + d.priceEurKwh!, 0) / withPrice.length
    : null

  const cheapHours = [...withPrice].sort((a, b) => (a.priceEurKwh ?? 0) - (b.priceEurKwh ?? 0)).slice(0, 6)
  const expHours = [...withPrice].sort((a, b) => (b.priceEurKwh ?? 0) - (a.priceEurKwh ?? 0)).slice(0, 6)
  const cheapUniq = Array.from(new Set(cheapHours.map(d => d.hour))).slice(0, 4)
  const expUniq = Array.from(new Set(expHours.map(d => d.hour))).slice(0, 4)

  const cheapThreshold = withPrice.length ? withPrice.reduce((a, b) => (b.priceEurKwh ?? 0) < (a.priceEurKwh ?? 0) ? b : a).priceEurKwh ?? 0 : 0
  const expThreshold = withPrice.length ? withPrice.reduce((a, b) => (b.priceEurKwh ?? 0) > (a.priceEurKwh ?? 0) ? b : a).priceEurKwh ?? 0 : 0
  const cheapCount = withPrice.filter(d => (d.priceEurKwh ?? 0) <= cheapThreshold * 1.1).length
  const expCount = withPrice.filter(d => (d.priceEurKwh ?? 0) >= expThreshold * 0.9).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Main chart */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)} style={chipStyle(range === r.key)}>
                {r.key}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([1, 2, 3] as const).map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted-c)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: PERIOD_COLORS[p] }} />
                {PERIOD_NAMES[p]}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: COLOR_PURPLE }}>
              <div style={{ width: 14, height: 2, background: COLOR_PURPLE, borderRadius: 1 }} /> PVPC
            </div>
          </div>
        </div>

        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={filteredData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <defs>
                {([1, 2, 3] as const).map(p => (
                  <linearGradient key={p} id={`pvpc-bar-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PERIOD_COLORS[p]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={PERIOD_COLORS[p]} stopOpacity={0.45} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={55} />
              <YAxis yAxisId="kwh" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={32} />
              <YAxis yAxisId="pvpc" orientation="right" tick={false} tickLine={false} axisLine={false} width={8} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="kwh" dataKey="consumptionKwh" radius={[2, 2, 0, 0]} maxBarSize={16}>
                {filteredData.map((d, i) => (
                  <Cell key={i} fill={`url(#pvpc-bar-${d.period ?? 3})`} />
                ))}
              </Bar>
              <Line yAxisId="pvpc" dataKey="priceEurKwh" stroke="#a78bfa" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: COLOR_PURPLE }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--dim)', fontSize: 13 }}>
            {tc('noData')}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="g4">
        {[
          { label: t('avgMarketPrice'), val: filteredAvgMarketPrice != null ? filteredAvgMarketPrice.toFixed(5) + ' €/kWh' : '—', color: COLOR_PURPLE },
          { label: t('avgPricePaid'), val: filteredAvgPricePaid != null ? filteredAvgPricePaid.toFixed(5) + ' €/kWh' : '—', color: COLOR_CYAN },
          { label: t('cheapHoursLabel'), val: cheapCount + ' h', color: COLOR_SUCCESS },
          { label: t('expHoursLabel'), val: expCount + ' h', color: COLOR_DANGER },
        ].map(item => (
          <div key={item.label} style={CARD}>
            <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)' }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Cheap / expensive hours */}
      <div className="g2">
        <div style={{ ...CARD, borderColor: 'rgba(52,211,153,0.25)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLOR_SUCCESS, marginBottom: 8 }}>{t('bestHoursTitle')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {cheapUniq.map(h => <ColorBadge key={h} color="#34d399">{h}</ColorBadge>)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
            {t('bestHoursDesc')}
          </div>
        </div>
        <div style={{ ...CARD, borderColor: 'rgba(248,113,113,0.25)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLOR_DANGER, marginBottom: 8 }}>{t('avoidHoursTitle')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {expUniq.map(h => <ColorBadge key={h} color="#f87171">{h}</ColorBadge>)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
            {t('avoidHoursDesc')}
          </div>
        </div>
      </div>
    </div>
  )
}
