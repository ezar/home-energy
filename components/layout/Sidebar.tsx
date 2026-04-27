'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, BarChart3, DollarSign, TrendingUp, Settings, HelpCircle } from 'lucide-react'

const navItems = [
  { href: '/',             label: 'Resumen',       icon: Zap },
  { href: '/consumption',  label: 'Consumo',       icon: BarChart3 },
  { href: '/cost',         label: 'Coste',         icon: DollarSign },
  { href: '/pvpc',         label: 'PVPC',          icon: TrendingUp },
  { href: '/settings',     label: 'Configuración', icon: Settings },
  { href: '/help',         label: 'Ayuda',         icon: HelpCircle },
]

interface SidebarProps {
  lastSyncAt: string | null
  syncing?: boolean
}

export function Sidebar({ lastSyncAt, syncing }: SidebarProps) {
  const pathname = usePathname()

  const syncLabel = syncing ? 'Sincronizando' : lastSyncAt ? 'Sincronizado' : 'Sin sync'
  const syncColor = syncing ? '#fbbf24' : lastSyncAt ? '#34d399' : '#888892'

  return (
    <div style={{
      width: 204, flexShrink: 0,
      background: 'var(--bg1)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 16px',
    }}>
      {/* Logo */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,rgba(245,158,11,0.3),rgba(249,115,22,0.15))',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={14} color="#f59e0b" fill="rgba(245,158,11,0.2)" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--nav-active-text)', letterSpacing: '0.02em' }}>
          Energy
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} prefetch scroll={false} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 12px', margin: '1px 8px',
                borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 500 : 400,
                color: active ? 'var(--nav-active-text)' : 'var(--dim)',
                background: active ? 'var(--nav-active-bg)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <Icon size={15} />
                {label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Sync status dot */}
      <div style={{
        margin: '0 12px',
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--status-bg)',
        border: '1px solid var(--status-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: syncColor,
            boxShadow: `0 0 6px ${syncColor}80`,
            animation: syncing ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: 10.5, color: syncColor, fontWeight: 500 }}>{syncLabel}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim2)' }}>
          {lastSyncAt
            ? new Date(lastSyncAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'Nunca'}
        </div>
      </div>

      {/* Build version */}
      {process.env.NEXT_PUBLIC_BUILD_VERSION && (
        <div style={{ margin: '8px 12px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 9.5, color: 'var(--dim2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            v{process.env.NEXT_PUBLIC_BUILD_VERSION}
          </span>
        </div>
      )}
    </div>
  )
}
