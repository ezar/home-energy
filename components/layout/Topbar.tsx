'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/':              { title: 'Resumen',          sub: 'Vista general del mes' },
  '/consumo':       { title: 'Consumo',           sub: 'Análisis horario, diario y mensual' },
  '/coste':         { title: 'Coste estimado',    sub: 'Tarifa 2.0TD PVPC' },
  '/pvpc':          { title: 'Comparativa PVPC',  sub: 'Consumo real vs mercado' },
  '/configuracion': { title: 'Configuración',     sub: 'Credenciales y sincronización' },
}

interface TopbarProps {
  pathname: string
}

export function Topbar({ pathname }: TopbarProps) {
  const [syncing, setSyncing] = useState(false)
  const meta = pageTitles[pathname] ?? { title: 'Energy', sub: '' }

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/datadis/sync', { method: 'POST' })
    } finally {
      setSyncing(false)
    }
  }

  const now = new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 48,
      background: 'var(--topbar-bg)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--sidebar-border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{meta.title}</span>
        <span style={{ fontSize: 12, color: 'var(--dim)' }}>{meta.sub}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {now}
        </span>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 8,
            background: 'var(--btn-bg)', color: 'var(--btn-text)',
            border: '1px solid var(--btn-border)',
            fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s',
          }}
        >
          <RefreshCw size={11} className={syncing ? 'spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  )
}
