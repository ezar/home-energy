import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { SyncStatus } from '@/components/dashboard/SyncStatus'
import { Zap, TrendingUp, Euro, Calendar } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ProfileRow, ConsumptionRow, PvpcPriceRow } from '@/lib/supabase/types-helper'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const startThisMonth = startOfMonth(now).toISOString()
  const startLastMonth = startOfMonth(subMonths(now, 1)).toISOString()
  const endLastMonth = startOfMonth(now).toISOString()

  const [profileResult, thisMonthResult, lastMonthResult, latestResult, pvpcResult] =
    await Promise.all([
      supabase.from('profiles').select('last_sync_at, cups').eq('id', user.id).single(),
      supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startThisMonth),
      supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startLastMonth).lt('datetime', endLastMonth),
      supabase.from('consumption').select('datetime').eq('user_id', user.id).order('datetime', { ascending: false }).limit(1),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').order('datetime', { ascending: false }).limit(1),
    ])

  const profile = profileResult.data as Pick<ProfileRow, 'last_sync_at' | 'cups'> | null
  const thisMonthRows = (thisMonthResult.data ?? []) as Pick<ConsumptionRow, 'consumption_kwh'>[]
  const lastMonthRows = (lastMonthResult.data ?? []) as Pick<ConsumptionRow, 'consumption_kwh'>[]
  const latestRows = (latestResult.data ?? []) as Pick<ConsumptionRow, 'datetime'>[]
  const pvpcRows = (pvpcResult.data ?? []) as Pick<PvpcPriceRow, 'price_eur_kwh' | 'datetime'>[]

  const thisMonthKwh = thisMonthRows.reduce((s, r) => s + r.consumption_kwh, 0)
  const lastMonthKwh = lastMonthRows.reduce((s, r) => s + r.consumption_kwh, 0)
  const latestDatetime = latestRows[0]?.datetime ?? null
  const currentPvpc = pvpcRows[0]?.price_eur_kwh ?? null
  const estimatedCostEur = currentPvpc ? thisMonthKwh * currentPvpc : null
  const monthTrend = lastMonthKwh > 0 ? ((thisMonthKwh - lastMonthKwh) / lastMonthKwh) * 100 : 0
  const monthLabel = format(now, 'MMMM yyyy', { locale: es })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resumen</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <SyncStatus lastSyncAt={profile?.last_sync_at ?? null} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Consumo este mes"
          value={`${thisMonthKwh.toFixed(1)} kWh`}
          icon={Zap}
          trend={lastMonthKwh > 0 ? { value: monthTrend, label: 'vs mes anterior' } : undefined}
          subtitle={lastMonthKwh > 0 ? `Mes anterior: ${lastMonthKwh.toFixed(1)} kWh` : undefined}
        />
        <StatsCard
          title="Coste estimado"
          value={estimatedCostEur !== null ? `${estimatedCostEur.toFixed(2)} €` : '—'}
          icon={Euro}
          subtitle="Solo término de energía"
        />
        <StatsCard
          title="Precio PVPC ahora"
          value={currentPvpc !== null ? `${(currentPvpc * 1000).toFixed(2)} €/MWh` : '—'}
          icon={TrendingUp}
          subtitle={pvpcRows[0]?.datetime
            ? format(new Date(pvpcRows[0].datetime), 'dd MMM HH:mm', { locale: es })
            : undefined}
        />
        <StatsCard
          title="Último dato"
          value={latestDatetime
            ? format(new Date(latestDatetime), 'dd MMM HH:mm', { locale: es })
            : 'Sin datos'}
          icon={Calendar}
          subtitle={profile?.cups ?? undefined}
        />
      </div>
    </div>
  )
}
