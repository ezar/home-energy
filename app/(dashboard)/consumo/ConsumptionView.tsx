'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { HourlyConsumptionChart } from '@/components/charts/HourlyConsumptionChart'
import { DailyConsumptionChart } from '@/components/charts/DailyConsumptionChart'
import { MonthlyConsumptionChart } from '@/components/charts/MonthlyConsumptionChart'
import { PERIOD_COLORS, PERIOD_NAMES } from '@/lib/tariff'
import type { ChartDataPoint, DailySummary, MonthlySummary, TariffPeriod } from '@/lib/types/consumption'

interface ConsumptionViewProps {
  hourlyData: ChartDataPoint[]
  dailyData: DailySummary[]
  monthlyData: MonthlySummary[]
}

const PERIODS = [1, 2, 3] as TariffPeriod[]

export function ConsumptionView({ hourlyData, dailyData, monthlyData }: ConsumptionViewProps) {
  const [showPvpc, setShowPvpc] = useState(false)

  // Resumen por período del día actual
  const periodSummary = PERIODS.map((p) => {
    const kwh = hourlyData
      .filter((d) => d.period === p)
      .reduce((s, d) => s + d.consumptionKwh, 0)
    return { period: p, kwh }
  })

  const totalKwh = hourlyData.reduce((s, d) => s + d.consumptionKwh, 0)

  return (
    <Tabs defaultValue="hourly">
      <TabsList>
        <TabsTrigger value="hourly">Horario</TabsTrigger>
        <TabsTrigger value="daily">Diario</TabsTrigger>
        <TabsTrigger value="monthly">Mensual</TabsTrigger>
      </TabsList>

      <TabsContent value="hourly" className="space-y-4 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Últimas 48 horas</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {periodSummary.map(({ period, kwh }) => (
                    <Badge
                      key={period}
                      variant="outline"
                      className="gap-1 text-xs"
                      style={{ borderColor: PERIOD_COLORS[period], color: PERIOD_COLORS[period] }}
                    >
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: PERIOD_COLORS[period] }} />
                      {PERIOD_NAMES[period].split(' ')[0]}: {kwh.toFixed(2)} kWh
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="pvpc-toggle"
                    checked={showPvpc}
                    onCheckedChange={setShowPvpc}
                  />
                  <Label htmlFor="pvpc-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    PVPC overlay
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <HourlyConsumptionChart data={hourlyData} showPvpc={showPvpc} />
          </CardContent>
        </Card>

        {totalKwh > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {periodSummary.map(({ period, kwh }) => (
              <Card key={period} style={{ borderColor: PERIOD_COLORS[period] + '40' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground">{PERIOD_NAMES[period]}</div>
                  <div className="text-lg font-bold mt-1">{kwh.toFixed(2)} kWh</div>
                  <div className="text-xs text-muted-foreground">
                    {totalKwh > 0 ? `${((kwh / totalKwh) * 100).toFixed(0)}%` : '—'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="daily" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consumo diario</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyConsumptionChart data={dailyData} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monthly" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyConsumptionChart data={monthlyData} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
