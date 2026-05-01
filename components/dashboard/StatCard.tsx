'use client'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  valueFontSize?: number
  meta?: React.ReactNode
  icon: React.ReactNode
  iconBg: string
  accentBg?: string
}

export function StatCard({ label, value, unit, valueFontSize = 32, meta, icon, iconBg, accentBg }: StatCardProps) {
  return (
    <div style={{
      background: accentBg ?? 'var(--card-grad)',
      border: '1px solid var(--border-c)',
      borderRadius: 12,
      padding: '16px 18px',
      boxShadow: 'var(--shadow-card)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-hover)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = ''
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card)'
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'nowrap', minWidth: 0 }}>
        <span style={{ fontSize: valueFontSize, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--muted-c)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>{unit}</span>}
      </div>
      {meta && <div style={{ marginTop: 8 }}>{meta}</div>}
    </div>
  )
}
