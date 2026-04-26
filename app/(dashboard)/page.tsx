import { createClient } from '@/lib/supabase/server'
import { Zap, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { startOfMonth, subMonths, format, subHours } from 'date-fns'
import type { ConsumptionRow, PvpcPriceRow, ProfileRow } from '@/lib/supabase/types-helper'
import { StatCard } from '@/components/dashboard/StatCard'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'
import { PvpcBarChart } from '@/components/charts/PvpcBarChart'
import { PvpcSparkline } from '@/components/charts/PvpcSparkline'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const startThisMonth = startOfMonth(now).toISOString()
  const startLastMonth = startOfMonth(subMonths(now, 1)).toISOString()
  const endLastMonth = startThisMonth
  const start24h = subHours(now, 24).toISOString()

  const [profileResult, thisMonthResult, lastMonthResult, latestResult, pvpcNowResult, pvpc24hResult] =
    await Promise.all([
      supabase.from('profiles').select('last_sync_at, cups, distributor_code').eq('id', user.id).single(),
      supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startThisMonth),
      supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startLastMonth).lt('datetime', endLastMonth),
      supabase.from('consumption').select('datetime').eq('user_id', user.id).order('datetime', { ascending: false }).limit(1),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').order('datetime', { ascending: false }).limit(1),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').gte('datetime', start24h).order('datetime', { ascending: true }),
    ])

  type MonthRow = Pick<ConsumptionRow, 'consumption_kwh'>
  type LatestRow = Pick<ConsumptionRow, 'datetime'>
  type PvpcRow = Pick<PvpcPriceRow, 'price_eur_kwh' | 'datetime'>

  const profile = profileResult.data as Pick<ProfileRow, 'last_sync_at' | 'cups' | 'distributor_code'> | null
  const thisMonthRows = (thisMonthResult.data ?? []) as MonthRow[]
  const lastMonthRows = (lastMonthResult.data ?? []) as MonthRow[]
  const latestRows = (latestResult.data ?? []) as LatestRow[]
  const pvpcNow = ((pvpcNowResult.data ?? []) as PvpcRow[])[0] ?? null
  const pvpc24h = (pvpc24hResult.data ?? []) as PvpcRow[]

  const thisMonthKwh = thisMonthRows.reduce((s, r) => s + r.consumption_kwh, 0)
  const lastMonthKwh = lastMonthRows.reduce((s, r) => s + r.consumption_kwh, 0)
  const estimatedCostEur = pvpcNow ? thisMonthKwh * pvpcNow.price_eur_kwh : null
  const avgPvpc = pvpcNow ? pvpcNow.price_eur_kwh : null
  const monthTrend = lastMonthKwh > 0 ? ((thisMonthKwh - lastMonthKwh) / lastMonthKwh) * 100 : null
  const latestDatetime = latestRows[0]?.datetime ?? null

  const pvpc24hForChart = pvpc24h.map((p, i) => ({
    hour: new Date(p.datetime).getHours(),
    price: p.price_eur_kwh,
  }))
  const pvpcPrices24h = pvpc24h.map(p => p.price_eur_kwh)
  const minPvpc = pvpcPrices24h.length ? Math.min(...pvpcPrices24h) : null
  const maxPvpc = pvpcPrices24h.length ? Math.max(...pvpcPrices24h) : null
  const avgPvpc24h = pvpcPrices24h.length ? pvpcPrices24h.reduce((a, b) => a + b, 0) / pvpcPrices24h.length : null
  const cheapHour = pvpc24h.length ? new Date(pvpc24h.reduce((a, b) => b.price_eur_kwh < a.price_eur_kwh ? b : a).datetime).getHours() : null
  const expHour = pvpc24h.length ? new Date(pvpc24h.reduce((a, b) => b.price_eur_kwh > a.price_eur_kwh ? b : a).datetime).getHours() : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {/* Consumo */}
        <StatCard
          label="Consumo mes"
          value={thisMonthKwh.toFixed(1)}
          unit="kWh"
          icon={<Zap size={14} color="#f59e0b" />}
          iconBg="rgba(245,158,11,0.15)"
          accentBg="linear-gradient(135deg,rgba(245,158,11,0.12),rgba(249,115,22,0.06))"
          meta={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {monthTrend !== null && (
                <ColorBadge color={monthTrend > 0 ? '#f87171' : '#34d399'}>
                  {monthTrend > 0 ? '↑' : '↓'} {Math.abs(monthTrend).toFixed(1)}%
                </ColorBadge>
              )}
              {lastMonthKwh > 0 && (
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>vs {lastMonthKwh.toFixed(1)} kWh</span>
              )}
            </div>
          }
        />

        {/* Coste */}
        <StatCard
          label="Coste estimado"
          value={estimatedCostEur !== null ? estimatedCostEur.toFixed(2) : '—'}
          unit="€"
          icon={<DollarSign size={14} color="#34d399" />}
          iconBg="rgba(52,211,153,0.1)"
          meta={
            <div>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>Precio medio </span>
              <span style={{ fontSize: 11, color: 'var(--muted-c)', fontFamily: 'var(--font-mono)' }}>
                {avgPvpc !== null ? avgPvpc.toFixed(5) : '—'} €/kWh
              </span>
              <div style={{ fontSize: 10.5, color: 'var(--dim2)', fontStyle: 'italic', marginTop: 2 }}>Solo término de energía</div>
            </div>
          }
        />

        {/* PVPC */}
        <StatCard
          label="PVPC ahora"
          value={pvpcNow ? pvpcNow.price_eur_kwh.toFixed(5) : '—'}
          unit="€/kWh"
          icon={<TrendingUp size={14} color="#a78bfa" />}
          iconBg="rgba(167,139,250,0.1)"
          meta={
            <div>
              {pvpcPrices24h.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <PvpcSparkline data={pvpcPrices24h} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {cheapHour !== null && <span style={{ fontSize: 10.5, color: '#34d399', fontFamily: 'var(--font-mono)' }}>↓ {cheapHour}:00 barato</span>}
                {expHour !== null && <span style={{ fontSize: 10.5, color: '#f87171', fontFamily: 'var(--font-mono)' }}>↑ {expHour}:00 caro</span>}
              </div>
            </div>
          }
        />

        {/* Último dato */}
        <StatCard
          label="Último dato"
          value={latestDatetime ? format(new Date(latestDatetime), 'dd MMM HH:mm') : 'Sin datos'}
          icon={<Clock size={14} color="#38bdf8" />}
          iconBg="rgba(56,189,248,0.1)"
          meta={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {profile?.distributor_code && <ColorBadge color="#38bdf8">Dist. {profile.distributor_code}</ColorBadge>}
              {profile?.cups && (
                <div style={{ fontSize: 10, color: 'var(--dim2)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', lineHeight: 1.5, marginTop: 4 }}>
                  {profile.cups}
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* PVPC 24h chart */}
      {pvpc24hForChart.length > 0 && (
        <div style={{
          background: 'var(--card-grad)', border: '1px solid var(--border-c)',
          borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Precio PVPC · Últimas 24 horas
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Mín', val: minPvpc?.toFixed(4), color: '#34d399' },
                { label: 'Máx', val: maxPvpc?.toFixed(4), color: '#f87171' },
                { label: 'Media', val: avgPvpc24h?.toFixed(4), color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--dim)' }}>{s.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: 'var(--font-mono)' }}>
                    {s.val ?? '—'} €
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PvpcBarChart data={pvpc24hForChart} />
        </div>
      )}
    </div>
  )
}
