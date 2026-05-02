'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { LanguageToggle } from '@/components/dashboard/LanguageToggle'

const DATA_PAGES = new Set(['/', '/consumption', '/cost', '/pvpc', '/offers'])
const STALE_THRESHOLD_DAYS = 3

interface TopbarProps {
  latestDataAt: string | null
}

export function Topbar({ latestDataAt }: TopbarProps) {
  const [syncing, setSyncing] = useState(false)
  const [showStalePopover, setShowStalePopover] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('Topbar')

  const staleDays = latestDataAt
    ? Math.floor((Date.now() - new Date(latestDataAt).getTime()) / 86400000)
    : null
  const staleData = staleDays === null || staleDays >= STALE_THRESHOLD_DAYS

  const pageTitles: Record<string, { title: string; sub: string }> = {
    '/':             { title: t('summaryTitle'),     sub: t('summarySub') },
    '/consumption':  { title: t('consumptionTitle'), sub: t('consumptionSub') },
    '/cost':         { title: t('costTitle'),        sub: t('costSub') },
    '/pvpc':         { title: t('pvpcTitle'),        sub: t('pvpcSub') },
    '/offers':       { title: t('offersTitle'),      sub: t('offersSub') },
    '/settings':     { title: t('settingsTitle'),    sub: t('settingsSub') },
    '/welcome':      { title: t('welcomeTitle'),     sub: t('welcomeSub') },
    '/help':         { title: t('helpTitle'),        sub: t('helpSub') },
  }

  const meta = pageTitles[pathname] ?? { title: t('defaultTitle'), sub: '' }
  const showSync = DATA_PAGES.has(pathname)

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/datadis/sync', { method: 'POST' })
    } finally {
      setSyncing(false)
      router.refresh()
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
        {staleData && showSync && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStalePopover(v => !v)}
              title={t('staleData')}
              style={{
                height: 32, minWidth: 32, padding: '0 8px',
                borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.35)',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <AlertTriangle size={14} />
            </button>
            {showStalePopover && (
              <>
                <div
                  onClick={() => setShowStalePopover(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                />
                <div style={{
                  position: 'absolute', top: 38, right: 0, zIndex: 100,
                  background: 'var(--bg2)', border: '1px solid var(--border-c)',
                  borderRadius: 10, padding: '12px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  width: 240, fontSize: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#f59e0b', fontWeight: 600 }}>
                    <AlertTriangle size={13} />
                    {t('staleData')}
                  </div>
                  <div style={{ color: 'var(--dim)', lineHeight: 1.5, marginBottom: 10 }}>
                    {staleDays === null
                      ? t('staleDataNoSync')
                      : t('staleDataDays', { days: staleDays })}
                  </div>
                  <div style={{ color: 'var(--dim2)', fontSize: 11 }}>
                    {t('staleDataHint')}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {showSync && (
          <button
            onClick={handleSync}
            disabled={syncing}
            title={syncing ? t('syncing') : t('sync')}
            style={{
              height: 32, padding: '0 8px',
              minWidth: 32, borderRadius: 8,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--btn-bg)', color: 'var(--btn-text)',
              border: '1px solid var(--btn-border)',
              fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
            <span className="topbar-date">{syncing ? t('syncing') : t('sync')}</span>
          </button>
        )}
        <LanguageToggle />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  )
}
