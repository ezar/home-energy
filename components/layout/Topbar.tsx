'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/':             { title: 'Resumen',          sub: 'Vista general del mes' },
  '/consumption':  { title: 'Consumo',           sub: 'Análisis horario, diario y mensual' },
  '/cost':         { title: 'Coste estimado',    sub: 'Tarifa 2.0TD PVPC' },
  '/pvpc':         { title: 'Comparativa PVPC',  sub: 'Consumo real vs mercado' },
  '/settings':     { title: 'Configuración',     sub: 'Credenciales y sincronización' },
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
      padding: '0 16px', height: 48,
      background: 'var(--topbar-bg)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--sidebar-border)',
      flexShrink: 0, gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{meta.title}</span>
        <span className="topbar-date" style={{ fontSize: 12, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.sub}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <span className="topbar-date" style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap' }}>
          {now}
        </span>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8,
            background: 'var(--btn-bg)', color: 'var(--btn-text)',
            border: '1px solid var(--btn-border)',
            fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw size={11} className={syncing ? 'spin' : ''} />
          <span className="topbar-date">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  )
}
