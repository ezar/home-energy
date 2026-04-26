import { createClient } from '@/lib/supabase/server'
import { Zap, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { startOfMonth, subMonths, format, subHours, startOfDay, addDays } from 'date-fns'
import type { ConsumptionRow, PvpcPriceRow, ProfileRow } from '@/lib/supabase/types-helper'
import { StatCard } from '@/components/dashboard/StatCard'
import { ColorBadge } from '@/components/dashboard/PeriodBadge'
import { PvpcBarChart } from '@/components/charts/PvpcBarChart'
import { PvpcSparkline } from '@/components/charts/PvpcSparkline'
import { tariffConfigFromProfile, getEnergyPrice } from '@/lib/pricing'
import { getPeriod } from '@/lib/tariff'

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
  const startToday = startOfDay(now).toISOString()
  const endTomorrow = startOfDay(addDays(now, 2)).toISOString()

  const [profileResult, thisMonthResult, lastMonthResult, latestResult, pvpcNowResult, pvpc24hResult, pvpcTodayResult] =
    await Promise.all([
      supabase.from('profiles').select('last_sync_at, cups, distributor_code, tariff_type, price_p1_eur_kwh, price_p2_eur_kwh, price_p3_eur_kwh, power_kw, power_price_eur_kw_month').eq('id', user.id).single(),
      supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startThisMonth),
      supabase.from('consumption').select('consumption_kwh').eq('user_id', user.id).gte('datetime', startLastMonth).lt('datetime', endLastMonth),
      supabase.from('consumption').select('datetime').eq('user_id', user.id).order('datetime', { ascending: false }).limit(1),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').order('datetime', { ascending: false }).limit(1),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').gte('datetime', start24h).order('datetime', { ascending: true }),
      supabase.from('pvpc_prices').select('price_eur_kwh, datetime').gte('datetime', startToday).lt('datetime', endTomorrow).order('datetime', { ascending: true }),
    ])

  type MonthRow = Pick<ConsumptionRow, 'consumption_kwh'>
  type LatestRow = Pick<ConsumptionRow, 'datetime'>
  type PvpcRow = Pick<PvpcPriceRow, 'price_eur_kwh' | 'datetime'>

  const profile = profileResult.data as Pick<ProfileRow, 'last_sync_at' | 'cups' | 'distributor_code' | 'tariff_type' | 'price_p1_eur_kwh' | 'price_p2_eur_kwh' | 'price_p3_eur_kwh' | 'power_kw' | 'power_price_eur_kw_month'> | null
  const thisMonthRows = (thisMonthResult.data ?? []) as MonthRow[]
  const lastMonthRows = (lastMonthResult.data ?? []) as MonthRow[]
  const latestRows = (latestResult.data ?? []) as LatestRow[]
  const pvpcNow = ((pvpcNowResult.data ?? []) as PvpcRow[])[0] ?? null
  const pvpc24h = (pvpc24hResult.data ?? []) as PvpcRow[]
  const pvpcToday = (pvpcTodayResult.data ?? []) as PvpcRow[]

  const tariffConfig = tariffConfigFromProfile(profile ?? {})
  const currentPeriod = getPeriod(now)
  const currentPeriodPrice = getEnergyPrice(currentPeriod, pvpcNow?.price_eur_kwh ?? null, tariffConfig)
  const PERIOD_NAMES: Record<number, string> = { 1: 'P1 Punta', 2: 'P2 Llano', 3: 'P3 Valle' }
  const PERIOD_COLORS: Record<number, string> = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399' }

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

  const nowRounded = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
  const upcomingPvpc = pvpcToday.filter(p => new Date(p.datetime) >= nowRounded)
  const bestHoursToday = [...upcomingPvpc].sort((a, b) => a.price_eur_kwh - b.price_eur_kwh).slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stat cards */}
      <div className="g4">
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

        {/* Precio ahora */}
        {(() => {
          const isFixed = tariffConfig.tariffType === 'fixed'
          const priceLabel = isFixed ? 'Precio ahora' : 'PVPC ahora'
          const priceVal = currentPeriodPrice > 0 ? currentPeriodPrice.toFixed(5) : '—'
          const periodColor = PERIOD_COLORS[currentPeriod]
          const cheapness = avgPvpc24h && pvpcNow
            ? pvpcNow.price_eur_kwh < avgPvpc24h * 0.85 ? { label: 'barato', color: '#34d399' }
            : pvpcNow.price_eur_kwh > avgPvpc24h * 1.15 ? { label: 'caro', color: '#f87171' }
            : { label: 'normal', color: '#fbbf24' }
            : null
          return (
            <StatCard
              label={priceLabel}
              value={priceVal}
              unit="€/kWh"
              icon={<TrendingUp size={14} color="#a78bfa" />}
              iconBg="rgba(167,139,250,0.1)"
              meta={
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: periodColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 10.5, color: periodColor, fontWeight: 500 }}>{PERIOD_NAMES[currentPeriod]}</span>
                    {!isFixed && cheapness && (
                      <span style={{ fontSize: 10, color: cheapness.color, marginLeft: 2 }}>· {cheapness.label}</span>
                    )}
                    {isFixed && <ColorBadge color="#60a5fa">Fija</ColorBadge>}
                  </div>
                  {!isFixed && pvpcPrices24h.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <PvpcSparkline data={pvpcPrices24h} />
                    </div>
                  )}
                  {!isFixed && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {cheapHour !== null && <span style={{ fontSize: 10.5, color: '#34d399', fontFamily: 'var(--font-mono)' }}>↓ {cheapHour}:00</span>}
                      {expHour !== null && <span style={{ fontSize: 10.5, color: '#f87171', fontFamily: 'var(--font-mono)' }}>↑ {expHour}:00</span>}
                    </div>
                  )}
                </div>
              }
            />
          )
        })()}

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

      {/* Mejor hora hoy */}
      {bestHoursToday.length > 0 && (
        <div style={{
          background: 'var(--card-grad)', border: '1px solid var(--border-c)',
          borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Mejor hora hoy
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim2)' }}>
              {upcomingPvpc.length} horas disponibles · {format(now, 'dd MMM')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {bestHoursToday.map((p) => {
              const dt = new Date(p.datetime)
              const hoursDiff = Math.round((dt.getTime() - now.getTime()) / 3600000)
              const isNow = hoursDiff === 0
              const isTomorrow = dt.toDateString() !== now.toDateString()
              const timeLabel = isNow ? 'ahora' : isTomorrow ? 'mañana' : `en ${hoursDiff}h`
              const period = getPeriod(dt)
              const pColor = PERIOD_COLORS[period]
              return (
                <div key={p.datetime} style={{
                  flex: '1 1 120px', padding: '10px 12px', borderRadius: 8,
                  background: isNow ? 'rgba(52,211,153,0.08)' : 'rgba(96,165,250,0.05)',
                  border: `1px solid ${isNow ? 'rgba(52,211,153,0.3)' : 'var(--border-c)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                      {String(dt.getHours()).padStart(2, '0')}:00
                    </span>
                    <span style={{ fontSize: 9.5, color: isNow ? '#34d399' : '#60a5fa', fontWeight: 500 }}>
                      {timeLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#34d399', marginBottom: 4 }}>
                    {p.price_eur_kwh.toFixed(5)} €/kWh
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: pColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: pColor }}>{PERIOD_NAMES[period]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
