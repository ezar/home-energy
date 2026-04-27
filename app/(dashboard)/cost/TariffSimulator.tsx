'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface MonthData {
  label: string
  p1Kwh: number
  p2Kwh: number
  p3Kwh: number
  actualCost: number
}

interface Props {
  months: MonthData[]
  currentP1: number | null
  currentP2: number | null
  currentP3: number | null
}

const CARD: React.CSSProperties = {
  background: 'var(--card-grad)', border: '1px solid var(--border-c)',
  borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)',
}

const INPUT: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text)',
  fontFamily: 'var(--font-mono)', width: '100%', outline: 'none',
}

const PERIOD_COLORS: Record<string, string> = { p1: '#f87171', p2: '#fbbf24', p3: '#34d399' }

export function TariffSimulator({ months, currentP1, currentP2, currentP3 }: Props) {
  const t = useTranslations('TariffSimulator')
  const tp = useTranslations('Period')

  const [simP1, setSimP1] = useState(String(currentP1?.toFixed(5) ?? ''))
  const [simP2, setSimP2] = useState(String(currentP2?.toFixed(5) ?? ''))
  const [simP3, setSimP3] = useState(String(currentP3?.toFixed(5) ?? ''))

  const p1 = parseFloat(simP1) || 0
  const p2 = parseFloat(simP2) || 0
  const p3 = parseFloat(simP3) || 0
  const hasValues = p1 > 0 || p2 > 0 || p3 > 0

  const simResults = months.map(m => {
    const simCost = m.p1Kwh * p1 + m.p2Kwh * p2 + m.p3Kwh * p3
    return { ...m, simCost, diff: simCost - m.actualCost }
  })

  const totalActual = simResults.reduce((s, m) => s + m.actualCost, 0)
  const totalSim = simResults.reduce((s, m) => s + m.simCost, 0)
  const totalDiff = totalSim - totalActual

  const annualFactor = 12 / Math.max(months.length, 1)
  const annualDiff = totalDiff * annualFactor

  const periodInputs = [
    { key: 'p1', label: tp('1'), val: simP1, set: setSimP1 },
    { key: 'p2', label: tp('2'), val: simP2, set: setSimP2 },
    { key: 'p3', label: tp('3'), val: simP3, set: setSimP3 },
  ] as const

  return (
    <div style={CARD}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
        {t('title')}
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim2)', marginBottom: 14 }}>
        {t('subtitle')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {periodInputs.map(({ key, label, val, set }) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: PERIOD_COLORS[key], flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: 'var(--dim)', fontWeight: 500 }}>{label}</span>
            </div>
            <input
              type="number"
              step="0.00001"
              min="0"
              placeholder="0.00000"
              value={val}
              onChange={e => set(e.target.value)}
              style={INPUT}
            />
            <div style={{ fontSize: 9.5, color: 'var(--dim2)', marginTop: 3 }}>€/kWh</div>
          </div>
        ))}
      </div>

      {hasValues && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 0, marginBottom: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            {[t('colMonth'), t('colActual'), t('colSimulated'), t('colDiff')].map(h => (
              <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderBottom: '1px solid var(--border-c)', textAlign: h === t('colMonth') ? 'left' : 'right' }}>{h}</div>
            ))}
            {simResults.map((m, i) => {
              const diffColor = m.diff > 0.005 ? '#f87171' : m.diff < -0.005 ? '#34d399' : 'var(--dim)'
              return [
                <div key={`l${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                  {m.label.split(' ')[0]}
                </div>,
                <div key={`a${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {m.actualCost.toFixed(2)} €
                </div>,
                <div key={`s${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: '#60a5fa', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {m.simCost.toFixed(2)} €
                </div>,
                <div key={`d${i}`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: diffColor, fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>
                  {m.diff > 0 ? '+' : ''}{m.diff.toFixed(2)} €
                </div>,
              ]
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            {[
              { label: t('totalMonths', { months: months.length }), val: `${totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(2)} €`, color: totalDiff > 0.01 ? '#f87171' : totalDiff < -0.01 ? '#34d399' : 'var(--dim)' },
              { label: t('annualProjection'), val: `${annualDiff > 0 ? '+' : ''}${annualDiff.toFixed(2)} €/año`, color: annualDiff > 0.01 ? '#f87171' : annualDiff < -0.01 ? '#34d399' : 'var(--dim)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: '1 1 140px', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)' }}>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{val}</div>
              </div>
            ))}
            <div style={{ flex: '2 1 200px', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-inset)', border: '1px solid var(--border-c)', display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
                {Math.abs(annualDiff) < 5
                  ? t('noSignificantDiff')
                  : annualDiff < 0
                    ? t('simulatedSaves', { amount: Math.abs(annualDiff).toFixed(0) })
                    : t('simulatedCosts', { amount: annualDiff.toFixed(0) })}
              </div>
            </div>
          </div>
        </>
      )}

      {!hasValues && (
        <div style={{ fontSize: 11, color: 'var(--dim2)', padding: '10px 0' }}>
          {t('enterPrices')}
        </div>
      )}
    </div>
  )
}
