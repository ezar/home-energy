'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface DashboardShellProps {
  children: React.ReactNode
  lastSyncAt: string | null
}

export function DashboardShell({ children, lastSyncAt }: DashboardShellProps) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg0)' }}>
      <Sidebar lastSyncAt={lastSyncAt} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar pathname={pathname} />
        <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--bg0)' }}>
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
