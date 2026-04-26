'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'

interface DashboardShellProps {
  children: React.ReactNode
  lastSyncAt: string | null
}

export function DashboardShell({ children, lastSyncAt }: DashboardShellProps) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', height: '100svh', background: 'var(--bg0)' }}>
      <div className="sidebar-wrap">
        <Sidebar lastSyncAt={lastSyncAt} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar pathname={pathname} />
        <main className="main-content" style={{ background: 'var(--bg0)' }}>
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
