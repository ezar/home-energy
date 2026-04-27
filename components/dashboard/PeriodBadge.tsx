'use client'

import { useTranslations } from 'next-intl'

const PERIOD_COLORS: Record<number, string> = { 1: '#f87171', 2: '#fbbf24', 3: '#34d399' }

interface PeriodBadgeProps {
  period: 1 | 2 | 3
}

export function PeriodBadge({ period }: PeriodBadgeProps) {
  const t = useTranslations('Period')
  const color = PERIOD_COLORS[period]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 500,
      background: `${color}22`, color, border: `1px solid ${color}38`,
    }}>
      {t(String(period) as '1' | '2' | '3')}
    </span>
  )
}

export function ColorBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 500,
      background: `${color}22`, color, border: `1px solid ${color}38`,
    }}>
      {children}
    </span>
  )
}
