'use client'

interface Props {
  message?: string
}

export function PageLoader({ message = 'Cargando...' }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 280, gap: 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid var(--border-c)',
        borderTopColor: '#f59e0b',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 13, color: 'var(--dim)', letterSpacing: '0.02em' }}>
        {message}
      </span>
    </div>
  )
}

export function SkeletonCard({ height = 88 }: { height?: number }) {
  return (
    <div style={{
      background: 'var(--card-grad)', border: '1px solid var(--border-c)',
      borderRadius: 12, height, boxShadow: 'var(--shadow-card)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, var(--bg2) 50%, transparent 100%)',
        animation: 'shimmer 1.4s ease-in-out infinite',
      }} />
    </div>
  )
}
