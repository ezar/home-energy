'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export function ErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: 300, gap: 16,
      padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={22} color="#f87171" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Algo salió mal
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)', maxWidth: 320 }}>
          {error.message || 'Error inesperado al cargar esta sección.'}
        </div>
      </div>
      <button
        onClick={reset}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
          background: 'var(--btn-bg)', color: 'var(--btn-text)',
          border: '1px solid var(--btn-border)', fontSize: 12,
          fontWeight: 500, fontFamily: 'var(--font-sans)',
        }}
      >
        <RefreshCw size={12} />
        Reintentar
      </button>
    </div>
  )
}
