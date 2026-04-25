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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PERIOD_COLORS } from '@/lib/tariff'
import type { ChartDataPoint, TariffPeriod } from '@/lib/types/consumption'

interface PvpcViewProps {
  data: ChartDataPoint[]
  avgPricePaid: number | null
  avgMarketPrice: number | null
}

export function PvpcView({ data, avgPricePaid, avgMarketPrice }: PvpcViewProps) {
  const topConsumptionHours = [...data]
    .sort((a, b) => b.consumptionKwh - a.consumptionKwh)
    .slice(0, 5)

  const topPriceHours = [...data]
    .filter((d) => d.priceEurKwh !== null)
    .sort((a, b) => (b.priceEurKwh ?? 0) - (a.priceEurKwh ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Precio medio pagado</div>
            <div className="text-xl font-bold mt-1">
              {avgPricePaid !== null ? `${(avgPricePaid * 1000).toFixed(2)} €/MWh` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Precio medio de mercado</div>
            <div className="text-xl font-bold mt-1">
              {avgMarketPrice !== null ? `${(avgMarketPrice * 1000).toFixed(2)} €/MWh` : '—'}
            </div>
            {avgPricePaid !== null && avgMarketPrice !== null && (
              <div className={`text-xs mt-1 ${avgPricePaid <= avgMarketPrice ? 'text-green-400' : 'text-red-400'}`}>
                {avgPricePaid <= avgMarketPrice ? '↓ Mejor que la media' : '↑ Por encima de la media'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico principal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Consumo + Precio PVPC</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data} margin={{ top: 4, right: 48, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="kwh"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <YAxis
                  yAxisId="pvpc"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#60a5fa' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${(v * 1000).toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'Consumo'
                      ? `${value.toFixed(3)} kWh`
                      : `${(value * 1000).toFixed(2)} €/MWh`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="kwh" dataKey="consumptionKwh" name="Consumo" radius={[2, 2, 0, 0]}>
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.period ? PERIOD_COLORS[entry.period as TariffPeriod] : '#6b7280'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
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
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Sin datos disponibles
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horas clave */}
      {(topConsumptionHours.length > 0 || topPriceHours.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Horas de mayor consumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topConsumptionHours.map((d) => (
                  <div key={d.datetime} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{d.hour}</span>
                    <span className="font-medium">{d.consumptionKwh.toFixed(3)} kWh</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Horas más caras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topPriceHours.map((d) => (
                  <div key={d.datetime} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{d.hour}</span>
                    <span className="font-medium text-red-400">
                      {((d.priceEurKwh ?? 0) * 1000).toFixed(2)} €/MWh
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
