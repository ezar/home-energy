'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, BarChart3, DollarSign, TrendingUp, Settings, HelpCircle } from 'lucide-react'

const navItems = [
  { href: '/',             label: 'Resumen',  icon: Zap },
  { href: '/consumption',  label: 'Consumo',  icon: BarChart3 },
  { href: '/cost',         label: 'Coste',    icon: DollarSign },
  { href: '/pvpc',         label: 'PVPC',     icon: TrendingUp },
  { href: '/settings',     label: 'Config',   icon: Settings },
  { href: '/help',         label: 'Ayuda',    icon: HelpCircle },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="bottom-nav">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href} prefetch scroll={false} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 0',
              color: active ? 'var(--nav-active-text)' : 'var(--dim)',
              transition: 'color 0.1s',
            }}>
              <Icon size={20} />
              <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 400, fontFamily: 'var(--font-sans)' }}>{label}</span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
