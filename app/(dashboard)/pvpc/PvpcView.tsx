'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { PeriodBadge, ColorBadge } from '@/components/dashboard/PeriodBadge'
import type { ChartDataPoint, TariffPeriod } from '@/lib/types/consumption'

const PERIOD_COLORS: Record<number, string> = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399' }
const PERIOD_NAMES: Record<number, string> = { 1: 'P1 Punta', 2: 'P2 Llano', 3: 'P3 Valle' }

const CARD = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}

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
        <div style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{d.priceEurKwh.toFixed(5)} €/kWh</div>
      )}
    </div>
  )
}

export function PvpcView({ data, avgPricePaid, avgMarketPrice }: Props) {
  const withPrice = data.filter(d => d.priceEurKwh != null)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Consumo + PVPC · Últimos 7 días
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[1, 2, 3].map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted-c)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: PERIOD_COLORS[p] }} />
                {PERIOD_NAMES[p]}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#a78bfa' }}>
              <div style={{ width: 14, height: 2, background: '#a78bfa', borderRadius: 1 }} /> PVPC
            </div>
          </div>
        </div>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data} margin={{ top: 4, right: 48, bottom: 0, left: -10 }}>
              <defs>
                {[1, 2, 3].map(p => (
                  <linearGradient key={p} id={`pvpc-bar-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PERIOD_COLORS[p]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={PERIOD_COLORS[p]} stopOpacity={0.45} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} interval={5} />
              <YAxis yAxisId="kwh" tick={{ fontSize: 10, fill: 'var(--dim)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={32} />
              <YAxis yAxisId="pvpc" orientation="right" tick={{ fontSize: 10, fill: '#a78bfa' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="kwh" dataKey="consumptionKwh" radius={[2, 2, 0, 0]} maxBarSize={16}>
                {data.map((d, i) => (
                  <Cell key={i} fill={`url(#pvpc-bar-${d.period ?? 3})`} />
                ))}
              </Bar>
              <Line yAxisId="pvpc" dataKey="priceEurKwh" stroke="#a78bfa" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#a78bfa' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--dim)', fontSize: 13 }}>
            Sin datos disponibles
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="g4">
        {[
          { label: 'Precio mercado medio', val: avgMarketPrice != null ? avgMarketPrice.toFixed(5) + ' €/kWh' : '—', color: '#a78bfa' },
          { label: 'Precio ponderado pagado', val: avgPricePaid != null ? avgPricePaid.toFixed(5) + ' €/kWh' : '—', color: '#38bdf8' },
          { label: 'Horas baratas', val: cheapCount + ' h', color: '#34d399' },
          { label: 'Horas caras', val: expCount + ' h', color: '#f87171' },
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
          <div style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginBottom: 8 }}>✓ Mejores horas para consumir</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {cheapUniq.map(h => <ColorBadge key={h} color="#34d399">{h}</ColorBadge>)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
            Precio típicamente bajo en madrugada y primera mañana. Ideal para lavadoras, lavavajillas, carga de vehículo.
          </div>
        </div>
        <div style={{ ...CARD, borderColor: 'rgba(248,113,113,0.25)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>⚠ Horas a evitar</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {expUniq.map(h => <ColorBadge key={h} color="#f87171">{h}</ColorBadge>)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
            Picos P1 entre 10–14h y 18–22h. Desplazar electrodomésticos a horas valle puede reducir el coste un 30–40%.
          </div>
        </div>
      </div>
    </div>
  )
}
