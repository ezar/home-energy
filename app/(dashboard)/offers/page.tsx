import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import { TariffSimulator } from '@/app/(dashboard)/cost/TariffSimulator'
import { startOfMonth, subMonths, format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import type { ProfileRow } from '@/lib/supabase/types-helper'
import { tariffConfigFromProfile } from '@/lib/pricing'
import { PERIOD_COLORS, COLOR_SUCCESS, COLOR_DANGER } from '@/lib/constants'
import { CARD_STYLE as CARD } from '@/lib/ui-styles'
import { ExternalLink, Scale } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ProfileData = Pick<ProfileRow,
  'tariff_type' | 'price_p1_eur_kwh' | 'price_p2_eur_kwh' | 'price_p3_eur_kwh' |
  'power_kw' | 'power_price_eur_kw_month'>

type MonthRow = {
  month: string
  p1_kwh: number; p2_kwh: number; p3_kwh: number; total_kwh: number
  pvpc_cost: number; pvpc_kwh: number
}

type MonthBucket = {
  key: string; label: string
  p1Kwh: number; p2Kwh: number; p3Kwh: number; totalKwh: number
  actualCost: number; pvpcCost: number; pvpcKwh: number
}

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [locale, t] = await Promise.all([getLocale(), getTranslations('Offers')])
  const dateFnsLocale = locale === 'en' ? enUS : es

  const now = new Date()
  const startDate = startOfMonth(subMonths(now, 23))

  const [profileResult, rpcResult] = await Promise.all([
    supabase.from('profiles')
      .select('tariff_type, price_p1_eur_kwh, price_p2_eur_kwh, price_p3_eur_kwh, power_kw, power_price_eur_kw_month')
      .eq('id', user.id).single(),
    (supabase as any).rpc('get_monthly_offers_data', {
      p_user_id: user.id,
      p_start: startDate.toISOString(),
    }),
  ])

  const profileData = (profileResult.data ?? {}) as ProfileData
  const tariffConfig = tariffConfigFromProfile(profileData)
  const isFixed = tariffConfig.tariffType === 'fixed'

  const months: MonthBucket[] = ((rpcResult.data ?? []) as MonthRow[])
    .filter(r => r.total_kwh > 0)
    .map(r => {
      const d = new Date(r.month + '-01T12:00:00Z')
      const p1 = Number(r.p1_kwh), p2 = Number(r.p2_kwh), p3 = Number(r.p3_kwh)
      const actualCost = isFixed
        ? p1 * (tariffConfig.priceP1 ?? 0) + p2 * (tariffConfig.priceP2 ?? 0) + p3 * (tariffConfig.priceP3 ?? 0)
        : Number(r.pvpc_cost)
      return {
        key: r.month,
        label: format(d, 'MMM yyyy', { locale: dateFnsLocale }),
        p1Kwh: p1, p2Kwh: p2, p3Kwh: p3,
        totalKwh: Number(r.total_kwh),
        actualCost,
        pvpcCost: Number(r.pvpc_cost),
        pvpcKwh: Number(r.pvpc_kwh),
      }
    })

  const totalKwh    = months.reduce((s, m) => s + m.totalKwh,  0)
  const totalP1     = months.reduce((s, m) => s + m.p1Kwh,     0)
  const totalP2     = months.reduce((s, m) => s + m.p2Kwh,     0)
  const totalP3     = months.reduce((s, m) => s + m.p3Kwh,     0)
  const totalActual = months.reduce((s, m) => s + m.actualCost, 0)
  const totalPvpc   = months.reduce((s, m) => s + m.pvpcCost,  0)
  const pvpcKwhTotal = months.reduce((s, m) => s + m.pvpcKwh,  0)
  const pvpcCoveragePct = totalKwh > 0 ? Math.round((pvpcKwhTotal / totalKwh) * 100) : 0

  const totalDiff = totalActual - totalPvpc

  const annualKwh = months.length >= 12
    ? Math.round(totalKwh)
    : Math.round((totalKwh / Math.max(months.length, 1)) * 12)

  const simMonths = months.map(m => ({
    label: m.label,
    p1Kwh: m.p1Kwh, p2Kwh: m.p2Kwh, p3Kwh: m.p3Kwh,
    actualCost: m.actualCost,
  }))

  const hasComparison = months.length > 0

  const periodStats = [
    { label: t('profileP1'), kwh: totalP1, color: PERIOD_COLORS[1] },
    { label: t('profileP2'), kwh: totalP2, color: PERIOD_COLORS[2] },
    { label: t('profileP3'), kwh: totalP3, color: PERIOD_COLORS[3] },
  ]

  return (
    <div style={{ maxWidth: 840, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Consumption profile card */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Scale size={16} color="var(--dim)" />
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('profileTitle')}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.5 }}>
          {t('profileSubtitle')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{t('profileAnnualKwh')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {annualKwh}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim2)' }}>
              kWh/año{months.length < 12 ? ` · ${t('profileEstimated', { months: months.length })}` : ` · ${months.length} ${t('profileMonths')}`}
            </div>
          </div>
          {periodStats.map(({ label, kwh, color }) => (
            <div key={label} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 10, color: 'var(--dim)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(kwh)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim2)' }}>
                kWh · {totalKwh > 0 ? Math.round((kwh / totalKwh) * 100) : 0}%
              </div>
            </div>
          ))}
          {tariffConfig.powerKw && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{t('profilePower')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {tariffConfig.powerKw.toFixed(2)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim2)' }}>kW</div>
            </div>
          )}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{t('profileTariff')}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {isFixed ? t('profileTariffFixed') : t('profileTariffPvpc')}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 10.5, color: 'var(--dim2)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg-inset)', borderRadius: 6 }}>
          💡 {t('profileTip')}
        </div>
      </div>

      {/* PVPC vs current tariff comparison */}
      {hasComparison && (
        <div style={CARD}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {t('pvpcCompTitle', { months: months.length })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 14, lineHeight: 1.5 }}>
            {isFixed ? t('pvpcCompSubFixed') : t('pvpcCompSubPvpc')}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: t('yourCost'), val: totalActual > 0 ? `${totalActual.toFixed(0)} €` : '—', note: `${months.length} ${t('profileMonths')}`, color: undefined },
              { label: t('pvpcCost'), val: totalPvpc > 0 ? `${totalPvpc.toFixed(0)} €` : '—', note: totalPvpc > 0 ? `${pvpcCoveragePct}% ${t('pvpcCoverage')}` : t('pvpcNoData'), color: undefined },
              ...(totalPvpc > 0 ? [{
                label: t('difference'),
                val: `${Math.abs(totalDiff) < 1 ? '~0' : (totalDiff > 0 ? '+' : '') + totalDiff.toFixed(0)} €`,
                note: totalDiff > 1 ? t('yourTariffPricier') : totalDiff < -1 ? t('yourTariffCheaper') : t('noSignificantDiff'),
                color: totalDiff > 1 ? COLOR_DANGER : totalDiff < -1 ? COLOR_SUCCESS : undefined,
              }] : []),
            ].map(({ label, val, note, color }) => (
              <div key={label} style={{ flex: '1 1 120px', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--text)', fontFamily: 'var(--font-mono)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--dim2)' }}>{note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            {[t('colMonth'), t('yourCost'), t('pvpcCost'), t('colDiff')].map(h => (
              <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderBottom: '1px solid var(--border-c)', textAlign: h === t('colMonth') ? 'left' : 'right' }}>
                {h}
              </div>
            ))}
            {months.map((m, i) => {
              const diff = m.actualCost - m.pvpcCost
              const diffColor = Math.abs(diff) < 0.5 ? 'var(--dim)' : diff > 0 ? COLOR_DANGER : COLOR_SUCCESS
              return [
                <div key={`l${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                  {m.label}
                </div>,
                <div key={`a${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {m.actualCost.toFixed(2)} €
                </div>,
                <div key={`p${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: '#60a5fa', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {m.pvpcKwh > 0 ? m.pvpcCost.toFixed(2) + ' €' : '—'}
                </div>,
                <div key={`d${i}`} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: diffColor, fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>
                  {m.pvpcKwh > 0 ? (diff > 0 ? '+' : '') + diff.toFixed(2) + ' €' : '—'}
                </div>,
              ]
            })}
          </div>
          {pvpcCoveragePct < 95 && (
            <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--dim2)', lineHeight: 1.5 }}>
              ⚠ {t('pvpcCoverageNote', { pct: pvpcCoveragePct })}
            </div>
          )}
        </div>
      )}

      {simMonths.length > 0 && (
        <TariffSimulator
          months={simMonths}
          currentP1={null}
          currentP2={null}
          currentP3={null}
        />
      )}

      <div style={CARD}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          {t('externalTitle')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 14, lineHeight: 1.5 }}>
          {t('externalSubtitle')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            { label: 'CNMC — Comparador de Ofertas de Luz', href: 'https://www.cnmc.es', desc: t('cnmcDesc') },
          ] as { label: string; href: string; desc: string }[]).map(({ label, href, desc }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 8,
                background: 'var(--bg-inset)', border: '1px solid var(--border-c)',
              }}>
                <ExternalLink size={14} color="var(--dim)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--dim2)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
